#!/usr/bin/env node
// Reconstruye desde los originales y sustituye solo los dos documentos cifrados.
// Recibe la clave mediante stdin JSON; nunca la escribe a disco, argumentos o entorno.
import { createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scripts = dirname(fileURLToPath(import.meta.url));
const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const name = process.argv[i];
  if (!['--source-root', '--output', '--python', '--plan-version'].includes(name) ||
      !process.argv[i + 1] || args[name]) {
    throw new Error('Usa --source-root <herramientas> --output <proyecto> [--python <python3>] [--plan-version <versión>].');
  }
  args[name] = process.argv[i + 1];
}
if (!args['--source-root'] || !args['--output']) throw new Error('Faltan las rutas de origen y salida.');
const sourceRoot = resolve(args['--source-root']);
const output = resolve(args['--output']);

function ejecutar(executable, arguments_, input) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, arguments_, {
      stdio: ['pipe', 'inherit', 'inherit'],
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }
    });
    let stdinError;
    child.stdin.on('error', error => { stdinError = error; });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0 && !stdinError) resolvePromise();
      else reject(new Error(`No se pudo completar la reconstrucción (${signal || code || stdinError?.code}).`));
    });
    child.stdin.end(input);
  });
}

function verificar(payload, password, expectedSalt) {
  if (payload.length < 53 || payload.subarray(0, 4).toString() !== 'TDL2') {
    throw new Error('La reconstrucción no produjo un documento cifrado válido.');
  }
  const iterations = payload.readUInt32BE(4);
  if (iterations < 100000 || iterations > 2000000) throw new Error('Parámetros de protección no válidos.');
  const salt = payload.subarray(8, 24);
  if (expectedSalt && !salt.equals(expectedSalt)) throw new Error('Los documentos no comparten la misma protección.');
  const key = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  let plaintext;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, payload.subarray(24, 36));
    decipher.setAuthTag(payload.subarray(-16));
    plaintext = Buffer.concat([decipher.update(payload.subarray(36, -16)), decipher.final()]);
    if (!/^\s*<!doctype html>/i.test(plaintext.toString('utf8'))) throw new Error('El contenido reconstruido no es una página web.');
    return Buffer.from(salt);
  } finally {
    key.fill(0);
    plaintext?.fill(0);
  }
}

async function escribirAtomico(path, payload) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomBytes(8).toString('hex')}.tmp`;
  try {
    await writeFile(temporary, payload, { flag: 'wx' });
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

let temporaryRoot;
let password;
let input;
try {
  if (process.stdin.isTTY) throw new Error('Envía la clave por stdin como JSON {"password":"…"}.');
  let json = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    json += chunk;
    if (json.length > 65536) throw new Error('Entrada demasiado grande.');
  }
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('La entrada debe ser JSON válido con el campo password.');
  }
  json = '';
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
      typeof parsed.password !== 'string' || !parsed.password) throw new Error('Falta la clave.');
  password = Buffer.from(parsed.password, 'utf8');
  input = Buffer.from(JSON.stringify({ password: parsed.password }), 'utf8');
  parsed.password = '';

  temporaryRoot = await mkdtemp('/private/tmp/tdl-actualizar-proyecto-');
  const stagingRoot = join(temporaryRoot, 'originales');
  await mkdir(stagingRoot);
  const regenerationArgs = [
    '-B', join(scripts, 'regenerar-proyecto.py'), '--source-root', sourceRoot, '--staging-root', stagingRoot
  ];
  if (args['--plan-version']) regenerationArgs.push('--plan-version', args['--plan-version']);
  await ejecutar(args['--python'] || 'python3', regenerationArgs);
  const encrypted = join(temporaryRoot, 'cifrados');
  await ejecutar(process.execPath, [
    join(scripts, 'preparar-proyecto.mjs'), '--source-root', join(stagingRoot, 'herramientas'), '--output', encrypted
  ], input);
  input.fill(0);

  const relativePaths = ['contenido.tlab', join('plan-de-filmacion', 'contenido.tlab')];
  const payloads = await Promise.all(relativePaths.map(path => readFile(join(encrypted, path))));
  const salt = verificar(payloads[0], password);
  verificar(payloads[1], password, salt);
  // Ambos se verifican antes de sustituir cualquier documento publicado.
  for (let i = 0; i < relativePaths.length; i++) {
    await escribirAtomico(join(output, relativePaths[i]), payloads[i]);
  }
  console.log('Proyecto y plan reconstruidos y protegidos. Solo se actualizaron los dos archivos contenido.tlab.');
  console.log('Los originales permanecen intactos. La publicación se realiza como un paso separado.');
} finally {
  password?.fill(0);
  input?.fill(0);
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
}
