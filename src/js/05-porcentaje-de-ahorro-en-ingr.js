  /* ---- Porcentaje de ahorro en ingresos ---- */
  function currentPct() {
    if (pctMode === 'none') return 0;
    if (pctMode === 'custom') return parseFloat($('f-pct').value) || 0;
    return pctMode;
  }
  function updatePreview() {
    var el = $('pct-preview');
    if (kind !== 'ingreso') { el.textContent = ''; return; }
    var p = currentPct(), a = num($('f-monto').value);
    if (pctMode === 'none') el.textContent = 'No apartarás nada de este ingreso.';
    else if (!(p > 0) || p > 100) el.textContent = 'Escribe un porcentaje entre 0.1 y 100.';
    else if (!(a > 0)) el.textContent = 'Escribe el monto para ver cuánto apartas.';
    else {
      var s = r2(a * p / 100);
      el.textContent = 'Apartas ' + fmtFull(s) + ' y te quedan ' + fmtFull(r2(a - s)) + ' para gastar.';
    }
  }
  $('save-box').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-pct]');
    if (!b) return;
    var v = b.getAttribute('data-pct');
    pctMode = (v === 'custom' || v === 'none') ? v : +v;
    document.querySelectorAll('[data-pct]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    $('pct-custom').hidden = pctMode !== 'custom';
    if (pctMode === 'custom') $('f-pct').focus();
    updatePreview();
  });
  $('f-pct').addEventListener('input', updatePreview);
  $('f-monto').addEventListener('input', updatePreview);

