  /* ---- Bloqueo con PIN ---- */
  var PIN_KEY = 'finanzas-pin', hiddenAt = 0;
  var PINAT_KEY = 'finanzas-pin-at';
  function pinAtVal() { try { return +localStorage.getItem(PINAT_KEY) || 0; } catch (e) { return 0; } }
  function pinTouch() { try { localStorage.setItem(PINAT_KEY, String(Date.now())); } catch (e) { /* sin almacenamiento */ } schedulePush(); }
  function applyRemotePin(h, at) {
    try { if (h) localStorage.setItem(PIN_KEY, h); else localStorage.removeItem(PIN_KEY); localStorage.setItem(PINAT_KEY, String(at)); } catch (e) { /* sin almacenamiento */ }
  }
  function pinStored() { try { return localStorage.getItem(PIN_KEY) || ''; } catch (e) { return ''; } }
  function hashPin(pin) {
    var fallback = function () { var x = 5381, i; for (i = 0; i < pin.length; i++) x = ((x << 5) + x + pin.charCodeAt(i)) | 0; return 'x' + x; };
    try {
      if (window.crypto && window.crypto.subtle && window.TextEncoder) {
        return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode('fp1:' + pin)).then(function (buf) {
          return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
        }, function () { return fallback(); });
      }
    } catch (e) { /* usa el respaldo */ }
    return Promise.resolve(fallback());
  }
  function showLock() {
    if (!pinStored()) return;
    $('lock').hidden = false;
    $('lock-in').value = '';
    $('lock-err').hidden = true;
    $('lock-forgot').hidden = true;
    $('lock-err').textContent = 'PIN incorrecto.';
    $('lock-bio').hidden = !(bioId() && bioOk());
    setTimeout(function () { $('lock-in').focus(); }, 0);
  }
  $('lock-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    hashPin($('lock-in').value).then(function (hsh) {
      if (hsh === pinStored()) { $('lock').hidden = true; $('lock-in').value = ''; tourMaybe(); }
      else { $('lock-err').textContent = 'PIN incorrecto.'; $('lock-err').hidden = false; $('lock-in').value = ''; }
    });
  });
  $('lock-forgot-btn').addEventListener('click', function () { $('lock-forgot').hidden = !$('lock-forgot').hidden; });
  $('lock-reset').addEventListener('click', function () {
    if ($('lock-word').value.trim().toUpperCase() !== 'QUITAR') return;
    try { localStorage.removeItem(PIN_KEY); } catch (e) { /* sin almacenamiento */ }
    pinTouch();
    $('lock').hidden = true;
    tourMaybe();
    $('lock-word').value = '';
    renderSettings();
  });
  function pinError(m) { var e = $('pin-error'); e.textContent = m; e.hidden = !m; }
  function calcEval(str) {
    var e = String(str).replace(/,/g, '').replace(/[×xX]/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '');
    if (!/^[\d.+\-*\/()]+$/.test(e) || /[+\-*\/]{2,}/.test(e.replace(/([*\/])-/g, '$1'))) return null;
    e = e.replace(/[+\-*\/.]+$/, '');
    if (!e) return null;
    var i = 0, bad = false;
    function atom() {
      if (e.charAt(i) === '(') { i++; var v = sum(); if (e.charAt(i) === ')') i++; return v; }
      if (e.charAt(i) === '-') { i++; return -atom(); }
      var m = /^\d*\.?\d+|^\d+\./.exec(e.slice(i));
      if (!m) { bad = true; return 0; }
      i += m[0].length; return parseFloat(m[0]);
    }
    function prod() {
      var v = atom();
      while (e.charAt(i) === '*' || e.charAt(i) === '/') { var o = e.charAt(i++), n = atom(); v = o === '*' ? v * n : v / n; }
      return v;
    }
    function sum() {
      var v = prod();
      while (e.charAt(i) === '+' || e.charAt(i) === '-') { var o = e.charAt(i++), n = prod(); v = o === '+' ? v + n : v - n; }
      return v;
    }
    var r = sum();
    if (bad || i < e.length || !isFinite(r)) return null;
    return Math.round(r * 100) / 100;
  }
  var OPRX = /[+*\/×÷xX−]|\d-/;
  function num(v) {
    var s = String(v == null ? '' : v);
    if (OPRX.test(s)) { var r = calcEval(s); return r == null ? NaN : r; }
    return parseFloat(s.replace(/,/g, ''));
  }
  function cm(v) { var p = String(v).split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); return p.join('.'); }
  document.addEventListener('input', function (ev) {
    var el = ev.target;
    if (!el.classList || !el.classList.contains('money')) return;
    var raw = el.value, pos = el.selectionStart == null ? raw.length : el.selectionStart;
    if (el.id === 'f-monto' && /[+*\/×÷xX−]|\d-/.test(raw)) {
      var sane = raw.replace(/[^\d.,+\-*\/×÷xX−]/g, '');
      if (sane !== raw) el.value = sane;
      var cr = calcEval(sane);
      $('calc-res').textContent = cr == null ? '' : '= ' + fmtFull(cr);
      return;
    }
    if (el.id === 'f-monto') $('calc-res').textContent = '';
    var before = raw.slice(0, pos).replace(/[^\d.]/g, '').length;
    var clean = raw.replace(/[^\d.]/g, ''), i = clean.indexOf('.');
    if (i >= 0) clean = clean.slice(0, i + 1) + clean.slice(i + 1).replace(/\./g, '').slice(0, 2);
    var out = cm(clean);
    if (out === raw) return;
    el.value = out;
    var n = 0, k = 0;
    while (k < out.length && n < before) { if (/[\d.]/.test(out.charAt(k))) n++; k++; }
    try { el.setSelectionRange(k, k); } catch (e) {}
  });
  function calcFinish() {
    var el = $('f-monto');
    if (!OPRX.test(el.value)) return;
    var r = calcEval(el.value);
    if (r != null && r > 0) { el.value = cm(String(r)); $('calc-res').textContent = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }
  }
  document.addEventListener('click', function (ev) {
    var k = ev.target.closest('.calc-key');
    if (!k) return;
    var el = $('f-monto'), op = k.getAttribute('data-op');
    if (op === '=') { calcFinish(); el.focus(); return; }
    var v = el.value.replace(/[+\-*\/×÷xX−.,]+$/, '');
    if (!v) return;
    el.value = v + (op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : op);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
  });
  $('f-monto').addEventListener('blur', calcFinish);

  /* Sin zoom con pellizco (iPhone ignora user-scalable) */
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); }, { passive: false }); });
  document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1 && e.scale !== undefined && e.scale !== 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('wheel', function (e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
