  /* ---- Secciones (pestañas) ---- */
  function setView(name) {
    var prevView = curView;
    scrollPos[prevView] = window.pageYOffset || 0;
    curView = name;
    if (name === 'gastos') playAnim('breakdown');
    document.querySelectorAll('[data-view]').forEach(function (el) { el.hidden = el.getAttribute('data-view') !== name; });
    document.querySelectorAll('[data-tab]').forEach(function (b) {
      if (b.getAttribute('data-tab') === name) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    if (name !== prevView && !reduceM()) {
      document.querySelectorAll('[data-view]').forEach(function (el) {
        if (!el.hidden && el.animate) el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
      });
    }
    $('fab-wrap').hidden = name === 'registrar';
    $('hero').classList.toggle('hero-tall', name === 'resumen');
    var VT = { resumen: 'Mis Finanzas', historial: 'Movimientos', cuentas: 'Cuentas', categorias: 'Categorías', gastos: 'Gastos', ahorro: 'Ahorro', ajustes: 'Ajustes', logros: 'Logros', tendencia: 'Reportes', registrar: 'Registrar', plantillas: 'Lo que se repite' };
    var vt = VT[name] || 'Mis Finanzas';
    var showMonth = ['resumen', 'historial', 'gastos', 'ahorro', 'tendencia'].indexOf(name) >= 0;
    $('hero-month').hidden = !showMonth; $('hero-title').hidden = showMonth; $('hero-title').textContent = vt;
    document.title = vt;
    var h1 = document.querySelector('#hero h1'); if (h1) h1.textContent = vt;
    var mt = document.querySelector('#menu .menu-title'); if (mt) mt.textContent = vt;
    if (typeof menuOpen === 'function') menuOpen(false);
    if (name === 'logros') { renderBadges(); if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); }
    if (name === 'tendencia') playAnim('trend-box');
    if (name === 'historial') {
      var hb = $('hist'); hb.classList.remove('stagger'); void hb.offsetWidth; hb.classList.add('stagger');
      setTimeout(function () { hb.classList.remove('stagger'); }, 900);
      if (freshId) setTimeout(function () { freshId = null; }, 1800);
    }
    if (name === 'resumen') setTimeout(runPulse, 250);
    if (name === 'ajustes') renderSettings();
    if (name === 'tendencia') { renderTrend(); renderYear(); }
    if (name === 'cuentas') renderAccounts();
    if (name === 'ahorro') renderSavings();
    if (name === 'plantillas') renderTpl();
    if ((name === 'tendencia' || name === 'cuentas' || name === 'ahorro' || name === 'plantillas') && window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    fitBalance();
    fabOpen(false);
    if (name === 'categorias') refreshCats();
    else { editing = null; confirmDel = null; draft = null; }
    window.scrollTo(0, (name !== prevView && name !== 'registrar' && scrollPos[name]) || 0);
    if (name === 'registrar') { try { $('f-monto').focus({ preventScroll: true }); } catch (e) {} }
    $('month-pop').hidden = true; $('m-label').setAttribute('aria-expanded', 'false');
  }
  document.querySelectorAll('[data-tab]').forEach(function (b) {
    b.addEventListener('click', function () { setView(b.getAttribute('data-tab')); });
  });
  document.querySelectorAll('[data-goto]').forEach(function (b) {
    b.addEventListener('click', function () { setView(b.getAttribute('data-goto')); });
  });

