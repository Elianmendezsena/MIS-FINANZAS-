/* El PIN antiguo (solo bloqueo, 4 números) debe seguir funcionando para quien ya lo tenía. */
const { chromium } = require('playwright'), srv = require('./srv'), crypto = require('crypto');
(async () => {
  const s = await srv(8814), b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 390, height: 900 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8814/'); await p.waitForTimeout(800);
  await p.evaluate(h => localStorage.setItem('finanzas-pin', h), crypto.createHash('sha256').update('fp1:1234').digest('hex'));
  await p.reload(); await p.waitForTimeout(900);
  const locked = await p.evaluate(() => !document.getElementById('lock').hidden);
  await p.fill('#lock-in', '9999'); await p.click('#lock-form button[type=submit]'); await p.waitForTimeout(300);
  const still = await p.evaluate(() => !document.getElementById('lock').hidden);
  await p.fill('#lock-in', '1234'); await p.click('#lock-form button[type=submit]'); await p.waitForTimeout(300);
  const open = await p.evaluate(() => document.getElementById('lock').hidden);
  await p.evaluate(() => window.__sv('ajustes')); await p.click('#pin-card > :first-child');
  const msg = await p.textContent('#pin-state');
  const ok = locked && still && open && /antiguo/.test(msg) && !errs.length;
  console.log(ok ? 'OK' : 'FALLO', { locked, still, open, msg, errs }); await b.close(); s.close(); process.exit(ok ? 0 : 1);
})();
