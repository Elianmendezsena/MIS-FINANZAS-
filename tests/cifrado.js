/* Cifrado con PIN de punta a punta.  node tests/cifrado.js [carpeta] */
const { chromium } = require('playwright'), srv = require('./srv'), seed = require('./seed'), fs = require('fs');
const out = process.argv[2] || '.', K = 'finanzas-personales-v1';
(async () => {
  const s = await srv(8813), b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 900 }, acceptDownloads: true }), p = await ctx.newPage(), errs = [], R = [];
  const ck = (n, v) => { R.push(v); console.log(v ? 'ok   ' : 'FALLO', n); };
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const ls = k => p.evaluate(k => localStorage.getItem(k), k);
  const txIds = () => p.evaluate(() => [...document.querySelectorAll('#hist .hrow')].length);
  await p.goto('http://localhost:8813/'); await p.waitForTimeout(900); await p.evaluate(seed); await p.reload(); await p.waitForTimeout(900);
  const before = JSON.parse(await ls(K));
  await p.evaluate(() => window.__sv('ajustes')); await p.click('#pin-card > :first-child');
  await p.fill('#pin-new', '1234'); await p.fill('#pin-new2', '1234'); await p.click('#pin-save'); await p.waitForTimeout(200);
  ck('rechaza PIN de 4 números', /6 números/.test(await p.textContent('#pin-error')) && !(await ls('finanzas-enc')));
  await p.fill('#pin-new', '111111'); await p.fill('#pin-new2', '111111'); await p.click('#pin-save'); await p.waitForTimeout(200);
  ck('rechaza PIN fácil', /fácil/.test(await p.textContent('#pin-error')));
  await p.fill('#pin-new', '482913'); await p.fill('#pin-new2', '482913'); await p.click('#pin-save'); await p.waitForTimeout(2500);
  const enc = await ls('finanzas-enc');
  ck('activa: hay datos cifrados y no queda copia sin cifrar', !!enc && (await ls(K)) === null && !(await ls('finanzas-pin')));
  ck('lo cifrado no contiene texto legible', !/Alquiler|Salario|amount/.test(enc));
  // respaldo cifrado
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#bk-save')]); await dl.saveAs(out + '/respaldo-cifrado.json');
  const bkTxt = fs.readFileSync(out + '/respaldo-cifrado.json', 'utf8');
  ck('el respaldo sale cifrado', /"cifrado":true/.test(bkTxt) && !/Alquiler/.test(bkTxt));
  // un movimiento nuevo con cifrado activo se guarda y sobrevive a recargar
  await p.evaluate(() => window.__sv('registrar')); await p.fill('#f-monto', '777'); await p.click('#f-submit'); await p.waitForTimeout(1200);
  await p.reload(); await p.waitForTimeout(900);
  ck('al recargar pide PIN y no muestra datos', await p.evaluate(() => !document.getElementById('lock').hidden && !document.getElementById('kpis').innerHTML));
  await p.fill('#lock-in', '000000'); await p.click('#lock-form button[type=submit]'); await p.waitForTimeout(2000);
  ck('PIN malo no entra', await p.evaluate(() => !document.getElementById('lock').hidden) && /incorrecto/.test(await p.textContent('#lock-err')));
  await p.fill('#lock-in', '482913'); await p.click('#lock-form button[type=submit]'); await p.waitForTimeout(2500);
  const n777 = await p.evaluate(() => document.getElementById('lock').hidden && /777/.test(document.getElementById('app').textContent));
  ck('PIN bueno entra, con el movimiento nuevo', n777);
  ck('entra sin pedir el PIN dos veces', await p.evaluate(() => document.getElementById('lock').hidden));
  // bloqueo por intentos
  await p.reload(); await p.waitForTimeout(700);
  for (let i = 0; i < 5; i++) { await p.fill('#lock-in', '00000' + i); await p.click('#lock-form button[type=submit]'); await p.waitForTimeout(1500); }
  await p.fill('#lock-in', '482913'); await p.click('#lock-form button[type=submit]'); await p.waitForTimeout(1500);
  ck('tras 5 fallos hay que esperar aunque el PIN sea bueno', /Espera/.test(await p.textContent('#lock-err')) && await p.evaluate(() => !document.getElementById('lock').hidden));
  await p.evaluate(() => localStorage.removeItem('finanzas-try'));
  await p.fill('#lock-in', '482913'); await p.click('#lock-form button[type=submit]'); await p.waitForTimeout(2500);
  // bloqueo en sesión
  await p.evaluate(() => window.__sv('ajustes')); await p.click('#pin-now'); await p.waitForTimeout(200);
  await p.fill('#lock-in', '482913'); await p.click('#lock-form button[type=submit]'); await p.waitForTimeout(2000);
  ck('"Bloquear ahora" y volver a entrar', await p.evaluate(() => document.getElementById('lock').hidden));
  // quitar PIN
  await p.click('#pin-off'); await p.waitForTimeout(800);
  const after = JSON.parse(await ls(K) || 'null');
  ck('al quitar el PIN vuelven los datos sin cifrar, completos', !!after && !(await ls('finanzas-enc')) && after.txs.length === before.txs.length + 1 && after.plan.length === before.plan.length);
  await p.reload(); await p.waitForTimeout(900);
  ck('sin PIN arranca directo', await p.evaluate(() => document.getElementById('lock').hidden && !!document.getElementById('kpis').innerHTML));
  // importar el respaldo cifrado
  await p.evaluate(() => window.__sv('ajustes'));
  await p.setInputFiles('#bk-file', out + '/respaldo-cifrado.json'); await p.waitForTimeout(400);
  await p.fill('#bk-pin', '999999'); await p.click('#bk-pin-ok'); await p.waitForTimeout(1500);
  const badMsg = await p.textContent('#bk-error');
  await p.fill('#bk-pin', '482913'); await p.click('#bk-pin-ok'); await p.waitForTimeout(1500);
  ck('respaldo cifrado: PIN malo no abre, PIN bueno sí', /no es el PIN/.test(badMsg) && await p.evaluate(() => !document.getElementById('bk-confirm').hidden));
  await p.click('#bk-yes'); await p.waitForTimeout(600);
  ck('restaura los movimientos del respaldo', JSON.parse(await ls(K)).txs.length === before.txs.length);
  // olvidé el PIN -> BORRAR
  await p.fill('#pin-new', '482913'); await p.fill('#pin-new2', '482913'); await p.click('#pin-save'); await p.waitForTimeout(2500);
  await p.reload(); await p.waitForTimeout(700);
  await p.click('#lock-forgot-btn'); await p.fill('#lock-word', 'borrar'); await p.click('#lock-reset'); await p.waitForTimeout(1500);
  ck('olvidé el PIN: BORRAR deja la app limpia', !(await ls('finanzas-enc')) && JSON.parse(await ls(K)).txs.length === 0);
  ck('sin errores de consola', !errs.length); if (errs.length) console.log(errs.slice(0, 4));
  await b.close(); s.close(); process.exit(R.every(Boolean) ? 0 : 1);
})();
