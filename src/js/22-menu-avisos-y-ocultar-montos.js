  /* ---- Menú, avisos y ocultar montos ---- */
  function menuOpen(open) {
    $('menu').hidden = !open; $('menu-back').hidden = !open;
    $('menu-btn').setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { try { $('menu-close').focus({ preventScroll: true }); } catch (e) {} }
  }
  $('menu-btn').addEventListener('click', function () { menuOpen($('menu').hidden); });
  $('menu-close').addEventListener('click', function () { menuOpen(false); try { $('menu-btn').focus({ preventScroll: true }); } catch (e) {} });
  $('menu-back').addEventListener('click', function () { menuOpen(false); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !$('menu').hidden) { menuOpen(false); try { $('menu-btn').focus({ preventScroll: true }); } catch (e) {} } });
  $('menu').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-mgo]');
    if (!b) return;
    setView(b.getAttribute('data-mgo'));
    var f = b.getAttribute('data-mfilter');
    if (f) { var fb = document.querySelector('[data-filter="' + f + '"]'); if (fb) fb.click(); }
  });
  $('bell-btn').addEventListener('click', function () {
    var n = +($('bell-btn').getAttribute('data-n') || 0);
    if (!n) { toast('No tienes avisos por ahora.'); return; }
    setView('resumen');
    setTimeout(function () { var a = $('alerts'); if (a && a.scrollIntoView) a.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
  });
  function applyHide(on) {
    $('app').classList.toggle('hide-amt', on);
    var e = $('eye-btn'); e.setAttribute('aria-pressed', on ? 'true' : 'false'); e.setAttribute('aria-label', on ? 'Mostrar montos' : 'Ocultar montos');
    e.innerHTML = '<i data-lucide="' + (on ? 'eye-off' : 'eye') + '"></i>';
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }
  $('eye-btn').addEventListener('click', function () { var on = !$('app').classList.contains('hide-amt'); lsSet('finanzas-hide', on ? '1' : '0'); applyHide(on); });
  applyHide(lsGet('finanzas-hide', '0') === '1');

