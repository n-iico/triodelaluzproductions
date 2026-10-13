#!/usr/bin/env node
// Prepara la edición Equipo y el Plan de filmación sin publicar fuentes privadas.
// La clave se recibe por stdin como JSON {"password":"…"}; no se guarda.
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const ITERATIONS = 300000;
const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const option = process.argv[i];
  if (!['--source-root', '--output'].includes(option) || !process.argv[i + 1] || args[option]) {
    throw new Error('Usa --source-root <herramientas> y --output <proyecto>.');
  }
  args[option] = resolve(process.argv[i + 1]);
}
if (!args['--source-root'] || !args['--output']) throw new Error('Faltan rutas de origen y salida.');
const sourceRoot = args['--source-root'];
const output = args['--output'];

function replaceOnce(text, needle, replacement) {
  if (text.split(needle).length !== 2) throw new Error(`La salida original cambió: ${needle.slice(0, 70)}`);
  return text.replace(needle, replacement);
}

function navigation(isPlan) {
  const project = isPlan ? '../' : './';
  const plan = isPlan ? './' : 'plan-de-filmacion/';
  const labs = isPlan ? '../../triangulos/' : '../triangulos/';
  return `<nav id="tdl-project-nav" aria-label="Espacios del proyecto" data-project-i18n-aria="nav.spaces">
  <div><a href="${project}" data-project-i18n="nav.project">Sitio del proyecto</a><a href="${plan}" data-project-i18n="nav.plan"${isPlan ? ' aria-current="page"' : ''}>Plan de filmación</a><a href="${labs}" data-project-i18n="nav.labs">Los triángulos</a></div>
  <button type="button" data-project-lock data-project-i18n="nav.lock">Cerrar acceso</button>
</nav>`;
}

const navStyle = `<style id="tdl-project-nav-style">
#tdl-project-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;box-sizing:border-box;margin:0;padding:10px clamp(16px,2.4vw,28px);background:var(--papel,#F2F4F5);color:var(--tinta,#131920);border-bottom:1px solid var(--linea,#C3C8CD);font:500 12px/1.5 "IBM Plex Sans",system-ui,sans-serif}
#tdl-project-nav>div{display:flex;align-items:center;gap:20px;flex-wrap:wrap}
#tdl-project-nav a{color:inherit;text-decoration:none;padding:4px 0;font:inherit}
#tdl-project-nav a:hover,#tdl-project-nav a[aria-current]{text-decoration:underline;text-underline-offset:4px}
#tdl-project-nav button{padding:5px 10px;margin:0;border:1px solid var(--linea,#C3C8CD);border-radius:4px;color:inherit;background:transparent;font:inherit;cursor:pointer}
#tdl-project-nav a:focus-visible,#tdl-project-nav button:focus-visible{outline:2px solid currentColor;outline-offset:3px}
@media(max-width:540px){#tdl-project-nav{font-size:11px}#tdl-project-nav>div{gap:14px}}
</style>`;

