  /* ---- Tutorial ---- */
  var TOUR = [
    { i: 'plus', t: 'Registra en segundos', l: ['Toca el botón + y elige ingreso o gasto.', 'Elige Hoy, Ayer o Antes de ayer con un toque.', 'En el monto puedes sumar y restar: 150+75 se calcula solo.'] },
    { i: 'menu', t: 'Todo está en el menú', l: ['Las dos rayitas de arriba abren el menú.', 'Ahí están Logros, Cuentas, Categorías, Lo que se repite y el modo oscuro.', 'El ojo oculta los montos cuando estés en público.'] },
    { i: 'hand', t: 'Gestos en Movimientos', l: ['Toca un movimiento para ver sus botones.', 'Desliza a la izquierda para eliminar y a la derecha para editar.', 'Mantén pulsado para ver todas las acciones.'] }
  ];
  var tourI = 0;
  function tourShow(i) {
    tourI = i;
    var p = TOUR[i];
    $('tour').hidden = false;
    $('tour-body').innerHTML = '<div class="tour-ic"><i data-lucide="' + p.i + '"></i></div><h2>' + esc(p.t) + '</h2><ul>' + p.l.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    $('tour-dots').innerHTML = TOUR.map(function (_, k) { return '<i' + (k === i ? ' class="on"' : '') + '></i>'; }).join('');
    $('tour-next').textContent = i === TOUR.length - 1 ? 'Listo' : 'Siguiente';
    $('tour-skip').hidden = i === TOUR.length - 1;
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    try { $('tour-next').focus({ preventScroll: true }); } catch (e) {}
  }
  function tourClose() { $('tour').hidden = true; lsSet('finanzas-tour', '1'); }
  $('tour-next').addEventListener('click', function () { if (tourI >= TOUR.length - 1) tourClose(); else tourShow(tourI + 1); });
  $('tour-skip').addEventListener('click', tourClose);
  $('tour-open').addEventListener('click', function () { menuOpen(false); tourShow(0); });
  function tourMaybe() { /* el tutorial ya no sale solo; se abre desde el menú */ }

