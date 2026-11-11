#!/bin/sh
# Corre todas las pruebas. Uso: sh tests/todo.sh [carpeta_para_capturas]
cd "$(dirname "$0")/.."; O="${1:-/tmp}"; export NODE_PATH="${NODE_PATH:-$(npm root -g)}"; F=0
for t in cifrado metas-pdf repite-preguntas; do node tests/$t.js "$O" > "$O/$t.log" 2>&1 && echo "ok    $t" || { echo "FALLO $t"; grep -v "^ok" "$O/$t.log" | head -8; F=1; }; done
for t in nube pin-antiguo; do node tests/$t.js > "$O/$t.log" 2>&1 && echo "ok    $t" || { echo "FALLO $t"; grep -v "^ok" "$O/$t.log" | head -8; F=1; }; done
node tests/audit.js | tail -3; [ $? -eq 0 ] || F=1
exit $F
