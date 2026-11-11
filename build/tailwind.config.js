/* Tailwind 3.4.17: escanea index.html ya construido. Ver build/build.sh */
const path = require('path');
module.exports = { content: [path.join(__dirname, '..', 'index.html')], theme: { extend: {} }, plugins: [] };
