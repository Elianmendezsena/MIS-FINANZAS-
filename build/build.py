#!/usr/bin/env python3
"""Construye Mis Finanzas desde src/.
  python3 build/build.py [ruta_artifact.html]
Genera index.html y sw.js (versión instalable) y, si se da una ruta, el HTML del artifact de Claude.
La versión sale del archivo VERSION."""
import os, sys, json
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def rd(p): return open(os.path.join(R, p), encoding='utf-8').read()
VER = rd('VERSION').strip()
css, body = rd('src/styles.css'), rd('src/body.html').replace('{{VER}}', VER)
meta, icons, pwa = rd('src/meta.html'), rd('src/icons-inline.html'), rd('src/pwa.js')
def js(with_pwa):
    out = rd('src/cifrado.js')
    for n in rd('src/js/ORDEN.txt').split():
        if n == '@pwa':
            if with_pwa: out += pwa
        else: out += rd('src/js/' + n)
    return out + rd('src/arranque.js')
TITLE = '<title>Mis Finanzas</title>\n'
artifact = (TITLE + icons + meta +
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Hanken+Grotesk:wght@400;500;600;700&display=swap">\n'
  '<style>\n' + css + '</style>\n<script src="https://cdn.tailwindcss.com/3.4.17"></script>\n'
  '<script src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js"></script>\n' + body + '<script>\n' + js(False) + '</script>\n')
index = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n' + TITLE +
  '<link rel="icon" type="image/png" href="icon-192.png">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">\n'
  '<link rel="manifest" href="manifest.webmanifest">\n<meta name="mobile-web-app-capable" content="yes">\n'
  '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="default">\n' + meta +
  '<link rel="stylesheet" href="tailwind.css">\n<link rel="stylesheet" href="fonts.css">\n<style>\n' + css + '</style>\n</head>\n<body>\n'
  '<script src="lucide.min.js"></script>\n' + body + '<script>\n' + js(True) + '</script>\n</body>\n</html>\n')
FILES = ["./", "index.html", "tailwind.css", "fonts.css", "lucide.min.js", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "maskable-512.png"] + sorted(f for f in os.listdir(R) if f.endswith('.woff2'))
sw = rd('build/sw.tpl.js').replace('{{VER}}', VER).replace('{{FILES}}', json.dumps(FILES))
open(os.path.join(R, 'index.html'), 'w', encoding='utf-8').write(index)
open(os.path.join(R, 'sw.js'), 'w', encoding='utf-8').write(sw)
if len(sys.argv) > 1: open(sys.argv[1], 'w', encoding='utf-8').write(artifact)
print('v' + VER, 'index.html', len(index), 'artifact', len(artifact))
