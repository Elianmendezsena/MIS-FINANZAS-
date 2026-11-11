/* Genera lucide.min.js solo con los iconos que usa la app (busca sus nombres en index.html). */
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..');
const l = require('./lucide-full.min.js'), src = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
const kebab = n => n.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([a-zA-Z])([0-9])/g, '$1-$2').toLowerCase();
const map = {}; for (const k in l.icons) map[kebab(k)] = k;
const used = new Set();
for (const m of src.matchAll(/["'` ]([a-z][a-z0-9-]*)(?=["'` ])/g)) if (map[m[1]]) used.add(m[1]);
const miss = [...new Set([...src.matchAll(/data-lucide="([a-z0-9-]+)"/g)].map(m => m[1]))].filter(n => !map[n]);
if (miss.length) { console.error('Iconos desconocidos:', miss); process.exit(1); }
const icons = {}; [...used].sort().forEach(n => { icons[n] = l.icons[map[n]][2]; });
const rt = `(function(){var I=${JSON.stringify(icons)},NS='http://www.w3.org/2000/svg',D={xmlns:NS,width:24,height:24,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'round'};
function mk(t,a,ch){var e=document.createElementNS(NS,t),k;for(k in a)e.setAttribute(k,a[k]);(ch||[]).forEach(function(c){e.appendChild(mk(c[0],c[1],c[2]))});return e}
window.lucide={icons:I,createIcons:function(){var L=document.querySelectorAll('[data-lucide]'),i,el,n,a,k,j,cl;for(i=0;i<L.length;i++){el=L[i];if(el.tagName.toLowerCase()==='svg')continue;n=el.getAttribute('data-lucide');if(!I[n])continue;a={};for(k in D)a[k]=D[k];for(j=0;j<el.attributes.length;j++)a[el.attributes[j].name]=el.attributes[j].value;cl=el.getAttribute('class');a['class']='lucide lucide-'+n+(cl?' '+cl:'');el.parentNode.replaceChild(mk('svg',a,I[n]),el)}}};})();`;
fs.writeFileSync(path.join(R, 'lucide.min.js'), rt);
console.log('iconos', used.size, 'bytes', rt.length);
