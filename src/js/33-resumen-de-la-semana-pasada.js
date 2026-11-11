  /* ---- Resumen de la semana pasada ---- */
  function renderRecap() {
    var el = $('wk-recap'), now = new Date(), dow = (now.getDay() + 6) % 7, i;
    var hide = function () { el.innerHTML = ''; el.style.display = 'none'; };
    var mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow - 7);
    var keys = [], pk = [];
    for (i = 0; i < 7; i++) {
      keys.push(ymd(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i)));
      pk.push(ymd(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 7 + i)));
    }
    if (dow > 2 || lsGet('finanzas-recap', '') === keys[0]) { hide(); return; }
    var exp = 0, inc = 0, prev = 0, byCat = {};
    state.txs.forEach(function (t) {
      if (t.pending || t.ex) return;
      var v = val(t);
      if (!v) return;
      if (keys.indexOf(t.date) >= 0) { if (t.kind === 'ingreso') inc += v; else { exp += v; byCat[t.cat] = (byCat[t.cat] || 0) + v; } }
      else if (pk.indexOf(t.date) >= 0 && t.kind === 'gasto') prev += v;
    });
    exp = r2(exp); inc = r2(inc);
    if (!(exp > 0 || inc > 0)) { hide(); return; }
    el.style.display = '';
    var topCat = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; })[0];
    var fm = function (k) { return parseDate(k).toLocaleDateString('es-DO', { day: 'numeric', month: 'short' }); };
    var cmp = '';
    if (exp > 0 && prev > 0) {
      var d = (exp - prev) / prev * 100;
      cmp = '<p class="note" style="font-weight:600;color:var(--' + (Math.abs(d) < 0.5 ? 'muted' : d < 0 ? 'good' : 'bad') + ')">' + (d >= 0 ? '▲ ' : '▼ ') + Math.abs(d).toLocaleString('es-DO', { maximumFractionDigits: 0 }) + '% vs. la anterior</p>';
    }
    el.setAttribute('data-wk', keys[0]);
    el.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px"><div><h2 class="text-xl font-bold">Tu semana pasada</h2><span class="text-sm muted block">' + esc(fm(keys[0])) + ' al ' + esc(fm(keys[6])) + '</span></div>' +
      '<button type="button" class="icon-btn" data-recap="x" aria-label="Cerrar el resumen"><i data-lucide="x"></i></button></div>' +
      '<div class="wk"><div><p class="eyebrow">Gastaste</p><b>' + fmt(exp) + '</b>' + cmp + '</div>' +
      '<div><p class="eyebrow">Ingresaste</p><b>' + fmt(inc) + '</b></div>' +
      '<div><p class="eyebrow">Categoría principal</p><b>' + esc(topCat || '—') + '</b>' + (topCat ? '<p class="note">' + fmt(r2(byCat[topCat])) + '</p>' : '') + '</div></div>';
  }
  $('wk-recap').addEventListener('click', function (ev) {
    if (!ev.target.closest('[data-recap]')) return;
    lsSet('finanzas-recap', $('wk-recap').getAttribute('data-wk') || '');
    renderRecap();
  });

