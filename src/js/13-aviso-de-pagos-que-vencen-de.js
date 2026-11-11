  /* ---- Aviso de pagos que vencen (dentro de la app) ---- */
  function dueList() {
    var now = new Date(), d = now.getDate(), last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), out = [];
    planItems(toKey(now)).forEach(function (p) {
      if (pkind(p) !== 'gasto' || planTx(p) || !p.day) return;
      var dd = Math.min(p.day, last);
      if (dd < d) out.push({ p: p, w: 0, t: 'Vencido (día ' + dd + ')' });
      else if (dd === d) out.push({ p: p, w: 1, t: 'Hoy' });
      else if (dd === d + 1) out.push({ p: p, w: 2, t: 'Mañana' });
    });
    return out.sort(function (a, b) { return a.w - b.w; });
  }
  function renderDue() {
    var el = $('due-banner');
    if (!el) return;
    var L = dueList(), sig = todayStr() + ':' + L.map(function (x) { return x.p.id; }).join(',');
    if (!L.length || lsGet('finanzas-due-x', '') === sig) { el.style.display = 'none'; el.innerHTML = ''; return; }
    el.style.display = ''; el.dataset.sig = sig;
    el.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><p class="eyebrow" style="color:var(--warn)">Pagos por vencer</p>' +
      '<button type="button" class="icon-btn" data-duex="1" aria-label="Ocultar el aviso" style="margin:-8px -8px 0 0"><i data-lucide="x"></i></button></div>' +
      L.slice(0, 4).map(function (x) {
        return '<p class="text-sm"><b style="color:var(--' + (x.w === 0 ? 'bad' : 'ink') + ')">' + esc(x.t) + ':</b> ' + esc(x.p.cat) + (x.p.n ? ' · ' + esc(x.p.n) : '') + ' <b>' + esc(fmt(r2(val(x.p)))) + '</b></p>';
      }).join('') + (L.length > 4 ? '<p class="note">y ' + (L.length - 4) + ' más</p>' : '') +
      '<button type="button" class="link-btn" data-go="gastos">Ver y marcar<i data-lucide="chevron-right" class="sm"></i></button>';
  }
  $('due-banner').addEventListener('click', function (ev) {
    if (ev.target.closest('[data-duex]')) { lsSet('finanzas-due-x', $('due-banner').dataset.sig || ''); renderDue(); }
  });

