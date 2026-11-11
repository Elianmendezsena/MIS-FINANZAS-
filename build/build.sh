#!/bin/sh
# Construye todo: index.html + sw.js, iconos recortados y tailwind.css.
# Uso: sh build/build.sh [ruta_artifact.html]   (Tailwind: npm i tailwindcss@3.4.17 en build/)
set -e
cd "$(dirname "$0")/.."
python3 build/build.py "$@"
node build/icons.js
if [ -x build/node_modules/.bin/tailwindcss ]; then build/node_modules/.bin/tailwindcss -c build/tailwind.config.js -i build/tailwind.in.css -o tailwind.css --minify 2>/dev/null; echo "tailwind $(wc -c < tailwind.css)"; else echo "AVISO: sin Tailwind instalado, tailwind.css no se regeneró"; fi
