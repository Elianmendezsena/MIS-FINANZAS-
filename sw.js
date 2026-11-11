const V='mis-finanzas-v26';
const FILES=["./", "index.html", "tailwind.css", "fonts.css", "lucide.min.js", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "maskable-512.png", "bricolage-ext.woff2", "bricolage.woff2", "hanken-400.woff2", "hanken-500.woff2", "hanken-600.woff2", "hanken-700.woff2", "hanken-ext-400.woff2", "hanken-ext-500.woff2", "hanken-ext-600.woff2", "hanken-ext-700.woff2"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
if(e.request.method!=='GET')return;
const u=new URL(e.request.url);
if(u.origin!==location.origin)return;
if(e.request.mode==='navigate'||u.pathname.endsWith('/')||u.pathname.endsWith('index.html')){
e.respondWith(Promise.race([fetch(e.request,{cache:'no-store'}).then(r=>{if(!r.ok)throw 0;const c=r.clone();caches.open(V).then(x=>x.put('index.html',c));return r}),new Promise((_,j)=>setTimeout(j,3500))]).catch(()=>caches.match('index.html').then(r=>r||caches.match('./'))));
return}
e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).catch(()=>caches.match('./'))))});
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(x){}e.waitUntil(self.registration.showNotification(d.title||'Mis Finanzas',{body:d.body||'',icon:'icon-192.png',badge:'icon-192.png',tag:d.tag||undefined}))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus' in c)return c.focus()}return self.clients.openWindow('./')}))});
