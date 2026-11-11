  /* ---- Pulido: saludo, sugerencias, sonido, confeti, ayuda, animaciones ---- */
  var scrollPos = {};
  function greet() {
    var h = new Date().getHours(), el = $('hero-greet');
    var nm = lsGet('finanzas-name', '').trim();
    if (el) el.textContent = (h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches') + (nm ? ', ' + nm : '');
    var sh = $('sp-hello'), ss = $('sp-sum');
    if (sh) sh.textContent = nm ? 'Hola, ' + nm : '';
    if (ss) {
      var ex = state.txs.filter(function (t) { return inCur(t) && t.kind === 'gasto' && !t.pending && t.date.slice(0, 7) === toKey(new Date()); });
      ss.textContent = ex.length ? 'Este mes llevas gastado ' + fmt(sum(ex)) : '';
    }
  }
  $('name-in').addEventListener('input', function () { lsSet('finanzas-name', $('name-in').value.trim().slice(0, 20)); greet(); });
  function fillSuggest() {
    var set = {}, dl = $('h-q-list');
    if (!dl) return;
    state.cats.gasto.concat(state.cats.ingreso).forEach(function (c) { set[c.n] = 1; });
    state.txs.slice(-200).forEach(function (t) { if (t.note) set[t.note] = 1; });
    dl.innerHTML = Object.keys(set).slice(0, 80).map(function (v) { return '<option value="' + esc(v) + '"></option>'; }).join('');
  }
  function applyLastAcc() {
    var a = lsGet('finanzas-last-acc', '');
    if (a && state.accounts.some(function (x) { return x.id === a; })) $('f-acc').value = a;
  }
  var actx = null;
  function tone(freq, at, dur, vol) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + at;
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* sin audio */ }
  }
  function playSound(k) {
    if (lsGet('finanzas-snd', '0') !== '1') return;
    try { if (actx && actx.state === 'suspended') actx.resume(); } catch (e) {}
    if (k === 'in') { tone(659.25, 0, 0.18); tone(880, 0.11, 0.32); }
    else if (k === 'goal') { [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tone(f, i * 0.1, 0.3); }); }
  }
  function applySnd(v, persist) {
    document.querySelectorAll('[data-snd]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-snd') === v ? 'true' : 'false'); });
    if (persist) { lsSet('finanzas-snd', v); if (v === '1') playSound('in'); }
  }
  document.querySelectorAll('[data-snd]').forEach(function (b) { b.addEventListener('click', function () { applySnd(b.getAttribute('data-snd'), true); }); });
  applySnd(lsGet('finanzas-snd', '0') === '1' ? '1' : '0', false);
  function applyConf(v, persist) {
    document.querySelectorAll('[data-conf]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-conf') === v ? 'true' : 'false'); });
    if (persist) lsSet('finanzas-conf', v);
  }
  document.querySelectorAll('[data-conf]').forEach(function (b) { b.addEventListener('click', function () { applyConf(b.getAttribute('data-conf'), true); }); });
  applyConf(lsGet('finanzas-conf', '0') === '1' ? '1' : '0', false);
  function applyCalm(v, persist) {
    document.documentElement.classList.toggle('calm', v === '1');
    document.querySelectorAll('[data-calm]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-calm') === v ? 'true' : 'false'); });
    if (persist) lsSet('finanzas-calm', v);
  }
  document.querySelectorAll('[data-calm]').forEach(function (b) { b.addEventListener('click', function () { applyCalm(b.getAttribute('data-calm'), true); }); });
  applyCalm(lsGet('finanzas-calm', '0') === '1' ? '1' : '0', false);
  function applyDens(v, persist) {
    document.documentElement.classList.toggle('compact', v === '1');
    document.querySelectorAll('[data-dens]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-dens') === v ? 'true' : 'false'); });
    if (persist) lsSet('finanzas-dens', v);
  }
  document.querySelectorAll('[data-dens]').forEach(function (b) { b.addEventListener('click', function () { applyDens(b.getAttribute('data-dens'), true); }); });
  applyDens(lsGet('finanzas-dens', '0') === '1' ? '1' : '0', false);
  document.addEventListener('click', function (ev) {
    if (ev.target.closest('.tab, .hero-btn, .fab, .fab-item, .calc-key, .trio-item, .day-opt, .seg button, .filters button, .pct-opt, .menu-item')) vib(8);
  });

  var confReady = false;
  function confetti() {
    if (reduceM()) { playSound('goal'); return; }
    var W = window.innerWidth, H = window.innerHeight, c = document.createElement('canvas');
    c.width = W; c.height = H;
    c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:120';
    document.body.appendChild(c);
    var x = c.getContext('2d'), cols = ['#4F46E5', '#DB2777', '#F59E0B', '#10B981', '#38BDF8', '#A78BFA'], ps = [], i;
    for (i = 0; i < 130; i++) ps.push({ x: W / 2 + (Math.random() - 0.5) * 80, y: H * 0.38, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 10 - 3, s: 6 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[i % cols.length] });
    var t0 = performance.now();
    (function frame(now) {
      var t = now - t0;
      x.clearRect(0, 0, W, H);
      ps.forEach(function (p) {
        p.vy += 0.28; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.r += p.vr;
        x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.globalAlpha = Math.max(0, 1 - t / 2600); x.fillStyle = p.c;
        x.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6); x.restore();
      });
      if (t < 2600) requestAnimationFrame(frame); else c.remove();
    })(t0);
    playSound('goal');
    vib([30, 40, 30, 40, 60]);
  }
  function checkGoal() {
    var g = goalVal();
    if (!(g > 0)) return;
    var led = ledger(), tot = led.length ? led[led.length - 1].run : 0, key = String(g) + state.cur;
    if (tot < g) { if (lsGet('finanzas-goal-done', '') === key) lsSet('finanzas-goal-done', ''); return; }
    if (lsGet('finanzas-goal-done', '') === key) return;
    lsSet('finanzas-goal-done', key);
    if (confReady && lsGet('finanzas-conf', '0') === '1') confetti();
  }

  var HELP = {
    resumen: { t: 'Inicio', l: ['Aquí ves el balance del mes y cuánto entró, salió y ahorraste.', 'Toca Ingresos, Gastos o Ahorros para ver el detalle.', 'El ojo oculta los montos y las flechas cambian de mes.', 'El botón + registra un gasto o un ingreso.'] },
    historial: { t: 'Movimientos', l: ['Todos los movimientos del mes, agrupados por día.', 'Filtra por tipo o busca por categoría o nota.', 'Toca uno para ver sus botones, desliza para eliminar o editar, o mantén pulsado para más acciones.'] },
    cuentas: { t: 'Cuentas', l: ['Tus cuentas y tarjetas de crédito con su saldo.', 'Cambia el nombre de una cuenta escribiendo sobre él.', 'Pasa dinero entre cuentas sin afectar tus gastos.'] },
    categorias: { t: 'Categorías', l: ['Crea y ordena las categorías de ingresos y gastos.', 'Cada una tiene su color y su ícono.'] },
    gastos: { t: 'Gastos', l: ['En qué gastaste este mes, por categoría.', 'Ponle un límite a cada categoría y te aviso cuando te acerques.'] },
    ahorro: { t: 'Ahorro', l: ['Tu alcancía: lo que apartas de cada ingreso más tus aportes.', 'Define una meta para ver cuánto te falta.'] },
    ajustes: { t: 'Ajustes', l: ['Cambia colores, tamaño de letra, vibración, sonido y animaciones.', 'Activa un PIN para proteger la app y haz copias de respaldo.'] },
    logros: { t: 'Logros', l: ['Insignias que ganas al usar la app y cumplir tus metas.'] },
    tendencia: { t: 'Reportes', l: ['Los últimos 6 meses de ingresos y gastos, el cierre del mes y el resumen del año.'] },
    plantillas: { t: 'Lo que se repite', l: ['Se registran solos: monto y fecha fijos.', 'Fijos del plan: aparecen cada mes y los marcas al pagar.', 'Atajos: los registras con un toque cuando quieras.'] },
    registrar: { t: 'Registrar', l: ['Elige gasto o ingreso, escribe el monto y guarda.', 'En el monto puedes sumar y restar, por ejemplo 150+75.', 'Usa Hoy, Ayer o Antes de ayer para la fecha.'] }
  };
  function helpShow(open) {
    if (open) {
      var p = HELP[curView] || HELP.resumen;
      $('help-body').innerHTML = '<div class="tour-ic"><i data-lucide="circle-help"></i></div><h2>' + esc(p.t) + '</h2><ul>' + p.l.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    }
    $('help').hidden = !open;
    if (open) { try { $('help-ok').focus({ preventScroll: true }); } catch (e) {} }
  }
  $('help-btn').addEventListener('click', function () { helpShow(true); });
  $('help-ok').addEventListener('click', function () { helpShow(false); });
  $('help').addEventListener('click', function (ev) { if (ev.target === $('help')) helpShow(false); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !$('help').hidden) helpShow(false); });

