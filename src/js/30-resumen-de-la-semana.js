  /* ---- Resumen de la semana ---- */
  function renderWeek() {
    var el = $('week-card'), now = new Date(), dow = (now.getDay() + 6) % 7, i;
    var mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
    var keys = [], prevKeys = [];
    for (i = 0; i < 7; i++) {
      keys.push(ymd(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i)));
      prevKeys.push(ymd(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 7 + i)));
    }
    var byDay = {}, byCat = {}, total = 0, prev = 0;
    state.txs.forEach(function (t) {
      if (t.pending || t.kind !== 'gasto') return;
      var v = val(t);
      if (keys.indexOf(t.date) >= 0) { byDay[t.date] = (byDay[t.date] || 0) + v; byCat[t.cat] = (byCat[t.cat] || 0) + v; total += v; }
      else if (prevKeys.indexOf(t.date) >= 0) prev += v;
    });
    total = r2(total);
    if (!(total > 0)) { el.innerHTML = ''; el.style.display = 'none'; return; }
    el.style.display = '';
    var topDay = Object.keys(byDay).sort(function (a, b) { return byDay[b] - byDay[a]; })[0];
    var topCat = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; })[0];
    var fm = function (k) { return parseDate(k).toLocaleDateString('es-DO', { day: 'numeric', month: 'short' }); };
    var cmpTxt = '';
    if (prev > 0) {
      var d = (total - prev) / prev * 100;
      cmpTxt = '<p class="note" style="font-weight:600;color:var(--' + (Math.abs(d) < 0.5 ? 'muted' : d < 0 ? 'good' : 'bad') + ')">' + (d >= 0 ? '▲ ' : '▼ ') + Math.abs(d).toLocaleString('es-DO', { maximumFractionDigits: 0 }) + '% vs. la semana pasada</p>';
    }
    el.innerHTML = '<summary class="sum"><span><h2 class="text-xl font-bold">Esta semana</h2><span class="text-sm muted block">' + esc(fm(keys[0])) + ' al ' + esc(fm(keys[6])) + '</span></span><span class="sum-r">' + fmt(total) + '<i data-lucide="chevron-down" class="sm sum-ch"></i></span></summary>' +
      '<div class="wk"><div><p class="eyebrow">Gastaste</p><b>' + fmt(total) + '</b>' + cmpTxt + '</div>' +
      '<div><p class="eyebrow">Día más caro</p><b>' + esc(parseDate(topDay).toLocaleDateString('es-DO', { weekday: 'long' })) + '</b><p class="note">' + fmt(r2(byDay[topDay])) + '</p></div>' +
      '<div><p class="eyebrow">Categoría principal</p><b>' + esc(topCat) + '</b><p class="note">' + fmt(r2(byCat[topCat])) + '</p></div></div>';
  }

