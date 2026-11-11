  /* ---- Secciones plegables (menos carga visual) ---- */
  var COLLAP_DEF = { 'tf-form': 1, 'tfl-card': 1, 'sim-box': 1, 'plan-card': 1, 'bud-card': 1, 'trash-card': 1, 'rs-card': 1, 'acc-exp-card': 1, 'name-card': 1, 'pers-card': 1, 'home-card': 1, 'pin-card': 1, 'exp-card': 1, 'bk-card': 1 };
  function collapState() { try { return JSON.parse(lsGet('finanzas-collap', '{}')) || {}; } catch (e) { return {}; } }
  function collapInit() {
    var st = collapState();
    document.querySelectorAll('.collap').forEach(function (el) {
      var h = el.firstElementChild;
      if (!h) return;
      var closed = el.id in st ? !!st[el.id] : !!COLLAP_DEF[el.id];
      el.classList.toggle('is-closed', closed);
      h.setAttribute('role', 'button'); h.setAttribute('tabindex', '0'); h.setAttribute('aria-expanded', closed ? 'false' : 'true');
    });
  }
  function collapOpen(id) {
    var el = $(id), st = collapState();
    if (!el) return;
    el.classList.remove('is-closed'); st[id] = 0;
    lsSet('finanzas-collap', JSON.stringify(st));
    if (el.firstElementChild) el.firstElementChild.setAttribute('aria-expanded', 'true');
  }
  function collapToggle(h) {
    var el = h.parentElement, st = collapState();
    st[el.id] = el.classList.toggle('is-closed') ? 1 : 0;
    h.setAttribute('aria-expanded', st[el.id] ? 'false' : 'true');
    lsSet('finanzas-collap', JSON.stringify(st));
  }
  document.addEventListener('click', function (ev) {
    if (ev.target.closest('#plan-mini [data-go], #due-banner [data-go], #planrec-list [data-go]')) {
      var pc = $('plan-card');
      if (pc && pc.classList.contains('is-closed')) { pc.classList.remove('is-closed'); var st0 = collapState(); st0['plan-card'] = 0; lsSet('finanzas-collap', JSON.stringify(st0)); collapInit(); }
    }
    var h = ev.target.closest('.collap > :first-child');
    if (h && !ev.target.closest('button,a,input,select')) collapToggle(h);
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    var h = ev.target.matches && ev.target.matches('.collap > :first-child') ? ev.target : null;
    if (h) { ev.preventDefault(); collapToggle(h); }
  });
  function moreHint() {
    var el = $('more-hint'), d = $('f-fecha').value, parts = [], r = document.querySelector('#tx-form [data-rec][aria-pressed="true"]');
    if (!el) return;
    parts.push(!d || d === todayStr() ? 'hoy' : d === dayStr(1) ? 'ayer' : dShort(parseDate(d)));
    if (r && r.getAttribute('data-rec') !== 'none') parts.push((REC_LABEL[r.getAttribute('data-rec')] || '').toLowerCase());
    if ($('f-nota').value.trim()) parts.push('con nota');
    if ($('f-pend') && $('f-pend').checked) parts.push('pendiente');
    el.textContent = '· ' + parts.join(', ');
  }
  ['input', 'change', 'click', 'submit'].forEach(function (n) { $('tx-form').addEventListener(n, function () { setTimeout(moreHint, 0); }); });
  /* Botón + : se esconde al bajar y vuelve al subir */
  var lastY = window.pageYOffset || 0;
  window.addEventListener('scroll', function () {
    var w = document.querySelector('.fab-wrap');
    if (!w) return;
    var y = window.pageYOffset || 0;
    if (w.querySelector('.fab[aria-expanded="true"]') || y < 80 || y < lastY - 4) w.classList.remove('fab-hide');
    else if (y > lastY + 6) w.classList.add('fab-hide');
    lastY = y;
  }, { passive: true });
  /* Inicio a tu gusto */
  var HOME = [['mb-card', 'Presupuesto del mes'], ['plan-mini', 'Plan del mes'], ['proj-card', 'Proyección del mes'], ['close-banner', 'Cierre del mes anterior'], ['recent', 'Últimos movimientos'], ['wk-recap', 'Tu semana pasada'], ['week-card', 'Esta semana'], ['bal-card', 'Saldo día a día'], ['tip', 'Consejo'], ['cheer', 'Mensajes de ánimo']];
  var HOME_GX = [['gx-sum', 'Resumen del mes'], ['cat-card', 'Gastos por categoría'], ['acc-exp-card', 'Gastos por cuenta'], ['plan-card', 'Gastos e ingresos seguros'], ['bud-card', 'Límites por categoría']];
  function homeHidden() { try { var a = JSON.parse(lsGet('finanzas-hide', '[]')); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function applyHome() {
    var h = homeHidden(), box = $('home-list');
    HOME.concat(HOME_GX).forEach(function (x) { document.documentElement.classList.toggle('hid-' + x[0], h.indexOf(x[0]) >= 0); });
    if (!box) return;
    var row = function (x) { return '<label class="chk"><input type="checkbox" data-home="' + x[0] + '"><span>' + x[1] + '</span></label>'; };
    if (!box.firstChild) box.innerHTML = '<p class="eyebrow">Inicio</p>' + HOME.map(row).join('') + '<p class="eyebrow" style="margin-top:12px">Ingresos y gastos</p>' + HOME_GX.map(row).join('');
    box.querySelectorAll('[data-home]').forEach(function (c) { c.checked = h.indexOf(c.getAttribute('data-home')) < 0; });
  }
  $('home-list').addEventListener('change', function (ev) {
    var c = ev.target.closest('[data-home]');
    if (!c) return;
    var id = c.getAttribute('data-home'), h = homeHidden().filter(function (x) { return x !== id; });
    if (!c.checked) h.push(id);
    lsSet('finanzas-hide', JSON.stringify(h));
    applyHome();
  });
  /* Desde la versión 20, Inicio arranca con lo esencial; lo demás se enciende en Ajustes. Se aplica una sola vez. */
  if (lsGet('finanzas-def20', '') !== '1') {
    var h20 = homeHidden();
    ['proj-card', 'close-banner', 'wk-recap', 'week-card', 'bal-card', 'tip', 'cheer'].forEach(function (id) { if (h20.indexOf(id) < 0) h20.push(id); });
    lsSet('finanzas-hide', JSON.stringify(h20)); lsSet('finanzas-def20', '1');
  }
  applyHome();
  var rzT = 0;
  window.addEventListener('resize', function () { clearTimeout(rzT); rzT = setTimeout(function () { if (balSeries) renderBalChart(); }, 150); });

  function fillCats(keep) {
    var sel = $('f-cat'), prev = keep || sel.value, list = state.cats[kind];
    sel.innerHTML = list.map(function (c) { return '<option value="' + esc(c.n) + '">' + esc(c.n) + '</option>'; }).join('');
    if (list.some(function (c) { return c.n === prev; })) sel.value = prev;
    else { var lc = lsGet('finanzas-last-' + kind, ''); if (lc && list.some(function (c) { return c.n === lc; })) sel.value = lc; }
  }
  var editTx = null, recMode = 'none';
  var REC_LABEL = { semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual' };
  function setRec(v) {
    recMode = v;
    document.querySelectorAll('[data-rec]').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-rec') === v ? 'true' : 'false'); });
    $('rec-note').hidden = v === 'none';
  }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function nthDate(base, rec, k) {
    var d = parseDate(base);
    if (rec === 'semanal') return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * k));
    if (rec === 'quincenal') return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 15 * k));
    var m = d.getMonth() + k, y = d.getFullYear() + Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    var last = new Date(y, m + 1, 0).getDate();
    return ymd(new Date(y, m, Math.min(d.getDate(), last)));
  }
  /* Crea los movimientos recurrentes que ya tocan. El id depende de la fecha, así que dos dispositivos no duplican. */
  function genRecurring() {
    var today = todayStr(), made = 0;
    state.txs.slice().forEach(function (t) {
      if (!t.rec || !REC_LABEL[t.rec]) return;
      var n = t.recN || 0, guard = 0;
      while (guard++ < 60) {
        var dt = nthDate(t.date, t.rec, n + 1);
        if (dt > today) break;
        n++;
        var id = 'r-' + t.id + '-' + dt;
        if (state.txs.some(function (x) { return x.id === id; })) continue;
        var c = { id: id, kind: t.kind, cat: t.cat, amount: t.amount, cur: t.cur, date: dt, note: t.note || '', ts: Date.now() + n, from: t.id };
        if (t.pct) c.pct = t.pct;
        if (t.acc) c.acc = t.acc;
        if (t.pending) c.pending = true;
        state.txs.push(c);
        made++;
      }
      t.recN = n;
    });
    return made;
  }
  function submitText() {
    $('f-submit-text').textContent = editTx ? 'Guardar cambios' : kind === 'gasto' ? 'Agregar gasto' : 'Agregar ingreso';
    $('edit-bar').hidden = !editTx;
  }
  function setPctMode(v) {
    pctMode = v;
    document.querySelectorAll('[data-pct]').forEach(function (x) {
      var xv = x.getAttribute('data-pct');
      x.setAttribute('aria-pressed', String(xv) === String(v) ? 'true' : 'false');
    });
    $('pct-custom').hidden = v !== 'custom';
  }
  function startEdit(id) {
    var t = state.txs.find(function (x) { return x.id === id; });
    if (!t) return;
    editTx = t;
    setKind(t.kind);
    var sel = $('f-cat');
    if (!Array.prototype.some.call(sel.options, function (o) { return o.value === t.cat; })) {
      var o = document.createElement('option'); o.value = t.cat; o.textContent = t.cat; sel.appendChild(o);
    }
    sel.value = t.cat;
    $('f-monto').value = cm(t.amount);
    $('f-fecha').value = t.date;
    $('f-acc').value = accId(t);
    $('f-nota').value = t.note || '';
    if (t.kind === 'ingreso') {
      var p = t.pct || 0;
      if (!p) setPctMode('none');
      else if (p === 10 || p === 15 || p === 20) setPctMode(p);
      else { setPctMode('custom'); $('f-pct').value = p; }
      $('f-pend').checked = !!t.pending;
    }
    setRec(t.rec || 'none');
    $('more-opts').open = true;
    submitText();
    updatePreview();
    syncDayButtons();
    setView('registrar');
    showError('');
  }
  function endEdit() {
    editTx = null;
    submitText();
    $('f-monto').value = '';
    $('f-nota').value = '';
    $('f-pend').checked = false;
    setRec('none');
    $('f-fecha').value = todayStr();
    syncDayButtons();
    updatePreview();
  }
  function renderChips() {
    var el = $('amt-chips');
    if (!el) return;
    var cnt = {};
    state.txs.forEach(function (t) {
      if (t.ex || t.kind !== kind) return;
      var v = r2(val(t));
      if (v > 0) cnt[v] = (cnt[v] || 0) + 1;
    });
    var top = Object.keys(cnt).map(Number).sort(function (a, b) { return cnt[b] - cnt[a] || a - b; }).slice(0, 4);
    [100, 500, 1000, 2000].forEach(function (x) { if (top.length < 4 && top.indexOf(x) < 0) top.push(x); });
    top.sort(function (a, b) { return a - b; });
    el.innerHTML = top.map(function (a) { return '<button type="button" class="day-opt" data-amt="' + a + '">' + fmt(a) + '</button>'; }).join('');
  }
  $('amt-chips').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-amt]');
    if (!b) return;
    $('f-monto').value = cm(b.getAttribute('data-amt'));
    updatePreview();
    $('f-monto').focus({ preventScroll: true });
  });
  function setKind(k) {
    kind = k; catTouched = false; warnKey = ''; showWarn('');
    accHint();
    renderChips();
    ['gasto', 'ingreso'].forEach(function (x) { $('kind-' + x).setAttribute('aria-pressed', x === k ? 'true' : 'false'); });
    submitText();
    fillCats();
    $('save-box').hidden = k !== 'ingreso';
    $('pend-box').hidden = k !== 'ingreso';
    if (k !== 'ingreso') $('f-pend').checked = false;
    updatePreview();
  }

  function toast(msg, actionLabel, action, quiet) {
    var t = $('toast');
    t.classList.remove('toast-warn');
    if (!quiet) vib(12);
    t.hidden = false;
    t.innerHTML = '<span></span>';
    t.firstChild.textContent = msg;
    if (actionLabel) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = actionLabel;
      b.addEventListener('click', function () { action(); t.hidden = true; });
      t.appendChild(b);
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 5500);
  }

  function showError(msg) {
    var e = $('f-error');
    e.textContent = msg;
    e.hidden = !msg;
  }

  /* Avisos antes de guardar: posible duplicado y gasto fuera de lo normal. Se confirma tocando Agregar otra vez. */
  var warnKey = '', catTouched = false;
  function showWarn(m) { var e = $('f-warn'); e.textContent = m; e.hidden = !m; }
  function preCheck(amount, date) {
    var cat = $('f-cat').value, acc = $('f-acc').value, base = kind + '|' + cat + '|' + amount + '|' + acc + '|' + date;
    var dup = state.txs.some(function (t) { return !t.ex && t.kind === kind && t.cat === cat && t.amount === amount && (t.cur || 'DOP') === state.cur && t.date === date && accId(t) === acc; });
    if (dup) return { key: base + '|d', msg: 'Ya registraste ' + (kind === 'gasto' ? 'un gasto' : 'un ingreso') + ' igual ese día (' + cat + ' · ' + fmtFull(amount) + '). Si es otro, toca el botón otra vez para guardarlo.' };
    if (kind === 'gasto') {
      var a = state.txs.filter(function (t) { return !t.ex && !t.pending && t.kind === 'gasto' && t.cat === cat && (t.cur || 'DOP') === state.cur; }).map(function (t) { return t.amount; }).sort(function (x, y) { return x - y; });
      if (a.length >= 4) {
        var med = a[Math.floor(a.length / 2)];
        if (amount >= med * 3 && amount >= med + 300) return { key: base + '|u', msg: 'Este gasto (' + fmtFull(amount) + ') es mucho más alto de lo normal en ' + cat + ' (lo típico es ' + fmtFull(med) + '). Revisa el monto y toca el botón otra vez para guardarlo.' };
      }
    }
    return null;
  }
  ['f-monto', 'f-cat', 'f-acc', 'f-fecha'].forEach(function (id) {
    $(id).addEventListener('input', function () { warnKey = ''; showWarn(''); });
    $(id).addEventListener('change', function () { warnKey = ''; showWarn(''); });
  });
  $('f-cat').addEventListener('change', function () { catTouched = true; $('f-learn').hidden = true; });
  /* Categoría aprendida: si ya usaste esa nota antes, sugiere la categoría que le pusiste. */
  function learnCat(note, k) {
    var n = norm(note).trim();
    if (n.length < 3) return '';
    var first = n.split(/\s+/)[0], cnt = {}, best = '', bv = 0;
    state.txs.forEach(function (t) {
      if (t.kind !== k || !t.note || t.ex) return;
      var tn = norm(t.note).trim();
      if (tn === n) cnt[t.cat] = (cnt[t.cat] || 0) + 3;
      else if (first.length >= 4 && tn.split(/\s+/)[0] === first) cnt[t.cat] = (cnt[t.cat] || 0) + 1;
    });
    Object.keys(cnt).forEach(function (c) { if (cnt[c] > bv) { bv = cnt[c]; best = c; } });
    return bv >= 2 && state.cats[k].some(function (c) { return c.n === best; }) ? best : '';
  }
  var learnT = null;
  $('f-nota').addEventListener('input', function () {
    clearTimeout(learnT);
    learnT = setTimeout(function () {
      if (catTouched || editTx) return;
      var lc = learnCat($('f-nota').value, kind), h = $('f-learn');
      if (lc && $('f-cat').value !== lc) { $('f-cat').value = lc; h.textContent = 'Categoría sugerida por tus movimientos anteriores: ' + lc; h.hidden = false; }
      else if (!lc) h.hidden = true;
    }, 300);
  });
  $('tx-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var amount = r2(num($('f-monto').value));
    var date = $('f-fecha').value;
    if (!isFinite(amount) || amount <= 0) { showError('Escribe un monto mayor que cero.'); $('f-monto').focus(); return; }
    if (!date) { showError('Elige la fecha del movimiento.'); $('more-opts').open = true; $('f-fecha').focus(); return; }
    var p = kind === 'ingreso' ? currentPct() : 0;
    if (kind === 'ingreso' && pctMode === 'custom' && !(p > 0 && p <= 100)) { showError('Escribe un porcentaje entre 0.1 y 100.'); $('f-pct').focus(); return; }
    showError('');
    if (!editTx) {
      var pc = preCheck(amount, date);
      if (pc && warnKey !== pc.key) { warnKey = pc.key; showWarn(pc.msg); vib([30, 50, 30]); return; }
    }
    warnKey = ''; showWarn(''); catTouched = false; $('f-learn').hidden = true;
    if (editTx) {
      var preE = (kind === 'gasto' && !$('f-pend').checked) ? pctAt($('f-cat').value, date.slice(0, 7)) : 0;
      editTx.kind = kind; editTx.cat = $('f-cat').value; editTx.amount = amount; editTx.cur = state.cur;
      editTx.date = date; editTx.note = $('f-nota').value.trim().slice(0, 60);
      if (p > 0) editTx.pct = p; else delete editTx.pct;
      editTx.acc = $('f-acc').value;
      if (kind === 'ingreso' && $('f-pend').checked) editTx.pending = true; else delete editTx.pending;
      delete editTx.ex;
      if (recMode !== 'none') { editTx.rec = recMode; if (!editTx.recN) editTx.recN = 0; } else { delete editTx.rec; delete editTx.recN; }
      save(state);
      view = date.slice(0, 7);
      endEdit();
      render();
      toast('Movimiento actualizado: ' + fmtFull(amount) + (kind === 'gasto' ? budgetNote($('f-cat').value) : ''));
      if (kind === 'gasto') crossWarn($('f-cat').value, Math.max(0, preE), date.slice(0, 7));
      setView('historial');
      return;
    }
    var tx = {
      id: 'tx' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      kind: kind, cat: $('f-cat').value, amount: amount, cur: state.cur, date: date,
      note: $('f-nota').value.trim().slice(0, 60), ts: Date.now()
    };
    if (p > 0) tx.pct = p;
    tx.acc = $('f-acc').value;
    var isPend = kind === 'ingreso' && $('f-pend').checked;
    if (isPend) tx.pending = true;
    if (recMode !== 'none') { tx.rec = recMode; tx.recN = 0; }
    var preP = (kind === 'gasto' && !isPend) ? pctAt(tx.cat, date.slice(0, 7)) : 0;
    state.txs.push(tx);
    freshId = tx.id;
    lsSet('finanzas-last-' + kind, tx.cat); lsSet('finanzas-last-acc', tx.acc);
    save(state);
    view = date.slice(0, 7);
    $('f-monto').value = '';
    $('f-nota').value = '';
    updatePreview();
    render();
    $('f-pend').checked = false;
    $('more-opts').open = false;
    var wasRec = recMode !== 'none';
    setRec('none');
    if (wasRec) genRecurring();
    save(state);
    render();
    toast((kind === 'gasto' ? 'Gasto' : isPend ? 'Ingreso pendiente' : 'Ingreso') + ' agregado: ' + fmtFull(amount) + (kind === 'gasto' ? budgetNote(tx.cat) : ''));
    if (kind === 'gasto' && !isPend) crossWarn(tx.cat, preP, date.slice(0, 7));
    savedPop(kind, amount);
    pulseInfo = { cls: kind === 'gasto' ? 'trio-out' : 'trio-in', text: (kind === 'gasto' ? '−' : '+') + fmtFull(amount) };
    $('f-monto').focus();
  });

  ['kind-gasto', 'kind-ingreso'].forEach(function (id) {
    $(id).addEventListener('click', function () { setKind(this.getAttribute('data-kind')); });
  });
  document.querySelectorAll('[data-rec]').forEach(function (b) {
    b.addEventListener('click', function () { setRec(b.getAttribute('data-rec')); });
  });
  (function () {
    var lastY = window.pageYOffset || 0;
    window.addEventListener('scroll', function () {
      var y = window.pageYOffset || 0, w = $('fab-wrap');
      if (!w) return;
      var nearEnd = (window.innerHeight + y) >= document.documentElement.scrollHeight - 80;
      if (y > lastY + 10 && y > 140 && !nearEnd) { w.classList.add('fab-hide'); $('help-btn').classList.add('fab-hide'); fabOpen(false); lastY = y; }
      else if (y < lastY - 6 || nearEnd || y <= 140) { w.classList.remove('fab-hide'); $('help-btn').classList.remove('fab-hide'); lastY = y; }
    }, { passive: true });
  })();
  var popT = null;
  function savedPop(kind, amount) {
    var el = $('ok-pop');
    if (!el) { el = document.createElement('div'); el.id = 'ok-pop'; el.className = 'ok-pop'; el.setAttribute('aria-hidden', 'true'); $('app').appendChild(el); }
    el.className = 'ok-pop ' + (kind === 'gasto' ? 'ok-out' : 'ok-in');
    el.innerHTML = '<span class="ok-circle"><i data-lucide="check"></i></span><span class="ok-amt">' + (kind === 'gasto' ? '−' : '+') + esc(fmtFull(amount)) + '</span>';
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    vib(25);
    if (kind === 'ingreso') playSound('in');
    clearTimeout(popT); popT = setTimeout(function () { el.classList.remove('show'); }, 1300);
  }
  function fabOpen(open) {
    $('fab-menu').hidden = !open;
    $('fab').setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  $('fab').addEventListener('click', function () { fabOpen($('fab-menu').hidden); });
  $('fab-menu').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-fab]');
    if (!b) return;
    var k = b.getAttribute('data-fab');
    fabOpen(false);
    if (k === 'plantilla') { setView('plantillas'); return; }
    if (k === 'ahorro') {
      setView('ahorro');
      setTimeout(function () { $('sv-monto').focus(); }, 0);
      return;
    }
    if (editTx) endEdit();
    applyLastAcc();
    setView('registrar');
    setKind(k);
    setTimeout(function () { $('f-monto').focus(); }, 0);
  });
  document.addEventListener('click', function (ev) {
    if (!ev.target.closest('#fab-wrap')) fabOpen(false);
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') fabOpen(false); });
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-go]');
    if (b) setView(b.getAttribute('data-go'));
  });
  $('h-q').addEventListener('input', function () { renderHistory(); if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); });
  $('budgets').addEventListener('change', function (ev) {
    var inp = ev.target.closest('[data-bud]');
    if (!inp) return;
    var c = inp.getAttribute('data-bud'), v = num(inp.value);
    lmEdit(function (m) { if (v > 0) m[c] = { amount: r2(v), cur: state.cur }; else delete m[c]; });
    save(state);
    render();
  });
  $('budgets').addEventListener('click', function (ev) {
    var x = ev.target.closest('[data-budx]');
    if (!x) return;
    var bcat = x.getAttribute('data-budx'), bold = limMap(view).m[bcat], mk = view;
    lmEdit(function (m) { delete m[bcat]; });
    save(state);
    render();
    if (bold) toast('Límite de ' + bcat + ' quitado', 'Deshacer', function () { lmEdit(function (m) { m[bcat] = bold; }, mk); save(state); render(); });
  });
  $('bud-add-btn').addEventListener('click', function () {
    var c = $('bud-cat').value, v = num($('bud-new').value);
    if (!c || !(v > 0)) { $('bud-new').focus(); toast('Escribe el monto del límite', null, null, true); return; }
    lmEdit(function (m) { m[c] = { amount: r2(v), cur: state.cur }; });
    $('bud-new').value = '';
    save(state);
    render();
    toast('Límite guardado: ' + c);
  });
  $('sv-adj-ok').addEventListener('click', function () {
    var er = $('sv-adj-err'), v = r2(num($('sv-adj-in').value));
    if (!isFinite(v) || v < 0 || $('sv-adj-in').value.trim() === '') { er.textContent = 'Escribe cuánto tienes ahorrado (puede ser 0).'; er.hidden = false; return; }
    er.hidden = true;
    var l = ledger(), cur = l.length ? l[l.length - 1].run : 0, diff = r2(v - cur);
    if (Math.abs(diff) < 0.005) { toast('Tu ahorro ya está en ' + fmtFull(v)); return; }
    var e = { id: 'sv' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), dir: diff > 0 ? 'aporte' : 'retiro', acc: '', amount: Math.abs(diff), cur: state.cur, date: todayStr(), note: 'Ajustado a ' + fmtFull(v), ts: Date.now(), open: true };
    state.savings.push(e);
    save(state);
    render();
    toast('Ahorro ajustado a ' + fmtFull(v), 'Deshacer', function () {
      var i = state.savings.findIndex(function (x) { return x.id === e.id; });
      if (i >= 0) { state.savings.splice(i, 1); save(state); render(); }
    });
  });
  $('sv-adj-in').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); $('sv-adj-ok').click(); } });
  $('sv-goal-save').addEventListener('click', function () {
    var v = num($('sv-goal-in').value);
    state.goal = v > 0 ? { amount: r2(v), cur: state.cur } : null;
    if (state.goal && $('sv-goal-date').value) state.goal.due = $('sv-goal-date').value;
    save(state);
    render();
    toast(state.goal ? 'Meta guardada: ' + fmtFull(v) : 'Meta quitada');
  });
  $('gl-add').addEventListener('click', function () {
    var n = $('gl-name').value.trim().slice(0, 24), v = num($('gl-amt').value);
    if (!n) { $('gl-name').focus(); toast('Ponle un nombre a la meta', null, null, true); return; }
    if (!(v > 0)) { $('gl-amt').focus(); toast('Escribe el monto de la meta', null, null, true); return; }
    if (state.goals.some(function (g) { return g.n.toLowerCase() === n.toLowerCase(); })) { toast('Ya tienes una meta con ese nombre', null, null, true); return; }
    var ng = { id: 'gl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), n: n, amount: r2(v), cur: state.cur };
    if ($('gl-date').value) ng.due = $('gl-date').value;
    state.goals.push(ng);
    $('gl-name').value = ''; $('gl-amt').value = ''; $('gl-date').value = '';
    save(state); render(); refreshIcons();
    toast('Meta creada: ' + n);
  });
  $('sv-goal-date').addEventListener('change', function () {
    if (!state.goal) return;
    if (this.value) state.goal.due = this.value; else delete state.goal.due;
    save(state); render();
  });
  $('goals-list').addEventListener('change', function (ev) {
    var c = ev.target.closest('[data-gldue]');
    if (!c) return;
    var g = goalById(c.getAttribute('data-gldue'));
    if (!g) return;
    if (c.value) g.due = c.value; else delete g.due;
    save(state); render(); refreshIcons();
  });
  $('goals-list').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-gldel]');
    if (!b) return;
    var i = state.goals.findIndex(function (g) { return g.id === b.getAttribute('data-gldel'); });
    if (i < 0) return;
    var gone = state.goals.splice(i, 1)[0];
    save(state); render(); refreshIcons();
    toast('Meta eliminada. Tus aportes se quedan como ahorro general.', 'Deshacer', function () { state.goals.splice(Math.min(i, state.goals.length), 0, gone); save(state); render(); refreshIcons(); });
  });
  $('sv-goal-in').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); $('sv-goal-save').click(); } });
  $('edit-cancel').addEventListener('click', function () { endEdit(); setView('historial'); });
  function monthPop(open) {
    var pop = $('month-pop');
    if (open) {
      var now = new Date(), cur = toKey(now), list = [], i, has = {};
      state.txs.forEach(function (t) { has[t.date.slice(0, 7)] = true; });
      for (i = 11; i >= 0; i--) list.push(toKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
      if (list.indexOf(view) < 0) list.push(view);
      list.sort();
      pop.innerHTML = list.map(function (k) {
        var d = new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1);
        var nm = d.toLocaleDateString('es-DO', { month: 'short' }).replace('.', '');
        nm = nm.charAt(0).toUpperCase() + nm.slice(1);
        return '<button type="button" class="day-opt" role="menuitem" data-mk="' + k + '" aria-pressed="' + (k === view) + '">' + nm + '<br><span style="font-weight:400;font-size:.75rem">' + k.slice(0, 4) + '</span>' + (has[k] ? '<i class="dot"></i>' : '') + '</button>';
      }).join('');
    }
    pop.hidden = !open;
    $('m-label').setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  $('m-label').addEventListener('click', function (ev) { ev.stopPropagation(); monthPop($('month-pop').hidden); });
  $('month-pop').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-mk]');
    if (!b) return;
    var nk = b.getAttribute('data-mk');
    if (nk !== view) monthAnim(nk > view ? 1 : -1);
    view = nk;
    monthPop(false);
    render();
  });
  document.addEventListener('click', function (ev) { if (!ev.target.closest('#m-wrap')) monthPop(false); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') monthPop(false); });
  $('m-prev').addEventListener('click', function () { shiftMonth(-1); });
  $('m-next').addEventListener('click', function () { shiftMonth(1); });

  document.querySelectorAll('[data-filter]').forEach(function (b) {
    b.addEventListener('click', function () {
      filter = b.getAttribute('data-filter');
      document.querySelectorAll('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      renderHistory();
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    });
  });

  $('hist').addEventListener('click', function (ev) {
    var dup = ev.target.closest('[data-dup]');
    if (dup) {
      var src = state.txs.find(function (x) { return x.id === dup.getAttribute('data-dup'); });
      if (!src) return;
      var c = { id: 'tx' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), kind: src.kind, cat: src.cat, amount: src.amount, cur: src.cur, date: todayStr(), note: src.note || '', ts: Date.now() };
      if (src.pct) c.pct = src.pct;
      if (src.acc) c.acc = src.acc;
      var preD = c.kind === 'gasto' ? pctAt(c.cat, c.date.slice(0, 7)) : 0;
      state.txs.push(c);
      view = c.date.slice(0, 7);
      save(state);
      render();
      toast('Repetido con fecha de hoy: ' + fmtFull(val(c)) + (c.kind === 'gasto' ? budgetNote(c.cat) : ''), 'Deshacer', function () {
        var i = state.txs.findIndex(function (x) { return x.id === c.id; });
        if (i >= 0) { state.txs.splice(i, 1); save(state); render(); }
      });
      if (c.kind === 'gasto') crossWarn(c.cat, preD, c.date.slice(0, 7));
      return;
    }
    var eb = ev.target.closest('[data-edit]');
    if (eb) { startEdit(eb.getAttribute('data-edit')); return; }
    var cb = ev.target.closest('[data-collect]');
    if (cb) {
      var tc = state.txs.find(function (t) { return t.id === cb.getAttribute('data-collect'); });
      if (!tc) return;
      var oldDate = tc.date;
      delete tc.pending;
      tc.date = todayStr();
      save(state);
      render();
      toast('Ingreso cobrado: ' + fmtFull(val(tc)), 'Deshacer', function () {
        tc.pending = true; tc.date = oldDate;
        save(state);
        render();
      });
      return;
    }
    var btn = ev.target.closest('[data-del]');
    if (!btn) return;
    var id = btn.getAttribute('data-del');
    var idx0 = state.txs.findIndex(function (t) { return t.id === id; });
    if (idx0 < 0) return;
    var rowEl = btn.closest('.hrow, li');
    var doDel = function () {
      var idx = state.txs.findIndex(function (t) { return t.id === id; });
      if (idx < 0) return;
      undoBuf = state.txs.splice(idx, 1)[0];
      state.trash.push({ tx: clone(undoBuf), at: Date.now() });
      save(state);
      render();
      toast('Movimiento eliminado', 'Deshacer', function () {
        if (!undoBuf) return;
        freshId = undoBuf.id;
        state.trash = state.trash.filter(function (x) { return x.tx.id !== undoBuf.id; });
        state.txs.push(undoBuf);
        undoBuf = null;
        save(state);
        render();
        setTimeout(function () { freshId = null; }, 1800);
      });
    };
    if (rowEl && !reduceM()) { rowEl.classList.add('gone'); setTimeout(doDel, 240); } else doDel();
  });

  
  $('banner').addEventListener('click', function (ev) {
    if (!ev.target.closest('#clear-ex')) return;
    state.txs = state.txs.filter(function (t) { return !t.ex; });
    state.savings = state.savings.filter(function (t) { return !t.ex; });
    save(state);
    render();
    toast('Ejemplos eliminados. Ya puedes empezar con tus datos.');
  });

