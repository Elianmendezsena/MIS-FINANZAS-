const V='mis-finanzas-v2';
const FILES=["./", "index.html", "tailwind.css", "fonts.css", "lucide.min.js", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "maskable-512.png", "hanken-ext-700.woff2", "hanken-ext-400.woff2", "hanken-600.woff2", "hanken-ext-600.woff2", "bricolage.woff2", "hanken-700.woff2", "hanken-400.woff2", "bricolage-ext.woff2", "hanken-500.woff2", "hanken-ext-500.woff2"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).catch(()=>caches.match('./'))))});