function protectDocument(html, isPlan) {
  if (!/^\s*<!doctype html>/i.test(html) || !html.includes('</head>') || !/<body\b/.test(html)) {
    throw new Error('El origen no es un documento web completo.');
  }
  html = html.replace(/<meta\b[^>]*name=["'](?:robots|referrer)["'][^>]*>\s*/gi, '');
  const prefix = isPlan ? '../' : '';
  const head = `<meta name="robots" content="noindex,nofollow,noarchive,nosnippet,noimageindex">\n<meta name="referrer" content="no-referrer">\n${navStyle}\n<script src="${prefix}idioma.js?v=20261013-2" defer></script>\n<script src="${prefix}acceso.js?v=20261013-2" defer></script>\n`;
  html = replaceOnce(html, '</head>', head + '</head>');
  html = html.replace(/<body\b([^>]*)>/, `<body$1 data-document="${isPlan ? 'plan-de-filmacion' : 'proyecto'}">${navigation(isPlan)}`);
  return html;
}

async function projectDocument(plan) {
  const source = join(sourceRoot, 'sitio', 'salida', 'web', 'equipo');
  let html = await readFile(join(source, 'index.html'), 'utf8');
  const dataMatch = html.match(/<script type="application\/json" id="datos">([\s\S]*?)<\/script>/);
  if (!dataMatch) throw new Error('Faltan los datos de la Biblia del proyecto.');
  const data = JSON.parse(dataMatch[1]);
  if (data.edicion.clave !== 'equipo') throw new Error('Solo se publica la edición Equipo.');
  for (const item of data.externos) {
    if (item.url === 'https://claude.ai/artifact/4hwhraYEzjDoNK3Qyu3sXm') item.url = '../triangulos/ultima-esperanza/';
    if (item.url === 'https://claude.ai/artifact/PdcWUdTXUCu5UGBd4vbNLR') item.url = '../triangulos/ledalen/';
  }
  const date = plan.date;
  const dateES = new Intl.DateTimeFormat('es-CL', {day:'numeric', month:'long', year:'numeric', timeZone:'UTC'}).format(new Date(date + 'T12:00:00Z'));
  const dateEN = new Intl.DateTimeFormat('en-GB', {day:'numeric', month:'long', year:'numeric', timeZone:'UTC'}).format(new Date(date + 'T12:00:00Z'));
  data.externos = data.externos.filter(item => !item.url?.startsWith('plan-de-filmacion/'));
  data.externos.unshift({
    titulo: 'Plan de filmación', titulo_en: 'Filming plan', url: 'plan-de-filmacion/',
    area: 'produccion', capa: 3, tipo: 'Rodaje', tipo_en: 'Shoot',
    desc: `Calendario de salidas y jornadas del documental. Foto del tablero al ${dateES}; los cambios quedan en tu navegador.`,
    desc_en: `The documentary’s outings and shooting schedule. Snapshot of the board on ${dateEN}; changes stay in your browser.`,
  });
  const paths = [...new Set(dataMatch[1].match(/img\/[A-Za-z0-9_.-]+/g) || [])];
  const images = {};
  for (const path of paths) {
    if (!/\.jpe?g$/i.test(path)) throw new Error('Tipo de fotografía no previsto.');
    images[path] = (await readFile(join(source, path))).toString('base64');
  }
  const dataJson = JSON.stringify(data).replace(/<\//g, '<\\/');
  const imageBootstrap = `<script type="application/json" id="tdl-project-images">${JSON.stringify(images)}</script>
<script>
(() => {
  const element = document.getElementById('tdl-project-images');
  const encoded = JSON.parse(element.textContent);
  const urls = {};
  for (const [path, value] of Object.entries(encoded)) {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    urls[path] = URL.createObjectURL(new Blob([bytes], {type:'image/jpeg'}));
  }
  const data = document.getElementById('datos');
  data.textContent = data.textContent.replace(/img\\/[A-Za-z0-9_.-]+/g, path => {
    if (!urls[path]) throw new Error('Falta una fotografía del proyecto.');
    return urls[path];
  });
  element.remove();
  window.addEventListener('pagehide', event => {
    if (!event.persisted) Object.values(urls).forEach(url => URL.revokeObjectURL(url));
  });
})();
</script>`;
  html = replaceOnce(html, dataMatch[0], `<script type="application/json" id="datos">${dataJson}</script>\n${imageBootstrap}`);
  // Keep the plan in this tab so the shared access session follows navigation.
  html = replaceOnce(html, '<a href="${esc(x.url)}" target="_blank" rel="noopener">', '<a href="${esc(x.url)}" ${x.url.startsWith(\'plan-de-filmacion/\') ? \'\' : \'target="_blank" rel="noopener"\'}>');
  const homeEntry = "${tx('Inicio', 'Home')}</a></li>`;";
  html = replaceOnce(html, homeEntry, "${tx('Inicio', 'Home')}</a></li><li><a href=\"plan-de-filmacion/\"><span class=\"pt\" style=\"--c:var(--brasa)\"></span>${tx('Plan de filmación', 'Filming plan')}</a></li>`;");
  html = html.replaceAll('https://claude.ai/artifact/4hwhraYEzjDoNK3Qyu3sXm', '../triangulos/ultima-esperanza/')
    .replaceAll('https://claude.ai/artifact/PdcWUdTXUCu5UGBd4vbNLR', '../triangulos/ledalen/');
  return {html: protectDocument(html, false), imageCount: paths.length, version: data.edicion.version};
}

async function planDocument() {
  const directory = join(sourceRoot, 'tablero-rodaje', 'compartir');
  const candidates = (await readdir(directory)).map(name => {
    const match = name.normalize('NFC').match(/^OVNI al fin del mundo — Tablero de rodaje v([\d.]+) \(Dirección y producción\) (\d{4}-\d{2}-\d{2})\.html$/);
    return match && {name, version: match[1], date: match[2]};
  }).filter(Boolean);
  candidates.sort((a, b) => b.date.localeCompare(a.date) || b.version.localeCompare(a.version, undefined, {numeric:true}));
  if (!candidates.length) throw new Error('No hay Plan de filmación autónomo.');
  const selected = candidates[0];
  let html = await readFile(join(directory, selected.name), 'utf8');
  if (!html.includes('id="d-plan"') || !html.includes('id="d-cielo"')) throw new Error('Faltan datos del plan.');
  html = replaceOnce(html, '<h1>Plan de rodaje</h1>', '<h1>Plan de filmación</h1>');
  return {html: protectDocument(html, true), ...selected};
}

function encrypt(html, key, salt) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const iterations = Buffer.alloc(4);
  iterations.writeUInt32BE(ITERATIONS);
  const content = Buffer.from(html, 'utf8');
  const encrypted = Buffer.concat([cipher.update(content), cipher.final()]);
  content.fill(0);
  return Buffer.concat([Buffer.from('TDL2'), iterations, salt, iv, encrypted, cipher.getAuthTag()]);
}

async function writeAtomic(path, bytes) {
  await mkdir(dirname(path), {recursive:true});
  const temporary = path + '.' + randomBytes(8).toString('hex') + '.tmp';
  try {
    await writeFile(temporary, bytes, {flag:'wx'});
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch(error => {if(error.code !== 'ENOENT') throw error;});
  }
}

let key;
let password;
try {
  if (process.stdin.isTTY) throw new Error('Envía la clave por stdin como JSON.');
  let input = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 65536) throw new Error('Entrada demasiado grande.');
  }
  let parsed;
  try { parsed = JSON.parse(input); } catch { throw new Error('La entrada debe ser JSON con el campo password.'); }
  input = '';
  if (typeof parsed.password !== 'string' || !parsed.password) throw new Error('Falta la clave.');
  password = Buffer.from(parsed.password);
  parsed.password = '';
  const plan = await planDocument();
  const project = await projectDocument(plan);
  const salt = randomBytes(16);
  key = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
  password.fill(0);
  const files = [
    [join(output, 'contenido.tlab'), encrypt(project.html, key, salt)],
    [join(output, 'plan-de-filmacion', 'contenido.tlab'), encrypt(plan.html, key, salt)],
  ];
  for (const [path, bytes] of files) await writeAtomic(path, bytes);
  console.log(`Sitio del proyecto v${project.version}: ${project.imageCount} fotografías protegidas.`);
  console.log(`Plan de filmación v${plan.version}, ${plan.date}.`);
  for (const [path, bytes] of files) console.log(`${path}: ${bytes.length} bytes cifrados.`);
} finally {
  password?.fill(0);
  key?.fill(0);
}
