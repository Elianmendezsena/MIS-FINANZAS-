  /* ---- Registro con texto ---- */
  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  var CAT_HINTS = [
    ['comida', /almuerzo|cena|desayuno|comida|supermercado|colmado|restaurante|merienda|cafe|pica pollo/],
    ['transporte', /gasolina|combustible|pasaje|uber|taxi|carro|transporte|peaje|motoconcho|guagua/],
    ['alquiler', /alquiler|renta/],
    ['servicios', /\bluz\b|\bagua\b|internet|electricidad|telefono|cable|servicio|edeeste|edesur|edenorte/],
    ['salud', /farmacia|medic|doctor|consulta|salud|hospital|clinica/],
    ['ocio', /cine|salida|fiesta|ocio|juego|netflix|trago|\bbar\b/],
    ['salario', /salario|sueldo|nomina|quincena/],
    ['negocio', /negocio|venta|vendi/]
  ];
  function parseAmount(t) {
    var re = /(\d+(?:[.,]\d+)*)\s*(mil\b|k\b)?/g, m, best = null;
    while ((m = re.exec(t))) {
      var s = m[1], v;
      if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) v = parseFloat(s.replace(/,/g, ''));
      else if (/^\d{1,3}(,\d{3})+$/.test(s)) v = parseFloat(s.replace(/,/g, ''));
      else if (/^\d{1,3}(\.\d{3})+$/.test(s)) v = parseFloat(s.replace(/\./g, ''));
      else v = parseFloat(s.replace(',', '.'));
      if (m[2]) v *= 1000;
      if (v > 0) { best = { v: r2(v), raw: m[0] }; break; }
    }
    return best;
  }
  function parseQuick(text) {
    var t = norm(text), out = { ok: false };
    var am = parseAmount(t);
    if (!am) return out;
    out.ok = true;
    out.amount = am.v;
    out.kind = /\b(cobre|ingreso|me pagaron|pagaron|salario|sueldo|nomina|recibi|vendi|venta|gane|quincena)\b/.test(t) ? 'ingreso' : 'gasto';
    out.back = /anteayer|antes de ayer|antier/.test(t) ? 2 : /\bayer\b/.test(t) ? 1 : 0;
    var list = state.cats[out.kind], best = null;
    list.forEach(function (c) { var n = norm(c.n); if (n.length >= 3 && t.indexOf(n) >= 0 && (!best || n.length > norm(best.n).length)) best = c; });
    if (!best) CAT_HINTS.some(function (hh) {
      if (!hh[1].test(t)) return false;
      var f = list.find(function (c) { return norm(c.n).indexOf(hh[0]) >= 0; });
      if (f) { best = f; return true; }
      return false;
    });
    if (!best) best = list.find(function (c) { return norm(c.n).indexOf('otro') >= 0; }) || null;
    out.cat = best ? best.n : '';
    var acc = null;
    state.accounts.forEach(function (a) { var n = norm(a.n); if (n.length >= 2 && t.indexOf(n) >= 0 && (!acc || n.length > norm(acc.n).length)) acc = a; });
    out.acc = acc ? acc.id : '';
    var words = String(text).split(/\s+/).filter(function (w) {
      var n = norm(w).replace(/[^a-z0-9$.,]/g, '');
      if (!n) return false;
      if (am.raw.indexOf(n) >= 0 && /\d/.test(n)) return false;
      if (/^(mil|k|pesos|peso|rd|rd\$|dop|\$|hoy|ayer|anteayer|antier|antes|de|en|con|por|la|el|me|y|cobre|recibi|gane|ingreso)$/.test(n)) return false;
      if (acc && norm(acc.n).split(' ').indexOf(n) >= 0) return false;
      return true;
    });
    var note = words.join(' ').slice(0, 60);
    out.note = note ? note.charAt(0).toUpperCase() + note.slice(1) : '';
    return out;
  }
  function runQuick() {
    var txt = $('q-text').value.trim(), note = $('q-note');
    if (!txt) { note.textContent = 'Escribe algo como: almuerzo 450 banco ayer.'; return; }
    var r = parseQuick(txt);
    if (!r.ok) { note.textContent = 'No encontré el monto. Prueba con algo como: almuerzo 450.'; return; }
    if (editTx) endEdit();
    setKind(r.kind);
    if (r.cat) $('f-cat').value = r.cat;
    if (r.acc) $('f-acc').value = r.acc;
    $('f-monto').value = cm(r.amount);
    $('f-fecha').value = dayStr(r.back);
    syncDayButtons();
    $('f-nota').value = r.note;
    var lcq = r.note ? learnCat(r.note, r.kind) : '';
    if (lcq && (!r.cat || /^otro/i.test(r.cat))) { $('f-cat').value = lcq; r.cat = lcq; }
    catTouched = false;
    if (r.note) $('more-opts').open = true;
    updatePreview();
    var when = r.back === 0 ? 'hoy' : r.back === 1 ? 'ayer' : 'antes de ayer';
    note.textContent = 'Entendí: ' + (r.kind === 'gasto' ? 'Gasto' : 'Ingreso') + ' · ' + (r.cat || 'sin categoría (elígela)') + ' · ' + accName($('f-acc').value) + ' · ' + fmtFull(r.amount) + ' · ' + when + '. Revisa y toca Agregar.';
    $('f-monto').focus();
  }
  $('q-go').addEventListener('click', runQuick);
  $('q-text').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); runQuick(); } });

