  /* ---- Atajos de las tarjetas ---- */
  $('kpis').addEventListener('click', function (ev) {
    var a = ev.target.closest('[data-kfilter]');
    if (!a) return;
    var b = document.querySelector('[data-filter="' + a.getAttribute('data-kfilter') + '"]');
    if (b) b.click();
  });
  $('kpis').addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    var a = ev.target.closest('.kpi-link');
    if (!a) return;
    ev.preventDefault();
    a.click();
  });

