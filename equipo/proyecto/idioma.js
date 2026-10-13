(() => {
  "use strict";

  // The original project site uses this preference too, so the chosen language
  // carries through the password page into the project itself.
  const storageName = "biblia.lang";
  const languages = new Set(["es", "en"]);
  let language = window.TDLProjectLanguage?.get() === "en" ? "en" : "es";
  const copy = {
    es: {
      "nav.mainSite": "Trío de la Luz Productions, sitio principal",
      "nav.language": "Idioma de la página",
      "nav.spaces": "Espacios del proyecto",
      "nav.project": "Sitio del proyecto",
      "nav.plan": "Plan de filmación",
      "nav.labs": "Los triángulos",
      "nav.lock": "Cerrar acceso",
      "access.skip": "Ir al acceso",
      "access.team": "Espacio del equipo",
      "access.documentary": "OVNI al fin del mundo",
      "access.passwordLabel": "Clave de acceso del proyecto",
      "access.showPassword": "Mostrar",
      "access.hidePassword": "Ocultar",
      "access.showPasswordAria": "Mostrar clave",
      "access.hidePasswordAria": "Ocultar clave",
      "project.title": "Sitio del proyecto · OVNI al fin del mundo",
      "project.heading": "Sitio del<br>proyecto",
      "project.art": "EL DOCUMENTAL",
      "project.intro": "La película, su investigación y su desarrollo. Un espacio de trabajo para el equipo del documental.",
      "project.enter": "Entrar al proyecto",
      "project.opening": "Abriendo el sitio del proyecto…",
      "project.note": "Una sola clave para el proyecto y el plan de filmación. El acceso dura ocho horas en esta pestaña.",
      "project.footer": "Material del proyecto · Acceso del equipo",
      "plan.title": "Plan de filmación · OVNI al fin del mundo",
      "plan.heading": "Plan de<br>filmación",
      "plan.art": "LA FILMACIÓN",
      "plan.intro": "El calendario y las jornadas del documental. Consulta el plan de rodaje del equipo de dirección y producción.",
      "plan.enter": "Abrir el plan de filmación",
      "plan.opening": "Abriendo el plan de filmación…",
      "plan.note": "La misma clave del sitio del proyecto. El acceso dura ocho horas en esta pestaña. El contenido del plan está en español.",
      "plan.footer": "Material de producción · Acceso del equipo",
      "status.required": "Ingresa la clave de acceso del proyecto.",
      "status.checking": "Verificando la clave…",
      "status.resume": "Recuperando el acceso…",
      "status.incorrect": "La clave no es correcta. Revisa la clave compartida por el equipo.",
      "status.unavailable": "No se pudo cargar el contenido. Revisa tu conexión e inténtalo de nuevo.",
      "status.storage": "Permite el almacenamiento de esta página en tu navegador para mantener el acceso al proyecto y al plan de filmación.",
      "status.invalidContent": "El contenido no está disponible. Recarga la página e inténtalo de nuevo.",
      "status.secureContext": "Abre esta página con una conexión HTTPS para ingresar.",
      "status.expired": "Tu acceso terminó. Ingresa la clave del proyecto para continuar."
    },
    en: {
      "nav.mainSite": "Trío de la Luz Productions, main website",
      "nav.language": "Page language",
      "nav.spaces": "Project spaces",
      "nav.project": "Project website",
      "nav.plan": "Filming plan",
      "nav.labs": "The triangles",
      "nav.lock": "Sign out",
      "access.skip": "Skip to access",
      "access.team": "Team workspace",
      "access.documentary": "UFO at the End of the World",
      "access.passwordLabel": "Project access password",
      "access.showPassword": "Show",
      "access.hidePassword": "Hide",
      "access.showPasswordAria": "Show password",
      "access.hidePasswordAria": "Hide password",
      "project.title": "Project website · UFO at the End of the World",
      "project.heading": "Project<br>website",
      "project.art": "THE DOCUMENTARY",
      "project.intro": "The film, its research and its development. A workspace for the documentary team.",
      "project.enter": "Enter the project",
      "project.opening": "Opening the project website…",
      "project.note": "One password for the project and the filming plan. Access lasts eight hours in this tab.",
      "project.footer": "Project material · Team access",
      "plan.title": "Filming plan · UFO at the End of the World",
      "plan.heading": "Filming<br>plan",
      "plan.art": "THE FILMING",
      "plan.intro": "The documentary’s schedule and filming days. View the filming plan for the directing and production team.",
      "plan.enter": "Open the filming plan",
      "plan.opening": "Opening the filming plan…",
      "plan.note": "Use the same password as the project website. Access lasts eight hours in this tab. The plan’s content is in Spanish.",
      "plan.footer": "Production material · Team access",
      "status.required": "Enter the project access password.",
      "status.checking": "Checking the password…",
      "status.resume": "Restoring access…",
      "status.incorrect": "The password is incorrect. Check the password shared by the team.",
      "status.unavailable": "The content could not be loaded. Check your connection and try again.",
      "status.storage": "Allow this page to use browser storage to keep access active between the project and the filming plan.",
      "status.invalidContent": "The content is unavailable. Reload the page and try again.",
      "status.secureContext": "Open this page over an HTTPS connection to enter.",
      "status.expired": "Your access has ended. Enter the project password to continue."
    }
  };

  function savedLanguage() {
    let saved;
    try { saved = localStorage.getItem(storageName); } catch { /* Use the tab preference. */ }
    if (!languages.has(saved)) {
      try { saved = sessionStorage.getItem(storageName); } catch { /* Keep the memory fallback. */ }
    }
    return languages.has(saved) ? saved : language;
  }
  language = savedLanguage();

  function translate(key) {
    return copy[language][key] ?? copy.es[key] ?? key;
  }

  function apply() {
    // The plan's source content remains in Spanish; only its shared navigation
    // and password page are bilingual.
    const isGate = document.body.dataset.view === "gate";
    const isPlan = document.body.dataset.document === "plan-de-filmacion";
    if (isGate || !isPlan) document.documentElement.lang = language;
    document.querySelectorAll("[data-project-i18n]").forEach(element => {
      element.textContent = translate(element.dataset.projectI18n);
    });
    document.querySelectorAll("[data-project-i18n-html]").forEach(element => {
      // Authored translations contain only text and line breaks.
      element.innerHTML = translate(element.dataset.projectI18nHtml);
    });
    document.querySelectorAll("[data-project-i18n-aria]").forEach(element => {
      element.setAttribute("aria-label", translate(element.dataset.projectI18nAria));
    });
    document.querySelectorAll("[data-project-language]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.projectLanguage === language));
    });
    const navigation = document.getElementById("tdl-project-nav");
    if (navigation) navigation.lang = language;
    if (isGate) document.title = translate(isPlan ? "plan.title" : "project.title");
  }

  function synchronizeProject() {
    if (document.body.dataset.view === "gate" || document.body.dataset.document !== "proyecto") return;
    const control = document.querySelector(`#idioma button[data-l="${language}"]`);
    if (control && control.getAttribute("aria-pressed") !== "true") control.click();
  }

  function set(next) {
    if (!languages.has(next)) return language;
    language = next;
    try { localStorage.setItem(storageName, language); } catch { /* Use tab storage or memory. */ }
    try { sessionStorage.setItem(storageName, language); } catch { /* Keep the memory fallback. */ }
    synchronizeProject();
    apply();
    window.dispatchEvent(new CustomEvent("tdl-project-language", { detail: { language } }));
    return language;
  }

  window.TDLProjectLanguage = { get: () => language, set, translate, apply };
  document.addEventListener("click", event => {
    const control = event.target.closest("[data-project-language], #idioma button[data-l]");
    if (control) set(control.dataset.projectLanguage || control.dataset.l);
  });
  window.addEventListener("storage", event => {
    if (event.key === storageName && languages.has(event.newValue)) set(event.newValue);
  });
  window.addEventListener("pageshow", () => {
    language = savedLanguage();
    synchronizeProject();
    apply();
    window.dispatchEvent(new CustomEvent("tdl-project-language", { detail: { language } }));
  });
  synchronizeProject();
  apply();
})();
