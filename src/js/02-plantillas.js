  /* ---- Plantillas ---- */
  function renderTpl() {
    renderRec();
    var box = $('tpl-list');
    if (!box) return;
    if (!state.tpl.length) {
      box.innerHTML = emptyState('bookmark', 'Todavía no tienes plantillas', 'Guarda un gasto o ingreso que repites seguido y lo registrarás con un toque. Se crean en Registrar, con "Guardar como plantilla".', 'Ir a Registrar', 'registrar');
      return;
    }
    box.innerHTML = '<ul class="cat-list">' + state.tpl.map(function (t) {
      var inc = t.kind === 'ingreso';
      return '<li class="flex items-center gap-2"><div class="min-w-0 grow"><div class="font-semibold">' + esc(t.n) + '</div>' +
        '<div class="note">' + (inc ? 'Ingreso' : 'Gasto') + ' · ' + esc(t.cat) + ' · ' + fmtFull(val(t)) + '</div></div>' +
        '<button type="button" class="btn-ghost" style="min-height:40px" data-tpluse="' + esc(t.id) + '">Usar</button>' +
        '<button type="button" class="icon-btn" data-tpldel="' + esc(t.id) + '" aria-label="Eliminar plantilla ' + esc(t.n) + '"><i data-lucide="trash-2"></i></button></li>';
    }).join('') + '</ul>';
  }
  $('tpl-save').addEventListener('click', function () {
    var amount = r2(num($('f-monto').value));
    if (!(amount > 0)) { showError('Escribe el monto para guardar la plantilla.'); $('f-monto').focus(); return; }
    showError('');
    var t = { id: 'tp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), kind: kind, cat: $('f-cat').value, amount: amount, cur: state.cur, acc: $('f-acc').value, note: $('f-nota').value.trim().slice(0, 60) };
    t.n = t.note || t.cat;
    if (state.tpl.some(function (x) { return x.kind === t.kind && x.cat === t.cat && x.amount === t.amount && x.cur === t.cur && x.acc === t.acc && x.note === t.note; })) { toast('Esa plantilla ya existe', null, null, true); return; }
    state.tpl.push(t);
    save(state);
    renderTpl();
    toast('Plantilla guardada: ' + t.n);
  });
  $('rec-list').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-recstop]');
    if (!b) return;
    var t = state.txs.find(function (x) { return x.id === b.getAttribute('data-recstop'); });
    if (!t) return;
    var oldRec = t.rec, oldN = t.recN;
    delete t.rec; delete t.recN;
    save(state); render();
    toast('Recurrencia detenida. Lo ya registrado se queda.', 'Deshacer', function () { t.rec = oldRec; t.recN = oldN || 0; save(state); render(); });
  });
  $('tpl-list').addEventListener('click', function (ev) {
    var u = ev.target.closest('[data-tpluse]'), d = ev.target.closest('[data-tpldel]');
    if (d) {
      var id = d.getAttribute('data-tpldel');
      var ti = state.tpl.findIndex(function (x) { return x.id === id; }), tg = state.tpl[ti];
      state.tpl = state.tpl.filter(function (x) { return x.id !== id; });
      save(state); renderTpl();
      if (tg) toast('Plantilla eliminada', 'Deshacer', function () { state.tpl.splice(Math.min(ti, state.tpl.length), 0, tg); save(state); renderTpl(); refreshIcons(); });
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
      return;
    }
    if (!u) return;
    var t = state.tpl.filter(function (x) { return x.id === u.getAttribute('data-tpluse'); })[0];
    if (!t) return;
    var tx = { id: 'tx' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), kind: t.kind, cat: t.cat, amount: t.amount, cur: t.cur || 'DOP', date: todayStr(), note: t.note || '', ts: Date.now(), acc: t.acc };
    var preT = t.kind === 'gasto' ? pctAt(tx.cat, tx.date.slice(0, 7)) : 0;
    state.txs.push(tx);
    view = tx.date.slice(0, 7);
    save(state);
    render();
    toast((t.kind === 'gasto' ? 'Gasto' : 'Ingreso') + ' agregado: ' + fmtFull(val(tx)) + (t.kind === 'gasto' ? budgetNote(t.cat) : ''), 'Deshacer', function () {
      state.txs = state.txs.filter(function (x) { return x.id !== tx.id; });
      save(state); render();
    });
    if (t.kind === 'gasto') crossWarn(tx.cat, preT, tx.date.slice(0, 7));
  });

  function nf(x) { return Math.round(x).toLocaleString('en-US'); }
  function mkLabel(k, short) {
    var d = new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1);
    var t = d.toLocaleDateString('es-DO', { month: short ? 'short' : 'long', year: 'numeric' }).replace('.', '');
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function renderAlerts() {
    var el = $('alerts');
    var out = [];
    state.cats.gasto.forEach(function (c) {
      var lim = limitVal(c.n);
      if (!lim) return;
      var sp = spentCat(c.n), p = sp / lim * 100;
      if (p >= 80) out.push('<div class="alert ' + (p >= 100 ? 'alert-bad' : 'alert-warn') + '"><i data-lucide="triangle-alert" class="sm"></i><span>' + esc(c.n) + ': ' + fmt(sp) + ' de ' + fmt(lim) + ' (' + Math.round(p) + '%)' + (p >= 100 ? ' · pasaste el límite' : '') + '</span></div>');
    });
    var bal = accBalances();
    state.accounts.forEach(function (a) {
      if (!isCC(a)) return;
      var ci = cardInfo(a, bal[a.id]);
      if (ci.lim && ci.debt / ci.lim >= 0.8) out.push('<div class="alert ' + (ci.debt >= ci.lim ? 'alert-bad' : 'alert-warn') + '"><i data-lucide="credit-card" class="sm"></i><span>' + esc(a.n) + ': usaste ' + fmt(ci.debt) + ' de ' + fmt(ci.lim) + ' (' + Math.round(ci.debt / ci.lim * 100) + '%)</span></div>');
      if (ci.ok && ci.st > 0 && (ci.overdue || ci.daysL <= 5)) out.push('<div class="alert ' + (ci.overdue ? 'alert-bad' : 'alert-warn') + '"><i data-lucide="calendar-clock" class="sm"></i><span>' + esc(a.n) + ': ' + (ci.overdue ? 'pago vencido desde el ' + dShort(ci.dueL) : ci.daysL === 0 ? 'el pago vence hoy' : ci.daysL === 1 ? 'el pago vence mañana' : 'el pago vence en ' + ci.daysL + ' días') + ' · Monto del corte: ' + fmt(ci.st) + '</span></div>');
    });
    el.innerHTML = out.join('');
    var bd = $('bell-dot'); if (bd) { bd.hidden = !out.length; $('bell-btn').setAttribute('data-n', out.length); }
  }
  function renderGoal(total) {
    var g = goalVal(), box = $('sv-goal-prog');
    if (!g) {
      box.innerHTML = '<p class="muted text-sm">Define cuánto quieres ahorrar y aquí verás tu avance.</p>';
    } else {
      var p = total / g * 100;
      box.innerHTML = '<div class="flex justify-between gap-2 text-sm"><strong>' + fmt(Math.max(total, 0)) + ' de ' + fmt(g) + '</strong><span>' + pctFmt(Math.max(0, p)) + '</span></div>' +
        '<div class="meter" style="height:10px"><i style="width:' + Math.max(0, Math.min(100, p)) + '%"></i></div>' +
        '<p class="note">' + (total >= g ? '¡Meta cumplida!' : 'Te faltan ' + fmt(r2(g - total))) + '</p>';
    }
    var inp = $('sv-goal-in');
    if (document.activeElement !== inp) inp.value = g ? cm(r2(g)) : '';
  }

  function fitBalance() {
    var el = $('hero-bal');
    if (!el) return;
    el.style.fontSize = '';
    if (!el.clientWidth) return;
    var size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth && size > 12) { size -= 1; el.style.fontSize = size + 'px'; }
  }
  window.addEventListener('resize', fitBalance);

  var lastKpi = null, balSeries = null;
  function renderKpis() {
    var allM = monthTxs();
    var txs = allM.filter(function (t) { return !t.pending; });
    var pendSum = sum(allM.filter(function (t) { return t.pending; })), nPend = allM.length - txs.length;
    var inc = sum(txs.filter(function (t) { return t.kind === 'ingreso'; }));
    var exp = sum(txs.filter(function (t) { return t.kind === 'gasto'; }));
    var nInc = txs.filter(function (t) { return t.kind === 'ingreso'; }).length;
    var nExp = txs.length - nInc;
    var saved = r2(txs.filter(function (t) { return t.kind === 'ingreso' && t.pct > 0; })
      .reduce(function (a, t) { return a + val(t) * t.pct / 100; }, 0));
    /* El ahorro (lo apartado de cada ingreso, más aportes y menos retiros) sale del balance. */
    var led = ledger(), savedMonth = 0;
    led.forEach(function (e) { if (!e.open && e.date.slice(0, 7) === view) savedMonth = r2(savedMonth + e.sign * e.amount); });
    var left = r2(inc - exp);
    /* Saldo que viene de meses anteriores (arrastre) */
    var start = view + '-01', prev = 0;
    state.txs.forEach(function (t) { if (!t.pending && t.date < start) prev = r2(prev + (t.kind === 'ingreso' ? 1 : -1) * val(t)); });
    led.forEach(function (e) { if (e.date < start) prev = r2(prev - e.sign * e.amount); });
    state.accounts.forEach(function (a) { prev = r2(prev + accAdj(a)); });
    var bal = r2(prev + left - savedMonth);
    lastKpi = { inc: inc, exp: exp, saved: savedMonth, bal: bal };
    var rate = inc > 0 ? (left / inc) * 100 : null;
    var pk = toKey(new Date(+view.slice(0, 4), +view.slice(5, 7) - 2, 1)), pInc = 0, pExp = 0;
    state.txs.forEach(function (t) {
      if (t.pending || t.date.slice(0, 7) !== pk) return;
      if (t.kind === 'ingreso') pInc += val(t); else pExp += val(t);
    });
    var cmp = function (cur, prev, upGood) {
      if (!(prev > 0)) return '';
      var d = (cur - prev) / prev * 100, up = d >= 0, good = up === upGood;
      return '<p class="kpi-sub" style="font-weight:600;color:var(--' + (Math.abs(d) < 0.5 ? 'muted' : good ? 'good' : 'bad') + ')">' + (up ? '▲ ' : '▼ ') + Math.abs(d).toLocaleString('es-DO', { maximumFractionDigits: 0 }) + '% vs. mes anterior</p>';
    };
    var balNote = savedMonth > 0 ? 'Después de apartar ' + fmt(savedMonth) + ' al ahorro'
      : savedMonth < 0 ? 'Incluye ' + fmt(-savedMonth) + ' retirados del ahorro' : 'Saldo anterior + ingresos − gastos';

    var pill, rateText;
    if (rate === null) {
      rateText = '—';
      pill = '<span class="pill pill-none">Sin ingresos este mes</span>';
    } else {
      rateText = rate.toLocaleString('es-DO', { maximumFractionDigits: 1 }) + '%';
      if (rate >= GOAL) pill = '<span class="pill pill-good"><i data-lucide="trending-up" class="sm"></i>Meta cumplida</span>';
      else if (rate >= 0) pill = '<span class="pill pill-warn">Bajo la meta del ' + GOAL + '%</span>';
      else pill = '<span class="pill pill-bad"><i data-lucide="trending-down" class="sm"></i>Gastas más de lo que ganas</span>';
    }
    var fillW = rate === null ? 0 : Math.max(0, Math.min(100, rate));
    var savTotal = led.length ? led[led.length - 1].run : 0, goalV = goalVal();

    var hb = $('hero-bal'); hb.setAttribute('data-n', bal); hb.textContent = fmt(bal);
    (function () {
      var dim = new Date(+view.slice(0, 4), +view.slice(5, 7), 0).getDate(), nowK = toKey(new Date());
      var dd = [], d, maxD = 0;
      for (d = 0; d <= dim + 1; d++) dd[d] = 0;
      monthTxs().forEach(function (t) {
        if (t.pending) return;
        d = +t.date.slice(8, 10);
        dd[d] += t.kind === 'ingreso' ? val(t) - r2(val(t) * (t.pct || 0) / 100) : -val(t);
        if (d > maxD) maxD = d;
      });
      led.forEach(function (e) { if (!e.auto && e.date.slice(0, 7) === view) { d = +e.date.slice(8, 10); dd[d] += -e.sign * e.amount; if (d > maxD) maxD = d; } });
      var lastD = view === nowK ? Math.max(new Date().getDate(), maxD) : view < nowK ? dim : maxD;
      var sp = $('hero-spark'), pg = $('hero-prog');
      if (lastD < 1) { sp.innerHTML = ''; balSeries = null; } else {
        var ser = [];
        ser[lastD] = bal;
        for (d = lastD - 1; d >= 0; d--) ser[d] = r2(ser[d + 1] - dd[d + 1]);
        balSeries = { ser: ser.slice(), lastD: lastD };
        var mn = Math.min.apply(null, ser), mx = Math.max.apply(null, ser), rg = mx - mn;
        if (!(rg > 0)) { sp.innerHTML = ''; ser = null; }
      }
      if (ser) {
        var pts = ser.map(function (v, i) { return [i / Math.max(1, lastD) * 300, rg > 0 ? 66 - (v - mn) / rg * 52 : 40]; });
        var line = pts.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' ');
        var lastX = pts[pts.length - 1][0];
        sp.innerHTML = '<path d="' + line + ' L' + lastX.toFixed(1) + ' 80 L0 80 Z" fill="rgba(255,255,255,.14)"></path><path d="' + line + '" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"></path>';
      }
      var skey = view + '|' + state.cur;
      if (skey !== lastSparkKey) { lastSparkKey = skey; sp.classList.remove('draw'); void sp.getBoundingClientRect(); sp.classList.add('draw'); }
      if (view === nowK) {
        var today = new Date().getDate(), lim = mbVal(), txt = 'Día ' + today + ' de ' + dim;
        if (lim > 0) txt += ' · Gastado ' + Math.round(exp / lim * 100) + '% del presupuesto';
        pg.innerHTML = '<span class="hp-bar"><i style="width:' + Math.round(today / dim * 100) + '%"></i></span><span class="hp-txt">' + esc(txt) + '</span>';
        pg.hidden = false;
      } else { pg.hidden = true; pg.innerHTML = ''; }
    })();
    var notes = [];
    if (nPend) notes.push('Pendiente por cobrar: <strong>' + fmt(pendSum) + '</strong>');
    if (goalV > 0) notes.push('Meta de ahorro ' + fmt(goalV) + ' · ' + Math.round(Math.max(0, savTotal / goalV * 100)) + '%');
    var tile = function (cls, icon, label, go, key, n, badge, extra) {
      return '<button type="button" class="trio-item ' + cls + '" data-go="' + go + '"' + (extra || '') + '>' +
        '<span class="trio-ico"><i data-lucide="' + icon + '"></i>' + (cls === 'trio-sav' ? '<span class="coin" aria-hidden="true"></span>' : '') + '</span>' +
        '<span class="trio-lbl">' + label + '<i data-lucide="chevron-right" class="trio-chev"></i></span>' +
        '<span class="kpi-value trio-val" data-key="' + key + '" data-n="' + n + '">' + fmt(n) + '</span>' +
        '<span class="trio-badge">' + badge + '</span></button>';
    };
    $('kpis').innerHTML =
      '<article class="card trio">' +
        '<div class="trio-row">' +
          tile('trio-in', 'banknote', 'Ingresos', 'historial', 'inc', inc, 'Entradas · ' + nInc, ' data-kfilter="ingreso"') +
          tile('trio-out', 'shopping-bag', 'Gastos', 'gastos', 'exp', exp, 'Salidas · ' + nExp) +
          tile('trio-sav', 'piggy-bank', 'Ahorros', 'ahorro', 'sav', savTotal, goalV > 0 ? 'Meta · ' + Math.round(Math.max(0, savTotal / goalV * 100)) + '%' : 'Sin meta') +
        '</div>' +
        (notes.length ? '<p class="trio-note">' + notes.join(' · ') + '</p>' : '') +
      '</article>';
    renderBalChart();
    fitBalance();
  }

  function shortN(v) { var a = Math.abs(v), sg = v < 0 ? '−' : ''; if (a >= 1e6) return sg + (Math.round(a / 1e5) / 10) + 'M'; if (a >= 1000) return sg + (Math.round(a / 100) / 10) + 'k'; return sg + Math.round(a); }
  function renderBalChart() {
    var box = $('bal-box'), rd = $('bal-read');
    if (!box) return;
    $('bal-sub').textContent = monthLabel();
    var S = balSeries;
    if (!S || S.lastD < 1) { box.innerHTML = '<p class="note">Cuando tengas movimientos este mes, aquí verás cómo cambia tu saldo día a día.</p>'; rd.textContent = ''; return; }
    var cw = Math.max(280, Math.min(780, Math.min(window.innerWidth || 390, 896) - 64));
    var ser = S.ser, n = S.lastD, W = Math.round(cw), H = cw > 520 ? 190 : 150, pl = 42, pr = 10, pt = 12, pb = 24, i;
    var mn = Math.min.apply(null, ser), mx = Math.max.apply(null, ser), rg = mx - mn || 1;
    var X = function (k) { return pl + k / n * (W - pl - pr); }, Y = function (v) { return pt + (1 - (v - mn) / rg) * (H - pt - pb); };
    var iMin = ser.indexOf(mn), iMax = ser.indexOf(mx);
    var dayL = function (k) { return k === 0 ? 'Inicio del mes' : 'Día ' + k; };
    var grid = [mx, (mx + mn) / 2, mn].map(function (v) {
      return '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" style="stroke:var(--line)" stroke-width="1"></line>' +
        '<text x="' + (pl - 6) + '" y="' + (Y(v) + 3).toFixed(1) + '" text-anchor="end" font-size="10" style="fill:var(--muted)">' + shortN(v) + '</text>';
    }).join('');
    var zero = (mn < 0 && mx > 0) ? '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(0).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '" style="stroke:var(--muted)" stroke-width="1" stroke-dasharray="4 3"></line>' : '';
    var pts = ser.map(function (v, k) { return [X(k), Y(v)]; });
    var line = pts.map(function (q, k) { return (k ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' ');
    var base = (H - pb).toFixed(1);
    var xl = '<text x="' + pl + '" y="' + (H - 6) + '" font-size="10" style="fill:var(--muted)">Inicio</text><text x="' + (W - pr) + '" y="' + (H - 6) + '" text-anchor="end" font-size="10" style="fill:var(--muted)">Día ' + n + '</text>';
    if (n >= 10) xl += '<text x="' + X(Math.round(n / 2)).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10" style="fill:var(--muted)">Día ' + Math.round(n / 2) + '</text>';
    var last = pts[pts.length - 1];
    box.innerHTML = '<svg id="bal-svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Saldo día a día de ' + esc(monthLabel()) + '. Hoy ' + esc(fmt(ser[n])) + ', más bajo ' + esc(fmt(mn)) + ', más alto ' + esc(fmt(mx)) + '." style="display:block;touch-action:pan-y">' +
      grid + zero + xl +
      '<path d="' + line + ' L' + last[0].toFixed(1) + ' ' + base + ' L' + pl + ' ' + base + ' Z" style="fill:var(--accent);opacity:.12"></path>' +
      '<path d="' + line + '" fill="none" style="stroke:var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>' +
      '<line id="bal-cx" y1="' + pt + '" y2="' + (H - pb) + '" style="stroke:var(--ink);opacity:.35" stroke-width="1" display="none"></line>' +
      '<circle id="bal-cd" r="5" style="fill:var(--accent);stroke:var(--surface)" stroke-width="2" display="none"></circle>' +
      '<circle id="bal-end" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="5" style="fill:var(--accent);stroke:var(--surface)" stroke-width="2"></circle>' +
      '<rect x="' + pl + '" y="0" width="' + (W - pl - pr) + '" height="' + H + '" fill="transparent" id="bal-hit"></rect></svg>';
    var def = function () {
      rd.innerHTML = '<strong>' + esc(dayL(n)) + ':</strong> ' + esc(fmt(ser[n])) + ' · <span class="muted">Más bajo ' + esc(fmt(mn)) + ' (' + esc(dayL(iMin).toLowerCase()) + ') · Más alto ' + esc(fmt(mx)) + ' (' + esc(dayL(iMax).toLowerCase()) + ')</span>';
      $('bal-cx').setAttribute('display', 'none'); $('bal-cd').setAttribute('display', 'none'); $('bal-end').setAttribute('display', '');
    };
    var at = function (ev) {
      var svg = $('bal-svg'), r = svg.getBoundingClientRect();
      var x = (ev.clientX - r.left) / r.width * W, k = Math.max(0, Math.min(n, Math.round((x - pl) / (W - pl - pr) * n)));
      var cx = pts[k][0].toFixed(1);
      $('bal-cx').setAttribute('x1', cx); $('bal-cx').setAttribute('x2', cx); $('bal-cx').setAttribute('display', '');
      $('bal-cd').setAttribute('cx', cx); $('bal-cd').setAttribute('cy', pts[k][1].toFixed(1)); $('bal-cd').setAttribute('display', '');
      $('bal-end').setAttribute('display', k === n ? 'none' : '');
      rd.innerHTML = '<strong>' + esc(dayL(k)) + ':</strong> ' + esc(fmt(ser[k])) + (k > 0 ? ' <span class="muted">(' + (ser[k] - ser[k - 1] >= 0 ? '+' : '−') + esc(fmt(Math.abs(r2(ser[k] - ser[k - 1])))) + ' ese día)</span>' : '');
    };
    var hit = $('bal-hit');
    hit.addEventListener('pointermove', at); hit.addEventListener('pointerdown', at);
    hit.addEventListener('pointerleave', def); hit.addEventListener('pointercancel', def);
    def();
  }

  var INFO_DEFAULT = 'Toca una porción o una categoría para ver el detalle.', bkKind = 'gasto';
  $('bk-kind').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-bk]');
    if (!b || b.getAttribute('data-bk') === bkKind) return;
    bkKind = b.getAttribute('data-bk');
    renderBreakdown();
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  });
  function renderBreakdown() {
    var box = $('breakdown'), info = $('slice-info'), K = bkKind, isG = K === 'gasto';
    document.querySelectorAll('#bk-kind [data-bk]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-bk') === K ? 'true' : 'false'); });
    var exps = monthTxs().filter(function (t) { return t.kind === K && !t.pending; });
    var total = sum(exps);
    var pctTxt = function (p) { return p.toLocaleString('es-DO', { maximumFractionDigits: 1 }) + '%'; };
    var head = function (text, color) {
      return '<div class="dn-head"><h2 id="h-desglose" class="dn-title">' + (isG ? 'Gastos' : 'Ingresos') + '<span>por categoría</span></h2>' +
        '<span class="dn-bar" aria-hidden="true" style="background:' + color + '"></span><p class="dn-text">' + text + '</p></div>';
    };
    if (!exps.length) {
      box.innerHTML = '<div class="dn-grid dn-empty">' + head(esc(monthLabel()) + '. Aún no hay ' + (isG ? 'gastos' : 'ingresos') + ' este mes. Cuando registres uno, aquí verás cuánto pesa cada categoría.', 'var(--accent)') + '</div>';
      info.textContent = '';
      return;
    }
    var map = {}, count = {};
    exps.forEach(function (t) {
      map[t.cat] = r2((map[t.cat] || 0) + val(t));
      count[t.cat] = (count[t.cat] || 0) + 1;
    });
    var pk = prevKey(), pm = expByCat(pk, K);
    var dlt = function (cu, pr) { if (!(pr > 0)) return ''; var d = (cu - pr) / pr * 100; return Math.abs(d) < 0.5 ? '' : (d > 0 ? '▲' : '▼') + Math.abs(Math.round(d)) + '%'; };
    var rows = Object.keys(map).map(function (k) {
      return { cat: k, amount: map[k], n: count[k], pct: map[k] / total * 100, d: dlt(map[k], pm[k] || 0), c: catInfo(K, k).c || 8 };
    }).sort(function (a, b) { return b.amount - a.amount; });

    var R = 71, C = 2 * Math.PI * R, gap = rows.length > 1 ? 1.4 : 0, acc = 0;
    var slices = '', labels = '';
    rows.forEach(function (r, i) {
      var frac = r.amount / total, len = Math.max(0, frac * C - gap);
      var text = r.cat + ' · ' + fmtFull(r.amount) + ' · ' + pctTxt(r.pct) + (isG ? ' del gasto · ' : ' del ingreso · ') + r.n + (isG ? (r.n === 1 ? ' gasto' : ' gastos') : (r.n === 1 ? ' ingreso' : ' ingresos')) + (r.d ? ' · ' + r.d + ' frente a ' + mkLabel(pk).toLowerCase() : '');
      r.info = text;
      slices += '<circle class="dn-slice" data-k="' + i + '" data-cat="' + esc(r.cat) + '" data-info="' + esc(text) + '" data-amt="' + esc(fmt(r.amount)) + '" data-pt="' + esc(pctTxt(r.pct)) + '" cx="100" cy="100" r="' + R + '" fill="none" stroke-width="38"' +
        ' style="stroke:var(--c' + r.c + ')" stroke-dasharray="' + len.toFixed(3) + ' ' + (C - len).toFixed(3) + '" stroke-dashoffset="' + (-acc).toFixed(3) + '"' +
        ' transform="rotate(-90 100 100)" tabindex="0" role="button" aria-label="' + esc(text) + '"></circle>';
      if (frac >= 0.07) {
        var a = (acc + frac * C / 2) / C * 2 * Math.PI - Math.PI / 2;
        labels += '<text class="dn-pct" text-anchor="middle" dy=".35em" x="' + (100 + R * Math.cos(a)).toFixed(2) + '" y="' + (100 + R * Math.sin(a)).toFixed(2) +
          '" style="fill:var(--on' + r.c + ')">' + pctTxt(r.pct) + '</text>';
      }
      acc += frac * C;
    });
    var totalStr = fmt(total), fs = Math.min(15, 86 / (totalStr.length * 0.6));
    var center = '<text class="dn-clabel" text-anchor="middle" x="100" y="91">Total</text>' +
      '<text class="dn-ctotal" text-anchor="middle" x="100" y="109" style="font-size:' + fs.toFixed(1) + 'px">' + esc(totalStr) + '</text>';

    var pills = rows.map(function (r, i) {
      return '<li><button type="button" class="dn-pill" data-k="' + i + '" data-cat="' + esc(r.cat) + '" data-info="' + esc(r.info) + '" style="background:var(--c' + r.c + ');color:var(--on' + r.c + ')">' +
        '<span class="n">' + esc(r.cat) + '</span><span class="v">' + pctTxt(r.pct) + ' · ' + fmt(r.amount) + (r.d ? ' · ' + r.d : '') + '</span></button></li>';
    }).join('');

    var lead = rows[0];
    box.innerHTML = '<div class="dn-grid">' +
      head(esc(monthLabel()) + '. ' + (isG ? 'Total gastado' : 'Total recibido') + ' <strong>' + esc(totalStr) + '</strong>. Lo que más pesa: <strong>' + esc(lead.cat) + '</strong> (' + pctTxt(lead.pct) + ').', 'var(--c' + lead.c + ')') +
      '<div class="dn-chart"><svg class="dn-svg" viewBox="0 0 200 200">' + slices + labels + center + '</svg></div>' +
      '<ul class="dn-legend">' + pills + '</ul></div>';
    var big = exps.slice().sort(function (x, z) { return val(z) - val(x); })[0];
    INFO_DEFAULT = (isG ? 'Mayor gasto: ' : 'Mayor ingreso: ') + big.cat + (big.note ? ' · ' + big.note : '') + ' (' + fmt(val(big)) + '). Toca una porción para ver el detalle.';
    info.textContent = INFO_DEFAULT;
  }

  var fltSig = '';
  function fillFilterCats() {
    var sel = $('h-cat'), prev = sel.value;
    var html = '<option value="">Todas las categorías</option>' + ['gasto', 'ingreso'].map(function (k) {
      return '<optgroup label="' + (k === 'gasto' ? 'Gastos' : 'Ingresos') + '">' + state.cats[k].map(function (c) {
        return '<option value="' + k + '|' + esc(c.n) + '">' + esc(c.n) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
    var asel = $('h-acc'), aprev = asel.value, ah = '<option value="">Todas las cuentas</option>' + state.accounts.map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.n) + '</option>'; }).join('');
    if (asel.getAttribute('data-sig') !== ah) { asel.setAttribute('data-sig', ah); asel.innerHTML = ah; asel.value = aprev; if (asel.selectedIndex < 0) asel.selectedIndex = 0; }
    if (html !== fltSig) {
      fltSig = html;
      sel.innerHTML = html;
      sel.value = prev;
      if (sel.selectedIndex < 0) sel.selectedIndex = 0;
    }
  }
  function qn(q) { return /^[\d.,\s]+$/.test(q) ? q.replace(/[,\s]/g, '') : q; }
  function getFilters() {
    return { cat: $('h-cat').value, acc: $('h-acc').value, min: num($('h-min').value), max: num($('h-max').value), from: $('h-from').value, to: $('h-to').value, q: $('h-q').value.trim().toLowerCase() };
  }

  function renderHistory() {
    renderTags();
    fillFilterCats();
    var f = getFilters();
    var rangeMode = !!(f.from || f.to || f.q);
    var active = (f.cat ? 1 : 0) + (f.acc ? 1 : 0) + (f.min > 0 ? 1 : 0) + (f.max > 0 ? 1 : 0) + (f.from ? 1 : 0) + (f.to ? 1 : 0);
    $('flt-count').textContent = active;
    $('flt-count').hidden = !active;
    var badRange = f.from && f.to && f.from > f.to;
    $('flt-note').textContent = badRange ? 'La fecha inicial es posterior a la final.'
      : rangeMode ? 'Con fechas o búsqueda se revisan todos los meses.' : 'Sin fechas, se muestra solo el mes que estás viendo.';
    var base = rangeMode ? state.txs.filter(inCur) : monthTxs();
    var shown = base.filter(function (t) {
      if (filter === 'pend') { if (!t.pending) return false; }
      else if (filter !== 'all' && t.kind !== filter) return false;
      if (f.cat && (t.kind + '|' + t.cat) !== f.cat) return false;
      if (f.acc && accId(t) !== f.acc) return false;
      var v = val(t);
      if (f.min > 0 && v < f.min) return false;
      if (f.max > 0 && v > f.max) return false;
      if (f.from && t.date < f.from) return false;
      if (f.to && t.date > f.to) return false;
      if (f.q && (t.cat + ' ' + (t.note || '') + ' ' + accName(accId(t)) + ' ' + val(t)).toLowerCase().indexOf(qn(f.q)) < 0) return false;
      return true;
    }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.ts - a.ts; });
    $('hist-count').textContent = shown.length + (shown.length === 1 ? ' movimiento' : ' movimientos') +
      (rangeMode ? (f.q && !(f.from || f.to) ? ' en todos los meses' : ' en el rango de fechas') : ' en ' + monthLabel().toLowerCase());
    var tg = 0, ti = 0, tp = 0;
    shown.forEach(function (t) { if (t.pending) tp += val(t); else if (t.kind === 'gasto') tg += val(t); else ti += val(t); });
    var out = (function (g, i, p) {
      var sp = function (c, txt) { return '<span style="color:var(--' + c + ')">' + txt + '</span>'; };
      if (!shown.length) return '';
      if (filter === 'gasto') return sp('bad', 'Total gastado: ' + esc(fmt(r2(g))));
      if (filter === 'ingreso') return sp('good', 'Total de ingresos: ' + esc(fmt(r2(i))));
      if (filter === 'pend') return sp('warn', 'Pendiente por cobrar: ' + esc(fmt(r2(p))));
      return sp('bad', 'Gastado: ' + esc(fmt(r2(g)))) + ' · ' + sp('good', 'Ingresos: ' + esc(fmt(r2(i))));
    })(tg, ti, tp);
    $('hist-total').innerHTML = out;
    var box = $('hist');
    if (!shown.length) {
      box.innerHTML = '<p class="muted text-sm py-6 text-center">' +
        (active > 0 || filter !== 'all' || f.q ? 'No encontré movimientos con esos filtros. Prueba quitando alguno.' : '') + '</p>';
      if (!(active > 0 || filter !== 'all' || f.q)) box.innerHTML = emptyState('receipt', 'Este mes está en blanco', otherCurHint() || 'Registra tu primer ingreso o gasto y aquí verás cómo va tu mes.', 'Registrar un movimiento', 'registrar');
      return;
    }
    var df = rangeMode ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' };
    var dayTot = {};
    shown.forEach(function (t) { if (!t.pending) dayTot[t.date] = r2((dayTot[t.date] || 0) + (t.kind === 'ingreso' ? 1 : -1) * val(t)); });
    var todayS = todayStr(), yS = dayStr(1), lastDay = '';
    var dayLabel = function (d) {
      if (d === todayS) return 'Hoy';
      if (d === yS) return 'Ayer';
      var x = parseDate(d).toLocaleDateString('es-DO', rangeMode ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
      return x.charAt(0).toUpperCase() + x.slice(1);
    };
    box.innerHTML = '<ul class="hlist">' +
      shown.map(function (t) {
        var dh = '';
        if (t.date !== lastDay) {
          lastDay = t.date;
          var dt = dayTot[t.date] || 0;
          dh = '<li class="dhead"><span>' + esc(dayLabel(t.date)) + '</span>' + (dt ? '<span class="dtot" style="color:var(--' + (dt > 0 ? 'good' : 'bad') + ')">' + (dt > 0 ? '+' : '−') + esc(fmt(Math.abs(dt))) + '</span>' : '') + '</li>';
        }
        var info = catInfo(t.kind, t.cat), col = catColor(t);
        var inc = t.kind === 'ingreso';
        var dtxt = parseDate(t.date).toLocaleDateString('es-DO', df);
        return dh + '<li class="hrow' + (t.pending ? ' open' : '') + (t.id === freshId ? ' fresh' : '') + '">' +
          '<span class="chip" style="color:' + col + ';background:color-mix(in srgb, ' + col + ' 16%, transparent)"><i data-lucide="' + info.i + '" class="sm"></i></span>' +
          '<div class="hmain"><div class="font-semibold">' + esc(t.cat) + '</div>' +
            '<div class="note">' + esc(accName(accId(t))) + ccPay(t) + (t.note ? ' · ' + esc(t.note) : '') + '</div>' +
            (t.pending ? '<div class="note" style="color:var(--warn);font-weight:700">Pendiente de cobro</div>' : '') +
            (t.rec ? '<div class="note" style="font-weight:600">Recurrente · ' + esc(REC_LABEL[t.rec] || '') + '</div>' : t.from ? '<div class="note" style="font-weight:600">Recurrente</div>' : '') +
            (inc && t.pct > 0 ? '<div class="note" style="color:var(--good);font-weight:600">Ahorro ' + t.pct.toLocaleString('es-DO', { maximumFractionDigits: 1 }) + '% · ' + fmtFull(r2(val(t) * t.pct / 100)) + '</div>' : '') +
          '</div>' +
          '<div class="hside"><div class="hamt" style="color:var(--' + (inc ? 'good' : 'bad') + ')">' + (inc ? '+' : '−') + fmtFull(val(t)) + '</div></div>' +
            '<div class="hact">' + (t.pending ? '<button type="button" class="btn-ghost" data-collect="' + esc(t.id) + '" style="min-height:34px;padding:0 .65rem;font-weight:700">Cobrar</button>' : '') +
              '<button type="button" class="icon-btn" data-dup="' + esc(t.id) + '" aria-label="Repetir ' + esc(t.cat) + ' con fecha de hoy"><i data-lucide="copy"></i></button>' +
              '<button type="button" class="icon-btn" data-edit="' + esc(t.id) + '" aria-label="Editar ' + esc(t.cat) + '"><i data-lucide="pencil"></i></button>' +
              '<button type="button" class="icon-btn" data-del="' + esc(t.id) + '" aria-label="Eliminar ' + esc(t.cat) + ' por ' + fmtFull(val(t)) + '"><i data-lucide="trash-2"></i></button>' +
            '</div>' +
        '</li>';
      }).join('') + '</ul>';
  }

  /* Ahorro: lo que apartas de cada ingreso más los aportes y retiros directos. */
  function pctFmt(p) { return p.toLocaleString('es-DO', { maximumFractionDigits: 1 }) + '%'; }
  function goalById(id) { return state.goals.filter(function (g) { return g.id === id; })[0] || null; }
  function goalSaved(id) {
    return r2(state.savings.reduce(function (a, e) { return a + (e.goal === id && inCur(e) ? (e.dir === 'retiro' ? -1 : 1) * val(e) : 0); }, 0));
  }
  function renderGoals() {
    var box = $('goals-list'), sel = $('sv-goal'), wrap = $('sv-goal-wrap');
    if (!box) return;
    var shown = state.goals.filter(function (g) { return (g.cur || 'DOP') === state.cur; }), hid = state.goals.length - shown.length;
    box.innerHTML = (shown.length ? '<ul class="cat-list">' + shown.map(function (g) {
      var sv = Math.max(0, goalSaved(g.id)), p = Math.min(100, sv / g.amount * 100);
      return '<li class="flex flex-col gap-1"><div class="flex items-center gap-2"><span class="font-semibold min-w-0 grow" style="overflow-wrap:anywhere">' + esc(g.n) + '</span>' +
        '<button type="button" class="icon-btn" data-gldel="' + esc(g.id) + '" aria-label="Eliminar la meta ' + esc(g.n) + '"><i data-lucide="trash-2"></i></button></div>' +
        '<div class="meter" style="height:8px"><i style="width:' + p + '%"></i></div>' +
        '<p class="note">' + fmt(sv) + ' de ' + fmt(g.amount) + ' (' + Math.round(p) + '%)' + (sv >= g.amount ? ' · ¡Meta cumplida!' : '') + '</p></li>';
    }).join('') + '</ul>' : '<p class="note">Aún no tienes otras metas. Crea una abajo (por ejemplo, Vacaciones) y elige para cuál aportas cada vez.</p>') +
      (hid ? '<p class="note">' + hid + (hid === 1 ? ' meta está' : ' metas están') + ' en la otra moneda.</p>' : '');
    var prev = sel.value;
    sel.innerHTML = '<option value="">Ahorro general</option>' + shown.map(function (g) { return '<option value="' + esc(g.id) + '">' + esc(g.n) + '</option>'; }).join('');
    if (shown.some(function (g) { return g.id === prev; })) sel.value = prev;
    wrap.hidden = !shown.length;
  }
  function ledger() {
    var list = [];
    state.txs.forEach(function (t) {
      if (inCur(t) && t.kind === 'ingreso' && t.pct > 0 && !t.pending) {
        list.push({ auto: true, date: t.date, ts: t.ts, amount: r2(val(t) * t.pct / 100), sign: 1,
          title: 'De tu ingreso: ' + t.cat, note: pctFmt(t.pct) + ' de ' + fmtFull(val(t)) + (t.note ? ' · ' + t.note : '') });
      }
    });
    state.savings.forEach(function (e) {
      if (!inCur(e)) return;
      list.push({ auto: false, open: !!e.open, id: e.id, date: e.date, ts: e.ts, amount: val(e), sign: e.dir === 'retiro' ? -1 : 1,
        title: e.open ? 'Ajuste de lo ahorrado' : (e.dir === 'retiro' ? 'Retiro' : 'Aporte') + (e.goal && goalById(e.goal) ? ' · ' + goalById(e.goal).n : ''), note: e.note || '' });
    });
    list.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.ts - b.ts; });
    var run = 0;
    list.forEach(function (e) { run = r2(run + e.sign * e.amount); e.run = run; });
    return list;
  }

  function renderSavings() {
    var list = ledger();
    var total = list.length ? list[list.length - 1].run : 0;
    var month = 0, fromInc = 0, deposits = 0, withdrawals = 0;
    var adjNet = 0;
    list.forEach(function (e) {
      if (e.open) { adjNet = r2(adjNet + e.sign * e.amount); return; }
      if (e.date.slice(0, 7) === view) month = r2(month + e.sign * e.amount);
      if (e.auto) fromInc = r2(fromInc + e.amount);
      else if (e.sign > 0) deposits = r2(deposits + e.amount);
      else withdrawals = r2(withdrawals + e.amount);
    });
    var adjIn = $('sv-adj-in');
    if (adjIn && document.activeElement !== adjIn) adjIn.value = total ? cm(r2(total)) : '';
    $('sv-hero').innerHTML =
      '<p class="eyebrow">Ahorro acumulado</p>' +
      '<p class="sv-total">' + fmt(total) + '</p>' +
      '<p class="sv-sub">' + esc(monthLabel()) + ': ' + (month < 0 ? '−' : '+') + fmt(Math.abs(month)) + '</p>' +
      '<dl class="sv-stats">' +
        '<div><dt>De tus ingresos</dt><dd>' + fmt(fromInc) + '</dd></div>' +
        '<div><dt>Aportes directos</dt><dd>' + fmt(deposits) + '</dd></div>' +
        '<div><dt>Retiros</dt><dd>' + (withdrawals ? '−' : '') + fmt(withdrawals) + '</dd></div>' +
        (adjNet ? '<div><dt>Ajustes</dt><dd>' + (adjNet < 0 ? '−' : '') + fmt(Math.abs(adjNet)) + '</dd></div>' : '') +
      '</dl>';

    renderGoal(total);
    renderGoals();
    $('sv-count').textContent = list.length
      ? list.length + (list.length === 1 ? ' movimiento' : ' movimientos') + '. Los que vienen de un ingreso se quitan eliminando ese ingreso.'
      : '';
    var box = $('sv-list');
    if (!list.length) {
      box.innerHTML = emptyState('piggy-bank', 'Tu alcancía está vacía', 'Aparta un porcentaje cuando registres un ingreso, o guarda un aporte con el formulario de arriba. Cada peso cuenta.', null, '');
      return;
    }
    var df = { day: 'numeric', month: 'short', year: 'numeric' };
    box.innerHTML = '<ul class="svlist">' +
      list.slice().reverse().map(function (e) {
        return '<li class="svrow">' +
          '<div class="svmain"><div class="font-semibold">' + esc(e.title) + '</div>' +
            '<div class="note">' + esc(parseDate(e.date).toLocaleDateString('es-DO', df)) + (e.note ? ' · ' + esc(e.note) : '') + '</div>' +
            '<div class="note">Acumulado: ' + fmtFull(e.run) + '</div></div>' +
          '<div class="svamt ' + (e.sign > 0 ? 'amt-in' : 'amt-out') + '">' + (e.sign > 0 ? '+' : '−') + fmtFull(e.amount) + '</div>' +
          (e.auto ? '' :
            '<button type="button" class="icon-btn" data-svdel="' + esc(e.id) + '" aria-label="Eliminar ' + esc(e.title.toLowerCase()) + ' de ' + fmtFull(e.amount) + '"><i data-lucide="trash-2"></i></button>') +
        '</li>';
      }).join('') + '</ul>';
  }

  function renderRecent() {
    var tdy = todayStr();
    var list = monthTxs().slice().sort(function (a, b) {
      var fa = a.pending || a.date > tdy ? 1 : 0, fb = b.pending || b.date > tdy ? 1 : 0;
      if (fa !== fb) return fa - fb;
      return a.date < b.date ? 1 : a.date > b.date ? -1 : b.ts - a.ts;
    }).slice(0, 3);
    var box = $('recent-list');
    if (!list.length) {
      box.innerHTML = emptyState('receipt', 'Aún no hay nada en ' + esc(monthLabel().toLowerCase()), otherCurHint() || 'Registra tu primer ingreso o gasto de este mes.', 'Registrar un movimiento', 'registrar');
      return;
    }
    box.innerHTML = '<ul class="cat-list">' + list.map(function (t) {
      var info = catInfo(t.kind, t.cat), col = catColor(t), inc = t.kind === 'ingreso';
      var d = parseDate(t.date).toLocaleDateString('es-DO', { day: 'numeric', month: 'short' });
      return '<li class="flex items-center gap-3">' +
        '<span class="chip" style="color:' + col + ';background:color-mix(in srgb, ' + col + ' 16%, transparent)"><i data-lucide="' + esc(info.i) + '" class="sm"></i></span>' +
        '<div class="min-w-0 grow"><div class="font-semibold">' + esc(t.cat) + '</div><div class="note">' + esc(d) + (t.note ? ' · ' + esc(t.note) : '') + (t.pending ? ' · Pendiente' : '') + '</div></div>' +
        '<span style="font-weight:700;' + (t.pending ? 'opacity:.55;' : '') + 'font-variant-numeric:tabular-nums;white-space:nowrap;' + (inc ? 'color:var(--good)' : 'color:var(--bad)') + '">' + (inc ? '+' : '−') + fmtFull(val(t)) + '</span>' +
      '</li>';
    }).join('') + '</ul>';
  }

  function renderBanner() {
    var b = $('banner');
    var has = state.txs.some(function (t) { return t.ex; }) || state.savings.some(function (t) { return t.ex; });
    if (!has || welcomeActive() || state.cur !== 'DOP') { b.hidden = true; b.className = ''; b.innerHTML = ''; return; }
    b.hidden = false;
    b.className = 'banner';
    b.innerHTML = '<span class="flex items-center gap-2"><i data-lucide="info" class="sm"></i>Estás viendo movimientos de ejemplo.</span>' +
      '<button type="button" class="btn-ghost" id="clear-ex">Eliminar ejemplos</button>';
  }

  function render() {
    syncCur();
    $('m-label').innerHTML = esc(monthLabel()) + '<i data-lucide="chevrons-up-down" class="sm" style="opacity:.6"></i>';
    renderBanner();
    renderKpis();
    countUp();
    renderBreakdown();
    fillAcc();
    renderBudgets();
    renderAlerts();
    renderMB();
    renderProj();
    renderPlan();
    renderDue();
    renderBk();
    renderCloseBanner();
    renderClose();
    renderGxSum();
    renderAccExp();
    renderYear();
    if (curView === 'tendencia') renderTrend();
    if (curView === 'cuentas') renderAccounts();
    renderWelcome();
    renderTip();
    renderCheer();
    renderWeek();
    renderRecap();
    renderHistory();
    renderRecent();
    if (curView === 'ahorro') renderSavings();
    renderChips();
    renderBadges();
    accHint();
    if (curView === 'plantillas') renderTpl();
    greet();
    fillSuggest();
    checkGoal();
    if (!$('cats-panel').hidden) renderCats();
    collapInit();
    moreHint();
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

