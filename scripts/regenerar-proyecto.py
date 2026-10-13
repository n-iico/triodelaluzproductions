#!/usr/bin/env python3
"""Reconstruye las dos ediciones en una carpeta temporal, sin escribir los originales."""

import argparse
import importlib.util
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path

sys.dont_write_bytecode = True


def cargar_modulo(nombre, ruta):
    spec = importlib.util.spec_from_file_location(nombre, ruta)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def version_del_plan(origen):
    carpeta = origen / "tablero-rodaje" / "compartir"
    patron = re.compile(
        r"^OVNI al fin del mundo — Tablero de rodaje v([\d.]+) "
        r"\(Dirección y producción\) (\d{4}-\d{2}-\d{2})\.html$"
    )
    candidatos = []
    if carpeta.is_dir():
        for archivo in carpeta.iterdir():
            coincidencia = patron.fullmatch(unicodedata.normalize("NFC", archivo.name))
            if coincidencia:
                version, fecha = coincidencia.groups()
                try:
                    numeros = tuple(int(n) for n in version.split("."))
                except ValueError:
                    continue
                candidatos.append((fecha, numeros, version))
    return max(candidatos)[2] if candidatos else None


def principal():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--staging-root", type=Path, required=True)
    parser.add_argument("--plan-version")
    args = parser.parse_args()
    origen = args.source_root.resolve(strict=True)
    destino = args.staging_root.resolve(strict=True)
    if destino == origen or origen in destino.parents or destino in origen.parents:
        parser.error("La carpeta temporal debe estar fuera de la carpeta de originales.")
    if any(destino.iterdir()):
        parser.error("La carpeta temporal debe estar vacía.")
    if args.plan_version and not re.fullmatch(r"\d+(?:\.\d+)*", args.plan_version):
        parser.error("La versión del plan debe tener números separados por puntos.")

    sitio = destino / "herramientas" / "sitio"
    sitio.mkdir(parents=True)
    for nombre in ("fuente", "datos", "traducciones"):
        carpeta = origen / "sitio" / nombre
        if carpeta.is_dir():
            shutil.copytree(carpeta, sitio / nombre)
        elif nombre != "traducciones":
            raise FileNotFoundError(f"Falta el original: {carpeta}")

    # El módulo se carga desde el original: RAIZ, STILLS y MONITOR conservan sus
    # rutas de lectura. Solo AQUI cambia, para escribir y leer plantillas en staging.
    constructor = cargar_modulo("ovni_constructor_temporal", origen / "sitio" / "construir.py")
    constructor.AQUI = str(sitio)
    constructor.construir("equipo")
    for aviso in constructor.AVISOS:
        print(f"  aviso: {aviso}")
    web = cargar_modulo("ovni_web_temporal", origen / "sitio" / "web.py")
    web.AQUI = str(sitio)
    web.armar("equipo")

    tablero = destino / "herramientas" / "tablero-rodaje"
    tablero.mkdir()
    for nombre in ("fuente", "datos"):
        shutil.copytree(origen / "tablero-rodaje" / nombre, tablero / nombre)
    shutil.copy2(origen / "tablero-rodaje" / "construir.py", tablero / "construir.py")
    (tablero / "compartir").mkdir()
    casa = destino / "herramientas" / "casa"
    casa.mkdir()
    (casa / "fuentes").symlink_to((origen / "casa" / "fuentes").resolve(strict=True), target_is_directory=True)
    version = args.plan_version or version_del_plan(origen)
    comando = [sys.executable, "-B", str(tablero / "construir.py")]
    if version:
        comando.append(version)
    # Sin --web: la protección compartida se añade después en preparar-proyecto.mjs.
    subprocess.run(comando, check=True)
    plan = json.loads((tablero / "datos" / "plan.json").read_text(encoding="utf-8"))
    print(f"Plan reconstruido desde datos/plan.json; guardado original: {plan.get('guardado') or 'sin fecha'}.")


if __name__ == "__main__":
    try:
        principal()
    except ModuleNotFoundError as error:
        raise SystemExit(f"Falta la dependencia Python {error.name}. Usa Python 3.11 o posterior con PyYAML y Pillow.")
