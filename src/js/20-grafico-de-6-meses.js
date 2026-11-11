  /* ---- Gráfico de 6 meses ---- */
  function renderTrend() {
    var y = +view.slice(0, 4), m = +view.slice(5, 7) - 1, data = [], i;
    for (i = 5; i >= 0; i--) {
      var d = new Date(y, m - i, 1), k = toKey(d), inc = 0, exp = 0;
      state.txs.forEach(function (t) {
        if (t.pending || t.date.slice(0, 7) !== k) return;
        if (t.kind === 'ingreso') inc += val(t); else exp += val(t);
      });
      data.push({ k: k, lbl: d.toLocaleDateString('es-DO', { month: 'short' }).replace('.', ''), inc: r2(inc), exp: r2(exp) });
    }
    var max = Math.max.apply(null, data.map(function (x) { return Math.max(x.inc, x.exp); }).concat([1]));
    var W = 320, H = 150, top = 16, bot = 24, bw = 16, gap = 3, cw = W / 6, ch = H - top - bot, out = '';
    data.forEach(function (x, j) {
      var cx = j * cw + cw / 2, hi = x.inc / max * ch, he = x.exp / max * ch;
      out += '<g data-m="' + x.k + '" style="cursor:pointer"><title>' + esc(x.lbl) + ': ingresos ' + esc(fmtFull(x.inc)) + ', gastos ' + esc(fmtFull(x.exp)) + '</title>' +
        '<rect x="' + (j * cw + 2) + '" y="0" width="' + (cw - 4) + '" height="' + H + '" rx="8" fill="' + (x.k === view ? 'var(--surface-2)' : 'transparent') + '"/>' +
        '<rect x="' + (cx - bw - gap / 2) + '" y="' + (top + ch - hi) + '" width="' + bw + '" height="' + Math.max(hi, x.inc > 0 ? 2 : 0) + '" rx="3" fill="var(--good)"/>' +
        '<rect x="' + (cx + gap / 2) + '" y="' + (top + ch - he) + '" width="' + bw + '" height="' + Math.max(he, x.exp > 0 ? 2 : 0) + '" rx="3" fill="var(--bad)"/>' +
        '<text x="' + cx + '" y="' + (H - 7) + '" text-anchor="middle" font-size="11" font-weight="' + (x.k === view ? 700 : 500) + '" fill="var(--' + (x.k === view ? 'ink' : 'muted') + ')" style="font-family:var(--font-body)">' + esc(x.lbl) + '</text></g>';
    });
    var half = top + ch / 2;
    out = '<line x1="0" x2="' + W + '" y1="' + top + '" y2="' + top + '" stroke="var(--line)" stroke-dasharray="3 4"/><line x1="0" x2="' + W + '" y1="' + half + '" y2="' + half + '" stroke="var(--line)" stroke-dasharray="3 4"/>' +
      '<text x="2" y="' + (top - 4) + '" font-size="10" fill="var(--muted)" style="font-family:var(--font-body)">' + esc(fmt(max)) + '</text>' +
      '<text x="2" y="' + (half - 4) + '" font-size="10" fill="var(--muted)" style="font-family:var(--font-body)">' + esc(fmt(max / 2)) + '</text>' +
      '<line x1="0" x2="' + W + '" y1="' + (top + ch) + '" y2="' + (top + ch) + '" stroke="var(--line)"/>' + out;
    var cur = data.filter(function (x) { return x.k === view; })[0] || data[data.length - 1], dif = r2(cur.inc - cur.exp);
    $('trend-sum').innerHTML = '<strong>' + esc(mkLabel(cur.k)) + '</strong>: Ingresos <b style="color:var(--good)">' + esc(fmtFull(cur.inc)) + '</b> · Gastos <b style="color:var(--bad)">' + esc(fmtFull(cur.exp)) + '</b> · ' + (dif >= 0 ? 'Sobran ' : 'Faltan ') + '<b>' + esc(fmtFull(Math.abs(dif))) + '</b>';
    $('trend-box').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Ingresos y gastos de los últimos 6 meses" style="display:block;max-width:560px">' + out + '</svg>';
  }
  $('trend-box').addEventListener('click', function (ev) {
    var g = ev.target.closest('[data-m]');
    if (!g) return;
    view = g.getAttribute('data-m');
    render();
  });

