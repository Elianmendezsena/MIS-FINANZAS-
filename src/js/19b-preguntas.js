  /* ---- Pregúntale a tus datos: preguntas sencillas en español, respondidas con tus movimientos ---- */
  var ASK_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function askParse(q) {
    var s = ' ' + norm(q).replace(/[¿?¡!.,;:]/g, ' ').replace(/\s+/g, ' ') + ' ', now = new Date(), y = now.getFullYear(), m = now.getMonth(), d = now.getDate(), mm, i;
    var kind = /\bahorr/.test(s) ? 'ahorro' : /\b(ingres|gane|ganado|gano|cobre|cobrado|recibi|entro|entraron)/.test(s) ? 'ingreso' : 'gasto';
    var op = /\bpromedio\b/.test(s) ? 'avg' : /\b(mayor|mas grande|mas alto|mas caro)\b/.test(s) ? 'max' : /\b(cuantas veces|cuantos (gastos|ingresos|movimientos|pagos))\b/.test(s) ? 'count' : /\b(en que|donde|a donde)\b.*\b(mas|gast|fue)|\bcategorias?\b/.test(s) ? 'top' : 'sum';
    var from, to, label, D = function (yy, mo, dd) { return ymd(new Date(yy, mo, dd)); };
    var dow = (now.getDay() + 6) % 7, yr = (s.match(/\b(20\d\d)\b/) || [])[1];
    if (/\bhoy\b/.test(s)) { from = to = todayStr(); label = 'hoy'; }
    else if (/\bayer\b/.test(s)) { from = to = D(y, m, d - 1); label = 'ayer'; }
    else if (/\b(semana pasada|semana anterior)\b/.test(s)) { from = D(y, m, d - dow - 7); to = D(y, m, d - dow - 1); label = 'la semana pasada'; }
    else if (/\besta semana\b/.test(s)) { from = D(y, m, d - dow); to = todayStr(); label = 'esta semana'; }
    else if ((mm = s.match(/\bultimos? (\d+) dias?\b/))) { from = D(y, m, d - (+mm[1]) + 1); to = todayStr(); label = 'los últimos ' + mm[1] + ' días'; }
    else if ((mm = s.match(/\bultimos? (\d+) mes(es)?\b/))) { from = D(y, m - (+mm[1]) + 1, 1); to = todayStr(); label = 'los últimos ' + mm[1] + ' meses'; }
    else if (/\b(mes pasado|mes anterior)\b/.test(s)) { from = D(y, m - 1, 1); to = D(y, m, 0); label = 'el mes pasado'; }
    else if (/\beste mes\b/.test(s)) { from = D(y, m, 1); to = D(y, m + 1, 0); label = 'este mes'; }
    else if (/\b(ano pasado|ano anterior)\b/.test(s)) { from = D(y - 1, 0, 1); to = D(y - 1, 11, 31); label = 'el año pasado'; }
    else if (/\beste ano\b/.test(s)) { from = D(y, 0, 1); to = D(y, 11, 31); label = 'este año'; }
    else if (/\b(siempre|en total|historic|desde el inicio|todo el tiempo)/.test(s)) { from = '0000-01-01'; to = '9999-12-31'; label = 'desde que empezaste'; }
    else {
      for (i = 0; i < 12 && from === undefined; i++) if (new RegExp('\\b' + ASK_MES[i] + '\\b').test(s)) {
        var yy = yr ? +yr : (i > m ? y - 1 : y);
        from = D(yy, i, 1); to = D(yy, i + 1, 0); label = 'en ' + ASK_MES[i] + ' de ' + yy;
      }
      if (from === undefined && yr) { from = yr + '-01-01'; to = yr + '-12-31'; label = 'en ' + yr; }
      if (from === undefined) { from = view + '-01'; to = D(+view.slice(0, 4), +view.slice(5, 7), 0); label = 'en ' + monthLabel().toLowerCase(); }
    }
    var cat = '', ck = '', best = 0;
    (kind === 'ahorro' ? [] : [kind, kind === 'gasto' ? 'ingreso' : 'gasto']).forEach(function (k) {
      state.cats[k].forEach(function (c) { var n = norm(c.n); if (n.length > best && s.indexOf(' ' + n + ' ') >= 0) { best = n.length; cat = c.n; ck = k; } });
    });
    if (cat && ck !== kind && !/\b(ingres|gane|cobre|recibi|gast|pague)/.test(s)) kind = ck;
    if (cat && ck !== kind) cat = '';
    var acc = '';
    state.accounts.forEach(function (a) { if (!acc && norm(a.n).length > 2 && s.indexOf(' ' + norm(a.n) + ' ') >= 0 && norm(a.n) !== norm(cat)) acc = a.id; });
    return { kind: kind, op: op, from: from, to: to, label: label, cat: cat, acc: acc };
  }
  function askAnswer(q) {
    var a = askParse(q), g = a.kind === 'gasto', verb = g ? 'Gastaste' : 'Recibiste', what = (a.cat ? ' en ' + a.cat : '') + (a.acc ? (g ? ' con ' : ' en ') + accName(a.acc) : '');
    var und = 'Entendí: ' + (a.kind === 'ahorro' ? 'ahorro' : g ? 'gastos' : 'ingresos') + (a.cat ? ' · ' + a.cat : '') + (a.acc ? ' · ' + accName(a.acc) : '') + ' · ' + a.label + (a.op === 'avg' ? ' · promedio por mes' : a.op === 'max' ? ' · el mayor' : a.op === 'count' ? ' · cuántos' : a.op === 'top' ? ' · por categoría' : '');
    if (a.kind === 'ahorro') {
      var sv = 0; ledger().forEach(function (e) { if (!e.open && e.date >= a.from && e.date <= a.to) sv = r2(sv + e.sign * e.amount); });
      return { big: fmtFull(sv), text: (sv >= 0 ? 'Ahorraste ' : 'Sacaste del ahorro ') + fmtFull(Math.abs(sv)) + ' ' + a.label + '.', und: und };
    }
    var L = state.txs.filter(function (t) { return inCur(t) && !t.pending && t.kind === a.kind && t.date >= a.from && t.date <= a.to && (!a.cat || t.cat === a.cat) && (!a.acc || t.acc === a.acc); });
    var tot = sum(L), go = { kind: a.kind, cat: a.cat, acc: a.acc, from: a.from, to: a.to };
    if (!L.length) return { big: fmtFull(0), text: 'No hay ' + (g ? 'gastos' : 'ingresos') + what + ' ' + a.label + '.', und: und };
    if (a.op === 'count') return { big: String(L.length), text: L.length + (L.length === 1 ? ' movimiento' : ' movimientos') + what + ' ' + a.label + ', por ' + fmtFull(tot) + ' en total.', und: und, go: go };
    if (a.op === 'max') {
      var mx = L.slice().sort(function (x, z) { return val(z) - val(x); })[0];
      return { big: fmtFull(val(mx)), text: 'Tu mayor ' + (g ? 'gasto' : 'ingreso') + what + ' ' + a.label + ': ' + mx.cat + (mx.note ? ' · ' + mx.note : '') + ', el ' + dShort(parseDate(mx.date)) + '.', und: und, go: go };
    }
    if (a.op === 'top') {
      var by = {}; L.forEach(function (t) { by[t.cat] = r2((by[t.cat] || 0) + val(t)); });
      var ks = Object.keys(by).sort(function (x, z) { return by[z] - by[x]; }).slice(0, 5);
      return { big: ks[0], text: 'Donde más ' + (g ? 'gastaste ' : 'recibiste ') + a.label + ': ' + ks.map(function (k) { return k + ' ' + fmt(by[k]) + ' (' + Math.round(by[k] / tot * 100) + '%)'; }).join(', ') + '.', und: und, go: go };
    }
    if (a.op === 'avg') {
      var first = L.reduce(function (p, t) { return t.date < p ? t.date : p; }, '9999'), f0 = a.from < first ? first : a.from, t0 = a.to > todayStr() ? todayStr() : a.to;
      var n = Math.max(1, (+t0.slice(0, 4) - +f0.slice(0, 4)) * 12 + (+t0.slice(5, 7) - +f0.slice(5, 7)) + 1);
      return { big: fmtFull(r2(tot / n)), text: 'En promedio ' + (g ? 'gastaste ' : 'recibiste ') + fmtFull(r2(tot / n)) + ' al mes' + what + ' ' + a.label + ' (' + fmtFull(tot) + ' en ' + n + (n === 1 ? ' mes' : ' meses') + ').', und: und, go: go };
    }
    return { big: fmtFull(tot), text: verb + ' ' + fmtFull(tot) + what + ' ' + a.label + ' (' + L.length + (L.length === 1 ? ' movimiento' : ' movimientos') + ').', und: und, go: go };
  }
  var askGo = null;
  function askRun(q) {
    q = String(q || '').trim();
    var out = $('ask-out');
    if (!q) { out.innerHTML = ''; return; }
    var r = askAnswer(q);
    askGo = r.go || null;
    out.innerHTML = '<p class="ask-big">' + esc(r.big) + '</p><p class="text-sm">' + esc(r.text) + '</p><p class="note">' + esc(r.und) + '</p>' +
      (r.go ? '<div><button type="button" class="link-btn" id="ask-see">Ver esos movimientos<i data-lucide="chevron-right" class="sm"></i></button></div>' : '');
    refreshIcons();
  }
  function renderAsk() {
    var box = $('ask-chips');
    if (!box) return;
    var by = expByCat(view, 'gasto'), top = Object.keys(by).sort(function (x, z) { return by[z] - by[x]; })[0] || (state.cats.gasto[0] || {}).n || 'comida';
    var ex = ['¿Cuánto gasté este mes?', '¿Cuánto gasté en ' + top.toLowerCase() + ' este año?', '¿Cuál fue mi mayor gasto del mes pasado?', '¿Cuánto ingresé este año?', 'Promedio de gastos de los últimos 6 meses', '¿En qué gasté más este año?'];
    box.innerHTML = ex.map(function (e) { return '<button type="button" class="day-opt" data-ask="' + esc(e) + '">' + esc(e) + '</button>'; }).join('');
    if ($('ask-in').value.trim()) askRun($('ask-in').value);
  }
  $('ask-form').addEventListener('submit', function (ev) { ev.preventDefault(); askRun($('ask-in').value); });
  $('ask-chips').addEventListener('click', function (ev) { var b = ev.target.closest('[data-ask]'); if (!b) return; $('ask-in').value = b.getAttribute('data-ask'); askRun($('ask-in').value); });
  $('ask-out').addEventListener('click', function (ev) {
    if (!ev.target.closest('#ask-see') || !askGo) return;
    var gq = askGo;
    filter = gq.kind;
    document.querySelectorAll('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-filter') === gq.kind ? 'true' : 'false'); });
    $('h-q').value = ''; $('h-min').value = ''; $('h-max').value = '';
    $('h-from').value = gq.from < '1900' ? '' : gq.from; $('h-to').value = gq.to > '9000' ? '' : gq.to;
    setView('historial');
    renderHistory();
    $('h-cat').value = gq.cat ? gq.kind + '|' + gq.cat : ''; $('h-acc').value = gq.acc || '';
    renderHistory(); refreshIcons();
  });
