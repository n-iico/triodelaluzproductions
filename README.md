# Trío de la Luz Productions — Sitio web

Sitio web one-page estático (HTML + CSS + JS, sin dependencias ni build).

## Archivos

- `index.html` — estructura y contenido
- `styles.css` — diseño (paleta, tipografía, animaciones)
- `script.js` — menú móvil, nav al hacer scroll y animaciones de entrada
- `favicon.svg` — emblema del Trío (favicon)

## Acceso compartido a los laboratorios

La portada del equipo está en `/equipo/triangulos/`. Una sola clave abre las
páginas independientes de Última Esperanza y Ledalen. El enlace anterior del
laboratorio de Última Esperanza redirige a esta portada.

Los tres archivos `.tlab` contienen el catálogo y los dos laboratorios cifrados
con AES-256-GCM y una clave derivada mediante PBKDF2-SHA-256 (300000 iteraciones).
El navegador conserva solo la clave derivada en `sessionStorage` de la pestaña;
el acceso caduca a las ocho horas y se elimina con «Cerrar acceso». La contraseña
no se incluye en los archivos del sitio ni en este repositorio.

Para actualizar ambos laboratorios o cambiar la clave, usa
`scripts/preparar-triangulos.mjs` con `--source-root` apuntando a la carpeta
`herramientas` original y `--output` a `equipo/triangulos`. Entrega la clave por
entrada estándar como un objeto JSON con el campo `password`; no la pongas en
argumentos ni archivos. El script selecciona las últimas versiones autónomas de
`compartir/`, añade navegación común y reemplaza los tres archivos cifrados.
Publica siempre los tres juntos. No copies los HTML originales sin cifrar al sitio.

## Sitio del proyecto y Plan de filmación

La edición Equipo de la Biblia está en `/equipo/proyecto/` y el Plan de filmación
en `/equipo/proyecto/plan-de-filmacion/`. Ambos tienen una clave compartida y
mantienen el acceso por ocho horas en la misma pestaña. «Cerrar acceso» borra
la sesión. La página de acceso permite elegir Español / English, y el proyecto
abre con ese idioma. El plan es una foto del tablero original: los cambios
se conservan como borrador en el navegador de cada visitante.

El HTML del proyecto, sus fotografías y el tablero se publican únicamente
cifrados con AES-256-GCM y PBKDF2-SHA-256 (300000 iteraciones), en dos archivos
`.tlab`. Las fotos se convierten en URLs temporales del navegador tras ingresar.
La clave no se guarda en los archivos ni en el repositorio.

Para actualizar desde los originales, usa `scripts/actualizar-proyecto.mjs` con
`--source-root` apuntando a `herramientas` y `--output equipo/proyecto`. Entrega
la clave por entrada estándar como JSON con el campo `password`. El proceso
regenera la edición Equipo y el plan desde sus fuentes actuales en una carpeta
temporal, prepara ambos documentos cifrados y elimina los archivos temporales.
Las instrucciones completas están en `equipo/proyecto/ACTUALIZAR.md`.

`scripts/preparar-proyecto.mjs` también permite preparar salidas ya exportadas.
Ambos procesos conservan los enlaces al plan y a los laboratorios y toman la fecha
del plan actual. Publica los dos `.tlab` juntos. No copies la carpeta de imágenes
ni las fuentes sin cifrar al repositorio web.

## Identidad: el emblema del Trío de la Luz

El símbolo —tres haces (rojo, azul, verde) que convergen en una luz blanca— está
definido una sola vez como `<symbol id="emblem">` al inicio de `index.html` y se
reutiliza con `<use href="#emblem">` en el nav, la franja de cita, el separador y el
footer. En el hero hay una versión animada (convergencia + pulso) con clases propias.

Para cambiar los colores del emblema, edita las variables en `:root` de `styles.css`:
`--red` (tierra), `--blue` (cielo/noche), `--green` (naturaleza), `--light` (unión).

## Ver en local

Abre `index.html` directamente en el navegador, o levanta un servidor simple:

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

## Reemplazar los fondos por fotos reales

Ahora los fondos del hero y del proyecto son gradientes atmosféricos (placeholder).
Cuando tengas las fotos, crea una carpeta `images/` y edita `styles.css`:

```css
/* Hero (portada) — Patagonia, cielo nocturno, rodaje... */
.hero__bg {
  background-image:
    linear-gradient(160deg, rgba(11,14,18,.55), rgba(7,10,14,.75)),
    url('images/hero.jpg');
  background-size: cover;
  background-position: center;
}

/* Proyecto un documental en desarrollo — still del documental */
.project__media--doc .project__media-bg {
  background-image: url('images/documental-desarrollo.jpg');
  background-size: cover;
  background-position: center;
}

/* Green Ghost: La Serie Animada — arte / still de la serie */
.project__media--ghost .project__media-bg {
  background-image: url('images/green-ghost.jpg');
  background-size: cover;
  background-position: center;
}
```

Recomendación: fotos en horizontal, mínimo 2000px de ancho, comprimidas (JPG ~70%).

## Editar textos

Todo el contenido está en `index.html`. Busca la sección y edita el texto directamente.

## Publicar (gratis)

- **Netlify** o **Vercel**: arrastra la carpeta o conecta un repositorio.
- **GitHub Pages**: sube los archivos a un repo y actívalo en Settings → Pages.
- Apunta tu dominio `triodelaluz.cl` al hosting elegido.

## Pendientes / decisiones

- Enlaces de redes sociales (Instagram / Vimeo / YouTube) están como `#`. Reemplázalos cuando existan.
- La frase institucional usada es "Historias con luz propia desde el sur del mundo".
- Hay dos proyectos en desarrollo: **un documental en desarrollo** (documental) y
  **Green Ghost: La Serie Animada**. Cada uno tiene su propia atmósfera de color.
- Charlie Clark / Orale Films aparece en Equipo como "Productor asociado" y como creador del
  universo de The Green Ghost. Si prefieres mantenerlo más institucional, edita esos bloques en `index.html`.
