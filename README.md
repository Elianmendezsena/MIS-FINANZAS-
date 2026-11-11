# Mis Finanzas

App de finanzas personales (RD$ y US$), instalable y sin conexión.

- `src/` — la fuente: `body.html`, `styles.css`, `js/` (módulos en el orden de `js/ORDEN.txt`), `pwa.js` (solo versión instalada).
- `build/` — `sh build/build.sh [artifact.html]` genera `index.html`, `sw.js`, `lucide.min.js` (solo iconos usados) y `tailwind.css`. Requiere `npm i tailwindcss@3.4.17` dentro de `build/`.
- `tests/` — `node tests/audit.js` revisa todas las pantallas en 5 anchos, claro/oscuro, con y sin datos.
- `VERSION` — número que se ve en Ajustes y nombre de la caché del service worker.

No edites `index.html` ni `sw.js` a mano: se regeneran.
