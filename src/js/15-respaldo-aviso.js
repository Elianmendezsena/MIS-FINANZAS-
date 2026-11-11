  /* ---- Respaldo: aviso ---- */
  function renderBk() {
    var el = $('bk-warn');
    if (!el) return;
    var hide = function () { el.style.display = 'none'; el.innerHTML = ''; };
    if (window.claude && window.claude.use) { hide(); return; }
    var real = state.txs.filter(function (t) { return !t.ex; }).length + state.savings.filter(function (e) { return !e.ex; }).length;
    if (real < 5) { hide(); return; }
    var now = Date.now(), last = +lsGet('finanzas-lastbk', '0') || 0, snooze = +lsGet('finanzas-bk-snooze', '0') || 0;
    if (!+lsGet('finanzas-bk-since', '0')) lsSet('finanzas-bk-since', String(now));
    var base = last || +lsGet('finanzas-bk-since', String(now)), age = Math.floor((now - base) / 864e5);
    if (snooze > now || age < (last ? 7 : 3)) { hide(); return; }
    el.style.display = '';
    el.innerHTML = '<p class="eyebrow">Respaldo</p><p class="text-sm">' + (last ? 'Hace ' + age + ' días que no haces un respaldo.' : 'Aún no has hecho un respaldo de tus datos.') + ' Tus datos viven solo en este dispositivo.</p>' +
      '<div class="flex gap-2"><button type="button" class="btn-ghost" data-bk="now"><i data-lucide="download" class="sm"></i>Respaldar ahora</button><button type="button" class="btn-ghost" data-bk="later">Más tarde</button></div>';
  }
  $('bk-warn').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-bk]');
    if (!b) return;
    if (b.getAttribute('data-bk') === 'now') $('bk-save').click();
    else { lsSet('finanzas-bk-snooze', String(Date.now() + 2 * 864e5)); renderBk(); }
  });

