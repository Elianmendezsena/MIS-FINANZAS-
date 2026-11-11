  /* ---- Metas, límites y avisos ---- */
  function goalVal() { return state.goal && state.goal.amount > 0 ? val({ amount: state.goal.amount, cur: state.goal.cur || 'DOP' }) : 0; }
  /* Presupuestos por mes: cada mes puede tener el suyo; si no, hereda el del mes anterior más reciente. */
  function pickMonth(obj, k) { var ks = Object.keys(obj || {}).filter(function (x) { return x <= k; }).sort(); return ks.length ? ks[ks.length - 1] : ''; }
  function mbEntry(k) { k = k || view; var s = pickMonth(state.mBud, k); return s ? { e: state.mBud[s], from: s } : { e: state.monthBudget, from: '' }; }
  function limMap(k) { k = k || view; var s = pickMonth(state.cBud, k); return s ? { m: state.cBud[s], from: s } : { m: state.budgets || {}, from: '' }; }
  function lmEdit(fn, k) { k = k || view; var m = clone(limMap(k).m); fn(m); state.cBud[k] = m; }
  function limitVal(cat, k) { var b = limMap(k).m[cat]; return b && b.amount > 0 ? val({ amount: b.amount, cur: b.cur || 'DOP' }) : 0; }
  function spentCat(cat) { return sum(monthTxs().filter(function (t) { return t.kind === 'gasto' && t.cat === cat && !t.pending; })); }
  function budgetNote(cat) {
    var lim = limitVal(cat);
    if (!lim) return '';
    var p = spentCat(cat) / lim * 100;
    if (p >= 100) return ' · ¡Pasaste el límite de ' + cat + '!';
    if (p >= 80) return ' · Vas al ' + Math.round(p) + '% del límite de ' + cat;
    return '';
  }
  function pctAt(cat, mk) {
    var lim = limitVal(cat, mk);
    if (!lim) return 0;
    var sp = sum(state.txs.filter(function (t) { return inCur(t) && t.kind === 'gasto' && t.cat === cat && !t.pending && t.date.slice(0, 7) === mk; }));
    return sp / lim * 100;
  }
  /* Aviso fuerte cuando un gasto cruza el 80 % o el 100 % del límite. Se llama justo después del toast normal. */
  function crossWarn(cat, pre, mk) {
    var post = pctAt(cat, mk), over = pre < 100 && post >= 100, near = pre < 80 && post >= 80 && post < 100;
    if (!over && !near) return;
    var t = $('toast');
    t.classList.add('toast-warn');
    var sp = t.firstChild;
    if (sp) sp.textContent = (over ? '⚠ Pasaste el límite de ' + cat + ' (' + Math.round(post) + '%)' : '⚠ Ya vas al ' + Math.round(post) + '% del límite de ' + cat);
    vib([40, 70, 40]);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 8000);
  }
  function otherCurHint() {
    var other = state.cur === 'USD' ? 'RD$' : 'US$';
    return state.txs.some(function (t) { return !inCur(t); }) ? 'Tus movimientos en ' + other + ' no se mezclan con estos. Cambia de moneda desde el menú para verlos.' : '';
  }
  function emptyState(icon, title, text, btn, go) {
    return '<div class="empty"><span class="empty-ic"><i data-lucide="' + icon + '"></i></span><p class="font-semibold">' + title + '</p><p class="muted text-sm">' + text + '</p>' +
      (btn ? '<button type="button" class="btn-primary" style="width:auto;padding-inline:1.1rem" data-go="' + go + '">' + btn + '</button>' : '') + '</div>';
  }
  function renderBudgets() {
    var el = $('budgets');
    if (!el) return;
    var bm = $('bud-month');
    if (bm) {
      var me = mbEntry(view), lm = limMap(view), ml = monthLabel().toLowerCase();
      var src = function (from, has) {
        if (from === view) return 'definido para ' + ml;
        if (from) return 'igual que ' + mkLabel(from).toLowerCase() + ' (si lo cambias, aplica desde ' + ml + ')';
        return has ? 'el que ya tenías (si lo cambias, aplica desde ' + ml + ')' : 'aún sin definir';
      };
      bm.innerHTML = 'Presupuesto total: ' + esc(src(me.from, !!(me.e && me.e.amount > 0))) + '.<br>Límites por categoría: ' + esc(src(lm.from, Object.keys(lm.m).length > 0)) + '.';
    }
    var withLim = state.cats.gasto.filter(function (c) { return limitVal(c.n) > 0; });
    var without = state.cats.gasto.filter(function (c) { return !(limitVal(c.n) > 0); });
    var bl = $('bud-line');
    if (bl) {
      var near = withLim.filter(function (c) { return spentCat(c.n) / limitVal(c.n) >= 0.8; }).length;
      bl.textContent = !withLim.length ? 'Sin límites' : near ? near + ' de ' + withLim.length + ' al 80% o más' : withLim.length + (withLim.length === 1 ? ' límite' : ' límites') + ' · todo en orden';
    }
    el.innerHTML = withLim.length ? withLim.map(function (c) {
      var lim = limitVal(c.n), sp = spentCat(c.n), p = sp / lim * 100;
      var col = p >= 100 ? 'var(--bad)' : p >= 80 ? 'var(--warn)' : 'var(--good)';
      return '<li class="bud"><div class="flex items-center justify-between gap-2"><span class="font-semibold min-w-0 grow">' + esc(c.n) + '</span>' +
        '<span class="relative block" style="width:8.5rem"><span class="prefix">' + SYM[state.cur] + '</span>' +
        '<input class="field field-prefix money" type="text" inputmode="decimal" min="0" step="0.01" data-bud="' + esc(c.n) + '" value="' + cm(r2(lim)) + '" aria-label="Límite mensual de ' + esc(c.n) + '"></span>' +
        '<button type="button" class="icon-btn" data-budx="' + esc(c.n) + '" aria-label="Quitar límite de ' + esc(c.n) + '"><i data-lucide="x"></i></button></div>' +
        '<div class="meter" style="height:8px"><i style="width:' + Math.min(100, p) + '%;background:' + col + '"></i></div><p class="note">' + fmt(sp) + ' de ' + fmt(lim) + ' (' + Math.round(p) + '%)</p>' +
      '</li>';
    }).join('') : '<li class="note">Aún no tienes límites. Agrega uno abajo.</li>';
    var sel = $('bud-cat'), prev = sel.value;
    sel.innerHTML = without.map(function (c) { return '<option value="' + esc(c.n) + '">' + esc(c.n) + '</option>'; }).join('');
    if (without.some(function (c) { return c.n === prev; })) sel.value = prev;
    $('bud-add').hidden = !without.length;
  }
  function renderRec() {
    var box = $('rec-list');
    if (!box) return;
    var L = state.txs.filter(function (t) { return t.rec && REC_LABEL[t.rec]; });
    if (!L.length) { box.innerHTML = '<p class="note">Nada por semana ni por quincena.</p>'; return; }
    var mo = 0;
    L.forEach(function (t) {
      if (t.kind !== 'gasto' || (t.cur || 'DOP') !== state.cur) return;
      mo += t.amount * (t.rec === 'semanal' ? 52 / 12 : t.rec === 'quincenal' ? 2 : 1);
    });
    mo = r2(mo);
    var row = function (l, v) { return '<div style="display:flex;justify-content:space-between;gap:8px"><span>' + l + '</span><strong>' + v + '</strong></div>'; };
    var tot = mo > 0 ? '<div style="display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-radius:12px;background:var(--surface-2)">' + row('Pagos fijos al mes', fmt(mo)) + row('Pagos fijos al año', fmt(r2(mo * 12))) + '</div>' : '';
    var sorted = L.slice().sort(function (x, y) { return nthDate(x.date, x.rec, (x.recN || 0) + 1) < nthDate(y.date, y.rec, (y.recN || 0) + 1) ? -1 : 1; });
    box.innerHTML = tot + '<ul class="cat-list">' + sorted.map(function (t) {
      var nx = nthDate(t.date, t.rec, (t.recN || 0) + 1), inc = t.kind === 'ingreso';
      return '<li class="flex items-center gap-2"><div class="min-w-0 grow"><div class="font-semibold">' + esc(t.note || t.cat) + '</div>' +
        '<div class="note">' + (inc ? 'Ingreso' : 'Gasto') + ' · ' + esc(t.cat) + ' · ' + fmtFull(t.amount, t.cur || 'DOP') + ' · ' + REC_LABEL[t.rec] + ' · Próximo: ' + esc(dShort(parseDate(nx))) + '</div></div>' +
        '<button type="button" class="btn-ghost btn-danger" style="min-height:40px" data-recstop="' + esc(t.id) + '">Detener</button></li>';
    }).join('') + '</ul>';
  }
