/* Meta con fecha y PDF del mes.  node tests/metas-pdf.js [carpeta_salida] */
const { chromium } = require('playwright'), srv = require('./srv'), seed = require('./seed'), fs = require('fs');
const out = process.argv[2] || '.';
(async () => {
  const s = await srv(8812), b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 900 }, acceptDownloads: true }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8812/'); await p.waitForTimeout(900); await p.evaluate(seed); await p.reload(); await p.waitForTimeout(900);
  await p.evaluate(() => window.__sv('ahorro'));
  const due = await p.evaluate(() => { const d = new Date(); const x = new Date(d.getFullYear(), d.getMonth() + 5, 15); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-15'; });
  await p.fill('#sv-goal-in', '60000'); await p.fill('#sv-goal-date', due); await p.click('#sv-goal-save'); await p.waitForTimeout(300);
  const t1 = await p.textContent('#sv-goal-prog'); console.log('meta principal:', t1);
  await p.fill('#gl-name', 'Vacaciones'); await p.fill('#gl-amt', '30000'); await p.fill('#gl-date', due); await p.click('#gl-add'); await p.waitForTimeout(300);
  const t2 = await p.textContent('#goals-list'); console.log('otra meta:', t2);
  await p.fill('[data-gldue]', '2020-01-01'); await p.dispatchEvent('[data-gldue]', 'change'); await p.waitForTimeout(300);
  const t3 = await p.textContent('#goals-list');
  const st = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('finanzas-personales-v1')); return [s.goal, s.goals]; });
  await p.screenshot({ path: out + '/ahorro-metas.png', fullPage: true });
  await p.evaluate(() => window.__sv('tendencia')); await p.waitForTimeout(300);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-view="tendencia"] [data-exp="pdf-mes"]')]);
  await dl.saveAs(out + '/reporte.pdf');
  const ok = /10,000 al mes \(6 meses\)/.test(t1) && /5,000 al mes/.test(t2) && /ya pasó/.test(t3) && st[0].due === due && st[1][0].due === '2020-01-01' && fs.statSync(out + '/reporte.pdf').size > 1500 && !errs.length;
  console.log(ok ? 'OK' : 'FALLO', JSON.stringify(st), errs); await b.close(); s.close(); process.exit(ok ? 0 : 1);
})();
