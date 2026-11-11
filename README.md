# Mis Finanzas

App de finanzas personales (RD$ y US$), instalable y sin conexión.

- `src/` — la fuente: `body.html`, `styles.css`, `js/` (módulos en el orden de `js/ORDEN.txt`), `pwa.js` (solo versión instalada).
- `build/` — `sh build/build.sh [artifact.html]` genera `index.html`, `sw.js`, `lucide.min.js` (solo iconos usados) y `tailwind.css`. Requiere `npm i tailwindcss@3.4.17` dentro de `build/`.
- `tests/` — `node tests/audit.js` revisa todas las pantallas en 5 anchos, claro/oscuro, con y sin datos.
- `VERSION` — número que se ve en Ajustes y nombre de la caché del service worker.

No edites `index.html` ni `sw.js` a mano: se regeneran.

## Nube y cifrado
- Nube (solo versión instalada): proyecto Supabase `mis-finanzas`, tabla `mf_docs` con RLS por usuario. Código en `src/js/37b-nube.js`.
- Cifrado: `src/cifrado.js` (PBKDF2 + AES-GCM) y `src/arranque.js` (pide el PIN antes de iniciar la app).
- Pruebas: `tests/cifrado.js`, `tests/nube.js` (Supabase simulado), `tests/metas-pdf.js`, `tests/pin-antiguo.js`.
