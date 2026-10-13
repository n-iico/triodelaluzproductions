(() => {
  "use strict";

  const storageName = "tdl-triangulos-language-v1";
  const languages = new Set(["es", "en"]);
  const copy = {
    es: {
      "access.heading": "Dos triángulos.<br>Una investigación.",
      "access.intro": "Última Esperanza y Ledalen: un punto de entrada a los dos laboratorios del documental.",
      "access.passwordLabel": "Clave de acceso del equipo",
      "access.showPassword": "Mostrar",
      "access.hidePassword": "Ocultar",
      "access.showPasswordAria": "Mostrar clave",
      "access.hidePasswordAria": "Ocultar clave",
      "access.enter": "Entrar a los laboratorios",
      "access.opening": "Abriendo los laboratorios…",
      "access.note": "Una sola clave para ambos. El acceso se mantiene mientras recorres las páginas en esta pestaña.",
      "portal.title": "Los triángulos · OVNI al fin del mundo",
      "portal.chileTitle": "Triángulo de Última Esperanza · OVNI al fin del mundo",
      "portal.norwayTitle": "Triángulo de Ledalen · OVNI al fin del mundo",
      "portal.team": "Espacio del equipo",
      "portal.documentary": "OVNI al fin del mundo",
      "portal.mapChile": "CHILE",
      "portal.mapNorway": "NORUEGA",
      "portal.eyebrow": "OVNI al fin del mundo · Laboratorios",
      "portal.heading": "Los triángulos",
      "portal.intro": "Dos territorios, dos casos. Elige el laboratorio que quieres explorar.",
      "portal.chileLocation": "Patagonia · Chile",
      "portal.chileCaption": "Laboratorio del Triángulo",
      "portal.chileHeading": "Triángulo de<br>Última Esperanza",
      "portal.chileIntro": "Explora el sitio, sus medidas, el registro visual y las hipótesis de trabajo.",
      "portal.norwayLocation": "Holtålen · Noruega",
      "portal.norwayCaption": "Laboratorio de Ledalen",
      "portal.norwayHeading": "Triángulo<br>de Ledalen",
      "portal.norwayIntro": "Explora los relatos, la forma, el terreno, el clima y las hipótesis de trabajo.",
      "portal.note": "Puedes volver a esta portada o cambiar de laboratorio desde cualquiera de las dos páginas.",
      "portal.footer": "Material de investigación · Acceso del equipo",
      "nav.mainSite": "Trío de la Luz Productions, sitio principal",
      "nav.language": "Idioma de la página",
      "nav.lock": "Cerrar acceso",
      "nav.openLaboratory": "Abrir laboratorio",
      "nav.back": "Volver a los triángulos",
      "nav.home": "Los triángulos",
      "nav.label": "Navegación de los laboratorios",
      "nav.sections": "Secciones",
      "nav.switchUltima": "Ir a Última Esperanza",
      "nav.switchLedalen": "Ir a Ledalen",
      "status.loading": "Abriendo el laboratorio…",
      "status.checking": "Verificando la clave…",
      "status.resume": "Recuperando el acceso…",
      "status.incorrect": "La clave no es correcta. Revisa la clave compartida por el equipo.",
      "status.unavailable": "No se pudo cargar el contenido. Revisa tu conexión e inténtalo de nuevo.",
      "status.unavailableLab": "No se pudo cargar el laboratorio. Revisa tu conexión y vuelve a intentarlo.",
      "status.storage": "Permite el almacenamiento de esta página en tu navegador para mantener el acceso entre laboratorios.",
      "status.invalidContent": "El contenido no está disponible. Recarga la página e inténtalo de nuevo.",
      "status.secureContext": "Abre esta página con una conexión HTTPS para ingresar.",
      "status.needKey": "Ingresa la clave del equipo para abrir los laboratorios."
    },
    en: {
      "access.heading": "Two triangles.<br>One investigation.",
      "access.intro": "Última Esperanza and Ledalen: one gateway to the documentary’s two laboratories.",
      "access.passwordLabel": "Team access password",
      "access.showPassword": "Show",
      "access.hidePassword": "Hide",
      "access.showPasswordAria": "Show password",
      "access.hidePasswordAria": "Hide password",
      "access.enter": "Enter the laboratories",
      "access.opening": "Opening the laboratories…",
      "access.note": "One password for both. Access stays active as you explore the pages in this tab.",
      "portal.title": "The triangles · UFO at the End of the World",
      "portal.chileTitle": "Última Esperanza Triangle · UFO at the End of the World",
      "portal.norwayTitle": "Ledalen Triangle · UFO at the End of the World",
      "portal.team": "Team workspace",
      "portal.documentary": "UFO at the End of the World",
      "portal.mapChile": "CHILE",
      "portal.mapNorway": "NORWAY",
      "portal.eyebrow": "UFO at the End of the World · Laboratories",
      "portal.heading": "The triangles",
      "portal.intro": "Two territories, two cases. Choose the laboratory you want to explore.",
      "portal.chileLocation": "Patagonia · Chile",
      "portal.chileCaption": "Triangle Laboratory",
      "portal.chileHeading": "Última Esperanza<br>Triangle",
      "portal.chileIntro": "Explore the site, its measurements, the visual record and the working hypotheses.",
      "portal.norwayLocation": "Holtålen · Norway",
      "portal.norwayCaption": "Ledalen Laboratory",
      "portal.norwayHeading": "Ledalen<br>Triangle",
      "portal.norwayIntro": "Explore the accounts, shape, terrain, weather and working hypotheses.",
      "portal.note": "You can return to this gateway or switch laboratories from either page.",
      "portal.footer": "Research material · Team access",
      "nav.mainSite": "Trío de la Luz Productions, main website",
      "nav.language": "Page language",
      "nav.lock": "Sign out",
      "nav.openLaboratory": "Open laboratory",
      "nav.back": "Back to the triangles",
      "nav.home": "The triangles",
      "nav.label": "Laboratory navigation",
      "nav.sections": "Sections",
      "nav.switchUltima": "Go to Última Esperanza",
      "nav.switchLedalen": "Go to Ledalen",
      "status.loading": "Opening the laboratory…",
      "status.checking": "Checking the password…",
      "status.resume": "Restoring access…",
      "status.incorrect": "The password is incorrect. Check the password shared by the team.",
      "status.unavailable": "The content could not be loaded. Check your connection and try again.",
      "status.unavailableLab": "The laboratory could not be loaded. Check your connection and try again.",
      "status.storage": "Allow this page to use browser storage to keep access active between laboratories.",
      "status.invalidContent": "The content is unavailable. Reload the page and try again.",
      "status.secureContext": "Open this page over an HTTPS connection to enter.",
      "status.needKey": "Enter the team password to open the laboratories."
    }
  };

  let language = "es";
  function savedLanguage() {
    let saved;
    try {
      saved = localStorage.getItem(storageName);
    } catch { /* The session copy still keeps language choices between pages. */ }
    if (!languages.has(saved)) {
      try { saved = sessionStorage.getItem(storageName); } catch { /* Keep the memory fallback. */ }
    }
    return languages.has(saved) ? saved : language;
  }
  language = savedLanguage();

  function translate(key) {
    if (key === "nav.switch") {
      const laboratory = document.body.dataset.portalLaboratory || document.body.dataset.laboratory;
      key = laboratory === "ledalen" ? "nav.switchUltima" : "nav.switchLedalen";
    }
    return copy[language][key] ?? copy.es[key] ?? key;
  }

  function apply() {
    document.documentElement.lang = language;
    document.querySelectorAll("[data-portal-i18n]").forEach(element => {
      element.textContent = translate(element.dataset.portalI18n);
    });
    document.querySelectorAll("[data-portal-i18n-html]").forEach(element => {
      // HTML translations are local, authored strings containing only line breaks.
      element.innerHTML = translate(element.dataset.portalI18nHtml);
    });
    document.querySelectorAll("[data-portal-i18n-aria]").forEach(element => {
      element.setAttribute("aria-label", translate(element.dataset.portalI18nAria));
    });
    document.querySelectorAll("[data-portal-language]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.portalLanguage === language));
    });
    const view = document.body.dataset.view;
    if (view === "portal") document.title = translate("portal.title");
    if (view === "laboratory") {
      document.title = translate(document.body.dataset.laboratory === "ledalen" ? "portal.norwayTitle" : "portal.chileTitle");
    }
  }

  function announce() {
    window.dispatchEvent(new CustomEvent("tdl-portal-language", { detail: { language } }));
  }

  function set(next) {
    if (!languages.has(next)) return language;
    language = next;
    try { localStorage.setItem(storageName, language); } catch { /* Keep the choice in memory when storage is unavailable. */ }
    try { sessionStorage.setItem(storageName, language); } catch { /* Local storage may still be available. */ }
    apply();
    announce();
    return language;
  }

  window.TDLPortalLanguage = { get: () => language, set, translate, apply };
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-portal-language]");
    if (button) set(button.dataset.portalLanguage);
  });
  window.addEventListener("storage", event => {
    if (event.key !== storageName || !languages.has(event.newValue)) return;
    language = event.newValue;
    apply();
    announce();
  });
  window.addEventListener("pageshow", () => {
    const previous = language;
    language = savedLanguage();
    apply();
    if (previous !== language) announce();
  });
  apply();
})();
