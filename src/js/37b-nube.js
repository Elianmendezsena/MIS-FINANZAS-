  /* ---- Nube: cuenta con correo y sincronización (versión instalada, Supabase) ---- */
  var SB = { url: 'https://rujwlbcofywofuifhrqa.supabase.co', key: 'sb_publishable_LtqqdGNErVfs3wFLS5yFMA_Nu8_mPV_' };
  var SBS = 'finanzas-nube', SBD = 'finanzas-nube-pend', SBK = 'finanzas-nube-llave', sbS = null, sbTimer = null, sbSig = '', sbBusy = false, sbStop = null;
  /* Cifrado de la nube: cada dato sube cifrado con una llave (sbDK) que solo se abre con tu contraseña. */
  var sbDK = null, sbDKraw = '', sbBad = false, sbRecTok = null;
  function cloudMode() { return !(window.claude && window.claude.use); }
  /* Hay cambios locales sin subir: al reconectar se mezclan con la nube en vez de perderse. */
  function cloudDirty(v) { if (v === undefined) return lsGet(SBD, '') === '1'; if (cloudMode() && sbS) lsSet(SBD, v ? '1' : ''); }
  /* La sesión se guarda cifrada si hay PIN. */
  function sbPut(k, obj) {
    if (!obj) { try { localStorage.removeItem(k); } catch (e) {} return Promise.resolve(); }
    var txt = JSON.stringify(obj);
    if (!encKey) { lsSet(k, txt); return Promise.resolve(); }
    return window.MFC.seal(encKey, txt, encMeta).then(function (c) { lsSet(k, c); }, function () {});
  }
  function sbGet(k) {
    var raw = lsGet(k, ''), o = null;
    if (!raw) return Promise.resolve(null);
    try { o = JSON.parse(raw); } catch (e) { return Promise.resolve(null); }
    if (o && o.ct) return encKey ? window.MFC.open(encKey, o).then(function (t) { return JSON.parse(t); }, function () { return null; }) : Promise.resolve(null);
    return Promise.resolve(o);
  }
  /* Sesión y llave de la nube; se vuelven a guardar al poner o quitar el PIN. La llave se conserva aunque cierres sesión. */
  function sbPersist() { return sbPut(SBS, sbS).then(function () { return sbDKraw && sbS ? sbPut(SBK, { uid: sbS.uid, dk: sbDKraw }) : sbGet(SBK).then(function (k) { return k ? sbPut(SBK, k) : null; }); }); }
  function sbLoad() { return sbGet(SBS).then(function (o) { return o && o.rt ? o : null; }); }
  function dkImport(raw64) { return crypto.subtle.importKey('raw', window.MFC.ub64(raw64), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']); }
  function dkSeal(key, text) { return window.MFC.seal(key, text, { s: '', n: 0 }).then(function (c) { var o = JSON.parse(c); return { e: 1, iv: o.iv, ct: o.ct }; }); }
  function kekOf(pw) { return window.MFC.derive(pw, window.MFC.b64(new TextEncoder().encode('mf-nube:' + sbS.uid)), 310000); }
  function keyUpload(kek, raw64, dk) {
    return Promise.all([dkSeal(kek, raw64), dkSeal(dk, 'mis-finanzas')]).then(function (a) {
      return sbRest('mf_docs?on_conflict=user_id,id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { user_id: sbS.uid, id: '_key', data: { v: 1, w: a[0], chk: a[1] } } });
    });
  }
  function dkSet(raw64) { return dkImport(raw64).then(function (k) { sbDK = k; sbDKraw = raw64; sbBad = false; return sbPut(SBK, { uid: sbS.uid, dk: raw64 }); }); }
  /* Al entrar con contraseña: abre la llave de la nube, o la crea, o la vuelve a envolver si cambiaste la contraseña. */
  function cloudKey(pw) {
    var kek, local;
    return kekOf(pw).then(function (k) { kek = k; return sbGet(SBK); }).then(function (l) {
      local = l && l.uid === sbS.uid && l.dk ? l.dk : '';
      return sbRest('mf_docs?select=data&id=eq._key').then(function (r) { return r.json(); });
    }).then(function (rows) {
      var rec = rows[0] && rows[0].data;
      if (!rec || !rec.w) {
        var raw = local || window.MFC.b64(crypto.getRandomValues(new Uint8Array(32)));
        return dkImport(raw).then(function (dk) { return keyUpload(kek, raw, dk); }).then(function () { return dkSet(raw); });
      }
      return window.MFC.open(kek, rec.w).then(function (raw) { return dkSet(raw); }, function () {
        if (!local) throw { code: 'badkey' };
        return dkImport(local).then(function (dk) { return window.MFC.open(dk, rec.chk).then(function () { return keyUpload(kek, local, dk); }).then(function () { return dkSet(local); }); }, function () { throw { code: 'badkey' }; })
          .catch(function (e) { throw (e && e.code) ? e : { code: 'badkey' }; });
      });
    });
  }
  function sbReq(path, opt, tok) {
    opt = opt || {};
    var h = { apikey: SB.key, Authorization: 'Bearer ' + (tok || SB.key) }, k;
    if (opt.body) h['Content-Type'] = 'application/json';
    for (k in (opt.headers || {})) h[k] = opt.headers[k];
    return fetch(SB.url + path, { method: opt.method || 'GET', headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined });
  }
  function sbTake(j) {
    sbS = { at: j.access_token, rt: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, email: (j.user && j.user.email) || (sbS && sbS.email) || '', uid: (j.user && j.user.id) || (sbS && sbS.uid) || '' };
    return sbPersist();
  }
  var sbRef = null;
  function sbToken() {
    if (!sbS) return Promise.reject({ code: 'nosession' });
    if (sbS.exp - 60000 > Date.now()) return Promise.resolve(sbS.at);
    if (sbRef) return sbRef;
    sbRef = sbReq('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: sbS.rt } }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || !j.access_token) { if (r.status === 400 || r.status === 401 || r.status === 403) { cloudOut(true); throw { code: 'expired' }; } throw { code: 'net' }; }
        return sbTake(j).then(function () { return sbS.at; });
      });
    });
    sbRef.then(function () { sbRef = null; }, function () { sbRef = null; });
    return sbRef;
  }
  function sbRest(path, opt) {
    return sbToken().then(function (t) { return sbReq('/rest/v1/' + path, opt, t); }).then(function (r) { if (!r.ok) throw { code: 'http' + r.status }; return r; });
  }
  /* Misma forma que la colección que usa la sincronización: doc(id).set / delete y onSnapshot */
  function cloudCol() {
    function all() {
      var rows = [];
      function page(from) {
        return sbRest('mf_docs?select=id,data&order=id', { headers: { Range: from + '-' + (from + 999), 'Range-Unit': 'items' } }).then(function (r) { return r.json(); }).then(function (a) {
          rows = rows.concat(a);
          return a.length === 1000 ? page(from + 1000) : rows;
        });
      }
      return page(0);
    }
    function sig() {
      return sbRest('mf_docs?select=updated_at&order=updated_at.desc&limit=1', { headers: { Prefer: 'count=exact' } }).then(function (r) {
        return r.json().then(function (a) { return (r.headers.get('Content-Range') || '').split('/')[1] + '|' + (a[0] ? a[0].updated_at : ''); });
      });
    }
    return {
      doc: function (id) {
        return {
          set: function (body) { return dkSeal(sbDK, JSON.stringify(body)).then(function (enc) { return sbRest('mf_docs?on_conflict=user_id,id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { user_id: sbS.uid, id: id, data: enc } }); }); },
          delete: function () { return sbRest('mf_docs?id=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); }
        };
      },
      onSnapshot: function (cb, onErr) {
        var alive = true;
        function tick(force) {
          if (!alive || sbBusy || document.hidden || pushTimer || pushing) return;
          if (!navigator.onLine) { setSync('error'); return; }
          /* Primero se sube lo local pendiente; así un cambio hecho sin conexión no lo pisa la nube. */
          if (sbSig && pendingChanges()) { schedulePush(); return; }
          sbBusy = true;
          sig().then(function (s) {
            if (!force && s === sbSig) { if (syncStatus === 'error') setSync('ok'); return null; }
            return all().then(function (rows) {
              rows = rows.filter(function (r) { return r.id.charAt(0) !== '_'; });
              var old = [];
              /* Si un solo dato no abre, no se aplica nada: así nunca se confunde "no lo pude leer" con "se borró". */
              return Promise.all(rows.map(function (r) {
                if (r.data && r.data.e && r.data.ct) return window.MFC.open(sbDK, r.data).then(function (t) { return { id: r.id, d: JSON.parse(t) }; });
                old.push(r); return { id: r.id, d: r.data };
              })).then(function (docs) {
                if (!alive || pushTimer || pushing) return;
                sbSig = s;
                cb({ docs: docs.map(function (x) { return { id: x.id, exists: true, data: function () { return x.d; } }; }) });
                renderNube();
                /* Lo que estaba en la nube sin cifrar (versión anterior) se vuelve a subir cifrado. */
                var self = cloudCol(), i = 0;
                (function next() { if (!alive || i >= old.length) return; var o = old[i++]; self.doc(o.id).set(o.data).then(next, function () {}); })();
              }, function () { if (alive) { sbBad = true; sbStop(); col = null; setSync('error'); renderNube(); } });
            });
          }).catch(function (e) { if (alive && (!e || e.code !== 'expired')) onErr(e); }).then(function () { sbBusy = false; });
        }
        var onVis = function () { if (!document.hidden) tick(); }, onLine = function () { tick(); };
        document.addEventListener('visibilitychange', onVis); window.addEventListener('online', onLine);
        sbTimer = setInterval(tick, 45000);
        tick(true);
        sbStop = function () { alive = false; clearInterval(sbTimer); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('online', onLine); };
        return { tick: tick };
      }
    };
  }
  var sbSnap = null;
  function cloudStart() {
    if (!cloudMode()) { var c0 = $('nube-card'), h0 = $('nube-h'); if (c0) c0.hidden = true; if (h0) h0.hidden = true; return; }
    sbLoad().then(function (s) {
      sbS = s;
      return sbGet(SBK).then(function (k) {
        if (sbS && k && k.uid === sbS.uid && k.dk) return dkImport(k.dk).then(function (key) { sbDK = key; sbDKraw = k.dk; });
      });
    }).then(function () {
      renderNube();
      if (sbS && !sbDK) { cloudOut(false, 'Entra de nuevo con tu contraseña para activar el cifrado de tus datos en la nube.'); return; }
      if (sbS) cloudOn();
      cloudHash();
    });
  }
  function cloudOn() {
    if (sbStop) sbStop();
    sbSig = ''; synced = {}; canWrite = true;
    col = cloudCol();
    setSync('syncing');
    sbSnap = col.onSnapshot(onRemote, function () { setSync('error'); });
  }
  function cloudOut(expired, msg) {
    if (sbStop) sbStop();
    sbStop = null; col = null; sbS = null; synced = {}; sbSig = ''; sbDK = null; sbDKraw = ''; sbBad = false;
    try { localStorage.removeItem(SBS); localStorage.removeItem(KEY + ':sync'); localStorage.removeItem(SBD); } catch (e) {}
    setSync('local');
    renderNube(msg || (expired ? 'Tu sesión venció. Entra de nuevo para seguir sincronizando.' : ''));
  }
  /* Enlaces del correo (confirmar cuenta o cambiar contraseña) llegan con datos después del # */
  function cloudHash() {
    var h = location.hash.charAt(0) === '#' ? location.hash.slice(1) : '';
    if (!/(access_token|error_description)=/.test(h)) return;
    var q = {}; h.split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) q[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); });
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    setView('ajustes'); collapOpen('nube-card');
    if (q.error_description) { nubeMsg(/expired|invalid/i.test(q.error_description) ? 'Ese enlace ya venció o ya se usó. Pide otro.' : q.error_description, true); return; }
    if (q.type === 'recovery') {
      sbRecTok = { access_token: q.access_token, refresh_token: q.refresh_token, expires_in: +q.expires_in || 3600 };
      $('nube-in').hidden = true; $('nube-on').hidden = true; $('nube-new').hidden = false;
      nubeMsg('Escribe tu contraseña nueva.');
      setTimeout(function () { $('nube-newpass').focus(); }, 50);
    } else nubeMsg('Correo confirmado. Escribe tu contraseña y toca "Entrar".');
  }
  function nubeNewPass() {
    var pw = $('nube-newpass').value, tk = sbRecTok;
    if (!tk) return;
    if (pw.length < 8) { nubeMsg('La contraseña debe tener al menos 8 caracteres.', true); return; }
    nubeMsg('Guardando…');
    sbReq('/auth/v1/user', { method: 'PUT', body: { password: pw } }, tk.access_token).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) { nubeMsg(j.error_code === 'same_password' ? 'Esa es tu contraseña actual. Escribe una distinta.' : 'No se pudo cambiar: ' + (j.msg || j.message || 'error ' + r.status), true); return; }
        sbRecTok = null; $('nube-new').hidden = true; $('nube-newpass').value = '';
        tk.user = { id: j.id, email: j.email };
        return sbTake(tk).then(function () { return cloudKey(pw); }).then(function () { renderNube(); cloudOn(); toast('Contraseña cambiada'); nubeMsg(''); }, function (e) {
          if (e && e.code === 'badkey' && !state.txs.length) { cloudOut(false, 'Contraseña cambiada. Ahora abre la app donde tienes tus datos y entra con la contraseña nueva.'); return; }
          nubeKeyFail(e);
        });
      });
    }).catch(function () { nubeMsg('No se pudo conectar con la nube.', true); });
  }
  function nubeKeyFail(e) {
    if (e && e.code === 'badkey') { sbBad = true; col = null; setSync('error'); renderNube(); return; }
    cloudOut(false, 'No se pudo abrir tu nube ahora. Revisa tu internet y entra de nuevo.');
  }
  function nubeMsg(m, bad) { var e = $('nube-msg'); if (!e) return; e.textContent = m || ''; e.hidden = !m; e.className = bad ? 'err' : 'note'; }
  function renderNube(msg) {
    if (!$('nube-card')) return;
    $('nube-in').hidden = !!sbS; $('nube-on').hidden = !sbS || sbBad; $('nube-new').hidden = !sbRecTok; $('nube-bad').hidden = !(sbS && sbBad);
    $('nube-replace').hidden = !state.txs.length; $('nube-chg').hidden = true;
    if (sbS && sbBad) { $('nube-line').textContent = 'Necesita atención'; $('nube-state').textContent = 'Entraste como ' + sbS.email + ', pero los datos de la nube están cifrados con una contraseña anterior y este dispositivo no tiene la llave.'; if (msg !== undefined) nubeMsg(msg, true); return; }
    $('nube-line').textContent = sbS ? 'Conectada · ' + sbS.email : 'Sin conectar';
    $('nube-state').textContent = sbS ? 'Sesión iniciada como ' + sbS.email + '. Tus datos suben cifrados con tu contraseña y se sincronizan entre tus dispositivos.' : 'Crea una cuenta o entra para guardar tus datos en la nube y verlos en tu teléfono y tu computadora.';
    if (msg !== undefined) nubeMsg(msg, true);
  }
  function nubeAuth(signup) {
    var em = $('nube-email').value.trim().toLowerCase(), pw = $('nube-pass').value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { nubeMsg('Escribe un correo válido.', true); return; }
    if (pw.length < 8) { nubeMsg('La contraseña debe tener al menos 8 caracteres.', true); return; }
    if (!navigator.onLine) { nubeMsg('No hay conexión a internet.', true); return; }
    nubeMsg(signup ? 'Creando tu cuenta…' : 'Entrando…');
    sbReq(signup ? '/auth/v1/signup?redirect_to=' + encodeURIComponent(appUrl()) : '/auth/v1/token?grant_type=password', { method: 'POST', body: { email: em, password: pw } }).then(function (r) {
      return r.json().then(function (j) {
        if (r.ok && j.access_token) {
          $('nube-pass').value = '';
          return sbTake(j).then(function () { return cloudKey(pw); }).then(function () { nubeMsg(''); renderNube(); cloudOn(); toast(signup ? 'Cuenta creada. Subiendo tus datos…' : 'Sesión iniciada. Sincronizando…'); }, nubeKeyFail);
        }
        if (r.ok && signup) { nubeMsg('Te envié un correo a ' + em + '. Ábrelo, toca el enlace para confirmar y luego vuelve aquí y toca "Entrar".'); return; }
        var c = j.error_code || j.code || '', m = j.msg || j.error_description || j.message || '';
        nubeMsg(c === 'invalid_credentials' || /Invalid login/i.test(m) ? 'Correo o contraseña incorrectos.' : c === 'email_not_confirmed' || /not confirmed/i.test(m) ? 'Primero confirma tu correo con el enlace que te envié.' : c === 'user_already_exists' || /already registered/i.test(m) ? 'Ya hay una cuenta con ese correo. Toca "Entrar".' : c === 'weak_password' ? 'Esa contraseña es muy débil. Usa una más larga.' : /rate limit/i.test(m) || r.status === 429 ? 'Demasiados intentos. Espera unos minutos.' : 'No se pudo: ' + (m || 'error ' + r.status), true);
      });
    }).catch(function () { nubeMsg('No se pudo conectar con la nube. Revisa tu internet.', true); });
  }
  function appUrl() { return location.origin + location.pathname; }
  window.addEventListener('hashchange', function () { if (cloudMode()) cloudHash(); });
  if ($('nube-card')) {
    $('nube-forgot').addEventListener('click', function () {
      var em = $('nube-email').value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { nubeMsg('Escribe arriba tu correo y vuelve a tocar "Olvidé mi contraseña".', true); $('nube-email').focus(); return; }
      nubeMsg('Enviando…');
      sbReq('/auth/v1/recover?redirect_to=' + encodeURIComponent(appUrl()), { method: 'POST', body: { email: em } }).then(function (r) {
        nubeMsg(r.ok ? 'Si hay una cuenta con ' + em + ', te llegó un correo con un enlace para poner una contraseña nueva.' : r.status === 429 ? 'Ya pediste uno hace poco. Espera un minuto.' : 'No se pudo enviar el correo.', !r.ok);
      }, function () { nubeMsg('No se pudo conectar con la nube.', true); });
    });
    $('nube-newok').addEventListener('click', nubeNewPass);
    $('nube-chg-open').addEventListener('click', function () { $('nube-chg').hidden = !$('nube-chg').hidden; });
    $('nube-chg-ok').addEventListener('click', function () {
      var pw = $('nube-chg-pass').value;
      if (pw.length < 8) { nubeMsg('La contraseña debe tener al menos 8 caracteres.', true); return; }
      nubeMsg('Guardando…');
      sbToken().then(function (t) { return sbReq('/auth/v1/user', { method: 'PUT', body: { password: pw } }, t); }).then(function (r) {
        if (!r.ok) return r.json().then(function (j) { nubeMsg(j.error_code === 'same_password' ? 'Esa es tu contraseña actual.' : 'No se pudo cambiar: ' + (j.msg || j.message || 'error ' + r.status), true); });
        /* la llave de los datos no cambia: solo se vuelve a envolver con la contraseña nueva */
        return kekOf(pw).then(function (kek) { return keyUpload(kek, sbDKraw, sbDK); }).then(function () { $('nube-chg-pass').value = ''; $('nube-chg').hidden = true; nubeMsg(''); toast('Contraseña cambiada'); });
      }).catch(function () { nubeMsg('No se pudo cambiar ahora. Revisa tu internet.', true); });
    });
    var repSure = false;
    $('nube-replace').addEventListener('click', function () {
      if (!repSure) { repSure = true; this.textContent = 'Sí, reemplazar lo que hay en la nube'; return; }
      repSure = false; this.textContent = 'Usar los datos de este dispositivo';
      var raw = window.MFC.b64(crypto.getRandomValues(new Uint8Array(32))), pw = $('nube-bad-pass').value;
      if (pw.length < 8) { nubeMsg('Escribe tu contraseña actual para cifrar la nube con ella.', true); return; }
      nubeMsg('Reemplazando…');
      sbRest('mf_docs?id=neq._key', { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
        .then(function () { return Promise.all([kekOf(pw), dkImport(raw)]); }).then(function (a) { return keyUpload(a[0], raw, a[1]); }).then(function () { return dkSet(raw); })
        .then(function () { try { localStorage.removeItem(KEY + ':sync'); } catch (e) {} $('nube-bad-pass').value = ''; nubeMsg(''); renderNube(); cloudOn(); toast('Listo. Subiendo los datos de este dispositivo…'); })
        .catch(function () { nubeMsg('No se pudo reemplazar ahora. Revisa tu internet.', true); });
    });
    $('nube-bad-out').addEventListener('click', function () { cloudOut(false); });
    $('nube-login').addEventListener('click', function () { nubeAuth(false); });
    $('nube-signup').addEventListener('click', function () { nubeAuth(true); });
    $('nube-pass').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); nubeAuth(false); } });
    $('nube-now').addEventListener('click', function () { if (pendingChanges()) schedulePush(); else if (sbSnap) { sbSig = ''; sbSnap.tick(true); } toast('Sincronizando…'); });
    $('nube-out').addEventListener('click', function () {
      var t = sbS && sbS.at;
      if (t) sbReq('/auth/v1/logout?scope=local', { method: 'POST' }, t).catch(function () {});
      cloudOut(false);
      toast('Sesión cerrada. Tus datos siguen en este dispositivo');
    });
  }
