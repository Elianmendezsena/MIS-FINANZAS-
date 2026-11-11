  /* ---- Nube: cuenta con correo y sincronización (versión instalada, Supabase) ---- */
  var SB = { url: 'https://rujwlbcofywofuifhrqa.supabase.co', key: 'sb_publishable_LtqqdGNErVfs3wFLS5yFMA_Nu8_mPV_' };
  var SBS = 'finanzas-nube', SBD = 'finanzas-nube-pend', sbS = null, sbTimer = null, sbSig = '', sbBusy = false, sbStop = null;
  function cloudMode() { return !(window.claude && window.claude.use); }
  /* Hay cambios locales sin subir: al reconectar se mezclan con la nube en vez de perderse. */
  function cloudDirty(v) { if (v === undefined) return lsGet(SBD, '') === '1'; if (cloudMode() && sbS) lsSet(SBD, v ? '1' : ''); }
  /* La sesión se guarda cifrada si hay PIN. */
  function sbPersist() {
    if (!sbS) { try { localStorage.removeItem(SBS); } catch (e) {} return Promise.resolve(); }
    var txt = JSON.stringify(sbS);
    if (!encKey) { lsSet(SBS, txt); return Promise.resolve(); }
    return window.MFC.seal(encKey, txt, encMeta).then(function (c) { lsSet(SBS, c); }, function () {});
  }
  function sbLoad() {
    var raw = lsGet(SBS, ''), o = null;
    if (!raw) return Promise.resolve(null);
    try { o = JSON.parse(raw); } catch (e) { return Promise.resolve(null); }
    if (o && o.ct) return encKey ? window.MFC.open(encKey, o).then(function (t) { return JSON.parse(t); }, function () { return null; }) : Promise.resolve(null);
    return Promise.resolve(o && o.rt ? o : null);
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
          set: function (body) { return sbRest('mf_docs?on_conflict=user_id,id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { user_id: sbS.uid, id: id, data: body } }); },
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
              if (!alive || pushTimer || pushing) return;
              sbSig = s;
              cb({ docs: rows.map(function (r) { return { id: r.id, exists: true, data: function () { return r.data; } }; }) });
              renderNube();
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
      renderNube();
      if (!sbS) return;
      cloudOn();
    });
  }
  function cloudOn() {
    if (sbStop) sbStop();
    sbSig = ''; synced = {}; canWrite = true;
    col = cloudCol();
    setSync('syncing');
    sbSnap = col.onSnapshot(onRemote, function () { setSync('error'); });
  }
  function cloudOut(expired) {
    if (sbStop) sbStop();
    sbStop = null; col = null; sbS = null; synced = {}; sbSig = '';
    try { localStorage.removeItem(SBS); localStorage.removeItem(KEY + ':sync'); localStorage.removeItem(SBD); } catch (e) {}
    setSync('local');
    renderNube(expired ? 'Tu sesión venció. Entra de nuevo para seguir sincronizando.' : '');
  }
  function nubeMsg(m, bad) { var e = $('nube-msg'); if (!e) return; e.textContent = m || ''; e.hidden = !m; e.className = bad ? 'err' : 'note'; }
  function renderNube(msg) {
    if (!$('nube-card')) return;
    $('nube-in').hidden = !!sbS; $('nube-on').hidden = !sbS;
    $('nube-line').textContent = sbS ? 'Conectada · ' + sbS.email : 'Sin conectar';
    $('nube-state').textContent = sbS ? 'Sesión iniciada como ' + sbS.email + '. Tus datos se guardan en tu cuenta y se sincronizan entre tus dispositivos.' : 'Crea una cuenta o entra para guardar tus datos en la nube y verlos en tu teléfono y tu computadora.';
    if (msg !== undefined) nubeMsg(msg, true);
  }
  function nubeAuth(signup) {
    var em = $('nube-email').value.trim().toLowerCase(), pw = $('nube-pass').value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { nubeMsg('Escribe un correo válido.', true); return; }
    if (pw.length < 8) { nubeMsg('La contraseña debe tener al menos 8 caracteres.', true); return; }
    if (!navigator.onLine) { nubeMsg('No hay conexión a internet.', true); return; }
    nubeMsg(signup ? 'Creando tu cuenta…' : 'Entrando…');
    sbReq(signup ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password', { method: 'POST', body: { email: em, password: pw } }).then(function (r) {
      return r.json().then(function (j) {
        if (r.ok && j.access_token) {
          $('nube-pass').value = '';
          return sbTake(j).then(function () { nubeMsg(''); renderNube(); cloudOn(); toast(signup ? 'Cuenta creada. Subiendo tus datos…' : 'Sesión iniciada. Sincronizando…'); });
        }
        if (r.ok && signup) { nubeMsg('Te envié un correo a ' + em + '. Ábrelo, toca el enlace para confirmar y luego vuelve aquí y toca "Entrar". (Si el enlace abre una página con error, no importa: la cuenta queda confirmada.)'); return; }
        var c = j.error_code || j.code || '', m = j.msg || j.error_description || j.message || '';
        nubeMsg(c === 'invalid_credentials' || /Invalid login/i.test(m) ? 'Correo o contraseña incorrectos.' : c === 'email_not_confirmed' || /not confirmed/i.test(m) ? 'Primero confirma tu correo con el enlace que te envié.' : c === 'user_already_exists' || /already registered/i.test(m) ? 'Ya hay una cuenta con ese correo. Toca "Entrar".' : c === 'weak_password' ? 'Esa contraseña es muy débil. Usa una más larga.' : /rate limit/i.test(m) || r.status === 429 ? 'Demasiados intentos. Espera unos minutos.' : 'No se pudo: ' + (m || 'error ' + r.status), true);
      });
    }).catch(function () { nubeMsg('No se pudo conectar con la nube. Revisa tu internet.', true); });
  }
  if ($('nube-card')) {
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
