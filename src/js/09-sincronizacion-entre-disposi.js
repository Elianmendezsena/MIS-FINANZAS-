  /* ---- Sincronización entre dispositivos (espacio privado de tu cuenta) ---- */
  var col = null, canWrite = true, synced = {}, pushTimer = null, pushing = false, pushAgain = false, retries = 0;

  function setSync(s) {
    syncStatus = s;
    var pill = $('sync-pill');
    var look = {
      ok: ['pill pill-good', 'Sincronizado en tu cuenta'],
      nube: ['pill pill-none', 'Sin nube: solo en este dispositivo'],
      syncing: ['pill pill-warn', 'Sincronizando…'],
      error: ['pill pill-bad', 'Sin sincronizar'],
      readonly: ['pill pill-none', 'Solo se guarda en este dispositivo'],
      local: ['pill pill-none', 'Solo en este dispositivo']
    }[s] || ['pill pill-none', 'Solo en este dispositivo'];
    if (s !== 'syncing') endSkel();
    pill.className = look[0];
    pill.textContent = look[1];
    updateFoot();
  }
  function updateFoot() {
    var foot = $('foot');
    if (!foot) return;
    var msg = {
      ok: 'Tus movimientos se guardan en tu cuenta y se ven igual en tu celular y en tu computadora.',
      syncing: 'Sincronizando tus movimientos con tu cuenta…',
      error: 'No se pudo sincronizar ahora. Tus movimientos siguen guardados en este navegador y se volverá a intentar.',
      readonly: 'Con tu nivel de acceso a esta página no se pueden guardar datos en la cuenta. Se guardan solo en este navegador.',
      local: 'Tus movimientos se guardan en este navegador y siguen ahí al recargar la página.'
    }[syncStatus || 'local'];
    if (!storageOk && syncStatus !== 'ok' && syncStatus !== 'syncing') msg = 'Este navegador no permite guardar datos. Lo que registres se perderá al recargar la página.';
    foot.textContent = msg;
  }

  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (v && typeof v === 'object') {
      return '{' + Object.keys(v).filter(function (k) { return v[k] !== undefined; }).sort()
        .map(function (k) { return JSON.stringify(k) + ':' + stable(v[k]); }).join(',') + '}';
    }
    return JSON.stringify(v);
  }
  function plain(o) { return JSON.parse(JSON.stringify(o)); }
  function settingsDoc() { return { cur: state.cur, rate: state.rate, cats: state.cats, goal: state.goal || null, budgets: state.budgets || {}, mBud: state.mBud || {}, cBud: state.cBud || {}, plan: state.plan || [], accounts: state.accounts, monthBudget: state.monthBudget || null, tpl: state.tpl || [], goals: state.goals || [], welcomed: !!state.welcomed, pin: encKey ? '' : pinLegacy(), pinAt: encKey ? 0 : pinAtVal(), seeded: true }; }
  function wantedMap() {
    var w = {};
    state.txs.forEach(function (t) { w['tx-' + t.id] = stable(t); });
    state.savings.forEach(function (e) { w['sv-' + e.id] = stable(e); });
    state.transfers.forEach(function (t) { w['tf-' + t.id] = stable(t); });
    w.settings = stable(settingsDoc());
    return w;
  }
  function pendingChanges() {
    var w = wantedMap(), k;
    for (k in w) if (synced[k] !== w[k]) return true;
    for (k in synced) if (!(k in w)) return true;
    return false;
  }
  function hadSync() { try { return localStorage.getItem(KEY + ':sync') === '1' && !(cloudMode() && cloudDirty()); } catch (e) { return false; } }
  function markSync() { endSkel(); try { localStorage.setItem(KEY + ':sync', '1'); } catch (e) { /* sin almacenamiento local */ } }

  function schedulePush() {
    if (pendingOrOff()) cloudDirty(true);
    avSoon();
    if (!col || !canWrite) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, 400);
  }
  async function pushNow() {
    pushTimer = null;
    if (!col || !canWrite) return;
    if (pushing) { pushAgain = true; return; }
    pushing = true;
    try {
      var w = wantedMap(), jobs = [], k, byKey = {};
      state.txs.forEach(function (t) { byKey['tx-' + t.id] = t; });
      state.savings.forEach(function (e) { byKey['sv-' + e.id] = e; });
      state.transfers.forEach(function (t) { byKey['tf-' + t.id] = t; });
      for (k in w) if (synced[k] !== w[k]) jobs.push({ k: k, s: w[k], body: k === 'settings' ? settingsDoc() : byKey[k] });
      for (k in synced) if (!(k in w)) jobs.push({ k: k, del: true });
      for (var i = 0; i < jobs.length; i += 6) {
        await Promise.all(jobs.slice(i, i + 6).map(function (j) {
          var ref = col.doc(j.k);
          return (j.del ? ref.delete() : ref.set(plain(j.body))).then(function () {
            if (j.del) delete synced[j.k]; else synced[j.k] = j.s;
          });
        }));
      }
      retries = 0;
      cloudDirty(false);
      setSync('ok');
    } catch (e) {
      var code = e && e.code;
      if (code === 'invalid_argument' || code === 'revoked') { canWrite = false; setSync('readonly'); }
      else {
        setSync('error');
        if (retries < 3) { retries++; setTimeout(schedulePush, 8000 * retries); }
      }
    } finally {
      pushing = false;
      if (pushAgain) { pushAgain = false; schedulePush(); }
    }
  }

  function onRemote(snap) {
    if (snap.metadata && snap.metadata.fromCache) return;
    if (pushTimer || pushing) return;
    var docs = {}, ids = [];
    snap.docs.forEach(function (d) { if (d.exists) { docs[d.id] = plain(d.data()); ids.push(d.id); } });
    if (!ids.length) {
      synced = {};
      markSync();
      setSync('syncing');
      schedulePush();
      return;
    }
    var remoteTxs = [], seen = {};
    ids.forEach(function (id) {
      var d = docs[id];
      if (id.indexOf('tx-') === 0 && d && d.id && (d.kind === 'ingreso' || d.kind === 'gasto') && d.cat && d.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(d.date || '')) {
        remoteTxs.push(d);
        seen[d.id] = true;
      }
    });
    var remoteSv = [], seenSv = {};
    ids.forEach(function (id) {
      var d = docs[id];
      if (id.indexOf('sv-') === 0 && d && d.id && (d.dir === 'aporte' || d.dir === 'retiro') && d.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(d.date || '')) {
        remoteSv.push(d);
        seenSv[d.id] = true;
      }
    });
    var remoteTf = [], seenTf = {};
    ids.forEach(function (id) {
      var d = docs[id];
      if (id.indexOf('tf-') === 0 && d && d.id && d.from && d.to && d.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(d.date || '')) {
        remoteTf.push(d);
        seenTf[d.id] = true;
      }
    });
    var st = docs.settings, next = { cur: state.cur, rate: state.rate, cats: state.cats, goal: state.goal, budgets: state.budgets, mBud: state.mBud, cBud: state.cBud, plan: state.plan, accounts: state.accounts, monthBudget: state.monthBudget, tpl: state.tpl, goals: state.goals, welcomed: state.welcomed };
    if (st) {
      if (st.cur === 'USD' || st.cur === 'DOP') next.cur = st.cur;
      if (st.rate > 0) next.rate = st.rate;
      if (st.cats && Array.isArray(st.cats.gasto) && Array.isArray(st.cats.ingreso)) next.cats = st.cats;
      if (st.budgets && typeof st.budgets === 'object') next.budgets = st.budgets;
      if (st.mBud && typeof st.mBud === 'object') next.mBud = st.mBud;
      if (st.cBud && typeof st.cBud === 'object') next.cBud = st.cBud;
      if (Array.isArray(st.plan)) next.plan = st.plan;
      if ('goal' in st) next.goal = st.goal && st.goal.amount > 0 ? st.goal : null;
      if (Array.isArray(st.accounts) && st.accounts.length) next.accounts = st.accounts;
      if ('monthBudget' in st) next.monthBudget = st.monthBudget && st.monthBudget.amount > 0 ? st.monthBudget : null;
      if (Array.isArray(st.tpl)) next.tpl = st.tpl;
      if (Array.isArray(st.goals)) next.goals = st.goals;
      if (st.welcomed) next.welcomed = true;
    }
    if (st && 'pinAt' in st && !encKey && st.pinAt > 0) {
      var la = pinAtVal();
      if (st.pinAt > la || (!pinLegacy() && st.pin && la === 0)) { applyRemotePin(st.pin || '', st.pinAt || 0); if (typeof renderSettings === 'function') renderSettings(); }
    }
    var txs = remoteTxs, svs = remoteSv, tfs = remoteTf;
    if (!hadSync()) {
      state.transfers.forEach(function (t) { if (!seenTf[t.id]) tfs.push(clone(t)); });
      state.txs.forEach(function (t) { if (!seen[t.id] && !t.ex) txs.push(clone(t)); });
      state.savings.forEach(function (e) { if (!seenSv[e.id] && !e.ex) svs.push(clone(e)); });
    }
    var map = {};
    ids.forEach(function (id) { map[id] = stable(docs[id]); });
    synced = map;
    var byId = function (a, b) { return a.id < b.id ? -1 : 1; };
    var before = stable({ t: state.txs.slice().sort(byId), s: state.savings.slice().sort(byId), c: state.cur, r: state.rate, k: state.cats, g: state.goal, b: state.budgets, mb: state.mBud, cb: state.cBud, pl: state.plan, f: state.transfers.slice().sort(byId), a: state.accounts, m: state.monthBudget, p: state.tpl, gl: state.goals, w: state.welcomed });
    var after = stable({ t: txs.slice().sort(byId), s: svs.slice().sort(byId), c: next.cur, r: next.rate, k: next.cats, g: next.goal, b: next.budgets, f: tfs.slice().sort(byId), a: next.accounts, mb: next.mBud, cb: next.cBud, pl: next.plan, m: next.monthBudget, p: next.tpl, gl: next.goals, w: next.welcomed });
    markSync();
    if (before !== after) {
      state.txs = txs;
      state.savings = svs;
      state.cur = next.cur;
      state.rate = next.rate;
      state.cats = next.cats;
      state.goal = next.goal;
      state.budgets = next.budgets;
      state.mBud = next.mBud;
      state.cBud = next.cBud;
      state.plan = next.plan;
      state.transfers = tfs;
      state.accounts = next.accounts;
      state.monthBudget = next.monthBudget;
      state.tpl = next.tpl;
      state.goals = next.goals;
      state.welcomed = next.welcomed;
      genRecurring();
      planAuto();
      save(state);
      fillCats();
      render();
    }
    if (pendingChanges()) { setSync('syncing'); schedulePush(); } else { cloudDirty(false); setSync('ok'); }
  }
  function pendingOrOff() { return !col || pendingChanges(); }

  async function initSync() {
    try {
      if (!window.claude || !window.claude.use) { cloudStart(); return; }
      cloudStart();
      var res = await Promise.all([window.claude.use('user'), window.claude.use('db')]);
      var u = res[0], db = res[1];
      if (!u || !db) return;
      var id = await u.id();
      if (!id) return;
      col = db.collection('data/users/' + id);
      setSync('syncing');
      if (!hadSync()) startSkel();
      col.onSnapshot(onRemote, function () { setSync('error'); });
    } catch (e) {
      col = null;
      setSync('local');
    }
  }

