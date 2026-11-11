/* "Lo que se repite" unificado y "Pregúntale a tus datos".  node tests/repite-preguntas.js [carpeta] */
const { chromium } = require('playwright'), srv = require('./srv'), seed = require('./seed');
const out = process.argv[2] || '.', K = 'finanzas-personales-v1';
(async () => {
  const s = await srv(8816), b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 390, height: 900 } })).newPage(), errs = [], R = [];
  const ck = (n, v, x) => { R.push(!!v); console.log(v ? 'ok   ' : 'FALLO', n, v ? '' : (x || '')); };
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const st = () => p.evaluate(k => JSON.parse(localStorage.getItem(k)), K);
  await p.goto('http://localhost:8816/'); await p.waitForTimeout(800); await p.evaluate(seed); await p.reload(); await p.waitForTimeout(800);
  const n0 = (await st()).txs.length, today = await p.evaluate(() => new Date().getDate());
  await p.evaluate(() => window.__sv('plantillas')); await p.click('#rep-form > :first-child');
  const add = async (o) => { for (const k in o.sel || {}) await p.selectOption('#' + k, o.sel[k]); await p.fill('#rp-n', o.n); await p.fill('#rp-amt', String(o.amt)); if (o.day) await p.fill('#rp-day', String(o.day)); await p.click('#rp-add'); await p.waitForTimeout(400); };
  // mensual automático con día ya pasado (día 1): se registra de una vez
  await add({ sel: { 'rp-freq': 'mes', 'rp-mode': 'auto' }, n: 'Internet', amt: 1500, day: 1 });
  let S = await st(); const pa = S.plan.find(x => x.n === 'Internet');
  ck('mensual automático: queda en el plan y se registra solo', pa && pa.auto && pa.rec && pa.tx === 'txpa' + pa.id && S.txs.some(t => t.id === pa.tx && t.amount === 1500) && S.txs.length === n0 + 1);
  await p.reload(); await p.waitForTimeout(800);
  ck('no se duplica al recargar', (await st()).txs.length === n0 + 1);
  // deshacer en el plan: no vuelve a crearse
  await p.evaluate(() => window.__sv('gastos')); await p.click('#plan-card > :first-child'); await p.click('[data-unpay="' + pa.id + '"]'); await p.waitForTimeout(400); await p.reload(); await p.waitForTimeout(800);
  S = await st(); ck('si lo deshaces no se vuelve a registrar este mes', S.txs.length === n0 && S.plan.find(x => x.id === pa.id).skip === 1);
  // mensual manual
  await p.evaluate(() => window.__sv('plantillas')); await p.click('#rep-form > :first-child').catch(() => {});
  if (!(await p.isVisible('#rp-add'))) await p.click('#rep-form > :first-child');
  await add({ sel: { 'rp-freq': 'mes', 'rp-mode': 'manual' }, n: 'Gimnasio', amt: 900, day: 1 });
  S = await st(); const pm = S.plan.find(x => x.n === 'Gimnasio');
  ck('mensual manual: en el plan, sin registrarse', pm && !pm.auto && !pm.tx && S.txs.length === n0);
  await p.click('[data-pauto="' + pm.id + '"]'); await p.waitForTimeout(400);
  S = await st(); ck('el interruptor lo pasa a automático y lo registra', S.plan.find(x => x.id === pm.id).auto && S.txs.length === n0 + 1);
  // semanal y atajo
  await add({ sel: { 'rp-freq': 'semanal' }, n: 'Mesada', amt: 300 }); S = await st();
  ck('semanal: se registra hoy con recurrencia', S.txs.some(t => t.note === 'Mesada' && t.rec === 'semanal') && /Mesada/.test(await p.textContent('#rec-list')));
  await add({ sel: { 'rp-freq': 'libre' }, n: 'Pasaje', amt: 50 }); S = await st();
  ck('sin fecha: queda como atajo', S.tpl.some(t => t.n === 'Pasaje') && /Pasaje/.test(await p.textContent('#tpl-list')));
  await p.screenshot({ path: out + '/repite.png', fullPage: true });
  // el mes siguiente hereda "automático"
  const nextOk = await p.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); const g = s.plan.find(x => x.n === 'Gimnasio'); return !!g.auto && !!g.rk; }, K);
  ck('queda marcado para los meses siguientes', nextOk);
  // preguntas
  await p.evaluate(() => window.__sv('tendencia'));
  const ask = async q => { await p.fill('#ask-in', q); await p.click('#ask-form button'); await p.waitForTimeout(200); return (await p.textContent('#ask-out')).replace(/\s+/g, ' '); };
  const tot = await p.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)), d = new Date(), y = String(d.getFullYear()), mk = y + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const f = (fn) => s.txs.filter(t => (t.cur || 'DOP') === 'DOP' && !t.pending && fn(t)).reduce((a, t) => a + t.amount, 0);
    return { mes: f(t => t.kind === 'gasto' && t.date.startsWith(mk)), comidaAno: f(t => t.kind === 'gasto' && t.cat === 'Comida' && t.date.startsWith(y)), ingAno: f(t => t.kind === 'ingreso' && t.date.startsWith(y)) }; }, K);
  const has = (txt, n) => txt.includes(n.toLocaleString('en-US', { minimumFractionDigits: 2 }));
  let a = await ask('¿Cuánto gasté este mes?'); ck('gasto del mes', has(a, tot.mes), a);
  a = await ask('cuanto gaste en comida este año'); ck('gasto por categoría en el año (sin tildes)', has(a, tot.comidaAno) && /Comida/.test(a), a);
  a = await ask('¿Cuánto ingresé este año?'); ck('ingresos del año', has(a, tot.ingAno) && /Recibiste/.test(a), a);
  a = await ask('¿Cuál fue mi mayor gasto este mes?'); ck('mayor gasto', /Alquiler/.test(a) && /15,000/.test(a), a);
  a = await ask('¿En qué gasté más este mes?'); ck('ranking por categoría', /Alquiler/.test(a) && /%/.test(a), a);
  a = await ask('cuanto gaste con tarjeta este mes'); ck('por cuenta', /Tarjeta/.test(a) && /5,500/.test(a), a);
  a = await ask('cuánto gasté en comida en enero de 2020'); ck('sin datos: lo dice claro', /No hay gastos/.test(a), a);
  await ask('cuanto gaste en comida este año'); await p.click('#ask-see'); await p.waitForTimeout(400);
  ck('"Ver esos movimientos" filtra el historial', (await p.inputValue('#h-cat')) === 'gasto|Comida' && !!(await p.inputValue('#h-from')));
  ck('sin errores', !errs.length, errs.slice(0, 3).join('|'));
  await b.close(); s.close(); process.exit(R.every(Boolean) ? 0 : 1);
})();
