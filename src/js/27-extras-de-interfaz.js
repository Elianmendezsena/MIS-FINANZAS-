  /* ---- Extras de interfaz ---- */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function vib(ms) { if (lsGet('finanzas-vib', '1') === '0') return; try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
  var curView = 'resumen';
  function reduceM() { return lsGet('finanzas-calm', '0') === '1' || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function monthAnim(dir) {
    if (reduceM()) return;
    document.querySelectorAll('#app [data-view]:not([hidden])').forEach(function (el) {
      if (el.animate) el.animate([{ transform: 'translateX(' + (dir > 0 ? 26 : -26) + 'px)' }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
    });
  }
  var pulseInfo = null;
  function runPulse() {
    if (!pulseInfo) return;
    var t = document.querySelector('#kpis .' + pulseInfo.cls), info = pulseInfo;
    pulseInfo = null;
    if (!t || reduceM()) return;
    var f = document.createElement('span');
    f.className = 'float-amt'; f.textContent = info.text;
    t.appendChild(f); t.classList.remove('pulse'); void t.offsetWidth; t.classList.add('pulse');
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); t.classList.remove('pulse'); }, 1500);
  }
  var kpiPrev = {};
  function countUp() {
    var reduce = reduceM();
    document.querySelectorAll('#kpis .kpi-value[data-n], #hero-bal').forEach(function (el) {
      var key = el.getAttribute('data-key'), to = parseFloat(el.getAttribute('data-n')), from = kpiPrev[key] == null ? 0 : kpiPrev[key];
      kpiPrev[key] = to;
      if (reduce || from === to || !isFinite(to)) return;
      var fin = el.textContent, t0 = performance.now();
      (function step(now) {
        if (!el.isConnected) return;
        var p = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - p, 3);
        el.textContent = p >= 1 ? fin : fmt(Math.round(from + (to - from) * e));
        if (p < 1) requestAnimationFrame(step); else fitBalance();
      })(t0);
    });
  }
  function playAnim(id) {
    var el = $(id);
    if (!el) return;
    el.classList.remove('play'); void el.offsetWidth; el.classList.add('play');
    clearTimeout(el._pt);
    el._pt = setTimeout(function () { el.classList.remove('play'); }, 1300);
  }
  $('trend-det').addEventListener('toggle', function () { if (this.open) playAnim('trend-box'); });

  /* Colores y vibración */
  function applyPal(p, persist) {
    if (['indigo', 'oceano', 'atardecer', 'bosque', 'cereza', 'uva', 'grafito'].indexOf(p) < 0) p = 'indigo';
    if (p === 'indigo') document.documentElement.removeAttribute('data-pal'); else document.documentElement.setAttribute('data-pal', p);
    document.querySelectorAll('[data-pal]').forEach(function (b) { if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', b.getAttribute('data-pal') === p ? 'true' : 'false'); });
    if (persist) lsSet('finanzas-pal', p);
  }
  document.querySelectorAll('button[data-pal]').forEach(function (b) { b.addEventListener('click', function () { applyPal(b.getAttribute('data-pal'), true); }); });
  applyPal(lsGet('finanzas-pal', 'indigo'), false);
  function applyVib(v, persist) {
    document.querySelectorAll('[data-vib]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-vib') === v ? 'true' : 'false'); });
    if (persist) { lsSet('finanzas-vib', v); if (v === '1') vib(25); }
  }
  document.querySelectorAll('[data-vib]').forEach(function (b) { b.addEventListener('click', function () { applyVib(b.getAttribute('data-vib'), true); }); });
  applyVib(lsGet('finanzas-vib', '1') === '0' ? '0' : '1', false);

  /* Logros */
  var BADGES = [
    { id: 'primer', n: 'Primer paso', d: 'Registra tu primer movimiento', i: 'rocket', ok: function () { return state.txs.some(function (t) { return !t.ex; }); } },
    { id: 'racha', n: 'Constante', d: '7 días seguidos registrando', i: 'flame', ok: function () {
      var days = {}; state.txs.forEach(function (t) { if (!t.ex) days[t.date] = 1; });
      var ks = Object.keys(days).sort(), best = 0, run = 0, prev = null;
      ks.forEach(function (k) { var d = parseDate(k); run = prev && Math.round((d - prev) / 86400000) === 1 ? run + 1 : 1; prev = d; if (run > best) best = run; });
      return best >= 7; } },
    { id: 'presup', n: 'Presupuesto en mente', d: 'Define el presupuesto del mes', i: 'wallet', ok: function () { return (!!state.monthBudget && state.monthBudget.amount > 0) || Object.keys(state.mBud).some(function (k) { return state.mBud[k].amount > 0; }); } },
    { id: 'bajo', n: 'Mes bajo presupuesto', d: 'Cierra un mes sin pasarte', i: 'target', ok: function () {
      var cur = toKey(new Date()), by = {};
      state.txs.forEach(function (t) { if (!t.ex && !t.pending && t.kind === 'gasto') { var k = t.date.slice(0, 7); if (k < cur) by[k] = (by[k] || 0) + val(t); } });
      return Object.keys(by).some(function (k) { var lm = mbVal(k); return lm > 0 && by[k] > 0 && by[k] <= lm; }); } },
    { id: 'ahorro', n: 'Primer ahorro', d: 'Aparta dinero para tu ahorro', i: 'piggy-bank', ok: function () {
      return state.savings.some(function (e) { return !e.ex && e.dir === 'aporte'; }) || state.txs.some(function (t) { return !t.ex && !t.pending && t.kind === 'ingreso' && t.pct > 0; }); } },
    { id: 'meta', n: 'Meta cumplida', d: 'Llega a tu meta de ahorro', i: 'trophy', ok: function () {
      var g = goalVal(); if (!(g > 0)) return false; var l = ledger(); return l.length > 0 && l[l.length - 1].run >= g; } },
    { id: 'plantilla', n: 'Atajo listo', d: 'Guarda una plantilla', i: 'bookmark', ok: function () { return state.tpl.length > 0; } },
    { id: 'cincuenta', n: '50 movimientos', d: 'Registra 50 movimientos', i: 'medal', ok: function () { return state.txs.filter(function (t) { return !t.ex; }).length >= 50; } }
  ];
  var freshBadges = {}, badgesReady = false;
  setTimeout(function () { badgesReady = true; renderBadges(); }, 5000);
  function whenToastFree(cb, n) {
    n = n || 0;
    var t = $('toast');
    if (t.hidden || n > 12) { setTimeout(cb, 400); return; }
    setTimeout(function () { whenToastFree(cb, n + 1); }, 1000);
  }
  function renderBadges() {
    var box = $('badges');
    if (!box) return;
    var done = BADGES.filter(function (b) { return b.ok(); }).map(function (b) { return b.id; });
    var stored = null;
    try { stored = JSON.parse(lsGet('finanzas-badges', 'null')); } catch (e) {}
    if (!badgesReady) stored = done.slice();
    else if (!Array.isArray(stored)) { lsSet('finanzas-badges', JSON.stringify(done)); stored = done; }
    var news = done.filter(function (id) { return stored.indexOf(id) < 0; });
    if (news.length) {
      lsSet('finanzas-badges', JSON.stringify(stored.concat(news)));
      news.forEach(function (id) { freshBadges[id] = true; });
      var nm = BADGES.filter(function (b) { return news.indexOf(b.id) >= 0; }).map(function (b) { return b.n; }).join(', ');
      whenToastFree(function () { toast('Logro desbloqueado: ' + nm); vib([30, 40, 30]); });
    }
    $('badge-count').textContent = done.length + ' de ' + BADGES.length + ' desbloqueados';
    box.innerHTML = BADGES.map(function (b) {
      var ok = done.indexOf(b.id) >= 0;
      return '<div class="badge' + (ok ? ' on' : '') + (freshBadges[b.id] ? ' new' : '') + '"><span class="bi"><i data-lucide="' + (ok ? b.i : 'lock') + '"></i></span><b>' + esc(b.n) + '</b><span>' + esc(b.d) + '</span></div>';
    }).join('');
  }

  /* Deslizar entre pestañas */
  var TAB_ORDER = ['resumen', 'historial', 'cuentas'], sw = null;
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { sw = null; return; }
    var t = e.touches[0];
    sw = { x: t.clientX, y: t.clientY, t: Date.now(), el: e.target };
  }, { passive: true });
  document.addEventListener('touchcancel', function () { sw = null; }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (!sw) return;
    var s0 = sw, t = e.changedTouches[0], dx = t.clientX - s0.x, dy = t.clientY - s0.y;
    sw = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6 || Date.now() - s0.t > 900) return;
    if (!$('menu').hidden) return;
    if (s0.el && s0.el.closest && s0.el.closest('.hrow,input,select,textarea,table,#month-pop,#lock,.dn-svg,#trend-box,#menu,#fab-wrap,.tabs')) return;
    var i = TAB_ORDER.indexOf(curView), j = dx < 0 ? i + 1 : i - 1;
    if (i < 0 || j < 0 || j >= TAB_ORDER.length) return;
    document.documentElement.style.setProperty('--vx', dx < 0 ? '28px' : '-28px');
    setView(TAB_ORDER[j]);
    setTimeout(function () { document.documentElement.style.setProperty('--vx', '0px'); }, 400);
  }, { passive: true });

  var FS_KEY = 'finanzas-fs';
  function applyFs(v, persist) {
    document.documentElement.style.setProperty('--fs', v);
    document.querySelectorAll('[data-fs]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-fs') === String(v) ? 'true' : 'false'); });
    if (persist) { try { localStorage.setItem(FS_KEY, String(v)); } catch (e) {} }
    fitBalance();
  }
  document.querySelectorAll('[data-fs]').forEach(function (b) {
    b.addEventListener('click', function () { applyFs(b.getAttribute('data-fs'), true); });
  });
  (function () { var v = '1'; try { v = localStorage.getItem(FS_KEY) || '1'; } catch (e) {} if (['1', '1.12', '1.25'].indexOf(v) < 0) v = '1'; applyFs(v, false); })();
  var trashSure = false;
  function renderTrash() {
    var box = $('trash-list');
    if (!box) return;
    var L = state.trash.slice().reverse();
    if (!L.length) { box.innerHTML = '<p class="note">Está vacía. Lo que elimines de Movimientos aparece aquí durante 30 días, por si te arrepientes.</p>'; return; }
    box.innerHTML = '<ul class="cat-list">' + L.map(function (x) {
      var t = x.tx, left = Math.max(1, 30 - Math.floor((Date.now() - x.at) / 864e5));
      return '<li class="flex items-center gap-2"><div class="min-w-0 grow"><div class="font-semibold">' + esc(t.cat) + ' · ' + (t.kind === 'gasto' ? '−' : '+') + fmtFull(t.amount, t.cur || 'DOP') + '</div>' +
        '<div class="note">' + esc(dShort(parseDate(t.date))) + (t.note ? ' · ' + esc(t.note) : '') + ' · se borra en ' + left + (left === 1 ? ' día' : ' días') + '</div></div>' +
        '<button type="button" class="btn-ghost" style="min-height:40px" data-trrest="' + esc(t.id) + '">Recuperar</button></li>';
    }).join('') + '</ul><div class="flex gap-2">' + (trashSure
      ? '<button type="button" class="btn-ghost btn-danger" id="trash-yes">Sí, vaciar</button><button type="button" class="btn-ghost" id="trash-no">Cancelar</button>'
      : '<button type="button" class="btn-ghost" id="trash-empty">Vaciar papelera</button>') + '</div>';
  }
  $('trash-list').addEventListener('click', function (ev) {
    var r = ev.target.closest('[data-trrest]'), id = ev.target.id;
    if (r) {
      var i = state.trash.findIndex(function (x) { return x.tx.id === r.getAttribute('data-trrest'); });
      if (i < 0) return;
      var t = state.trash.splice(i, 1)[0].tx;
      if (!state.txs.some(function (x) { return x.id === t.id; })) state.txs.push(t);
      freshId = t.id;
      save(state); render(); renderTrash(); refreshIcons();
      toast('Movimiento recuperado: ' + fmtFull(t.amount, t.cur || 'DOP'));
      return;
    }
    if (id === 'trash-empty') { trashSure = true; renderTrash(); }
    else if (id === 'trash-no') { trashSure = false; renderTrash(); }
    else if (id === 'trash-yes') { trashSure = false; state.trash = []; save(state); renderTrash(); toast('Papelera vaciada'); }
  });
  function renderSettings() {
    renderTrash();
    $('name-in').value = lsGet('finanzas-name', '');
    var bo = bioOk(), bi = !!bioId();
    $('bio-on').hidden = !(bo && !bi) || !pinStored();
    $('bio-off').hidden = !bi || !pinStored();
    $('bio-note').hidden = !(bo && pinStored());
    var on = !!pinStored();
    $('pin-state').textContent = encKey ? 'PIN activado. Tus datos de este dispositivo están cifrados.' : on ? 'Tienes un PIN antiguo: bloquea la pantalla pero no cifra. Quítalo y crea uno de 6 números para cifrar tus datos.' : 'Sin PIN. Tus datos no están cifrados.';
    $('pin-set').hidden = on;
    $('pin-on').hidden = !on;
  }
  $('pin-save').addEventListener('click', function () {
    var p = $('pin-new').value.trim();
    if (!/^\d{6}$/.test(p)) { pinError('El PIN debe tener 6 números.'); return; }
    if (p !== $('pin-new2').value.trim()) { pinError('Los dos PIN no coinciden.'); return; }
    if (/^(\d)\1{5}$/.test(p) || p === '123456' || p === '654321') { pinError('Ese PIN es muy fácil de adivinar. Elige otro.'); return; }
    if (!window.MFC.ok()) { pinError('Este navegador no permite cifrar los datos.'); return; }
    pinError('');
    var meta = window.MFC.newMeta(), text = JSON.stringify(state);
    window.MFC.derive(p, meta.s, meta.n).then(function (key) {
      return window.MFC.seal(key, text, meta).then(function (out) {
        /* Primero se guarda lo cifrado y se comprueba que abre; solo entonces se borra la copia sin cifrar. */
        localStorage.setItem(window.MFC.ENC, out);
        return window.MFC.open(key, JSON.parse(localStorage.getItem(window.MFC.ENC))).then(function (back) {
          if (back !== text) throw 0;
          encKey = key; encMeta = meta;
          localStorage.removeItem(KEY); localStorage.removeItem(PIN_KEY); localStorage.removeItem(BIO_KEY);
          save(state);
          $('pin-new').value = ''; $('pin-new2').value = '';
          renderSettings();
          toast('PIN activado. Tus datos quedaron cifrados');
        });
      });
    }).catch(function () {
      if (!encKey) { try { localStorage.removeItem(window.MFC.ENC); } catch (e) {} }
      pinError('No se pudo activar el cifrado. Tus datos siguen como estaban.');
    });
  });
  $('pin-off').addEventListener('click', function () {
    if (encKey) {
      /* Se espera a que termine cualquier guardado cifrado pendiente y se vuelve a guardar sin cifrar. */
      encChain.then(function () {
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { pinError('No se pudo quitar el cifrado: no hay espacio para guardar.'); return; }
        encKey = null; encMeta = null;
        window.MFC.wipe().then(function () { renderSettings(); toast('PIN quitado. Tus datos ya no están cifrados'); });
      });
      return;
    }
    try { localStorage.removeItem(PIN_KEY); localStorage.removeItem(BIO_KEY); } catch (e) { /* sin almacenamiento */ }
    pinTouch();
    renderSettings();
    toast('Bloqueo quitado');
  });
  /* Face ID / huella: llave del dispositivo (WebAuthn). Solo abre este dispositivo; el PIN sigue de respaldo. */
  var BIO_KEY = 'finanzas-bio';
  function bioId() { return lsGet(BIO_KEY, ''); }
  function bioOk() { var top = true; try { top = window.top === window.self; } catch (e) { top = false; } return !!(top && window.PublicKeyCredential && navigator.credentials && navigator.credentials.create && window.isSecureContext); }
  function rnd(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
  function b64e(buf) { var s = '', b = new Uint8Array(buf), i; for (i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var r = atob(s), u = new Uint8Array(r.length), i; for (i = 0; i < r.length; i++) u[i] = r.charCodeAt(i); return u; }
  $('bio-on').addEventListener('click', function () {
    if (!bioOk()) { pinError('Este navegador no permite Face ID aquí.'); return; }
    pinError('');
    navigator.credentials.create({ publicKey: { challenge: rnd(32), rp: { name: 'Mis Finanzas' }, user: { id: rnd(16), name: 'mis-finanzas', displayName: 'Mis Finanzas' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' }, timeout: 60000, attestation: 'none' } })
      .then(function (c) { return (encKey ? window.MFC.keyPut(encKey) : Promise.resolve()).then(function () { lsSet(BIO_KEY, b64e(c.rawId)); renderSettings(); toast('Face ID activado'); }); })
      .then(null,
        function (e) { pinError(e && e.name === 'NotAllowedError' ? 'Se canceló o no se permitió.' : 'No se pudo activar Face ID en este dispositivo.'); });
  });
  $('bio-off').addEventListener('click', function () { try { localStorage.removeItem(BIO_KEY); } catch (e) {} window.MFC.keyDel(); renderSettings(); toast('Face ID quitado'); });
  $('lock-bio').addEventListener('click', function () {
    var id = bioId();
    if (!id || !bioOk()) return;
    navigator.credentials.get({ publicKey: { challenge: rnd(32), allowCredentials: [{ type: 'public-key', id: b64d(id) }], userVerification: 'required', timeout: 60000 } })
      .then(function () { $('lock').hidden = true; $('lock-in').value = ''; },
        function () { $('lock-err').textContent = 'No se pudo verificar. Usa tu PIN.'; $('lock-err').hidden = false; });
  });
  $('pin-now').addEventListener('click', showLock);
  document.addEventListener('visibilitychange', function () {
    /* Se bloquea en el momento en que sales de la app, así vuelves siempre a la pantalla del PIN. */
    if (document.hidden) { hiddenAt = Date.now(); showLock(); }
    else if (hiddenAt && pinStored() && $('lock').hidden) showLock();
  });
  window.addEventListener('pagehide', function () { showLock(); });
  window.addEventListener('pageshow', function (ev) { if (ev.persisted) showLock(); });
  if (!encKey) showLock(); /* con cifrado, el PIN ya se pidió al arrancar */
  themeIcon();

