#!/usr/bin/env node
/**
 * Prepara los laboratorios originales para el acceso común.
 * La clave se recibe únicamente por stdin, como JSON {"password":"…"}.
 * Uso: node scripts/preparar-triangulos.mjs --source-root <herramientas> --output <triangulos>
 *
 * TDL2: magic(4) + iteraciones uint32 BE(4) + salt(16) + iv(12) + ciphertext + tag(16).
 * PBKDF2-SHA-256, 300000 iteraciones, clave AES-256-GCM de 32 bytes.
 * Todos los documentos comparten salt y clave derivada; cada uno usa un IV distinto.
 * Solo se escriben los tres documentos cifrados. No se guarda la clave ni HTML sin cifrar.
 */

import { createCipheriv, pbkdf2, randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const deriveKey = promisify(pbkdf2);
const ITERATIONS = 300000;
const MAGIC = Buffer.from('TDL2', 'ascii');
const CONTROLLER = '../acceso.js?v=20261013-1';
const LABORATORIES = [
  {
    id: 'ultima-esperanza',
    directory: 'laboratorio-triangulo',
    title: 'Laboratorio del Triángulo',
    otherId: 'ledalen',
    expectedData: ['laboratorio', 'laboratorio-en', 'geometria', 'imagenes', 'nube'],
  },
  {
    id: 'ledalen',
    directory: 'laboratorio-ledalen',
    title: 'Laboratorio de Ledalen',
    otherId: 'ultima-esperanza',
    expectedData: ['laboratorio', 'lugar', 'clima'],
  },
];

function argumentsFrom(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const option = argv[i];
    if (option === '--help') return { help: true };
    if (!['--source-root', '--output'].includes(option) || !argv[i + 1] || argv[i + 1].startsWith('--')) {
      throw new Error('Usa --source-root <herramientas> y --output <triangulos>.');
    }
    if (args[option]) throw new Error(`La opción ${option} está repetida.`);
    args[option] = argv[++i];
  }
  if (!args['--source-root'] || !args['--output']) {
    throw new Error('Faltan --source-root <herramientas> y --output <triangulos>.');
  }
  return { sourceRoot: resolve(args['--source-root']), output: resolve(args['--output']) };
}

async function passwordFromStdin() {
  if (process.stdin.isTTY) throw new Error('La clave debe recibirse por stdin en un objeto JSON.');
  let input = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input, 'utf8') > 65536) throw new Error('La entrada JSON es demasiado grande.');
  }
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error('La entrada debe ser un objeto JSON con el campo password.');
  }
  input = '';
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
      typeof parsed.password !== 'string' || parsed.password.length === 0) {
    throw new Error('El campo password debe contener una clave no vacía.');
  }
  const password = Buffer.from(parsed.password, 'utf8');
  parsed.password = '';
  return password;
}

function compareVersions(left, right) {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const difference = (a[i] || 0) - (b[i] || 0);
    if (difference) return difference;
  }
  return 0;
}

