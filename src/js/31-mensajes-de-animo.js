  /* ---- Mensajes de ánimo ---- */
  function renderTip() {
    var el = $('tip');
    if (!el) return;
    var now = new Date();
    if (view !== toKey(now)) { el.innerHTML = ''; return; }
    var D = now.getDate(), pk = toKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)), cur = {}, prev = {}, tot = 0;
    state.txs.forEach(function (t) {
      if (t.kind !== 'gasto' || t.pending || t.ex || !inCur(t)) return;
      var mk = t.date.slice(0, 7);
      if (mk === view) { cur[t.cat] = (cur[t.cat] || 0) + val(t); tot += val(t); }
      else if (mk === pk && +t.date.slice(8, 10) <= D) prev[t.cat] = (prev[t.cat] || 0) + val(t);
    });
    var msgs = [];
    Object.keys(cur).forEach(function (c) {
      var a = cur[c], b = prev[c] || 0;
      if (b > 0 && a >= 500 && a >= b * 1.25) msgs.push('Vas ' + Math.round((a / b - 1) * 100) + '% más en ' + c + ' que el mes pasado a esta fecha (' + fmt(r2(a)) + ' contra ' + fmt(r2(b)) + '). Mira si puedes recortar.');
      else if (b >= 500 && a <= b * 0.75) msgs.push('Llevas ' + Math.round((1 - a / b) * 100) + '% menos en ' + c + ' que el mes pasado a esta fecha. ¡Buen control!');
    });
    var keys = Object.keys(cur).sort(function (x, y) { return cur[y] - cur[x]; });
    if (keys.length > 1 && cur[keys[0]] / tot >= 0.4) msgs.push(keys[0] + ' se lleva el ' + Math.round(cur[keys[0]] / tot * 100) + '% de lo que has gastado este mes.');
    var wk = dayStr(7);
    if (now.getHours() >= 18 && !state.txs.some(function (t) { return t.date === todayStr(); }) && state.txs.some(function (t) { return t.date >= wk && !t.ex; })) msgs.push('Hoy no has registrado nada. Si gastaste algo, anótalo para no perder el rastro.');
    if (!msgs.length) { el.innerHTML = ''; return; }
    var doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
    el.innerHTML = '<div class="alert" style="background:var(--surface-2);color:var(--accent)"><i data-lucide="lightbulb" class="sm"></i><span style="color:var(--ink)">' + esc(msgs[doy % msgs.length]) + '</span></div>';
  }
  function renderCheer() {
    var el = $('cheer'), msgs = [], i;
    var real = state.txs.filter(function (t) { return !t.ex && !t.pending; });
    if (!real.length) { el.innerHTML = ''; return; }
    var now = new Date();
    var stats = function (k) {
      var inc = 0, exp = 0;
      real.forEach(function (t) { if (t.date.slice(0, 7) !== k) return; if (t.kind === 'ingreso') inc += val(t); else exp += val(t); });
      return { inc: inc, exp: exp, rate: inc > 0 ? (inc - exp) / inc * 100 : null };
    };
    var key = function (back) { return toKey(new Date(now.getFullYear(), now.getMonth() - back, 1)); };
    var start = (stats(key(0)).rate !== null && stats(key(0)).rate >= GOAL) ? 0 : 1, streak = 0;
    for (i = start; i < 24; i++) { var s = stats(key(i)); if (s.rate !== null && s.rate >= GOAL) streak++; else break; }
    if (streak >= 2) msgs.push('Llevas ' + streak + ' meses seguidos cumpliendo tu meta de ahorro del ' + GOAL + '%. ¡Sigue así!');
    var g = goalVal(), led = ledger(), tot = led.length ? led[led.length - 1].run : 0;
    if (g > 0 && tot >= g) msgs.unshift('¡Alcanzaste tu meta de ahorro de ' + fmt(g) + '!');
    var dates = {};
    real.forEach(function (t) { dates[t.date] = true; });
    var day = new Date(now.getFullYear(), now.getMonth(), now.getDate()), run = 0;
    if (!dates[ymd(day)]) day.setDate(day.getDate() - 1);
    while (dates[ymd(day)] && run < 365) { run++; day.setDate(day.getDate() - 1); }
    if (run >= 3) msgs.push('Llevas ' + run + ' días seguidos registrando tus movimientos.');
    var a = stats(key(1)), b = stats(key(2));
    if (a.exp > 0 && b.exp > 0 && a.exp <= b.exp * 0.9) {
      var nm = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('es-DO', { month: 'long' });
      msgs.push('En ' + nm + ' gastaste ' + Math.round((1 - a.exp / b.exp) * 100) + '% menos que el mes anterior.');
    }
    el.innerHTML = msgs.slice(0, 2).map(function (m) {
      return '<div class="alert" style="background:var(--good-bg);color:var(--good)"><i data-lucide="sparkles" class="sm"></i><span>' + esc(m) + '</span></div>';
    }).join('');
  }

