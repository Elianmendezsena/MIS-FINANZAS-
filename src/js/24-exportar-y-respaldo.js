  /* ---- Exportar y respaldo ---- */
  var dl = null;
  function dlError(e) {
    var c = e && e.code;
    if (c === 'declined') return;
    $('exp-note').textContent = c === 'rate_limited' ? 'Espera un momento e inténtalo otra vez.' : 'No se pudo guardar el archivo en este dispositivo.';
  }
  function saveFile(name, data) {
    if (!dl) { $('exp-note').textContent = 'Descargar archivos no está disponible aquí.'; return Promise.resolve(); }
    $('exp-note').textContent = '';
    return dl.save({ filename: name, data: data }).then(function () { toast('Archivo guardado'); return true; }, function (e) { dlError(e); return false; });
  }
  function csvCell(s) {
    s = String(s == null ? '' : s);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function exportRows(scope) {
    var txs = (scope === 'mes' ? monthTxs() : state.txs).slice();
    var tfs = state.transfers.filter(function (t) { return scope !== 'mes' || t.date.slice(0, 7) === view; });
    var rows = txs.map(function (t) {
      return { d: t.date, ts: t.ts || 0, c: [t.date, t.kind === 'ingreso' ? 'Ingreso' : 'Gasto', t.cat, accName(accId(t)), t.amount, t.cur || 'DOP', r2(val(t)), t.pending ? 'Pendiente' : 'Cobrado/Pagado', t.pct || '', t.note || ''] };
    });
    tfs.forEach(function (t) {
      rows.push({ d: t.date, ts: t.ts || 0, c: [t.date, 'Transferencia', accName(accId({ acc: t.from })) + ' → ' + accName(accId({ acc: t.to })), '', t.amount, t.cur || 'DOP', r2(val(t)), '', '', t.note || ''] });
    });
    rows.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : a.ts - b.ts; });
    return rows.map(function (r) { return r.c; });
  }
  function exportCsv(scope) {
    var head = ['Fecha', 'Tipo', 'Categoría', 'Cuenta', 'Monto', 'Moneda', 'Monto en ' + (state.cur === 'USD' ? 'US$' : 'RD$'), 'Estado', 'Ahorro %', 'Nota'];
    var lines = [head].concat(exportRows(scope)).map(function (r) { return r.map(csvCell).join(','); });
    var name = scope === 'mes' ? 'mis-finanzas-' + view + '.csv' : 'mis-finanzas-todo.csv';
    return saveFile(name, '\ufeff' + lines.join('\r\n'));
  }
  /* PDF sencillo de texto (Courier), sin librerías */
  function latin1(s) {
    return String(s).replace(/\u00a0/g, ' ').replace(/[→]/g, '->').replace(/[−–—]/g, '-').replace(/[·•]/g, '-').replace(/[^\x20-\x7e\u00a1-\u00ff]/g, '?');
  }
  function pdfEsc(s) { return latin1(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
  function makePdf(lines) {
    var W = 595, H = 842, M = 40, LH = 12, per = Math.floor((H - 2 * M) / LH), pages = [], i;
    for (i = 0; i < lines.length; i += per) pages.push(lines.slice(i, i + per));
    if (!pages.length) pages.push([{ t: '' }]);
    var objs = [];
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objs[2] = '<< /Type /Pages /Kids [' + pages.map(function (p, n) { return (5 + n * 2) + ' 0 R'; }).join(' ') + '] /Count ' + pages.length + ' >>';
    objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
    objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>';
    pages.forEach(function (pg, n) {
      var s = '';
      pg.forEach(function (ln, j) {
        s += 'BT /' + (ln.b ? 'F2' : 'F1') + ' 9 Tf ' + M + ' ' + (H - M - 9 - j * LH) + ' Td (' + pdfEsc(ln.t) + ') Tj ET\n';
      });
      objs[5 + n * 2] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + (6 + n * 2) + ' 0 R >>';
      objs[6 + n * 2] = '<< /Length ' + s.length + ' >>\nstream\n' + s + 'endstream';
    });
    var out = '%PDF-1.4\n', offs = [];
    for (i = 1; i < objs.length; i++) { offs[i] = out.length; out += i + ' 0 obj\n' + objs[i] + '\nendobj\n'; }
    var xr = out.length;
    out += 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n';
    for (i = 1; i < objs.length; i++) out += ('0000000000' + offs[i]).slice(-10) + ' 00000 n \n';
    out += 'trailer\n<< /Size ' + objs.length + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF';
    var u8 = new Uint8Array(out.length);
    for (i = 0; i < out.length; i++) u8[i] = out.charCodeAt(i) & 255;
    return u8;
  }
  function exportPdf() {
    var sym = state.cur === 'USD' ? 'US$' : 'RD$';
    var pm = function (n) { return (n < 0 ? '-' : '') + sym + ' ' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    var pad = function (s, n) { s = latin1(s); return s.length > n ? s.slice(0, n) : s + new Array(n - s.length + 1).join(' '); };
    var padL = function (s, n) { s = latin1(s); return s.length >= n ? s : new Array(n - s.length + 1).join(' ') + s; };
    var txs = monthTxs().filter(function (t) { return !t.pending; });
    var inc = sum(txs.filter(function (t) { return t.kind === 'ingreso'; })), exp = sum(txs.filter(function (t) { return t.kind === 'gasto'; }));
    var saved = 0;
    ledger().forEach(function (e) { if (!e.open && e.date.slice(0, 7) === view) saved = r2(saved + e.sign * e.amount); });
    var L = [];
    L.push({ t: 'MIS FINANZAS - ' + monthLabel().toUpperCase(), b: true });
    L.push({ t: 'Moneda: ' + sym + '    Generado: ' + todayStr() });
    L.push({ t: '' });
    L.push({ t: 'RESUMEN DEL MES', b: true });
    L.push({ t: pad('Ingresos', 30) + padL(pm(inc), 18) });
    L.push({ t: pad('Gastos', 30) + padL(pm(exp), 18) });
    L.push({ t: pad('Ahorro del mes', 30) + padL(pm(saved), 18) });
    L.push({ t: pad('Quedó (ingresos - gastos - ahorro)', 34) + padL(pm(r2(inc - exp - saved)), 14), b: true });
    L.push({ t: '' });
    var byCat = {};
    txs.forEach(function (t) { if (t.kind === 'gasto') byCat[t.cat] = r2((byCat[t.cat] || 0) + val(t)); });
    var cats = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });
    if (cats.length) {
      L.push({ t: 'GASTOS POR CATEGORÍA', b: true });
      cats.forEach(function (c) { L.push({ t: pad(c, 30) + padL(pm(byCat[c]), 18) + padL((byCat[c] / exp * 100).toFixed(1) + '%', 8) }); });
      L.push({ t: '' });
    }
    var pk = prevKey(), pe = sumObj(expByCat(pk, 'gasto')), pi = sumObj(expByCat(pk, 'ingreso'));
    if (pe > 0 || pi > 0) {
      var dp = function (cu, pr) { return pr > 0 ? ((cu - pr) / pr * 100 >= 0 ? '+' : '') + ((cu - pr) / pr * 100).toFixed(0) + '%' : 'n/d'; };
      L.push({ t: 'FRENTE A ' + mkLabel(pk).toUpperCase(), b: true });
      L.push({ t: pad('Ingresos', 30) + padL(pm(pi), 18) + padL(dp(inc, pi), 8) });
      L.push({ t: pad('Gastos', 30) + padL(pm(pe), 18) + padL(dp(exp, pe), 8) });
      L.push({ t: '' });
    }
    var byAcc = {};
    txs.forEach(function (t) { if (t.kind === 'gasto') { var an = accOk(t.acc) ? accName(t.acc) : 'Sin cuenta'; byAcc[an] = r2((byAcc[an] || 0) + val(t)); } });
    var accs = Object.keys(byAcc).sort(function (a, b) { return byAcc[b] - byAcc[a]; });
    if (accs.length) {
      L.push({ t: 'GASTOS POR CUENTA', b: true });
      accs.forEach(function (a) { L.push({ t: pad(a, 30) + padL(pm(byAcc[a]), 18) + padL((byAcc[a] / exp * 100).toFixed(1) + '%', 8) }); });
      L.push({ t: '' });
    }
    var lims = state.cats.gasto.filter(function (c) { return limitVal(c.n) > 0; }), mb = mbVal();
    if (lims.length || mb > 0) {
      L.push({ t: 'PRESUPUESTO Y LÍMITES', b: true });
      L.push({ t: pad('', 22) + padL('Gastado', 16) + padL('Límite', 16) + padL('Uso', 7), b: true });
      if (mb > 0) L.push({ t: pad('Total del mes', 22) + padL(pm(exp), 16) + padL(pm(mb), 16) + padL(Math.round(exp / mb * 100) + '%', 7) });
      lims.forEach(function (c) { var lv = limitVal(c.n), sp = byCat[c.n] || 0; L.push({ t: pad(c.n, 22) + padL(pm(sp), 16) + padL(pm(lv), 16) + padL(Math.round(sp / lv * 100) + '%', 7) }); });
      L.push({ t: '' });
    }
    var pls = planItems(view).sort(function (a, b) { return (a.day || 99) - (b.day || 99); });
    if (pls.length) {
      L.push({ t: 'PLAN DEL MES (GASTOS E INGRESOS SEGUROS)', b: true });
      pls.forEach(function (p) {
        var ptx = planTx(p), g = pkind(p) === 'gasto';
        L.push({ t: pad((p.n ? p.cat + ' - ' + p.n : p.cat), 28) + pad(g ? 'Gasto' : 'Ingreso', 9) + padL(pm(r2(val(p))), 16) + '  ' + (ptx ? (g ? 'Pagado ' : 'Cobrado ') + ptx.date : 'Pendiente' + (p.day ? ' (día ' + p.day + ')' : '')) });
      });
      L.push({ t: '' });
    }
    var led = ledger(), savTot = led.length ? led[led.length - 1].run : 0, gv = goalVal(), gls = state.goals.filter(function (g) { return (g.cur || 'DOP') === state.cur; });
    if (savTot || gv || gls.length) {
      L.push({ t: 'AHORRO Y METAS', b: true });
      L.push({ t: pad('Ahorro acumulado', 30) + padL(pm(r2(savTot)), 18) });
      var gl = function (n, sv, amt, due) {
        var di = dueInfo(due, amt - sv);
        L.push({ t: pad(n, 30) + padL(pm(r2(sv)), 18) + ' de ' + pm(amt) + ' (' + Math.round(Math.max(0, sv) / amt * 100) + '%)' });
        if (di) L.push({ t: '   ' + (di.late ? 'La fecha ' + due + ' ya pasó' : 'Para el ' + due + ': ' + pm(di.per) + ' al mes') });
      };
      if (gv) gl('Meta principal', savTot, gv, state.goal.due);
      gls.forEach(function (g) { gl(g.n, Math.max(0, goalSaved(g.id)), g.amount, g.due); });
      L.push({ t: '' });
    }
    L.push({ t: 'MOVIMIENTOS', b: true });
    L.push({ t: pad('Fecha', 11) + pad('Tipo', 9) + pad('Categoría', 18) + pad('Cuenta', 12) + padL('Monto', 16) + '  Nota', b: true });
    var rows = monthTxs().slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ts || 0) - (b.ts || 0); });
    if (!rows.length) L.push({ t: 'Sin movimientos este mes.' });
    rows.forEach(function (t) {
      L.push({ t: pad(t.date, 11) + pad(t.kind === 'ingreso' ? 'Ingreso' : 'Gasto', 9) + pad(t.cat, 18) + pad(accName(accId(t)), 12) +
        padL((t.kind === 'gasto' ? '-' : '') + pm(val(t)).replace('-', ''), 16) + '  ' + latin1(t.note || '').slice(0, 24) + (t.pending ? ' (pend.)' : '') });
    });
    return saveFile('mis-finanzas-' + view + '.pdf', makePdf(L));
  }
  function backupData() {
    return {
      app: 'mis-finanzas', version: 2, exportedAt: new Date().toISOString(),
      data: {
        txs: state.txs.filter(function (t) { return !t.ex; }), savings: state.savings.filter(function (e) { return !e.ex; }), transfers: state.transfers,
        cats: state.cats, accounts: state.accounts, cur: state.cur, rate: state.rate, goal: state.goal, budgets: state.budgets, mBud: state.mBud, cBud: state.cBud, plan: state.plan, monthBudget: state.monthBudget, tpl: state.tpl, goals: state.goals
      }
    };
  }
  var pendingImport = null;
  function bkError(m) { var e = $('bk-error'); e.textContent = m; e.hidden = !m; }
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  function cleanImport(d) {
    if (!d || typeof d !== 'object' || !Array.isArray(d.txs)) return null;
    var out = {
      txs: d.txs.filter(function (t) { return t && t.id && (t.kind === 'ingreso' || t.kind === 'gasto') && t.cat && t.amount > 0 && DATE_RE.test(t.date || ''); }),
      savings: (Array.isArray(d.savings) ? d.savings : []).filter(function (e) { return e && e.id && (e.dir === 'aporte' || e.dir === 'retiro') && e.amount > 0 && DATE_RE.test(e.date || ''); }),
      transfers: (Array.isArray(d.transfers) ? d.transfers : []).filter(function (t) { return t && t.id && t.from && t.to && t.amount > 0 && DATE_RE.test(t.date || ''); })
    };
    if (d.cats && Array.isArray(d.cats.gasto) && Array.isArray(d.cats.ingreso)) out.cats = d.cats;
    if (Array.isArray(d.accounts) && d.accounts.length && d.accounts.every(function (a) { return a && a.id && a.n; })) out.accounts = d.accounts;
    if (d.cur === 'USD' || d.cur === 'DOP') out.cur = d.cur;
    if (d.rate > 0) out.rate = d.rate;
    out.goal = d.goal && d.goal.amount > 0 ? d.goal : null;
    out.budgets = d.budgets && typeof d.budgets === 'object' ? d.budgets : {};
    out.monthBudget = d.monthBudget && d.monthBudget.amount > 0 ? d.monthBudget : null;
    out.mBud = d.mBud && typeof d.mBud === 'object' ? d.mBud : {};
    out.cBud = d.cBud && typeof d.cBud === 'object' ? d.cBud : {};
    out.plan = (Array.isArray(d.plan) ? d.plan : []).filter(function (p) { return p && p.id && /^\d{4}-\d{2}$/.test(p.mk || '') && p.cat && p.amount > 0; });
    out.tpl = (Array.isArray(d.tpl) ? d.tpl : []).filter(function (t) { return t && t.id && (t.kind === 'ingreso' || t.kind === 'gasto') && t.cat && t.amount > 0; });
    out.goals = (Array.isArray(d.goals) ? d.goals : []).filter(function (g) { return g && g.id && g.n && g.amount > 0; });
    return out;
  }
  $('bk-save').addEventListener('click', function () {
    saveFile('respaldo-mis-finanzas-' + todayStr() + '.json', JSON.stringify(backupData(), null, 2)).then(function (ok) { if (ok) { lsSet('finanzas-lastbk', String(Date.now())); renderBk(); } });
  });
  $('bk-file').addEventListener('change', function () {
    var f = this.files && this.files[0], inp = this;
    bkError('');
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      inp.value = '';
      var parsed = null;
      try { parsed = JSON.parse(String(rd.result)); } catch (e) { parsed = null; }
      var c = cleanImport(parsed && (parsed.data || parsed));
      if (!c) { bkError('Ese archivo no parece un respaldo de Mis Finanzas.'); return; }
      pendingImport = c;
      $('bk-msg').textContent = 'El respaldo trae ' + c.txs.length + ' movimientos, ' + c.savings.length + ' de ahorro y ' + c.transfers.length + ' transferencias. Reemplazará lo que tienes ahora.';
      $('bk-confirm').hidden = false;
    };
    rd.onerror = function () { bkError('No se pudo leer el archivo.'); };
    rd.readAsText(f);
  });
  $('bk-no').addEventListener('click', function () { pendingImport = null; $('bk-confirm').hidden = true; });
  $('bk-yes').addEventListener('click', function () {
    var c = pendingImport;
    pendingImport = null;
    $('bk-confirm').hidden = true;
    if (!c) return;
    state.txs = c.txs;
    state.savings = c.savings;
    state.transfers = c.transfers;
    if (c.cats) state.cats = c.cats;
    if (c.accounts) state.accounts = c.accounts;
    if (c.cur) state.cur = c.cur;
    if (c.rate) state.rate = c.rate;
    state.goal = c.goal;
    state.budgets = c.budgets;
    state.monthBudget = c.monthBudget;
    state.mBud = c.mBud || {};
    state.cBud = c.cBud || {};
    state.plan = c.plan || [];
    state.tpl = c.tpl || [];
    state.goals = c.goals || [];
    save(state);
    fillCats();
    render();
    toast('Respaldo restaurado');
  });
  $('rs-open').addEventListener('click', function () { $('rs-confirm').hidden = false; $('rs-word').value = ''; $('rs-word').focus(); });
  $('rs-no').addEventListener('click', function () { $('rs-confirm').hidden = true; $('rs-word').value = ''; });
  $('rs-yes').addEventListener('click', function () {
    if ($('rs-word').value.trim().toUpperCase() !== 'BORRAR') { $('rs-word').focus(); return; }
    $('rs-confirm').hidden = true; $('rs-word').value = '';
    state.txs = []; state.savings = []; state.transfers = [];
    state.cats = clone(DEFAULT_CATS);
    state.accounts = [{ id: 'a1', n: 'Efectivo' }, { id: 'a2', n: 'Banco' }, { id: 'a3', n: 'Tarjeta' }];
    state.goal = null; state.budgets = {}; state.monthBudget = null; state.mBud = {}; state.cBud = {}; state.plan = []; state.tpl = []; state.goals = []; state.trash = [];
    state.welcomed = false;
    lsSet('finanzas-goal-done', ''); lsSet('finanzas-recap', '');
    save(state);
    fillCats();
    render();
    setView('resumen');
    toast('Listo, la app quedó en blanco');
  });
  document.querySelectorAll('[data-exp]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-exp');
      if (k === 'csv-mes') exportCsv('mes');
      else if (k === 'csv-todo') exportCsv('todo');
      else if (k === 'xlsx') exportXlsx();
      else exportPdf();
    });
  });
  try {
    if (window.claude && window.claude.use) {
      window.claude.use('downloads').then(function (d) { dl = d; if (!d) { $('exp-note').textContent = 'Descargar archivos no está disponible aquí.'; } }, function () { dl = null; });
    }
  } catch (e) { dl = null; }
