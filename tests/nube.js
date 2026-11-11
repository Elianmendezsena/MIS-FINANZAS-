/* Sincronización con la nube usando un Supabase simulado en memoria (dos dispositivos).  node tests/nube.js */
const { chromium } = require('playwright'), srv = require('./srv'), seed = require('./seed');
const K = 'finanzas-personales-v1', HOST = 'https://rujwlbcofywofuifhrqa.supabase.co';
const users = {}, rows = new Map(), net = { down: false }; let clock = 0;
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'Content-Range' };
async function mock(ctx) {
  await ctx.route(HOST + '/**', async route => {
    const rq = route.request(), u = new URL(rq.url()), J = (st, b, h) => route.fulfill({ status: st, headers: Object.assign({ 'content-type': 'application/json' }, cors, h || {}), body: JSON.stringify(b) });
    if (net.down) return route.abort();
    if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const body = rq.postData() ? JSON.parse(rq.postData()) : null;
    if (u.pathname === '/auth/v1/signup') { if (users[body.email]) return J(422, { error_code: 'user_already_exists', msg: 'User already registered' }); users[body.email] = body.password; return J(200, { access_token: 'tok-' + body.email, refresh_token: 'r', expires_in: 3600, user: { id: 'u-' + body.email, email: body.email } }); }
    if (u.pathname === '/auth/v1/token') { if (users[body.email] !== body.password) return J(400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' }); return J(200, { access_token: 'tok-' + body.email, refresh_token: 'r', expires_in: 3600, user: { id: 'u-' + body.email, email: body.email } }); }
    if (u.pathname === '/auth/v1/logout') return J(204, {});
    const tok = (rq.headers()['authorization'] || '').replace('Bearer ', ''); if (!tok.startsWith('tok-')) return J(401, { message: 'no auth' });
    const uid = 'u-' + tok.slice(4), mine = () => [...rows.values()].filter(r => r.user_id === uid);
    if (rq.method() === 'POST') { rows.set(uid + '|' + body.id, { user_id: uid, id: body.id, data: body.data, updated_at: String(++clock).padStart(8, '0') }); return J(201, {}); }
    if (rq.method() === 'DELETE') { rows.delete(uid + '|' + decodeURIComponent(u.searchParams.get('id').slice(3))); return J(204, {}); }
    const all = mine();
    if (u.searchParams.get('select') === 'updated_at') { const top = all.sort((a, b) => a.updated_at < b.updated_at ? 1 : -1)[0]; return J(200, top ? [{ updated_at: top.updated_at }] : [], { 'content-range': (top ? '0-0' : '*') + '/' + all.length }); }
    const [a, z] = (rq.headers()['range'] || '0-999').split('-').map(Number);
    return J(200, all.sort((x, y) => x.id < y.id ? -1 : 1).slice(a, z + 1).map(r => ({ id: r.id, data: r.data })));
  });
}
(async () => {
  const s = await srv(8815), b = await chromium.launch(), R = [], errs = [];
  const ck = (n, v) => { R.push(v); console.log(v ? 'ok   ' : 'FALLO', n); };
  const dev = async (withSeed) => { const ctx = await b.newContext({ viewport: { width: 390, height: 900 } }); await mock(ctx); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8815/'); await p.waitForTimeout(800); if (withSeed) { await p.evaluate(seed); await p.reload(); await p.waitForTimeout(800); } return p; };
  const txs = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)).txs.length, K);
  const auth = async (p, btn, em, pw) => { await p.evaluate(() => window.__sv('ajustes')); await p.fill('#nube-email', em); await p.fill('#nube-pass', pw); await p.click(btn); await p.waitForTimeout(2500); };
  const addTx = async (p, amt) => { await p.evaluate(() => window.__sv('registrar')); await p.fill('#f-monto', String(amt)); await p.click('#f-submit'); await p.waitForTimeout(1800); };
  const A = await dev(true), n0 = await txs(A);
  await auth(A, '#nube-login', 'e@x.com', 'clave-larga'); ck('entrar sin cuenta: mensaje claro', /incorrectos/.test(await A.textContent('#nube-msg')));
  await auth(A, '#nube-signup', 'e@x.com', 'clave-larga');
  const srvTx = () => [...rows.keys()].filter(k => k.includes('|tx-')).length;
  ck('crear cuenta sube todo lo local (' + n0 + ' movimientos)', srvTx() === n0 && rows.has('u-e@x.com|settings') && await txs(A) === n0);
  ck('la tarjeta muestra la sesión', /e@x\.com/.test(await A.textContent('#nube-state')) && /Sincronizado/.test(await A.textContent('#sync-pill')));
  const B = await dev(false);
  await auth(B, '#nube-login', 'e@x.com', 'mala-clave'); ck('contraseña mala no entra', /incorrectos/.test(await B.textContent('#nube-msg')));
  await auth(B, '#nube-login', 'e@x.com', 'clave-larga'); await B.waitForTimeout(1000);
  ck('segundo dispositivo recibe los ' + n0 + ' movimientos y el plan', await txs(B) === n0 && await B.evaluate(k => JSON.parse(localStorage.getItem(k)).plan.length, K) === 2);
  await addTx(B, 555);
  ck('un movimiento nuevo en B llega a la nube', srvTx() === n0 + 1);
  await A.evaluate(() => window.__sv('ajustes')); await A.click('#nube-now'); await A.waitForTimeout(2500);
  ck('y aparece en A al sincronizar', await txs(A) === n0 + 1);
  // cambio sin conexión en A: no se pierde
  net.down = true; await addTx(A, 321);
  ck('queda marcado como pendiente de subir', await A.evaluate(() => localStorage.getItem('finanzas-nube-pend')) === '1');
  ck('y no llegó a la nube todavía', srvTx() === n0 + 1);
  await A.reload(); await A.waitForTimeout(1500); net.down = false; await A.reload(); await A.waitForTimeout(3500);
  ck('cambio hecho sin conexión sobrevive a recargar y sube', await txs(A) === n0 + 2 && srvTx() === n0 + 2);
  // borrar en A se refleja en B
  await A.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); }, K);
  // PIN + sesión cifrada
  await A.evaluate(() => window.__sv('ajustes')); await A.click('#pin-card > :first-child');
  await A.fill('#pin-new', '482913'); await A.fill('#pin-new2', '482913'); await A.click('#pin-save'); await A.waitForTimeout(2500);
  ck('con PIN, la sesión de la nube se guarda cifrada', /"ct"/.test(await A.evaluate(() => localStorage.getItem('finanzas-nube'))) && !/tok-/.test(await A.evaluate(() => localStorage.getItem('finanzas-nube'))));
  await A.reload(); await A.waitForTimeout(700); await A.fill('#lock-in', '482913'); await A.click('#lock-form button[type=submit]'); await A.waitForTimeout(3500);
  await addTx(B, 99); await A.evaluate(() => window.__sv('ajustes')); await A.click('#nube-now'); await A.waitForTimeout(2500);
  ck('tras desbloquear con PIN sigue sincronizando', /777|99/.test('99') && await A.evaluate(() => /e@x\.com/.test(document.getElementById('nube-state').textContent)) && srvTx() === n0 + 3);
  const encTxt = await A.evaluate(async () => { return localStorage.getItem('finanzas-enc').length > 100 && localStorage.getItem('finanzas-personales-v1') === null; });
  ck('y los datos locales siguen cifrados', encTxt);
  // cerrar sesión en B conserva datos
  const nB = await txs(B);
  await B.evaluate(() => window.__sv('ajustes')); await B.click('#nube-out'); await B.waitForTimeout(500);
  ck('cerrar sesión deja los datos en el dispositivo', nB >= n0 + 2 && await txs(B) === nB && !(await B.evaluate(() => localStorage.getItem('finanzas-nube'))));
  ck('sin errores', !errs.length); if (errs.length) console.log(errs.slice(0, 3));
  await b.close(); s.close(); process.exit(R.every(Boolean) ? 0 : 1);
})();
