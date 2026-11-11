  /* ---- Proyección, comparación, mayores gastos, año y etiquetas ---- */
  function renderProj() {
    var el = $('proj-card');
    if (!el) return;
    var now = new Date(), hide = function () { el.style.display = 'none'; el.innerHTML = ''; };
    if (view !== toKey(now)) { hide(); return; }
    var day = now.getDate(), last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var sp = sum(monthTxs().filter(function (t) { return t.kind === 'gasto' && !t.pending; }));
    if (day < 3 || !(sp > 0)) { hide(); return; }
    var proj = r2(sp / day * last), lim = mbVal(), extra = '';
    if (lim > 0) extra = proj <= lim ? ' Quedarías <strong style="color:var(--good)">' + fmt(r2(lim - proj)) + '</strong> por debajo de tu presupuesto.'
      : ' Te pasarías <strong style="color:var(--bad)">' + fmt(r2(proj - lim)) + '</strong> de tu presupuesto.';
    el.style.display = '';
    el.innerHTML = '<p class="eyebrow">Proyección del mes</p><p class="text-sm">A este ritmo cerrarás con unos <strong>' + esc(fmt(proj)) + '</strong> en gastos.' + extra + '</p>' +
      '<p class="note">Cálculo simple: lo gastado ÷ ' + day + ' días × ' + last + ' días del mes.</p>';
  }
  function expByCat(k, kind) {
    var m = {}, kd = kind || 'gasto';
    state.txs.forEach(function (t) {
      if (!inCur(t) || t.kind !== kd || t.pending || t.date.slice(0, 7) !== k) return;
      m[t.cat] = r2((m[t.cat] || 0) + val(t));
    });
    return m;
  }
  function prevKey() { return toKey(new Date(+view.slice(0, 4), +view.slice(5, 7) - 2, 1)); }
  function sumObj(o) { var t = 0; Object.keys(o).forEach(function (k) { t += o[k]; }); return r2(t); }
  function renderGxSum() {
    var el = $('gx-sum');
    if (!el || !lastKpi) return;
    var pk = prevKey(), pe = sumObj(expByCat(pk, 'gasto')), pi = sumObj(expByCat(pk, 'ingreso'));
    var left = r2(lastKpi.inc - lastKpi.exp);
    var dl = function (cu, pr, upGood) {
      if (!(pr > 0)) return '';
      var d = (cu - pr) / pr * 100;
      if (Math.abs(d) < 0.5) return 'igual';
      var good = upGood ? d > 0 : d < 0;
      return '<b style="color:var(--' + (good ? 'good' : 'bad') + ')">' + (d > 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(d)) + '%</b>';
    };
    var parts = [], g = dl(lastKpi.exp, pe, false), i = dl(lastKpi.inc, pi, true);
    if (g) parts.push('gastos ' + g);
    if (i) parts.push('ingresos ' + i);
    el.innerHTML = '<p class="eyebrow">' + esc(monthLabel()) + '</p>' +
      '<div class="wk"><div><p class="eyebrow">Ingresos</p><b style="color:var(--good)">' + esc(fmt(lastKpi.inc)) + '</b></div>' +
      '<div><p class="eyebrow">Gastos</p><b>' + esc(fmt(lastKpi.exp)) + '</b></div>' +
      '<div><p class="eyebrow">' + (left >= 0 ? 'Te queda' : 'Te falta') + '</p><b style="color:var(--' + (left >= 0 ? 'good' : 'bad') + ')">' + esc(fmt(Math.abs(left))) + '</b></div></div>' +
      (parts.length ? '<p class="gx-note">Frente a ' + esc(mkLabel(pk).toLowerCase()) + ': ' + parts.join(' · ') + '</p>' : '');
  }
  function renderAccExp() {
    var el = $('acc-exp-card');
    if (!el) return;
    var m = {}, n = {}, total = 0;
    monthTxs().forEach(function (t) {
      if (t.kind !== 'gasto' || t.pending) return;
      var id = accOk(t.acc) ? t.acc : '';
      m[id] = r2((m[id] || 0) + val(t)); n[id] = (n[id] || 0) + 1; total = r2(total + val(t));
    });
    var ids = Object.keys(m).sort(function (x, z) { return m[z] - m[x]; });
    if (!ids.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
    el.style.display = '';
    var nm = function (id) { return id ? accName(id) : 'Sin cuenta'; }, top = ids[0];
    el.innerHTML = '<div><h2 id="h-accexp" class="text-xl font-bold">Gastos por cuenta</h2>' +
      '<p class="text-sm muted">Con qué cuenta o tarjeta pagaste en ' + esc(monthLabel().toLowerCase()) + '.</p>' +
      '<p class="sum-line">' + esc(nm(top)) + ' · ' + esc(fmt(m[top])) + ' (' + Math.round(m[top] / total * 100) + '%)' + (ids.length > 1 ? ' · +' + (ids.length - 1) + (ids.length === 2 ? ' cuenta' : ' cuentas') : '') + '</p></div>' +
      '<div class="gx-rows">' + ids.map(function (id) {
        var p = m[id] / total * 100;
        return '<div><div class="rw"><span class="nm">' + esc(nm(id)) + '<span class="note" style="display:block;font-weight:400">' + n[id] + (n[id] === 1 ? ' gasto' : ' gastos') + ' · ' + Math.round(p) + '%</span></span><span class="am">' + esc(fmt(m[id])) + '</span></div>' +
          '<div class="meter" style="height:8px"><i style="width:' + Math.max(2, Math.round(m[id] / m[top] * 100)) + '%;background:var(--accent)"></i></div></div>';
      }).join('') + '</div>';
  }
  function renderYear() {
    var box = $('year-box');
    if (!box || curView !== 'tendencia') return;
    var y = +view.slice(0, 4), rows = '', TI = 0, TE = 0, m;
    $('year-sub').textContent = 'Año ' + y;
    for (m = 0; m < 12; m++) {
      var k = y + '-' + pad(m + 1), inc = 0, exp = 0;
      state.txs.forEach(function (t) {
        if (!inCur(t) || t.pending || t.date.slice(0, 7) !== k) return;
        if (t.kind === 'ingreso') inc += val(t); else exp += val(t);
      });
      inc = r2(inc); exp = r2(exp); TI += inc; TE += exp;
      var lbl = new Date(y, m, 1).toLocaleDateString('es-DO', { month: 'short' }).replace('.', ''), bal = r2(inc - exp);
      rows += '<tr data-m="' + k + '"' + (k === view ? ' class="cur"' : '') + '><td>' + esc(lbl.charAt(0).toUpperCase() + lbl.slice(1)) + '</td><td' + (inc ? ' style="color:var(--good)"' : ' class="z"') + '>' + (inc ? esc(fmt(inc)) : '–') + '</td><td' + (exp ? ' style="color:var(--bad)"' : ' class="z"') + '>' + (exp ? esc(fmt(exp)) : '–') + '</td><td' + (inc || exp ? ' style="color:var(--' + (bal < 0 ? 'bad' : 'ink') + ')"' : ' class="z"') + '>' + (inc || exp ? esc(fmt(bal)) : '–') + '</td></tr>';
    }
    TI = r2(TI); TE = r2(TE);
    box.innerHTML = '<div style="overflow-x:auto"><table class="yr"><thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Balance</th></tr></thead><tbody>' + rows +
      '</tbody><tfoot><tr><td>Total</td><td style="color:var(--good)">' + esc(fmt(TI)) + '</td><td style="color:var(--bad)">' + esc(fmt(TE)) + '</td><td>' + esc(fmt(r2(TI - TE))) + '</td></tr></tfoot></table></div>';
  }
  $('year-box').addEventListener('click', function (ev) {
    var r = ev.target.closest('[data-m]');
    if (!r) return;
    view = r.getAttribute('data-m');
    render();
  });
  function renderTags() {
    var el = $('tag-chips');
    if (!el) return;
    var cnt = {}, re = /#[\p{L}\p{N}_]+/gu;
    state.txs.forEach(function (t) {
      if (!inCur(t) || !t.note) return;
      var m = t.note.toLowerCase().match(re);
      if (m) m.forEach(function (x) { cnt[x] = (cnt[x] || 0) + 1; });
    });
    var tags = Object.keys(cnt).sort(function (x, z) { return cnt[z] - cnt[x] || (x < z ? -1 : 1); }).slice(0, 12), q = $('h-q').value.trim().toLowerCase();
    if (!tags.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
    el.style.display = '';
    el.innerHTML = tags.map(function (x) { return '<button type="button" class="day-opt" data-tag="' + esc(x) + '" aria-pressed="' + (q === x) + '">' + esc(x) + ' · ' + cnt[x] + '</button>'; }).join('');
  }
  $('tag-chips').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-tag]');
    if (!b) return;
    var t = b.getAttribute('data-tag');
    $('h-q').value = $('h-q').value.trim().toLowerCase() === t ? '' : t;
    renderHistory();
  });

