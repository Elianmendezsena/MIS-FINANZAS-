const V='mis-finanzas-v{{VER}}';
const FILES={{FILES}};
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
