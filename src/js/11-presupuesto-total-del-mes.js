  /* ---- Presupuesto total del mes ---- */
  function mbVal(k) { var b = mbEntry(k).e; return b && b.amount > 0 ? val({ amount: b.amount, cur: b.cur || 'DOP' }) : 0; }
  function renderMB() {
    var el = $('mb-card'), lim = mbVal(), inp = $('mb-in');
    if (document.activeElement !== inp) inp.value = lim ? cm(r2(lim)) : '';
    var isNow = view === toKey(new Date());
    if (!lim) {
      el.innerHTML = isNow && !welcomeActive() ? '<p class="note">Pon un presupuesto del mes y te digo cuánto puedes gastar por día.</p><button type="button" class="link-btn" data-go="gastos">Definir presupuesto<i data-lucide="chevron-right" class="sm"></i></button>' : '';
      return;
    }
    var sp = sum(monthTxs().filter(function (t) { return t.kind === 'gasto' && !t.pending; })), p = sp / lim * 100;
    var col = p >= 100 ? 'var(--bad)' : p >= 80 ? 'var(--warn)' : 'var(--good)';
    el.innerHTML = '<div class="flex justify-between gap-2 text-sm"><strong>Presupuesto del mes</strong><span>' + Math.round(p) + '%</span></div>' +
      '<div class="meter" style="height:10px"><i style="width:' + Math.min(100, p) + '%;background:' + col + '"></i></div>' +
      '<p class="note">' + (sp <= lim ? 'Te quedan <strong>' + fmt(r2(lim - sp)) + '</strong> de ' + fmt(lim) : 'Te pasaste por <strong>' + fmt(r2(sp - lim)) + '</strong> (presupuesto ' + fmt(lim) + ')') + '</p>' + perDay(lim, sp, isNow) +
      (mbEntry(view).from && mbEntry(view).from !== view ? '<p class="note">Igual que ' + esc(mkLabel(mbEntry(view).from).toLowerCase()) + '. <button type="button" class="link-btn" data-go="gastos">Cambiar para este mes</button></p>' : '');
  }
  function perDay(lim, sp, isNow) {
    if (!isNow || sp >= lim) return '';
    var n = new Date(), last = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate(), left = last - n.getDate() + 1;
    return '<p class="note" style="font-weight:700;color:var(--ink)">Puedes gastar unos ' + fmt(r2((lim - sp) / left)) + ' por día (' + left + (left === 1 ? ' día' : ' días') + ' restantes)</p>';
  }
  $('mb-in').addEventListener('change', function () {
    var v = num($('mb-in').value);
    state.mBud[view] = { amount: v > 0 ? r2(v) : 0, cur: state.cur };
    save(state);
    render();
  });

