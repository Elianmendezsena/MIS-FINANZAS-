const http=require('http'),fs=require('fs'),path=require('path');
const R=path.join(__dirname,'..');
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/json'};
module.exports=function(port){return new Promise(r=>{const s=http.createServer((q,res)=>{let p=q.url.split('?')[0];if(p.endsWith('/'))p+='index.html';const f=path.join(R,p);if(!fs.existsSync(f)){res.statusCode=404;return res.end()}let b=fs.readFileSync(f);if(p==='/index.html')b=Buffer.from(b.toString().replace('function setView(name) {','window.__sv=setView; function setView(name) {'));res.setHeader('Content-Type',T[path.extname(f)]||'text/plain');res.end(b)}).listen(port,()=>r(s))})};
