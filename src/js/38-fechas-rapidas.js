  /* ---- Fechas rápidas ---- */
  function dayStr(offset) {
    var d = new Date();
    d.setDate(d.getDate() - offset);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function syncDayButtons() {
    var v = $('f-fecha').value;
    document.querySelectorAll('[data-day]').forEach(function (b) {
      b.setAttribute('aria-pressed', v === dayStr(+b.getAttribute('data-day')) ? 'true' : 'false');
    });
  }
  document.querySelectorAll('[data-day]').forEach(function (b) {
    b.addEventListener('click', function () {
      $('f-fecha').value = dayStr(+b.getAttribute('data-day'));
      syncDayButtons();
    });
  });
  $('f-fecha').addEventListener('input', syncDayButtons);
  $('f-fecha').addEventListener('change', syncDayButtons);

  $('f-fecha').value = todayStr();
  $('sv-fecha').value = todayStr();
  syncDayButtons();
  fillCats();
  var madeRec = genRecurring();
  save(state);
  render();
  if (madeRec) toast(madeRec === 1 ? 'Se agregó 1 movimiento recurrente' : 'Se agregaron ' + madeRec + ' movimientos recurrentes');
  setView('resumen');
  initSync();
  tourMaybe();
  applyLastAcc();
  try {
    var qa = new URLSearchParams(location.search).get('add');
    if (qa === 'gasto' || qa === 'ingreso') {
      setKind(qa); setView('registrar');
      if (history.replaceState) history.replaceState(null, '', location.pathname);
      setTimeout(function () { try { $('f-monto').focus(); } catch (e) {} }, 400);
    }
  } catch (e) { /* sin acceso directo */ }
  confReady = true;
  setTimeout(function () {
    var sp = $('splash');
    if (!sp) return;
    sp.classList.add('out');
    setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 380);
  }, lsGet('finanzas-name', '') ? 1100 : 550);
})();
