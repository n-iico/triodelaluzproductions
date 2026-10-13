(() => {
  "use strict";

  const root = new URL(".", document.currentScript.src);
  const sessionName = "tdl-proyecto-session-v1";
  const lifetime = 8 * 60 * 60 * 1000;
  const documents = new Map([
    ["proyecto", "contenido.tlab"],
    ["plan-de-filmacion", "plan-de-filmacion/contenido.tlab"]
  ]);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const view = document.body.dataset.view;
  const documentId = documents.has(document.body.dataset.document)
    ? document.body.dataset.document
    : location.pathname.startsWith(new URL("plan-de-filmacion/", root).pathname)
      ? "plan-de-filmacion" : "proyecto";
  let expiryTimer;

  function encode(bytes) {
    return btoa(String.fromCharCode(...bytes));
  }

  function decode(value) {
    return Uint8Array.from(atob(value), char => char.charCodeAt(0));
  }

  function readSession() {
    try {
      const session = JSON.parse(sessionStorage.getItem(sessionName));
      if (!session || typeof session.key !== "string" || decode(session.key).length !== 32 ||
          typeof session.salt !== "string" || decode(session.salt).length !== 16 ||
          !Number.isFinite(session.createdAt) || Date.now() - session.createdAt >= lifetime ||
          session.createdAt > Date.now()) return null;
      return session;
    } catch {
      return null;
    }
  }

  function clearSession() {
    try { sessionStorage.removeItem(sessionName); } catch { /* The next visit will require the key. */ }
  }

  function gateUrl() {
    const target = new URL(documentId === "plan-de-filmacion" ? "plan-de-filmacion/" : ".", root);
    target.hash = location.hash;
    return target;
  }

  function lock() {
    clearSession();
    document.documentElement.style.visibility = "hidden";
    location.replace(gateUrl());
  }

  function watchSession() {
    const session = readSession();
    if (!session) return lock();
    clearTimeout(expiryTimer);
    expiryTimer = setTimeout(lock, Math.max(1, session.createdAt + lifetime - Date.now()));
  }

  // The original document includes this controller after decryption.
  if (view !== "gate") {
    document.querySelectorAll("[data-project-lock]").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        lock();
      });
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) watchSession();
    });
    window.addEventListener("pageshow", watchSession);
    watchSession();
    return;
  }

  const form = document.getElementById("gate");
  const field = document.getElementById("password");
  const button = document.getElementById("submit");
  const status = document.getElementById("status");
  const show = document.getElementById("show-password");
  const buttonText = button.innerHTML;
  const documentName = documentId === "plan-de-filmacion" ? "el plan de filmación" : "el sitio del proyecto";
  let contentPromise;

  if (!window.crypto?.subtle) {
    status.textContent = "Abre esta página con una conexión HTTPS para ingresar.";
    button.disabled = true;
    return;
  }

  async function payload() {
    let response;
    try {
      response = await fetch(new URL(documents.get(documentId), root), { cache: "no-store" });
    } catch {
      throw new Error("unavailable");
    }
    if (!response.ok) throw new Error("unavailable");
    let bytes;
    try {
      bytes = new Uint8Array(await response.arrayBuffer());
    } catch {
      throw new Error("unavailable");
    }
    if (bytes.length < 53 || String.fromCharCode(...bytes.subarray(0, 4)) !== "TDL2") throw new Error("invalid-content");
    const iterations = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, false);
    if (iterations < 100000 || iterations > 2000000) throw new Error("invalid-content");
    return { iterations, salt: bytes.subarray(8, 24), iv: bytes.subarray(24, 36), content: bytes.subarray(36) };
  }

  const content = () => contentPromise ??= payload().catch(error => {
    contentPromise = undefined;
    throw error;
  });

  async function decrypt(data, key) {
    const bytes = await crypto.subtle.decrypt({ name: "AES-GCM", iv: data.iv, tagLength: 128 }, key, data.content);
    let html;
    try { html = decoder.decode(bytes); } catch { throw new Error("invalid-content"); }
    if (!/^\s*<!doctype html>/i.test(html) || !/<html[\s>]/i.test(html) || !/<body[\s>]/i.test(html)) {
      throw new Error("invalid-content");
    }
    return html;
  }

  async function sessionKey(session, data) {
    if (session.salt !== encode(data.salt)) throw new Error("session-expired");
    return crypto.subtle.importKey("raw", decode(session.key), "AES-GCM", false, ["decrypt"]);
  }

  function openDocument(html) {
    if (!readSession()) throw new Error("session-expired");
    // Writing in place keeps the original route and any deep link in its hash.
    document.open();
    document.write(html);
    document.close();
  }

  function showError(error, resuming = false) {
    if (error.message === "unavailable") {
      status.textContent = "No se pudo cargar el contenido. Revisa tu conexión e inténtalo de nuevo.";
    } else if (error.message === "storage-unavailable") {
      status.textContent = "Permite el almacenamiento de esta página en tu navegador para mantener el acceso al proyecto y al plan de filmación.";
    } else if (error.message === "invalid-content") {
      status.textContent = "El contenido no está disponible. Recarga la página e inténtalo de nuevo.";
      contentPromise = undefined;
    } else if (resuming || error.message === "session-expired") {
      clearSession();
      status.textContent = "Tu acceso terminó. Ingresa la clave del proyecto para continuar.";
    } else {
      status.textContent = "La clave no es correcta. Revisa la clave compartida por el equipo.";
      field.setAttribute("aria-invalid", "true");
      field.value = "";
    }
  }

  function busy(active, message = "") {
    button.disabled = active;
    form.setAttribute("aria-busy", String(active));
    if (active) button.textContent = "Abriendo " + documentName + "…";
    else button.innerHTML = buttonText;
    if (message) status.textContent = message;
  }

  show.addEventListener("click", () => {
    const visible = field.type === "password";
    field.type = visible ? "text" : "password";
    show.textContent = visible ? "Ocultar" : "Mostrar";
    show.setAttribute("aria-label", visible ? "Ocultar clave" : "Mostrar clave");
    show.setAttribute("aria-pressed", String(visible));
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!field.value || button.disabled) return;
    busy(true, "Verificando la clave…");
    field.removeAttribute("aria-invalid");
    try {
      const data = await content();
      const material = await crypto.subtle.importKey("raw", encoder.encode(field.value), "PBKDF2", false, ["deriveKey"]);
      const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: data.salt, iterations: data.iterations, hash: "SHA-256" }, material,
        { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
      const html = await decrypt(data, key);
      const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
      try {
        sessionStorage.setItem(sessionName, JSON.stringify({ key: encode(raw), salt: encode(data.salt), createdAt: Date.now() }));
      } catch {
        throw new Error("storage-unavailable");
      }
      field.value = "";
      openDocument(html);
    } catch (error) {
      showError(error);
      busy(false);
      field.focus();
    }
  });

  async function resume() {
    const session = readSession();
    if (!session || button.disabled) return;
    busy(true, "Recuperando el acceso…");
    try {
      const data = await content();
      const html = await decrypt(data, await sessionKey(session, data));
      openDocument(html);
    } catch (error) {
      showError(error, true);
      busy(false);
    }
  }

  window.addEventListener("pageshow", event => {
    if (event.persisted) resume();
  });
  resume();
})();
