  /* ---- Cuentas ---- */
  function accId(x) {
    var id = x && x.acc;
    return state.accounts.some(function (a) { return a.id === id; }) ? id : state.accounts[0].id;
  }
  function accName(id) {
    var a = state.accounts.find(function (x) { return x.id === id; });
    return a ? a.n : state.accounts[0].n;
  }
  function accAdj(a) { return (a && !isCC(a) && a.adj && a.adj[state.cur]) || 0; }
  function accBalances(upTo) {
    var m = {};
    state.accounts.forEach(function (a) { m[a.id] = accAdj(a); });
    /* Cashback: dinero que la tarjeta devuelve. Baja lo que debes; no es ingreso ni pago. */
    state.accounts.forEach(function (a) { (a.cb || []).forEach(function (c) { if (!(upTo && c.date > upTo)) m[a.id] = r2(m[a.id] + val(c)); }); });
    state.txs.forEach(function (t) {
      if (t.pending || (upTo && t.date > upTo)) return;
      var a = accId(t), v = val(t);
      m[a] = r2(m[a] + (t.kind === 'ingreso' ? v - r2(v * (t.pct || 0) / 100) : -v));
    });
    state.savings.forEach(function (e) {
      if (e.open || (upTo && e.date > upTo)) return;
      var a = accId(e);
      m[a] = r2(m[a] + (e.dir === 'retiro' ? 1 : -1) * val(e));
    });
    state.transfers.forEach(function (t) {
      if (upTo && t.date > upTo) return;
      var v = val(t), f = accId({ acc: t.from }), to = accId({ acc: t.to });
      m[f] = r2(m[f] - v);
      m[to] = r2(m[to] + v);
    });
    return m;
  }
  function fillAcc() {
    ['f-acc', 'sv-acc', 'tf-from', 'tf-to'].forEach(function (id, i) {
      var sel = $(id), prev = sel.value;
      sel.innerHTML = state.accounts.map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.n) + (isCC(a) ? ' (crédito)' : '') + '</option>'; }).join('');
      if (state.accounts.some(function (a) { return a.id === prev; })) sel.value = prev;
      else if (id === 'tf-to' && state.accounts.length > 1) sel.value = state.accounts[1].id;
    });
  }
  var confirmAcc = null, cbOpen = '';
  function cbTotal(test) { var s = 0; state.accounts.forEach(function (a) { (a.cb || []).forEach(function (c) { if (test(c)) s += val(c); }); }); return r2(s); }
  function isCC(a) { return a && a.type === 'credito'; }
  function clampDay(y, m, d) { return Math.min(d, new Date(y, m + 1, 0).getDate()); }
  function dueAfter(a, c) {
    var y = c.getFullYear(), m = c.getMonth(), d = new Date(y, m, clampDay(y, m, a.due));
    if (d <= c) d = new Date(y, m + 1, clampDay(y, m + 1, a.due));
    return d;
  }
  /* Corte y pago que le tocan a un consumo hecho en esa fecha: entra al primer corte igual o posterior, y se paga en el primer día de pago después de ese corte. */
  function cycleFor(a, ds) {
    var T = parseDate(ds), y = T.getFullYear(), m = T.getMonth(), cd = clampDay(y, m, a.cut);
    var c = T.getDate() <= cd ? new Date(y, m, cd) : new Date(y, m + 1, clampDay(y, m + 1, a.cut));
    return { cut: c, due: dueAfter(a, c) };
  }
  function ccPay(t) {
    if (t.kind !== 'gasto') return '';
    var a = state.accounts.find(function (x) { return x.id === accId(t); });
    if (!isCC(a) || !(a.cut >= 1 && a.due >= 1)) return '';
    return ' · paga el ' + dShort(cycleFor(a, t.date).due);
  }
  function dShort(d) { return d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' }); }
  function cardInfo(a, bal) {
    var debt = Math.max(0, r2(-bal)), lim = a.lim > 0 ? val({ amount: a.lim, cur: a.lcur || 'DOP' }) : 0;
    var info = { debt: debt, lim: lim, ok: false, st: 0, open: debt };
    if (!(a.cut >= 1 && a.due >= 1)) return info;
    var now = new Date(), t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()), y = t0.getFullYear(), m = t0.getMonth();
    var cd = clampDay(y, m, a.cut), cutL = t0.getDate() >= cd ? new Date(y, m, cd) : new Date(y, m - 1, clampDay(y, m - 1, a.cut));
    var cutN = new Date(cutL.getFullYear(), cutL.getMonth() + 1, clampDay(cutL.getFullYear(), cutL.getMonth() + 1, a.cut));
    var dueL = dueAfter(a, cutL), dueN = dueAfter(a, cutN), cutStr = ymd(cutL);
    var atCut = Math.max(0, r2(-accBalances(cutStr)[a.id])), paid = 0;
    state.transfers.forEach(function (t) { if (t.to === a.id && t.date > cutStr) paid = r2(paid + val(t)); });
    info.ok = true;
    info.st = Math.min(debt, Math.max(0, r2(atCut - paid)));
    info.open = Math.max(0, r2(debt - info.st));
    info.cutL = cutL; info.dueL = dueL; info.cutN = cutN; info.dueN = dueN;
    var prevCut = ymd(new Date(cutL.getFullYear(), cutL.getMonth() - 1, clampDay(cutL.getFullYear(), cutL.getMonth() - 1, a.cut)));
    info.cb = 0; (a.cb || []).forEach(function (c) { if (c.date > prevCut && c.date <= cutStr) info.cb = r2(info.cb + val(c)); });
    info.daysL = Math.round((dueL - t0) / 86400000);
    info.overdue = info.st > 0 && info.daysL < 0;
    return info;
  }
  function accHint() {
    var el = $('acc-hint');
    if (!el) return;
    var a = state.accounts.find(function (x) { return x.id === $('f-acc').value; }), ds = $('f-fecha').value;
    if (!isCC(a) || !(a.cut >= 1 && a.due >= 1) || !ds || kind !== 'gasto') { el.hidden = true; return; }
    var c = cycleFor(a, ds);
    el.textContent = 'Este consumo entra en el corte del ' + dShort(c.cut) + ' y se paga el ' + dShort(c.due) + '.';
    el.hidden = false;
  }
  $('f-acc').addEventListener('change', accHint);
  $('f-fecha').addEventListener('change', accHint);
  $('f-fecha').addEventListener('input', accHint);
  var ccOpen = {}, accX = {};
  var simInit = false;
  function fillSim() {
    var sel = $('sim-card');
    if (!sel) return;
    var bal = accBalances(), cards = state.accounts.filter(isCC), prev = sel.value;
    sel.innerHTML = '<option value="">Otra cantidad</option>' + cards.map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.n) + ' · debe ' + esc(fmt(Math.max(0, r2(-bal[a.id])))) + '</option>'; }).join('');
    if (cards.some(function (a) { return a.id === prev; })) sel.value = prev;
    if (!simInit) {
      simInit = true;
      var ap = lsGet('finanzas-apr', ''); if (ap) $('sim-apr').value = ap;
      if (cards.length) { sel.value = cards[0].id; var d0 = Math.max(0, r2(-bal[cards[0].id])); if (d0 > 0) $('sim-debt').value = cm(d0); }
    }
    simRun();
  }
  function simRun() {
    var out = $('sim-out');
    if (!out) return;
    var debt = num($('sim-debt').value), apr = num($('sim-apr').value) || 0, pay = num($('sim-pay').value);
    if ($('sim-apr').value) lsSet('finanzas-apr', $('sim-apr').value);
    if (!(debt > 0)) { out.textContent = 'Escribe la deuda, o elige una tarjeta que tenga saldo.'; return; }
    if (!(pay > 0)) { out.textContent = 'Escribe cuánto puedes pagar al mes.'; return; }
    var r = apr / 1200;
    var run = function (p) {
      if (p <= debt * r + 0.005) return null;
      var bal = debt, m = 0, it = 0;
      while (bal > 0.005 && m < 1200) { var i = bal * r; it += i; bal += i; bal -= Math.min(p, bal); m++; }
      return m >= 1200 ? null : { m: m, it: r2(it) };
    };
    var span = function (m) { var y = Math.floor(m / 12), rm = m % 12; return (y ? y + (y === 1 ? ' año' : ' años') + (rm ? ' y ' : '') : '') + (rm || !y ? rm + (rm === 1 ? ' mes' : ' meses') : ''); };
    var a = run(pay);
    if (!a) { out.innerHTML = 'Con ' + fmt(pay) + ' al mes no alcanzas a cubrir ni los intereses (≈ ' + fmt(r2(debt * r)) + ' al mes). Necesitas pagar más de eso para que la deuda baje.'; return; }
    var html = 'Terminas de pagar en <strong>' + span(a.m) + '</strong>. Pagas <strong>' + fmt(a.it) + '</strong> en intereses y en total <strong>' + fmt(r2(debt + a.it)) + '</strong>.';
    var p2 = r2(pay * 1.5), b = run(p2);
    if (b && b.m < a.m) html += '<br>Si pagas ' + fmt(p2) + ' al mes: terminas en ' + span(b.m) + ' y te ahorras ' + fmt(r2(a.it - b.it)) + ' en intereses.';
    if (!(apr > 0)) html += '<br><span class="muted">Sin tasa, el cálculo no incluye intereses.</span>';
    out.innerHTML = html;
  }
  ['sim-debt', 'sim-apr', 'sim-pay'].forEach(function (id) { $(id).addEventListener('input', simRun); });
  $('sim-card').addEventListener('change', function () {
    var a = state.accounts.find(function (x) { return x.id === this.value; }, this);
    if (a) { var d = Math.max(0, r2(-accBalances()[a.id])); $('sim-debt').value = d > 0 ? cm(d) : ''; }
    simRun();
  });
  function renderAccounts() {
    fillSim();
    var bal = accBalances(), total = 0, avail = 0, debtAll = 0, hasCC = false;
    state.accounts.forEach(function (a) { total = r2(total + bal[a.id]); if (isCC(a)) { hasCC = true; debtAll = r2(debtAll + bal[a.id]); } else avail = r2(avail + bal[a.id]); });
    function delBtn(a) {
      return confirmAcc === a.id
        ? '<button type="button" class="btn-ghost btn-danger" data-accdel="' + esc(a.id) + '" style="min-height:40px">¿Seguro?</button>'
        : '<button type="button" class="icon-btn" data-accdel="' + esc(a.id) + '" aria-label="Eliminar cuenta ' + esc(a.n) + '"' + (state.accounts.length < 2 ? ' disabled style="opacity:.35"' : '') + '><i data-lucide="trash-2"></i></button>';
    }
    var normal = state.accounts.filter(function (a) { return !isCC(a); }), cards = state.accounts.filter(isCC);
    var bw = 0;
    normal.forEach(function (a) { bw = Math.max(bw, fmt(bal[a.id]).length); });
    $('acc-list').style.setProperty('--balw', bw + 'ch');
    var NCOL = ['#4F46E5', '#0E7490', '#C2410C', '#047857', '#9333EA', '#BE185D'];
    var accIcon = function (n) {
      n = String(n).toLowerCase();
      if (/efectivo|cash|billete/.test(n)) return 'banknote';
      if (/tarjeta|cr[eé]dito|visa|master/.test(n)) return 'credit-card';
      if (/ahorro|alcanc/.test(n)) return 'piggy-bank';
      if (/banco|bhd|popular|reservas|scotia|apap|promerica|santa cruz|cuenta/.test(n)) return 'landmark';
      return 'wallet';
    };
    var html = normal.map(function (a, ix) {
      var v = bal[a.id], open = !!accX[a.id] || adjAcc === a.id || confirmAcc === a.id;
      var sum = '<button type="button" class="acc-sum" data-accx="' + esc(a.id) + '" aria-expanded="' + open + '" aria-label="' + esc(a.n) + ', ' + esc(fmt(v)) + '"><span class="acc-ic"><i data-lucide="' + accIcon(a.n) + '"></i></span>' +
        '<span class="acc-nm">' + esc(a.n) + '</span><span class="abal" style="color:var(--' + (v < 0 ? 'bad' : 'ink') + ')">' + fmt(v) + '</span><i data-lucide="chevron-down" class="sm acc-chev"></i></button>';
      var body = '';
      if (open) {
        body = '<div class="acc-body"><label class="lbl">Nombre<input class="field" type="text" maxlength="24" value="' + esc(a.n) + '" data-accname="' + esc(a.id) + '" aria-label="Nombre de la cuenta"></label>' +
          (adjAcc === a.id
            ? '<div class="acc-edit"><label class="lbl" for="adj-in">Saldo actual de ' + esc(a.n) + '</label>' +
              '<div class="flex gap-2 items-center"><span class="relative block grow"><span class="prefix">' + SYM[state.cur] + '</span><input id="adj-in" class="field field-prefix money" type="text" inputmode="decimal" placeholder="0.00" autocomplete="off" value="' + (v >= 0 ? cm(v) : '') + '"></span>' +
              '<button type="button" class="btn-primary" data-accadjok="' + esc(a.id) + '" style="width:auto;padding-inline:1rem;min-height:44px">Guardar</button>' +
              '<button type="button" class="btn-ghost" data-accadjno="1" style="min-height:44px">Cancelar</button></div>' +
              '<p class="note">Escribe cuánto tienes ahora en esta cuenta. Se ajusta el saldo sin crear un movimiento.</p></div>'
            : '<div class="flex flex-wrap items-center gap-2">' +
              '<button type="button" class="btn-ghost" style="min-height:40px" data-accadj="' + esc(a.id) + '" aria-label="Ajustar el saldo de ' + esc(a.n) + '"><i data-lucide="pencil" class="sm"></i>Ajustar saldo</button>' +
              '<button type="button" class="btn-ghost" style="min-height:40px" data-acctoc="' + esc(a.id) + '" aria-label="Marcar ' + esc(a.n) + ' como tarjeta de crédito"><i data-lucide="credit-card" class="sm"></i>Es tarjeta</button>' +
              delBtn(a) + '</div>') + '</div>';
      }
      return '<div class="arow arn acard' + (open ? ' acx-open' : '') + '" style="--ac:' + NCOL[ix % NCOL.length] + '">' + sum + body + '</div>';
    }).join('');
    if (cards.length) {
      html += '<p class="eyebrow" style="margin-top:12px">Tarjetas de crédito</p>' + cards.map(function (a) {
        var v = bal[a.id], ci = cardInfo(a, v), p = ci.lim ? ci.debt / ci.lim * 100 : 0;
        var col = p >= 100 ? 'var(--bad)' : p >= 80 ? 'var(--warn)' : 'var(--accent)';
        var dueTxt = '';
        if (!ci.ok) dueTxt = '<p class="note">Configura el día de corte y de pago.</p>';
        else {
          var stTxt = ci.st > 0
            ? (ci.overdue ? '<span style="color:var(--bad);font-weight:700">Vencido desde el ' + dShort(ci.dueL) + '</span>' : (ci.daysL === 0 ? 'vence hoy' : ci.daysL === 1 ? 'vence mañana' : 'vence en ' + ci.daysL + ' días'))
            : 'sin pendiente ✓';
          var newTxt = ci.open > 0 ? 'Consumos nuevos: ' + fmt(ci.open) + ' · se cierran el ' + dShort(ci.cutN) + ' y se pagan el ' + dShort(ci.dueN) : 'Próximo corte el ' + dShort(ci.cutN) + ' · pago el ' + dShort(ci.dueN);
          dueTxt = (ci.st > 0
            ? '<p class="note" style="font-weight:700;color:var(--ink)">Corte del ' + dShort(ci.cutL) + ': ' + fmt(ci.st) + ' · pago el ' + dShort(ci.dueL) + ' (' + stTxt + ')</p>'
            : '<p class="note" style="font-weight:700;color:var(--good)">Nada pendiente por pagar ✓</p>') +
            (ci.cb > 0 ? '<p class="note" style="color:var(--good);font-weight:600">Ese corte ya tiene descontado ' + fmt(ci.cb) + ' de cashback.</p>' : '') +
            '<p class="note">' + newTxt + '</p>';
        }
        var GR = ['#4F46E5,#7C3AED', '#C2410C,#DB2777', '#0E7490,#2563EB', '#047857,#0D9488'], gi = cards.indexOf(a) % GR.length;
        var visual = '<div class="ccard" style="background:linear-gradient(135deg,' + GR[gi] + ')">' +
          '<div class="cc-top"><span class="cc-name">' + esc(a.n) + '</span><i data-lucide="credit-card"></i></div>' +
          '<div class="cc-chip"></div>' +
          '<div class="cc-amt">' + (v > 0 ? 'A favor ' + fmt(v) : 'Debes ' + fmt(ci.debt)) + '</div>' +
          (ci.lim ? '<div class="cc-bar"><i style="width:' + Math.min(100, p) + '%"></i></div><div class="cc-row"><span>' + Math.round(p) + '% usado</span><span>Límite ' + fmt(ci.lim) + '</span></div>' : '') +
          (a.cut >= 1 && a.due >= 1 ? '<div class="cc-row"><span>Corte día ' + a.cut + '</span><span>Pago día ' + a.due + '</span></div>' : '') +
        '</div>';
        var cOpen = !!accX[a.id] || confirmAcc === a.id, cc1 = GR[gi].split(',')[0];
        var cSub = (ci.lim ? Math.round(p) + '% usado' : '') + (ci.ok && ci.st > 0 ? (ci.lim ? ' · ' : '') + 'pago ' + dShort(ci.dueL) : '');
        var cSum = '<button type="button" class="acc-sum" data-accx="' + esc(a.id) + '" aria-expanded="' + cOpen + '"><span class="acc-ic" style="--ac:' + cc1 + '"><i data-lucide="credit-card"></i></span>' +
          '<span class="acc-nm">' + esc(a.n) + (cSub ? '<span class="acc-sub">' + esc(cSub) + '</span>' : '') + '</span>' +
          '<span class="abal" style="color:var(--' + (v < 0 ? 'bad' : 'ink') + ')">' + (v > 0 ? 'A favor ' + fmt(v) : 'Debes ' + fmt(ci.debt)) + '</span><i data-lucide="chevron-down" class="sm acc-chev"></i></button>';
        if (!cOpen) return '<div class="cc" style="padding-block:6px">' + cSum + '</div>';
        return '<div class="cc" style="padding-block:10px;display:flex;flex-direction:column;gap:10px">' + cSum + visual +
          (ci.lim ? '<p class="note">Disponible ' + fmt(Math.max(0, r2(ci.lim - ci.debt))) + '</p>' : '') +
          dueTxt +
          '<div class="flex flex-wrap gap-2"><button type="button" class="btn-ghost" style="min-height:40px" data-ccpay="' + esc(a.id) + '"' + (ci.debt > 0 ? '' : ' disabled') + '><i data-lucide="banknote" class="sm"></i>' + (ci.st > 0 ? 'Pagar tarjeta' : 'Adelantar pago') + '</button>' +
            '<button type="button" class="btn-ghost" style="min-height:40px" data-cbopen="' + esc(a.id) + '"><i data-lucide="gift" class="sm"></i>Registrar cashback</button></div>' +
          (cbOpen === a.id ? '<div class="editor"><div class="grid grid-cols-2 gap-3">' +
            '<label class="lbl">Cashback recibido<span class="relative block"><span class="prefix">' + SYM[state.cur] + '</span><input class="field field-prefix money" type="text" inputmode="decimal" data-cbamt placeholder="0.00" autocomplete="off"></span></label>' +
            '<label class="lbl">Fecha<input class="field" type="date" data-cbdate value="' + (ci.ok ? ymd(ci.cutL) : todayStr()) + '"></label></div>' +
            '<p class="note">Con la fecha del corte (o antes), baja lo que debes de ese corte. No cuenta como ingreso ni cambia tus gastos por categoría.</p>' +
            '<p class="err" role="alert" data-cberr hidden></p>' +
            '<div class="flex gap-2"><button type="button" class="btn-ghost" style="min-height:40px" data-cbsave="' + esc(a.id) + '">Guardar cashback</button><button type="button" class="btn-ghost" style="min-height:40px" data-cbcancel>Cancelar</button></div></div>' : '') +
          ((a.cb || []).length ? '<div><p class="eyebrow">Cashback · ' + new Date().getFullYear() + ': ' + esc(fmt(r2((a.cb || []).reduce(function (s, c) { return s + (c.date.slice(0, 4) === String(new Date().getFullYear()) ? val(c) : 0); }, 0)))) + '</p>' +
            (a.cb || []).slice().sort(function (x, z) { return x.date < z.date ? 1 : -1; }).slice(0, 4).map(function (c) {
              return '<div class="rw"><span class="nm">' + esc(dShort(parseDate(c.date))) + ' ' + c.date.slice(0, 4) + '</span><span class="am" style="color:var(--good)">+' + esc(fmtFull(c.amount, c.cur || 'DOP')) + '</span>' +
                '<button type="button" class="icon-btn" data-cbdel="' + esc(a.id) + '|' + esc(c.id) + '" aria-label="Quitar este cashback"><i data-lucide="x"></i></button></div>';
            }).join('') + '</div>' : '') +
          '<details class="cc-edit" data-ccid="' + esc(a.id) + '"' + (ccOpen[a.id] ? ' open' : '') + '><summary class="link-btn" style="cursor:pointer">Editar tarjeta</summary><div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">' +
          '<div class="arow" style="grid-template-columns:minmax(0,1fr) auto;padding:0"><input class="field" type="text" maxlength="24" value="' + esc(a.n) + '" data-accname="' + esc(a.id) + '" aria-label="Nombre de la tarjeta">' + delBtn(a) + '</div>' +
          '<div class="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2">' +
            '<label class="lbl">Límite<input class="field money" type="text" inputmode="decimal" data-accf="lim" data-id="' + esc(a.id) + '" value="' + (a.lim > 0 ? cm(a.lim) : '') + '" placeholder="Opcional"></label>' +
            '<label class="lbl">Corte<input class="field" type="number" inputmode="numeric" min="1" max="31" data-accf="cut" data-id="' + esc(a.id) + '" value="' + (a.cut || '') + '"></label>' +
            '<label class="lbl">Pago<input class="field" type="number" inputmode="numeric" min="1" max="31" data-accf="due" data-id="' + esc(a.id) + '" value="' + (a.due || '') + '"></label></div>' +
          '<button type="button" class="link-btn" data-accnocc="' + esc(a.id) + '" style="align-self:flex-start">Dejar de usar como crédito</button></div></details></div>';
      }).join('');
    }
    if (hasCC) {
      html += '<div class="arow" style="grid-template-columns:minmax(0,1fr) auto;margin-top:6px"><span>Disponible (sin tarjetas)</span><span class="abal">' + fmt(avail) + '</span></div>' +
        '<div class="arow" style="grid-template-columns:minmax(0,1fr) auto"><span>Deuda en tarjetas</span><span class="abal" style="color:var(--' + (debtAll < 0 ? 'bad' : 'ink') + ')">' + fmt(debtAll) + '</span></div>' +
        '<div class="arow" style="grid-template-columns:minmax(0,1fr) auto"><strong>Balance neto</strong><span class="abal">' + fmt(total) + '</span></div>';
    } else html += '<div class="arow" style="grid-template-columns:minmax(0,1fr) auto"><strong>Total</strong><span class="abal">' + fmt(total) + '</span></div>';
    if (confirmAcc) html += '<p class="note">Lo que tenga esta cuenta pasará a ' + esc(accName(state.accounts.filter(function (x) { return x.id !== confirmAcc; })[0].id)) + '.</p>';
    $('acc-list').innerHTML = html;
    var tl = state.transfers.filter(inCur).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.ts - a.ts; }).slice(0, 30);
    $('tf-list').innerHTML = !tl.length
      ? emptyState('arrow-left-right', 'Aún no has movido dinero', 'Cuando pases dinero de una cuenta a otra, lo verás aquí.', null, '')
      : '<ul class="hlist">' + tl.map(function (t) {
          return '<li class="hrow" style="grid-template-columns:minmax(0,1fr) auto auto"><div class="hmain"><div class="font-semibold">' + esc(accName(accId({ acc: t.from }))) + ' → ' + esc(accName(accId({ acc: t.to }))) + '</div>' +
            '<div class="note">' + esc(parseDate(t.date).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })) + (t.note ? ' · ' + esc(t.note) : '') + '</div></div>' +
            '<span class="hamt">' + fmtFull(val(t)) + '</span>' +
            '<button type="button" class="icon-btn" data-tfdel="' + esc(t.id) + '" aria-label="Eliminar transferencia"><i data-lucide="trash-2"></i></button></li>';
        }).join('') + '</ul>';
  }
  $('acc-list').addEventListener('click', function (ev) {
    var x = ev.target.closest('[data-accx]');
    if (!x) return;
    var id = x.getAttribute('data-accx');
    accX[id] = !accX[id];
    renderAccounts(); refreshIcons();
  });
  $('acc-list').addEventListener('toggle', function (ev) { var d = ev.target; if (d && d.getAttribute && d.getAttribute('data-ccid')) ccOpen[d.getAttribute('data-ccid')] = d.open; }, true);
  $('acc-type').addEventListener('change', function () { $('acc-cc').hidden = this.value !== 'credito'; });
  $('acc-list').addEventListener('change', function (ev) {
    var f = ev.target.closest('[data-accf]');
    if (!f) return;
    var a = state.accounts.find(function (x) { return x.id === f.getAttribute('data-id'); });
    if (!a) return;
    var k = f.getAttribute('data-accf');
    if (k === 'lim') { var v = num(f.value); if (v > 0) { a.lim = r2(v); a.lcur = state.cur; } else { delete a.lim; delete a.lcur; } }
    else { var d = parseInt(f.value, 10); if (d >= 1 && d <= 31) a[k] = d; else delete a[k]; }
    save(state); render();
  });
  var adjAcc = null;
  /* Igualar el balance de Inicio: se crea un ajuste en una cuenta normal por la diferencia. */
  function eqDiff() {
    var t = num($('eq-in').value), bal = lastKpi ? lastKpi.bal : 0, el = $('eq-diff');
    if (!isFinite(t)) { el.textContent = ''; return; }
    var d = r2(t - bal);
    el.textContent = d === 0 ? 'Ya coincide con tu balance.' : (d > 0 ? 'Se sumarán ' : 'Se restarán ') + fmtFull(Math.abs(d)) + ' a la cuenta elegida.';
  }
  function eqOpen(o) {
    var p = $('eq-panel');
    p.hidden = !o;
    if (!o) return;
    var bal = lastKpi ? lastKpi.bal : 0, normal = state.accounts.filter(function (a) { return !isCC(a); });
    $('eq-cur').textContent = fmtFull(bal);
    $('eq-acc').innerHTML = normal.map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.n) + '</option>'; }).join('');
    $('eq-in').value = '';
    $('eq-diff').textContent = '';
    document.querySelectorAll('[data-sym]').forEach(function (el) { el.textContent = SYM[state.cur]; });
    p.scrollIntoView({ behavior: reduceM() ? 'auto' : 'smooth', block: 'center' });
    try { $('eq-in').focus({ preventScroll: true }); } catch (e) { $('eq-in').focus(); }
  }
  $('eq-btn').addEventListener('click', function () { if ($('eq-panel').hidden) eqOpen(true); else eqOpen(false); });
  $('eq-no').addEventListener('click', function () { eqOpen(false); });
  $('eq-in').addEventListener('input', eqDiff);
  $('eq-ok').addEventListener('click', function () {
    var t = num($('eq-in').value), bal = lastKpi ? lastKpi.bal : 0;
    if (!isFinite(t)) { $('eq-in').focus(); toast('Escribe el balance real', null, null, true); return; }
    var d = r2(t - bal);
    if (d === 0) { eqOpen(false); toast('Tu balance ya coincide', null, null, true); return; }
    var a = state.accounts.find(function (x) { return x.id === $('eq-acc').value; });
    if (!a || isCC(a)) return;
    a.adj = a.adj || {};
    var old = a.adj[state.cur] || 0, cur = state.cur;
    a.adj[cur] = r2(old + d);
    save(state);
    eqOpen(false);
    render();
    toast('Balance igualado a ' + fmtFull(t), 'Deshacer', function () { a.adj[cur] = old; save(state); render(); });
  });
  $('eq-in').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { ev.preventDefault(); $('eq-ok').click(); }
    else if (ev.key === 'Escape') eqOpen(false);
  });
  function adjSave(id) {
    var a = state.accounts.find(function (x) { return x.id === id; }), inp = $('adj-in');
    if (!a || !inp) return;
    var nv = num(inp.value);
    if (!isFinite(nv) || nv < 0) { inp.focus(); return; }
    var cur = accBalances()[id], delta = r2(r2(nv) - cur), before = a.adj ? JSON.parse(JSON.stringify(a.adj)) : null;
    adjAcc = null;
    if (delta !== 0) {
      a.adj = a.adj || {};
      a.adj[state.cur] = r2((a.adj[state.cur] || 0) + delta);
      save(state);
    }
    render();
    toast(delta === 0 ? 'El saldo ya era ' + fmtFull(nv) : a.n + ' ahora tiene ' + fmtFull(nv), delta === 0 ? null : 'Deshacer', function () {
      if (before) a.adj = before; else delete a.adj;
      save(state); render();
    });
  }
  $('acc-list').addEventListener('click', function (ev) {
    var ab = ev.target.closest('[data-accadj]'), ok = ev.target.closest('[data-accadjok]'), no = ev.target.closest('[data-accadjno]');
    if (ab) { adjAcc = ab.getAttribute('data-accadj'); renderAccounts(); if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); var i = $('adj-in'); if (i) { i.focus(); i.select(); } }
    else if (ok) adjSave(ok.getAttribute('data-accadjok'));
    else if (no) { adjAcc = null; renderAccounts(); if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); }
  });
  $('acc-list').addEventListener('keydown', function (ev) {
    if (ev.target.id !== 'adj-in') return;
    if (ev.key === 'Enter') { ev.preventDefault(); adjSave(adjAcc); }
    else if (ev.key === 'Escape') { adjAcc = null; renderAccounts(); if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); }
  });
  $('acc-list').addEventListener('click', function (ev) {
    var cbo = ev.target.closest('[data-cbopen]'), cbs = ev.target.closest('[data-cbsave]'), cbd = ev.target.closest('[data-cbdel]');
    if (cbo || ev.target.closest('[data-cbcancel]')) { cbOpen = cbo && cbOpen !== cbo.getAttribute('data-cbopen') ? cbo.getAttribute('data-cbopen') : ''; renderAccounts(); refreshIcons(); if (cbOpen) { var fi = document.querySelector('[data-cbamt]'); if (fi) fi.focus(); } return; }
    if (cbs) {
      var ca = state.accounts.find(function (x) { return x.id === cbs.getAttribute('data-cbsave'); }), cv = r2(num(document.querySelector('[data-cbamt]').value)), cdt = document.querySelector('[data-cbdate]').value, ce = document.querySelector('[data-cberr]');
      if (!ca) return;
      if (!isFinite(cv) || cv <= 0) { ce.textContent = 'Escribe cuánto cashback recibiste.'; ce.hidden = false; return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cdt) || cdt > todayStr()) { ce.textContent = 'Pon una fecha de hoy o anterior.'; ce.hidden = false; return; }
      if (!Array.isArray(ca.cb)) ca.cb = [];
      ca.cb.push({ id: 'cb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), date: cdt, amount: cv, cur: state.cur });
      cbOpen = '';
      save(state); render(); refreshIcons();
      toast('Cashback registrado: ' + fmtFull(cv) + ' menos en ' + ca.n);
      return;
    }
    if (cbd) {
      var ids = cbd.getAttribute('data-cbdel').split('|'), da = state.accounts.find(function (x) { return x.id === ids[0]; });
      if (!da || !da.cb) return;
      var di = da.cb.findIndex(function (x) { return x.id === ids[1]; });
      if (di < 0) return;
      var gone = da.cb.splice(di, 1)[0];
      save(state); render(); refreshIcons();
      toast('Cashback quitado', 'Deshacer', function () { da.cb.push(gone); save(state); render(); refreshIcons(); });
      return;
    }
    var c = ev.target.closest('[data-acctoc]'), n = ev.target.closest('[data-accnocc]'), pay = ev.target.closest('[data-ccpay]');
    if (c) {
      var a = state.accounts.find(function (x) { return x.id === c.getAttribute('data-acctoc'); });
      if (a) { a.type = 'credito'; save(state); render(); toast('Ahora ' + a.n + ' es tarjeta de crédito. Pon el límite, el corte y el pago.'); }
    } else if (n) {
      var b = state.accounts.find(function (x) { return x.id === n.getAttribute('data-accnocc'); });
      if (b) { delete b.type; delete b.lim; delete b.lcur; delete b.cut; delete b.due; delete b.cb; save(state); render(); }
    } else if (pay && !pay.disabled) {
      var id = pay.getAttribute('data-ccpay'), card = state.accounts.find(function (x) { return x.id === id; });
      var info = cardInfo(card, accBalances()[id]), from = state.accounts.filter(function (x) { return !isCC(x); })[0];
      $('tf-to').value = id;
      if (from) $('tf-from').value = from.id;
      $('tf-monto').value = cm(info.st > 0 ? info.st : info.debt);
      $('tf-nota').value = (info.st > 0 ? 'Pago de ' : 'Adelanto a ') + card.n;
      collapOpen('tf-form');
      $('tf-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('tf-monto').focus({ preventScroll: true });
    }
  });
  function accError(m) { var e = $('acc-error'); e.textContent = m; e.hidden = !m; }
  $('acc-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var n = $('acc-new').value.trim();
    if (!n) { accError('Escribe un nombre.'); return; }
    if (state.accounts.some(function (a) { return a.n.toLowerCase() === n.toLowerCase(); })) { accError('Ya tienes una cuenta con ese nombre.'); return; }
    var acc = { id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), n: n };
    if ($('acc-type').value === 'credito') {
      var cut = parseInt($('acc-cut').value, 10), due = parseInt($('acc-due').value, 10), lim = num($('acc-lim').value);
      if (!(cut >= 1 && cut <= 31) || !(due >= 1 && due <= 31)) { accError('Escribe el día de corte y el día de pago (del 1 al 31).'); return; }
      acc.type = 'credito'; acc.cut = cut; acc.due = due;
      if (lim > 0) { acc.lim = r2(lim); acc.lcur = state.cur; }
    }
    accError('');
    state.accounts.push(acc);
    $('acc-new').value = ''; $('acc-lim').value = ''; $('acc-cut').value = ''; $('acc-due').value = '';
    $('acc-type').value = 'normal'; $('acc-cc').hidden = true;
    save(state);
    render();
  });
  $('acc-list').addEventListener('change', function (ev) {
    var inp = ev.target.closest('[data-accname]');
    if (!inp) return;
    var n = inp.value.trim(), id = inp.getAttribute('data-accname');
    if (n && !state.accounts.some(function (a) { return a.id !== id && a.n.toLowerCase() === n.toLowerCase(); })) {
      state.accounts.find(function (a) { return a.id === id; }).n = n;
      save(state);
    }
    render();
  });
  $('acc-list').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-accdel]');
    if (!b || b.disabled) return;
    var id = b.getAttribute('data-accdel');
    if (confirmAcc !== id) { confirmAcc = id; renderAccounts(); if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); return; }
    confirmAcc = null;
    var snap = { acc: state.accounts.slice(), tf: JSON.parse(JSON.stringify(state.transfers)),
      tx: state.txs.filter(function (t) { return t.acc === id; }).map(function (t) { return t.id; }),
      sv: state.savings.filter(function (e) { return e.acc === id; }).map(function (e) { return e.id; }) };
    state.accounts = state.accounts.filter(function (a) { return a.id !== id; });
    var first = state.accounts[0].id;
    state.txs.forEach(function (t) { if (t.acc === id) t.acc = first; });
    state.savings.forEach(function (e) { if (e.acc === id) e.acc = first; });
    state.transfers.forEach(function (t) { if (t.from === id) t.from = first; if (t.to === id) t.to = first; });
    state.transfers = state.transfers.filter(function (t) { return t.from !== t.to; });
    save(state);
    render();
    toast('Cuenta eliminada', 'Deshacer', function () {
      state.accounts = snap.acc; state.transfers = snap.tf;
      state.txs.forEach(function (t) { if (snap.tx.indexOf(t.id) >= 0) t.acc = id; });
      state.savings.forEach(function (e) { if (snap.sv.indexOf(e.id) >= 0) e.acc = id; });
      save(state); render();
    });
  });
  function tfError(m) { var e = $('tf-error'); e.textContent = m; e.hidden = !m; }
  $('tf-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var a = r2(num($('tf-monto').value)), from = $('tf-from').value, to = $('tf-to').value, date = $('tf-fecha').value;
    if (from === to) { tfError('Elige dos cuentas distintas.'); return; }
    if (!isFinite(a) || a <= 0) { tfError('Escribe un monto mayor que cero.'); $('tf-monto').focus(); return; }
    if (!date) { tfError('Elige la fecha.'); return; }
    tfError('');
    state.transfers.push({ id: 'tf' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), from: from, to: to, amount: a, cur: state.cur, date: date, note: $('tf-nota').value.trim().slice(0, 60), ts: Date.now() });
    save(state);
    $('tf-monto').value = '';
    $('tf-nota').value = '';
    render();
    toast('Transferencia hecha: ' + fmtFull(a));
  });
  $('tf-list').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-tfdel]');
    if (!b) return;
    var idx = state.transfers.findIndex(function (t) { return t.id === b.getAttribute('data-tfdel'); });
    if (idx < 0) return;
    var gone = state.transfers.splice(idx, 1)[0];
    save(state);
    render();
    toast('Transferencia eliminada', 'Deshacer', function () { state.transfers.push(gone); save(state); render(); });
  });
  $('tf-fecha').value = todayStr();