async function latestStandalone(sourceRoot, laboratory) {
  const directory = join(sourceRoot, laboratory.directory, 'compartir');
  const escapedTitle = laboratory.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^OVNI al fin del mundo — ${escapedTitle} v([0-9]+(?:\\.[0-9]+)*) \\(Equipo\\) ([0-9]{4}-[0-9]{2}-[0-9]{2})\\.html$`);
  const entries = await readdir(directory, { withFileTypes: true });
  const candidates = entries.flatMap((entry) => {
    if (!entry.isFile()) return [];
    const match = entry.name.normalize('NFC').match(pattern);
    return match ? [{ name: entry.name, version: match[1], date: match[2] }] : [];
  });
  candidates.sort((a, b) => compareVersions(b.version, a.version) || b.date.localeCompare(a.date));
  if (!candidates.length) throw new Error(`No se encontró un HTML autónomo de ${laboratory.title}.`);
  const selected = candidates[0];
  const path = join(directory, selected.name);
  const html = await readFile(path, 'utf8');
  if (!/^\s*<!doctype html>/i.test(html) || !/<\/head>/i.test(html) || !/<body\b[^>]*>/i.test(html) ||
      !html.includes('window.LAB_ASSETS=') || laboratory.expectedData.some((id) => !html.includes(`id="d-${id}"`))) {
    throw new Error(`El archivo de ${laboratory.title} no contiene el laboratorio autónomo esperado.`);
  }
  return { ...selected, path, html };
}

const portalStyle = `<style id="tdl-portal-style">
#tdl-portal-nav{--tdl-portal-bg:#F2F4F5;--tdl-portal-fg:#131920;--tdl-portal-line:#C3C8CD;position:static;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;box-sizing:border-box;width:100%;margin:0;padding:12px max(20px,calc((100vw - 1320px)/2));border-bottom:1px solid var(--tdl-portal-line);background:var(--tdl-portal-bg);color:var(--tdl-portal-fg);font:500 13px/1.5 "IBM Plex Sans","Helvetica Neue",Arial,sans-serif}
#tdl-portal-nav .tdl-portal-links{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
#tdl-portal-nav a{display:inline-block;margin:0;padding:4px 0;border:0;background:transparent;color:var(--tdl-portal-fg);font:inherit;text-decoration:none;white-space:normal;opacity:1}
#tdl-portal-nav a:hover{text-decoration:underline;text-underline-offset:4px}
#tdl-portal-nav button{position:static;margin:0;padding:5px 10px;border:1px solid var(--tdl-portal-line);border-radius:5px;background:transparent;color:var(--tdl-portal-fg);font:inherit;cursor:pointer;opacity:1}
#tdl-portal-nav a:focus-visible,#tdl-portal-nav button:focus-visible{outline:2px solid var(--tdl-portal-fg);outline-offset:4px}
@media(prefers-color-scheme:dark){#tdl-portal-nav{--tdl-portal-bg:#0E1418;--tdl-portal-fg:#E3E8EB;--tdl-portal-line:#33414A}}
@media(max-width:480px){#tdl-portal-nav{gap:10px;padding:10px 16px;font-size:12px}#tdl-portal-nav .tdl-portal-links{gap:16px}}
</style>`;

function portalDocument(original, laboratory) {
  // The original standalone document remains complete; only the portal additions are inserted.
  let html = original.replace(/<meta\b[^>]*\bname\s*=\s*["'](?:robots|referrer)["'][^>]*>\s*/gi, '');
  const headAdditions = `\n<meta name="robots" content="noindex, nofollow, noarchive">\n<meta name="referrer" content="no-referrer">\n${portalStyle}\n<script src="${CONTROLLER}" defer></script>\n`;
  html = html.replace(/<\/head>/i, `${headAdditions}</head>`);
  const navigation = `\n<nav id="tdl-portal-nav" aria-label="Navegación de los laboratorios">\n  <div class="tdl-portal-links"><a href="../">Los triángulos</a><a href="../${laboratory.otherId}/">Cambiar laboratorio</a></div>\n  <button type="button" data-portal-lock>Cerrar acceso</button>\n</nav>\n`;
  return html.replace(/<body\b[^>]*>/i, (body) => body + navigation);
}

function encryptDocument(plaintext, key, salt, usedIVs) {
  let iv;
  do { iv = randomBytes(12); } while (usedIVs.has(iv.toString('hex')));
  usedIVs.add(iv.toString('hex'));
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const iterations = Buffer.alloc(4);
  iterations.writeUInt32BE(ITERATIONS);
  return Buffer.concat([MAGIC, iterations, salt, iv, ciphertext, cipher.getAuthTag()]);
}

async function atomicWrite(path, bytes) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomBytes(8).toString('hex')}.tmp`;
  try {
    await writeFile(temporary, bytes, { flag: 'wx', mode: 0o644 });
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  }
}

async function main() {
  const args = argumentsFrom(process.argv.slice(2));
  if (args.help) {
    process.stdout.write('Uso: node scripts/preparar-triangulos.mjs --source-root <herramientas> --output <triangulos>\nClave: JSON por stdin con el campo password.\n');
    return;
  }
  let password;
  let key;
  try {
    password = await passwordFromStdin();
    const sources = await Promise.all(LABORATORIES.map((lab) => latestStandalone(args.sourceRoot, lab)));
    const salt = randomBytes(16);
    key = await deriveKey(password, salt, ITERATIONS, 32, 'sha256');
    password.fill(0);
    const usedIVs = new Set();
    const catalog = Buffer.from(JSON.stringify({ version: 1, laboratories: LABORATORIES.map((lab) => lab.id) }), 'utf8');
    const outputs = [{ path: join(args.output, 'catalogo.tlab'), bytes: encryptDocument(catalog, key, salt, usedIVs) }];
    for (let index = 0; index < LABORATORIES.length; index += 1) {
      const lab = LABORATORIES[index];
      const source = sources[index];
      const document = Buffer.from(portalDocument(source.html, lab), 'utf8');
      outputs.push({ path: join(args.output, lab.id, 'contenido.tlab'), bytes: encryptDocument(document, key, salt, usedIVs) });
      document.fill(0);
    }
    for (const output of outputs) await atomicWrite(output.path, output.bytes);
    for (let index = 0; index < LABORATORIES.length; index += 1) {
      process.stdout.write(`${LABORATORIES[index].id}: ${sources[index].path}\n`);
    }
    process.stdout.write(`Preparados ${outputs.length} documentos cifrados en ${args.output}.\n`);
  } finally {
    password?.fill(0);
    key?.fill(0);
  }
}

main().catch((error) => {
  process.stderr.write(`No se pudo preparar el portal: ${error.message}\n`);
  process.exitCode = 1;
});
