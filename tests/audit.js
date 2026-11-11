/* Auditoría: todas las pantallas, 5 anchos, claro/oscuro, con y sin datos.
   Revisa: errores de consola, desborde horizontal, iconos sin dibujar.  node tests/audit.js [--shots dir] */
const { chromium } = require('playwright'), srv = require('./srv'), seed = require('./seed');
const VIEWS = (process.env.VIEWS || 'resumen,registrar,historial,gastos,ahorro,cuentas,tendencia,plantillas,categorias,logros,ajustes').split(',');
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : '';
(async () => {
  const s = await srv(8811), b = await chromium.launch(); let bad = 0, n = 0;
  for (const dark of [false, true]) for (const empty of [false, true]) for (const w of [320, 390, 430, 768, 1280]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: dark ? 'dark' : 'light' }), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('http://localhost:8811/'); await p.waitForTimeout(900);
    if (!empty) { await p.evaluate(seed); await p.reload(); await p.waitForTimeout(900); }
    for (const v of VIEWS) {
      await p.evaluate(v => window.__sv(v), v); await p.waitForTimeout(250);
      const r = await p.evaluate(() => { const de = document.documentElement, vw = de.clientWidth;
        const out = [...document.querySelectorAll('#app *')].filter(e => { if (e.closest('[hidden]')) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > vw + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.tbl-wrap,[style*="overflow-x"]'); }).length;
        return { o: de.scrollWidth > de.clientWidth + 1, out, ic: [...document.querySelectorAll('i[data-lucide]')].filter(e => !e.closest('[hidden]')).length }; });
      n++;
      if (r.o || r.out || r.ic || errs.length) { bad++; console.log(`${dark ? 'oscuro' : 'claro'} ${empty ? 'vacío' : 'datos'} ${w} ${v}`, JSON.stringify(r), errs.splice(0).slice(0, 2).join(' | ')); }
      if (shots && (w === 390 || w === 1280) && !dark && !empty) await p.screenshot({ path: `${shots}/${v}-${w}.png`, fullPage: true });
    }
    await ctx.close();
  }
  console.log(`revisadas ${n} combinaciones, con problemas: ${bad}`); await b.close(); s.close(); process.exit(bad ? 1 : 0);
})();
