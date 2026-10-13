(() => {
  "use strict";

  const root = new URL(".", document.currentScript.src);
  const sessionName = "tdl-triangulos-session-v1";
  const lifetime = 8 * 60 * 60 * 1000;
  const laboratories = new Set(["ultima-esperanza", "ledalen"]);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const view = document.body.dataset.view;
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
    try { sessionStorage.removeItem(sessionName); } catch { /* Access will require the key again. */ }
  }

  function home(laboratory) {
    const target = new URL(root);
    if (laboratories.has(laboratory)) target.searchParams.set("abrir", laboratory);
    return target;
  }

  function lock() {
    clearSession();
    document.documentElement.style.visibility = "hidden";
    location.replace(home());
  }

  function watchSession() {
    const session = readSession();
    if (!session) return lock();
    clearTimeout(expiryTimer);
    expiryTimer = setTimeout(lock, Math.max(1, session.createdAt + lifetime - Date.now()));
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && expiryTimer) watchSession();
  });

  document.querySelectorAll("[data-portal-lock]").forEach(button => button.addEventListener("click", lock));

  // Recheck pages restored by browser Back, including decrypted laboratory documents.
  window.addEventListener("pageshow", event => {
    if (event.persisted && !readSession()) {
      document.documentElement.style.visibility = "hidden";
      location.replace(home(view === "laboratory" ? document.body.dataset.laboratory : undefined));
    }
  });

  // This same script is included in the original laboratory after decryption.
  if (view !== "portal" && view !== "laboratory") {
    if (!readSession()) {
      document.documentElement.style.visibility = "hidden";
      location.replace(home());
    } else {
      watchSession();
    }
    return;
  }

  async function payload(path) {
    let response;
    try {
      response = await fetch(new URL(path, root), { cache: "no-store" });
    } catch {
      throw new Error("unavailable");
    }
    if (!response.ok) throw new Error("unavailable");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 53 || decoder.decode(bytes.subarray(0, 4)) !== "TDL2") throw new Error("invalid-content");
    const iterations = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, false);
    if (iterations < 100000 || iterations > 2000000) throw new Error("invalid-content");
    return { iterations, salt: bytes.subarray(8, 24), iv: bytes.subarray(24, 36), content: bytes.subarray(36) };
  }

  async function decrypt(data, key) {
    return decoder.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: data.iv, tagLength: 128 }, key, data.content));
  }

  async function sessionKey(session, data) {
    if (session.salt !== encode(data.salt)) throw new Error("session-expired");
    return crypto.subtle.importKey("raw", decode(session.key), "AES-GCM", false, ["decrypt"]);
  }

  function showPortal() {
    watchSession();
    const next = new URL(location.href).searchParams.get("abrir");
    if (laboratories.has(next)) {
      location.replace(new URL(next + "/", root));
      return;
    }
    document.getElementById("access").hidden = true;
    document.getElementById("portal").hidden = false;
    const heading = document.querySelector("#portal h1");
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }

  function validateCatalog(text) {
    const catalog = JSON.parse(text);
    if (catalog.version !== 1 || !Array.isArray(catalog.laboratories) ||
        catalog.laboratories.length !== 2 || ![...laboratories].every(id => catalog.laboratories.includes(id))) {
      throw new Error("invalid-content");
    }
  }

  async function openLaboratory() {
    const id = document.body.dataset.laboratory;
    if (!laboratories.has(id)) return location.replace(home());
    const session = readSession();
    if (!session) return location.replace(home(id));
    try {
      const data = await payload(id + "/contenido.tlab");
      const key = await sessionKey(session, data);
      const html = await decrypt(data, key);
      if (!readSession()) return location.replace(home(id));
      document.open();
      document.write(html);
      document.close();
    } catch (error) {
      if (error.message === "unavailable") {
        document.getElementById("loading-status").textContent = "No se pudo cargar el laboratorio. Revisa tu conexión y vuelve a intentarlo.";
        return;
      }
      clearSession();
      location.replace(home(id));
    }
  }

  if (!window.crypto?.subtle) {
    const status = document.getElementById(view === "portal" ? "status" : "loading-status");
    status.textContent = "Abre esta página con una conexión HTTPS para ingresar.";
    const submit = document.getElementById("submit");
    if (submit) submit.disabled = true;
    return;
  }

  if (view === "laboratory") {
    openLaboratory();
    return;
  }

  const form = document.getElementById("gate");
  const field = document.getElementById("password");
  const button = document.getElementById("submit");
  const status = document.getElementById("status");
  const show = document.getElementById("show-password");
  const buttonText = button.innerHTML;
  let catalogPromise;
  const catalog = () => catalogPromise ??= payload("catalogo.tlab").catch(error => {
    catalogPromise = undefined;
    throw error;
  });

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
    button.disabled = true;
    button.textContent = "Abriendo los laboratorios…";
    status.textContent = "Verificando la clave…";
    field.removeAttribute("aria-invalid");
    try {
      const data = await catalog();
      const material = await crypto.subtle.importKey("raw", encoder.encode(field.value), "PBKDF2", false, ["deriveKey"]);
      const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: data.salt, iterations: data.iterations, hash: "SHA-256" }, material,
        { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
      validateCatalog(await decrypt(data, key));
      const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
      try {
        sessionStorage.setItem(sessionName, JSON.stringify({ key: encode(raw), salt: encode(data.salt), createdAt: Date.now() }));
      } catch {
        throw new Error("storage-unavailable");
      }
      field.value = "";
      field.type = "password";
      show.textContent = "Mostrar";
      show.setAttribute("aria-label", "Mostrar clave");
      show.setAttribute("aria-pressed", "false");
      status.textContent = "";
      showPortal();
    } catch (error) {
      if (error.message === "unavailable") {
        status.textContent = "No se pudo cargar el contenido. Revisa tu conexión e inténtalo de nuevo.";
      } else if (error.message === "storage-unavailable") {
        status.textContent = "Permite el almacenamiento de esta página en tu navegador para mantener el acceso entre laboratorios.";
      } else if (error.message === "invalid-content") {
        status.textContent = "El contenido no está disponible. Recarga la página e inténtalo de nuevo.";
        catalogPromise = undefined;
      } else {
        status.textContent = "La clave no es correcta. Revisa la clave compartida por el equipo.";
        field.setAttribute("aria-invalid", "true");
        field.value = "";
      }
      field.focus();
    } finally {
      button.disabled = false;
      button.innerHTML = buttonText;
    }
  });

  async function resume() {
    const session = readSession();
    if (!session) return;
    button.disabled = true;
    status.textContent = "Recuperando el acceso…";
    try {
      const data = await catalog();
      validateCatalog(await decrypt(data, await sessionKey(session, data)));
      if (readSession()) showPortal();
    } catch (error) {
      if (error.message === "unavailable") {
        status.textContent = "No se pudo cargar el contenido. Revisa tu conexión e inténtalo de nuevo.";
      } else {
        clearSession();
        status.textContent = "Ingresa la clave del equipo para abrir los laboratorios.";
      }
    } finally {
      button.disabled = false;
    }
  }
  resume();
})();
