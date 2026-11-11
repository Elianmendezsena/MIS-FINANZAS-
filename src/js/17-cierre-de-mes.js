  /* ---- Cierre de mes ---- */
  function closeHTML(k, short) {
    var inc = 0, exp = 0, sav = 0, by = {}, n = 0;
    state.txs.forEach(function (t) {
      if (!inCur(t) || t.pending || t.date.slice(0, 7) !== k) return;
      n++;
      if (t.kind === 'ingreso') inc += val(t); else { exp += val(t); by[t.cat] = (by[t.cat] || 0) + val(t); }
    });
    ledger().forEach(function (e) { if (!e.open && e.date.slice(0, 7) === k) sav = r2(sav + e.sign * e.amount); });
    inc = r2(inc); exp = r2(exp);
    if (!n && !sav) return '';
    var pk = toKey(new Date(+k.slice(0, 4), +k.slice(5, 7) - 2, 1)), pe = 0;
    state.txs.forEach(function (t) { if (inCur(t) && !t.pending && t.kind === 'gasto' && t.date.slice(0, 7) === pk) pe += val(t); });
    pe = r2(pe);
    var row = function (a, b) { return '<div class="cl-row"><span>' + a + '</span><b>' + b + '</b></div>'; };
    var dif = r2(inc - exp), lim = mbVal(k), cats = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }), out = '';
    out += row('Ingresaste', '<span style="color:var(--good)">' + esc(fmt(inc)) + '</span>');
    out += row('Gastaste', '<span style="color:var(--bad)">' + esc(fmt(exp)) + '</span>');
    if (!short) out += row('Ahorraste', esc(fmt(sav)));
    out += row(dif >= 0 ? 'Te sobró' : 'Te faltó', '<span style="color:var(--' + (dif >= 0 ? 'good' : 'bad') + ')">' + esc(fmt(Math.abs(dif))) + '</span>');
    if (short) return out;
    if (lim > 0) { var pc = exp / lim * 100; out += row('Presupuesto', '<span style="color:var(--' + (pc > 100 ? 'bad' : 'good') + ')">' + Math.round(pc) + '% de ' + esc(fmt(lim)) + '</span>'); }
    if (cats.length) out += row('Categoría principal', esc(cats[0]) + ' (' + Math.round(by[cats[0]] / exp * 100) + '%)');
    if (pe > 0 && exp > 0) { var d = (exp - pe) / pe * 100; out += row('Frente a ' + esc(mkLabel(pk).toLowerCase()), '<span style="color:var(--' + (Math.abs(d) < 0.5 ? 'muted' : d < 0 ? 'good' : 'bad') + ')">' + (Math.abs(d) < 0.5 ? 'igual' : (d >= 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(d)) + '%') + '</span>'); }
    var over = cats.filter(function (c) { var l = limitVal(c, k); return l > 0 && by[c] > l; });
    if (over.length) out += row('Pasaste el límite en', '<span style="color:var(--bad)">' + esc(over.join(', ')) + '</span>');
    return out;
  }
  function closeText(k) {
    var inc = 0, exp = 0, sav = 0, by = {}, n = 0;
    state.txs.forEach(function (t) {
      if (!inCur(t) || t.pending || t.date.slice(0, 7) !== k) return;
      n++;
      if (t.kind === 'ingreso') inc += val(t); else { exp += val(t); by[t.cat] = (by[t.cat] || 0) + val(t); }
    });
    ledger().forEach(function (e) { if (!e.open && e.date.slice(0, 7) === k) sav = r2(sav + e.sign * e.amount); });
    inc = r2(inc); exp = r2(exp);
    var dif = r2(inc - exp), lim = mbVal(k), cats = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).slice(0, 3);
    var L = ['Resumen de ' + mkLabel(k).toLowerCase(), '', 'Ingresos: ' + fmt(inc), 'Gastos: ' + fmt(exp), (dif >= 0 ? 'Me sobró: ' : 'Me faltó: ') + fmt(Math.abs(dif))];
    if (sav) L.push('Ahorro: ' + fmt(sav));
    if (lim > 0) L.push('Presupuesto: ' + Math.round(exp / lim * 100) + '% de ' + fmt(lim));
    if (cats.length) { L.push('', 'Lo que más pesó:'); cats.forEach(function (c) { L.push('• ' + c + ': ' + fmt(r2(by[c])) + ' (' + Math.round(by[c] / exp * 100) + '%)'); }); }
    L.push('', 'Hecho con Mis Finanzas');
    return L.join('\n');
  }
  function shareText(text) {
    var wa = function () { try { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener'); } catch (e) { toast('No pude abrir WhatsApp', null, null, true); } };
    if (navigator.share) { navigator.share({ text: text }).catch(function (err) { if (!err || err.name !== 'AbortError') wa(); }); }
    else wa();
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-share]');
    if (b) shareText(closeText(b.getAttribute('data-share')));
  });
  function renderClose() {
    var el = $('close-card');
    if (!el) return;
    var body = closeHTML(view), cur = view === toKey(new Date());
    el.innerHTML = '<div><h2 id="h-close" class="text-xl font-bold">Cierre de ' + esc(monthLabel().toLowerCase()) + '</h2><p class="text-sm muted">' + (cur ? 'El mes sigue en curso: estos números cambian hasta que termine.' : 'Así terminó el mes.') + '</p></div>' +
      (body ? body + '<button type="button" class="link-btn" data-share="' + view + '"><i data-lucide="share-2" class="sm"></i>Compartir por WhatsApp</button>' : '<p class="note">No hay movimientos en este mes.</p>');
  }
  function renderCloseBanner() {
    var el = $('close-banner');
    if (!el) return;
    var now = new Date(), pk = toKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)), hide = function () { el.style.display = 'none'; el.innerHTML = ''; };
    if (now.getDate() > 10 || lsGet('finanzas-cierre', '') === pk) { hide(); return; }
    var body = closeHTML(pk, true);
    if (!body) { hide(); return; }
    el.style.display = '';
    el.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div><p class="eyebrow">Cierre de mes</p><h2 class="text-xl font-bold">' + esc(mkLabel(pk)) + '</h2></div>' +
      '<button type="button" class="icon-btn" data-closex="' + pk + '" aria-label="Cerrar el resumen"><i data-lucide="x"></i></button></div>' + body +
      '<div class="flex flex-wrap gap-4"><button type="button" class="link-btn" data-closego="' + pk + '">Ver el cierre completo<i data-lucide="chevron-right" class="sm"></i></button>' +
      '<button type="button" class="link-btn" data-share="' + pk + '"><i data-lucide="share-2" class="sm"></i>Compartir</button></div>';
  }
  $('close-banner').addEventListener('click', function (ev) {
    var x = ev.target.closest('[data-closex]'), g = ev.target.closest('[data-closego]');
    if (x) { lsSet('finanzas-cierre', x.getAttribute('data-closex')); renderCloseBanner(); }
    else if (g) { view = g.getAttribute('data-closego'); render(); setView('tendencia'); }
  });

