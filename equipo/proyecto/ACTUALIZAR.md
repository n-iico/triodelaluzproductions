# Actualizar el proyecto y el plan de filmación

Los archivos originales siguen siendo la fuente de trabajo. Cuando Nico pida actualizar la web, reconstruir ambos documentos desde esos originales y publicar en las mismas direcciones:

- Proyecto: https://triodelaluzproductions.cl/equipo/proyecto/
- Plan: https://triodelaluzproductions.cl/equipo/proyecto/plan-de-filmacion/

Repositorio publicado: `n-iico/triodelaluzproductions`, rama `main`.

## Fuentes

Carpeta: `/Volumes/TDLL_FLASH_01/OVNI_AFDM/OVNI Wiki/herramientas`.

- El proyecto se reconstruye desde `sitio/fuente/`, `sitio/datos/curaduria.json`, `sitio/traducciones/en/` y los documentos de la wiki, guion y pitch. También lee las imágenes originales, inventarios y el monitor.
- El plan se reconstruye desde `tablero-rodaje/fuente/tablero.html`, `tablero-rodaje/datos/plan.json` y `tablero-rodaje/datos/cielo.json`. Conserva la fecha `guardado` del plan original.
- Si los cambios se hicieron en el artifact de Claude, primero debe obtenerse su estado guardado y actualizar las copias locales de esos tres archivos. El generador no consulta el artifact. Los cambios realizados solo en el navegador del sitio público tampoco actualizan los originales.
- Revisar los avisos de traducciones desactualizadas: modificar un original español no traduce automáticamente su versión inglesa.

## Reconstrucción segura

Desde `/Volumes/TDLL_FLASH_01/TRIO/WEB`, ejecutar `scripts/actualizar-proyecto.mjs` con Node.js, estos argumentos y la clave actual enviada como JSON por la entrada estándar:

```text
node scripts/actualizar-proyecto.mjs \
  --source-root "/Volumes/TDLL_FLASH_01/OVNI_AFDM/OVNI Wiki/herramientas" \
  --output "/Volumes/TDLL_FLASH_01/TRIO/WEB/equipo/proyecto"
```

Entrada estándar: un objeto JSON con el campo `password`. Obtener la clave actual del contexto autorizado; nunca escribirla en el repositorio, archivos temporales, argumentos o variables de entorno. Mantener la misma clave salvo petición expresa de cambiarla.

Se necesita Python 3.11 o posterior con PyYAML y Pillow. Si el Python habitual no dispone de esas dependencias, añadir `--python /ruta/al/python3` con el runtime disponible. La versión de presentación del plan se toma del nombre de su última edición local; si es necesario indicarla expresamente, añadir `--plan-version 2.1` con la versión que corresponda.

El proceso carga los generadores originales, escribe las salidas nuevas en `/private/tmp`, añade navegación y protección, y verifica que ambos documentos se descifren con la misma clave. Solo después sustituye los dos `contenido.tlab` de la web. No modifica ni reconstruye dentro de la carpeta de originales. El material temporal sin cifrar se elimina al terminar, incluso si falla la reconstrucción.

## Comprobación y publicación

1. Comprobar el proyecto, el plan y los avisos del generador. Confirmar que los datos nuevos aparecen, funcionan los enlaces y la selección de idioma, y ambas páginas aceptan la clave actual.
2. Revisar los cambios del repositorio. Solo publicar material previsto para la web; nunca subir las carpetas temporales ni los originales privados. El script prepara los documentos, no hace commit, push ni despliegue.
3. Publicar los cambios en `main` mediante el mecanismo de publicación existente y comprobar las dos URL en producción. Mantener rutas, acceso con clave y diseño de navegación.

Una nueva reconstrucción renueva la protección de ambos documentos; las sesiones abiertas pueden necesitar introducir de nuevo la misma clave.
