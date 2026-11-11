  /* ---- Plan del mes: gastos e ingresos seguros ---- */
  var payOpen = '';
  function pkind(p) { return p.kind === 'ingreso' ? 'ingreso' : 'gasto'; }
  function planItems(k) { return state.plan.filter(function (p) { return !p.stop && p.mk === k && (p.cur || 'DOP') === state.cur; }); }
  function newPlanId(x) { return 'pl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + (x || ''); }
  /* Gastos/ingresos que se repiten: al abrir un mes se crean solos desde el último mes que los tenía */
  function ensureRec(k) {
    if (k > toKey(new Date())) return;
    var src = {}, stop = {}, have = {}, made = 0;
    state.plan.forEach(function (p) {
      if (!p.rk) return;
      if (p.stop) { if (!stop[p.rk] || p.mk < stop[p.rk]) stop[p.rk] = p.mk; return; }
      if (p.mk === k) have[p.rk] = 1;
      else if (p.mk < k && (!src[p.rk] || p.mk > src[p.rk].mk)) src[p.rk] = p;
    });
    Object.keys(src).forEach(function (rk) {
      var p = src[rk];
      if (!p.rec || have[rk] || (stop[rk] && k >= stop[rk])) return;
      var c = { id: newPlanId(made), mk: k, kind: pkind(p), cat: p.cat, n: p.n || '', amount: p.amount, cur: p.cur || 'DOP', rec: true, rk: rk };
      if (p.day) c.day = p.day;
      if (accOk(p.acc)) c.acc = p.acc;
      state.plan.push(c); made++;
    });
    if (made) save(state);
  }
  function planTx(p) { return p.tx ? (state.txs.filter(function (t) { return t.id === p.tx; })[0] || null) : null; }
  function planDate(p) {
    if (p.mk === toKey(new Date())) return todayStr();
    var last = new Date(+p.mk.slice(0, 4), +p.mk.slice(5, 7), 0).getDate();
    return p.mk + '-' + pad(Math.min(p.day || 1, last));
  }
  function fillPlanCats() {
    var sel = $('pl-cat'), pv = sel.value, k = $('pl-kind').value;
    sel.innerHTML = state.cats[k].map(function (c) { return '<option value="' + esc(c.n) + '">' + esc(c.n) + '</option>'; }).join('');
    if (state.cats[k].some(function (c) { return c.n === pv; })) sel.value = pv;
  }
  function accOpts(sel) {
    return state.accounts.map(function (a) { return '<option value="' + esc(a.id) + '"' + (a.id === sel ? ' selected' : '') + '>' + esc(a.n) + (isCC(a) ? ' (crédito)' : '') + '</option>'; }).join('');
  }
  function accOk(id) { return state.accounts.some(function (a) { return a.id === id; }); }
  function accDefault(p) {
    if (p && accOk(p.acc)) return p.acc;
    var l = lsGet('finanzas-last-acc', '');
    return accOk(l) ? l : state.accounts[0].id;
  }
  function fillPlanAccs() {
    var sel = $('pl-acc'), pv = sel.value;
    sel.innerHTML = accOpts(accOk(pv) ? pv : accDefault(null));
    $('pl-acc-l').textContent = $('pl-kind').value === 'ingreso' ? 'Cuenta donde entra' : 'Forma de pago';
  }
  $('pl-kind').addEventListener('change', function () { fillPlanCats(); fillPlanAccs(); });
  var editOpen = '';
  function planEditRow(p) {
    var k = pkind(p);
    return '<li class="rw" style="display:block"><div class="grid grid-cols-2 gap-3">' +
      '<label class="lbl">Tipo<select class="field" data-ek><option value="gasto"' + (k === 'gasto' ? ' selected' : '') + '>Gasto</option><option value="ingreso"' + (k === 'ingreso' ? ' selected' : '') + '>Ingreso</option></select></label>' +
      '<label class="lbl">Categoría<select class="field" data-ec>' + catOpts(k, p.cat) + '</select></label>' +
      '<label class="lbl">Detalle<input class="field" type="text" maxlength="40" data-en value="' + esc(p.n || '') + '" autocomplete="off"></label>' +
      '<label class="lbl">Monto<span class="relative block"><span class="prefix">' + SYM[state.cur] + '</span><input class="field field-prefix money" type="text" inputmode="decimal" data-ea value="' + cm(r2(val(p))) + '" autocomplete="off"></span></label>' +
      '<label class="lbl">Día (opcional)<input class="field" type="number" inputmode="numeric" min="1" max="31" data-ed value="' + (p.day || '') + '"></label>' +
      '<label class="lbl"><span data-eal>' + (k === 'ingreso' ? 'Cuenta donde entra' : 'Forma de pago') + '</span><select class="field" data-eacc>' + accOpts(accDefault(p)) + '</select></label>' +
      '<label class="chk" style="grid-column:1/-1"><input type="checkbox" data-erec' + (p.rec ? ' checked' : '') + '><span>Se repite cada mes</span></label>' +
      '</div><p class="err" role="alert" data-eerr hidden></p>' +
      '<div class="flex gap-2" style="margin-top:10px"><button type="button" class="btn-ghost" style="min-height:40px" data-esave="' + esc(p.id) + '">Guardar cambios</button>' +
      '<button type="button" class="btn-ghost" style="min-height:40px" data-ecancel="1">Cancelar</button></div></li>';
  }
  function catOpts(k, sel) {
    var list = state.cats[k].map(function (c) { return c.n; });
    if (sel && list.indexOf(sel) < 0) list.unshift(sel);
    return list.map(function (n) { return '<option value="' + esc(n) + '"' + (n === sel ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('');
  }
  function planTotals() {
    var o = { dueG: 0, paidG: 0, dueI: 0, paidI: 0, nG: 0, nI: 0, late: 0 }, now = new Date(), isNow = view === toKey(now);
    planItems(view).forEach(function (p) {
      var v = val(p), tx = planTx(p), g = pkind(p) === 'gasto';
      if (tx) { if (g) o.paidG = r2(o.paidG + r2(val(tx))); else o.paidI = r2(o.paidI + r2(val(tx))); }
      else if (g) { o.dueG = r2(o.dueG + v); o.nG++; if (isNow && p.day && p.day < now.getDate()) o.late++; }
      else { o.dueI = r2(o.dueI + v); o.nI++; }
    });
    return o;
  }
  function projBal(o) { return lastKpi && typeof lastKpi.bal === 'number' ? r2(lastKpi.bal + o.dueI - o.dueG) : null; }
  function renderPlan() {
    var list = $('plan-list');
    if (!list) return;
    ensureRec(view);
    var items = planItems(view).sort(function (a, b) { return (a.day || 99) - (b.day || 99); });
    var o = planTotals(), now = new Date(), isNow = view === toKey(now);
    if (payOpen && !items.some(function (p) { return p.id === payOpen; })) payOpen = '';
    if (editOpen && !items.some(function (p) { return p.id === editOpen && !planTx(p); })) editOpen = '';
    fillPlanCats(); fillPlanAccs();
    var hasG = items.some(function (p) { return pkind(p) === 'gasto'; }), hasI = items.some(function (p) { return pkind(p) === 'ingreso'; }), s1 = '';
    if (hasG) {
      var lim = mbVal(), spent = sum(monthTxs().filter(function (t) { return t.kind === 'gasto' && !t.pending; })), free = r2(lim - spent - o.dueG);
      s1 += '<div class="wk"><div><p class="eyebrow">Gastos seguros</p><b>' + esc(fmt(r2(o.paidG + o.dueG))) + '</b></div>' +
        '<div><p class="eyebrow">Ya pagados</p><b style="color:var(--good)">' + esc(fmt(o.paidG)) + '</b></div>' +
        '<div><p class="eyebrow">Por pagar</p><b style="color:var(--' + (o.dueG > 0 ? 'warn' : 'good') + ')">' + esc(fmt(o.dueG)) + '</b></div></div>' +
        (lim > 0 ? '<p class="note">' + (free >= 0 ? 'Después de pagarlos te quedan <strong>' + esc(fmt(free)) + '</strong> libres de tu presupuesto.' : 'Con ellos te faltarían <strong style="color:var(--bad)">' + esc(fmt(-free)) + '</strong> de tu presupuesto.') + '</p>' : '<p class="note">Define el presupuesto del mes y te digo cuánto te queda libre.</p>');
    }
    if (hasI) {
      s1 += '<div class="wk" style="margin-top:6px"><div><p class="eyebrow">Ingresos seguros</p><b>' + esc(fmt(r2(o.paidI + o.dueI))) + '</b></div>' +
        '<div><p class="eyebrow">Ya cobrados</p><b style="color:var(--good)">' + esc(fmt(o.paidI)) + '</b></div>' +
        '<div><p class="eyebrow">Por cobrar</p><b style="color:var(--' + (o.dueI > 0 ? 'warn' : 'good') + ')">' + esc(fmt(o.dueI)) + '</b></div></div>';
    }
    var pb = projBal(o);
    if (pb !== null && (o.dueG > 0 || o.dueI > 0)) {
      s1 += '<p class="note" style="font-weight:700;color:var(--ink)">Saldo proyectado a fin de mes: <span style="color:var(--' + (pb < 0 ? 'bad' : 'good') + ')">' + esc(fmt(pb)) + '</span></p>' +
        '<p class="note">Tu balance de hoy (' + esc(fmt(lastKpi.bal)) + ')' + (o.dueI > 0 ? ' + ' + esc(fmt(o.dueI)) + ' por cobrar' : '') + (o.dueG > 0 ? ' − ' + esc(fmt(o.dueG)) + ' por pagar' : '') + '.</p>';
    }
    $('plan-sum').innerHTML = s1;
    (function () {
      var np = 0, ni = 0, pl = [];
      items.forEach(function (p) { if (!planTx(p)) { if (pkind(p) === 'gasto') np++; else ni++; } });
      if (np) pl.push(np + ' por pagar · ' + fmt(o.dueG));
      if (ni) pl.push(ni + ' por cobrar · ' + fmt(o.dueI));
      $('plan-line').textContent = pl.length ? pl.join(' · ') : (items.length ? 'Todo al día' : 'Nada anotado este mes');
    })();
    list.innerHTML = items.length ? items.map(function (p) {
      var tx = planTx(p), g = pkind(p) === 'gasto', late = !tx && g && isNow && p.day && p.day < now.getDate();
      var col = g ? 'var(--bad)' : 'var(--good)', sg = g ? '−' : '+';
      var nm = '<span class="nm" style="white-space:normal">' + esc(p.cat) + (p.n ? ' · ' + esc(p.n) : '') +
        '<span class="note" style="display:block;font-weight:400">' + (g ? 'Gasto' : 'Ingreso') + ' · ' + (p.day ? 'Día ' + p.day : 'Sin día fijo') + (accOk(tx ? tx.acc : p.acc) ? ' · ' + esc(accName(tx ? tx.acc : p.acc)) : '') + (p.rec ? ' · ↻ cada mes' : '') + (late ? ' · <b style="color:var(--bad)">vencido</b>' : '') +
        (tx ? ' · ' + (g ? 'pagado' : 'cobrado') + ' el ' + esc(dShort(parseDate(tx.date))) + (Math.abs(val(tx) - val(p)) > 0.004 ? ' (plan: ' + esc(fmt(r2(val(p)))) + ')' : '') : '') + '</span></span>';
      if (editOpen === p.id && !tx) return planEditRow(p);
      if (payOpen === p.id && !tx) {
        return '<li class="rw" style="flex-wrap:wrap">' + nm + '<span class="relative block" style="width:8.5rem"><span class="prefix">' + SYM[state.cur] + '</span>' +
          '<input class="field field-prefix money" type="text" inputmode="decimal" data-payamt="' + esc(p.id) + '" value="' + cm(r2(val(p))) + '" aria-label="Monto real"></span>' +
          '<select class="field" style="width:8.5rem" data-payacc aria-label="' + (g ? 'Forma de pago' : 'Cuenta') + '">' + accOpts(accDefault(p)) + '</select>' +
          '<button type="button" class="btn-ghost" style="min-height:40px" data-payok="' + esc(p.id) + '">' + (g ? 'Confirmar pago' : 'Confirmar cobro') + '</button>' +
          '<button type="button" class="icon-btn" data-paycancel="1" aria-label="Cancelar"><i data-lucide="x"></i></button></li>';
      }
      return '<li class="rw pl-row">' + nm + '<span class="am" style="color:' + col + '">' + sg + esc(fmt(r2(tx ? val(tx) : val(p)))) + '</span><span class="pl-act">' +
        (tx ? '<button type="button" class="btn-ghost" style="min-height:40px" data-unpay="' + esc(p.id) + '">Deshacer</button>'
            : '<button type="button" class="btn-ghost" style="min-height:40px" data-pay="' + esc(p.id) + '">' + (g ? 'Pagado' : 'Cobrado') + '</button>' +
              '<button type="button" class="icon-btn" data-pedit="' + esc(p.id) + '" aria-label="Editar"><i data-lucide="pencil"></i></button>') +
        '<button type="button" class="icon-btn" data-pdel="' + esc(p.id) + '" aria-label="Quitar del plan"><i data-lucide="x"></i></button></span></li>';
    }).join('') : '<li class="note">Aquí van tus pagos y cobros seguros de ' + esc(monthLabel().toLowerCase()) + ' (alquiler, luz, salario…). Agrégalos abajo y márcalos cuando pasen. Si se repiten, marca “Se repite cada mes” y la app los crea sola.</li>';
    var pk = toKey(new Date(+view.slice(0, 4), +view.slice(5, 7) - 2, 1)), prevN = planItems(pk).length;
    $('plan-copy-wrap').hidden = !(items.length === 0 && prevN > 0);
    $('plan-copy-t').textContent = 'Copiar los ' + prevN + ' de ' + mkLabel(pk).toLowerCase();
    var mini = $('plan-mini');
    if (isNow && (o.nG > 0 || o.nI > 0)) {
      var nx = items.filter(function (p) { return !planTx(p) && p.day && pkind(p) === 'gasto'; }).sort(function (a, b) { return a.day - b.day; })[0], pb2 = projBal(o);
      mini.style.display = '';
      mini.innerHTML = '<p class="eyebrow">Plan del mes</p>' +
        '<div class="wk">' +
        (o.nG > 0 ? '<div><p class="eyebrow">Por pagar' + (o.late ? ' · <b style="color:var(--bad)">' + o.late + ' vencido' + (o.late === 1 ? '' : 's') + '</b>' : '') + '</p><b>' + esc(fmt(o.dueG)) + '</b></div>' : '') +
        (o.nI > 0 ? '<div><p class="eyebrow">Por cobrar</p><b>' + esc(fmt(o.dueI)) + '</b></div>' : '') +
        (pb2 !== null ? '<div><p class="eyebrow">Fin de mes</p><b style="color:var(--' + (pb2 < 0 ? 'bad' : 'good') + ')">' + esc(fmt(pb2)) + '</b></div>' : '') +
        '</div>' +
        (nx ? '<p class="note">Próximo pago: ' + esc(nx.cat) + ', día ' + nx.day + '.</p>' : '') +
        '<button type="button" class="link-btn" data-go="gastos">Ver y marcar<i data-lucide="chevron-right" class="sm"></i></button>';
    } else { mini.style.display = 'none'; mini.innerHTML = ''; }
  }
  $('pl-add').addEventListener('click', function () {
    var er = $('pl-err'), v = r2(num($('pl-amt').value)), d = parseInt($('pl-day').value, 10);
    if (!isFinite(v) || v <= 0) { er.textContent = 'Escribe el monto.'; er.hidden = false; $('pl-amt').focus(); return; }
    if ($('pl-day').value.trim() !== '' && !(d >= 1 && d <= 31)) { er.textContent = 'El día va del 1 al 31.'; er.hidden = false; return; }
    er.hidden = true;
    var p = { id: 'pl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), mk: view, kind: $('pl-kind').value, cat: $('pl-cat').value, n: $('pl-n').value.trim().slice(0, 40), amount: v, cur: state.cur, acc: $('pl-acc').value };
    if ($('pl-rec').checked) { p.rec = true; p.rk = p.id; }
    if (d >= 1 && d <= 31) p.day = d;
    state.plan.push(p);
    $('pl-amt').value = ''; $('pl-n').value = ''; $('pl-day').value = ''; $('pl-rec').checked = false;
    save(state); render();
    toast((p.kind === 'gasto' ? 'Gasto' : 'Ingreso') + ' agregado al plan: ' + fmtFull(v));
  });
  $('plan-copy').addEventListener('click', function () {
    var pk = toKey(new Date(+view.slice(0, 4), +view.slice(5, 7) - 2, 1)), n = 0;
    planItems(pk).forEach(function (p) {
      var c = { id: 'pl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + n, mk: view, kind: pkind(p), cat: p.cat, n: p.n || '', amount: p.amount, cur: p.cur || 'DOP' };
      if (p.day) c.day = p.day;
      if (accOk(p.acc)) c.acc = p.acc;
      if (p.rec) { c.rec = true; c.rk = p.rk || p.id; }
      state.plan.push(c); n++;
    });
    save(state); render();
    toast(n + (n === 1 ? ' movimiento copiado al plan' : ' movimientos copiados al plan'));
  });
  function planFind(id) { return state.plan.filter(function (x) { return x.id === id; })[0]; }
  $('plan-list').addEventListener('click', function (ev) {
    var pay = ev.target.closest('[data-pay]'), ok = ev.target.closest('[data-payok]'), cn = ev.target.closest('[data-paycancel]'), un = ev.target.closest('[data-unpay]'), del = ev.target.closest('[data-pdel]'),
        ped = ev.target.closest('[data-pedit]'), esv = ev.target.closest('[data-esave]'), ecn = ev.target.closest('[data-ecancel]');
    if (pay) {
      editOpen = ''; payOpen = pay.getAttribute('data-pay'); renderPlan();
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
      var inp = document.querySelector('[data-payamt]'); if (inp) { try { inp.focus(); inp.select(); } catch (e) {} }
    } else if (ped) {
      payOpen = ''; editOpen = ped.getAttribute('data-pedit'); renderPlan();
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
      var ie = document.querySelector('[data-ea]'); if (ie) { try { ie.focus(); ie.select(); } catch (e) {} }
    } else if (ecn) {
      editOpen = ''; renderPlan();
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    } else if (esv) {
      var pe = planFind(esv.getAttribute('data-esave'));
      if (!pe) return;
      var row = esv.closest('li'), er2 = row.querySelector('[data-eerr]'), av = r2(num(row.querySelector('[data-ea]').value)), dv = row.querySelector('[data-ed]').value.trim(), dn = parseInt(dv, 10);
      if (!isFinite(av) || av <= 0) { er2.textContent = 'Escribe el monto.'; er2.hidden = false; return; }
      if (dv !== '' && !(dn >= 1 && dn <= 31)) { er2.textContent = 'El día va del 1 al 31.'; er2.hidden = false; return; }
      pe.kind = row.querySelector('[data-ek]').value; pe.cat = row.querySelector('[data-ec]').value;
      pe.n = row.querySelector('[data-en]').value.trim().slice(0, 40); pe.amount = av; pe.acc = row.querySelector('[data-eacc]').value;
      if (dv === '') delete pe.day; else pe.day = dn;
      pe.rec = !!row.querySelector('[data-erec]').checked;
      if (pe.rec && !pe.rk) pe.rk = pe.id;
      if (!pe.rec) delete pe.rec;
      editOpen = '';
      save(state); render();
      toast('Cambios guardados');
    } else if (cn) {
      payOpen = ''; renderPlan();
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    } else if (ok) {
      var p = planFind(ok.getAttribute('data-payok'));
      if (!p) return;
      var inp2 = document.querySelector('[data-payamt]'), amt = r2(num(inp2 ? inp2.value : '')), g = pkind(p) === 'gasto';
      if (!isFinite(amt) || amt <= 0) { toast('Escribe el monto real', null, null, true); return; }
      var date = planDate(p), pre = g ? pctAt(p.cat, date.slice(0, 7)) : 0, accSel = document.querySelector('[data-payacc]'), acc = accSel ? accSel.value : accDefault(p);
      if (!accOk(acc)) acc = state.accounts[0].id;
      p.acc = acc;
      var tx = { id: 'tx' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), kind: pkind(p), cat: p.cat, amount: amt, cur: p.cur || 'DOP', date: date, note: p.n || '', ts: Date.now(), acc: acc };
      state.txs.push(tx); p.tx = tx.id; payOpen = '';
      save(state); render();
      toast((g ? 'Pagado y registrado: ' : 'Cobrado y registrado: ') + fmtFull(amt) + (g ? budgetNote(p.cat) : ''));
      if (g) crossWarn(p.cat, pre, date.slice(0, 7));
    } else if (un) {
      var q = planFind(un.getAttribute('data-unpay'));
      if (!q) return;
      state.txs = state.txs.filter(function (t) { return t.id !== q.tx; });
      delete q.tx;
      save(state); render();
      toast('Deshecho: el movimiento se quitó de tus movimientos');
    } else if (del) {
      var idx = state.plan.findIndex(function (x) { return x.id === del.getAttribute('data-pdel'); });
      if (idx < 0) return;
      var old = state.plan.splice(idx, 1)[0], tomb = null;
      if (old.rk) { tomb = { id: newPlanId('s'), mk: old.mk, rk: old.rk, stop: true, cur: old.cur || 'DOP' }; state.plan.push(tomb); }
      save(state); render();
      toast(old.rec ? 'Quitado de este mes y de los siguientes' : 'Quitado del plan', 'Deshacer', function () {
        if (tomb) state.plan = state.plan.filter(function (x) { return x !== tomb; });
        state.plan.push(old); save(state); render();
      });
    }
  });

  $('plan-list').addEventListener('change', function (ev) {
    var k = ev.target.closest('[data-ek]');
    if (!k) return;
    var row = k.closest('li');
    row.querySelector('[data-ec]').innerHTML = catOpts(k.value, '');
    row.querySelector('[data-eal]').textContent = k.value === 'ingreso' ? 'Cuenta donde entra' : 'Forma de pago';
  });

