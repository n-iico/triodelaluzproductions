#!/usr/bin/env node
/**
 * Prepara los laboratorios originales para el acceso común.
 * La clave se recibe únicamente por stdin, como JSON {"password":"…"}.
 * Uso: node scripts/preparar-triangulos.mjs --source-root <herramientas> --ledalen-en <HTML inglés> --output <triangulos>
 *
 * TDL2: magic(4) + iteraciones uint32 BE(4) + salt(16) + iv(12) + ciphertext + tag(16).
 * PBKDF2-SHA-256, 300000 iteraciones, clave AES-256-GCM de 32 bytes.
 * Todos los documentos comparten salt y clave derivada; cada uno usa un IV distinto.
 * Solo se escriben documentos cifrados. No se guarda la clave ni HTML sin cifrar.
 */

import { createCipheriv, pbkdf2, randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const deriveKey = promisify(pbkdf2);
const ITERATIONS = 300000;
const MAGIC = Buffer.from('TDL2', 'ascii');
const CONTROLLER = '../acceso.js?v=20261013-2';
const LANGUAGE_CONTROLLER = '../idioma.js?v=20261013-2';
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
    if (!['--source-root', '--ledalen-en', '--output'].includes(option) || !argv[i + 1] || argv[i + 1].startsWith('--')) {
      throw new Error('Usa --source-root <herramientas>, --ledalen-en <HTML inglés> y --output <triangulos>.');
    }
    if (args[option]) throw new Error(`La opción ${option} está repetida.`);
    args[option] = argv[++i];
  }
  if (!args['--source-root'] || !args['--output'] || !args['--ledalen-en']) {
    throw new Error('Faltan --source-root <herramientas>, --ledalen-en <HTML inglés> o --output <triangulos>.');
  }
  return { sourceRoot: resolve(args['--source-root']), english: resolve(args['--ledalen-en']), output: resolve(args['--output']) };
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
#tdl-portal-nav .tdl-portal-actions{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
#tdl-portal-nav .tdl-portal-language{display:inline-flex;align-items:center;gap:4px}
#tdl-portal-nav [data-portal-language]{border-color:transparent;padding:4px 8px;font:500 12px/1.5 "IBM Plex Mono",Menlo,monospace}
#tdl-portal-nav [data-portal-language][aria-pressed="true"]{border-color:var(--tdl-portal-line);background:color-mix(in srgb,var(--tdl-portal-fg) 8%,transparent)}
#tdl-portal-nav a{display:inline-block;margin:0;padding:4px 0;border:0;background:transparent;color:var(--tdl-portal-fg);font:inherit;text-decoration:none;white-space:normal;opacity:1}
#tdl-portal-nav a:hover{text-decoration:underline;text-underline-offset:4px}
#tdl-portal-nav button{position:static;margin:0;padding:5px 10px;border:1px solid var(--tdl-portal-line);border-radius:5px;background:transparent;color:var(--tdl-portal-fg);font:inherit;cursor:pointer;opacity:1}
#tdl-portal-nav a:focus-visible,#tdl-portal-nav button:focus-visible{outline:2px solid var(--tdl-portal-fg);outline-offset:4px}
@media(prefers-color-scheme:dark){#tdl-portal-nav{--tdl-portal-bg:#0E1418;--tdl-portal-fg:#E3E8EB;--tdl-portal-line:#33414A}}
@media(max-width:480px){#tdl-portal-nav{gap:10px;padding:10px 16px;font-size:12px}#tdl-portal-nav .tdl-portal-links{gap:16px}}
</style>`;

function portalDocument(original, laboratory, language = 'es') {
  // The original standalone document remains complete; only the portal additions are inserted.
  let html = original.replace(/<meta\b[^>]*\bname\s*=\s*["'](?:robots|referrer)["'][^>]*>\s*/gi, '');
  const headAdditions = `\n<meta name="robots" content="noindex, nofollow, noarchive">\n<meta name="referrer" content="no-referrer">\n${portalStyle}\n<script src="${LANGUAGE_CONTROLLER}" defer></script>\n<script src="${CONTROLLER}" defer></script>\n`;
  html = html.replace(/<\/head>/i, `${headAdditions}</head>`);
  const selector = laboratory.id === 'ledalen' ? `<div class="tdl-portal-language" role="group" aria-label="Idioma / Language" data-portal-i18n-aria="nav.language"><button type="button" data-portal-language="es" lang="es" aria-label="Español" aria-pressed="${language === 'es'}">ES</button><button type="button" data-portal-language="en" lang="en" aria-label="English" aria-pressed="${language === 'en'}">EN</button></div>` : '';
  const navigation = `\n<nav id="tdl-portal-nav" aria-label="Navegación de los laboratorios" data-portal-i18n-aria="nav.label">\n  <div class="tdl-portal-links"><a href="../" data-portal-i18n="nav.home">Los triángulos</a><a href="../${laboratory.otherId}/" data-portal-i18n="nav.switch">Cambiar laboratorio</a></div>\n  <div class="tdl-portal-actions">${selector}<button type="button" data-portal-lock data-portal-i18n="nav.lock">Cerrar acceso</button></div>\n</nav>\n`;
  html = html.replace(/<body\b[^>]*>/i, (body) => body.slice(0, -1) + ` data-portal-laboratory="${laboratory.id}" data-portal-content-language="${language}">` + navigation);
  html = html.replace('aria-label="Secciones"', 'aria-label="Secciones" data-portal-i18n-aria="nav.sections"');
  if (laboratory.id === 'ultima-esperanza') {
    html = html.replace('localStorage.getItem("lab-lang")', 'localStorage.getItem("tdl-triangulos-language-v1") || localStorage.getItem("lab-lang")');
    html = html.replace('LANG=saved||((navigator.language||"es").toLowerCase().startsWith("es")?"es":"en");', 'LANG=saved==="en"?"en":"es";');
    const oldSetLang = 'function setLang(l){if(l===LANG)return;LANG=l;try{localStorage.setItem("lab-lang",l)}catch(e){}render()}';
    const newSetLang = 'function setLang(l){if(l!=="es"&&l!=="en")return;const changed=l!==LANG;LANG=l;try{localStorage.setItem("lab-lang",l);localStorage.setItem("tdl-triangulos-language-v1",l)}catch(e){}if(changed)render();window.dispatchEvent(new CustomEvent("tdl-triangle-language",{detail:{language:l}}))}';
    if (!html.includes(oldSetLang)) throw new Error('Cambió el controlador de idioma del Triángulo; revisa la integración antes de publicar.');
    html = html.replace(oldSetLang, newSetLang);
    html = html.replace('$("#lang-es").onclick=()=>setLang("es"); $("#lang-en").onclick=()=>setLang("en");', '$("#lang-es").onclick=()=>setLang("es"); $("#lang-en").onclick=()=>setLang("en"); window.TDLTriangleLanguage={get:()=>LANG,set:setLang}; document.dispatchEvent(new CustomEvent("tdl-triangle-ready"));');
  }
  return html;
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
    process.stdout.write('Uso: node scripts/preparar-triangulos.mjs --source-root <herramientas> --ledalen-en <HTML inglés> --output <triangulos>\nClave: JSON por stdin con el campo password.\n');
    return;
  }
  let password;
  let key;
  try {
    password = await passwordFromStdin();
    const sources = await Promise.all(LABORATORIES.map((lab) => latestStandalone(args.sourceRoot, lab)));
    const english = await readFile(args.english, 'utf8');
    if (!/<html\b[^>]*lang=["']en["']/i.test(english) || !english.includes('id="d-laboratorio"') || !english.includes('window.LAB_ASSETS=')) {
      throw new Error('La versión inglesa de Ledalen debe ser un HTML autónomo completo con lang="en".');
    }
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
    const englishDocument = Buffer.from(portalDocument(english, LABORATORIES[1], 'en'), 'utf8');
    outputs.push({ path: join(args.output, 'ledalen', 'contenido.en.tlab'), bytes: encryptDocument(englishDocument, key, salt, usedIVs) });
    englishDocument.fill(0);
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
