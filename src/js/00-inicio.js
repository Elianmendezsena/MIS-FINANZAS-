window.MF_MAIN = function () {
  var KEY = 'finanzas-personales-v1';
  /* Con cifrado activo, los datos llegan ya descifrados desde el arranque y se guardan cifrados. */
  var encKey = window.__mf ? window.__mf.key : null, encMeta = window.__mf ? window.__mf.meta : null, encChain = Promise.resolve();
  var encPlain = window.__mf ? window.__mf.plain : null;
  if (window.__mf) window.__mf.plain = null;
  function encWrite(text) {
    var k = encKey, m = encMeta;
    encChain = encChain.then(function () { return window.MFC.seal(k, text, m); }).then(function (out) { if (encKey === k) localStorage.setItem(window.MFC.ENC, out); })
      .catch(function () { storageOk = false; updateFoot(); });
    return encChain;
  }
  var DEFAULT_CATS = {
    gasto: [
      { n: 'Alquiler', i: 'house', c: 1 },
      { n: 'Comida', i: 'utensils', c: 2 },
      { n: 'Transporte', i: 'bus', c: 3 },
      { n: 'Ocio', i: 'clapperboard', c: 4 },
      { n: 'Servicios', i: 'zap', c: 5 },
      { n: 'Salud', i: 'heart-pulse', c: 6 },
      { n: 'Educación', i: 'graduation-cap', c: 7 },
      { n: 'Otros gastos', i: 'ellipsis', c: 8 }
    ],
    ingreso: [
      { n: 'Salario', i: 'briefcase' },
      { n: 'Negocio', i: 'store' },
      { n: 'Otros ingresos', i: 'circle-dollar-sign' }
    ]
  };
  var GOAL = 20;
  var COLOR_NAMES = ['Azul', 'Naranja', 'Verde azulado', 'Violeta', 'Rosa', 'Verde', 'Celeste', 'Gris', 'Turquesa', 'Dorado', 'Índigo', 'Marrón'];
  var ICONS = ['house', 'utensils', 'bus', 'fuel', 'clapperboard', 'zap', 'wifi', 'phone', 'heart-pulse', 'graduation-cap',
    'shopping-cart', 'shirt', 'plane', 'gift', 'dumbbell', 'paw-print', 'baby', 'coffee', 'laptop', 'landmark',
    'briefcase', 'store', 'hand-coins', 'piggy-bank', 'circle-dollar-sign', 'ellipsis', 'tag',
    'car', 'bike', 'truck', 'ship', 'wrench', 'hammer', 'scissors', 'book', 'music', 'gamepad-2', 'camera', 'tv', 'smartphone', 'wallet', 'credit-card', 'receipt',
    'banknote', 'percent', 'trending-up', 'building-2', 'bed', 'bath', 'droplets', 'flame', 'sprout', 'pizza', 'beer', 'wine', 'pill', 'stethoscope', 'glasses',
    'gem', 'crown', 'heart', 'star', 'umbrella', 'handshake', 'users', 'ticket', 'popcorn', 'shopping-bag', 'package', 'church', 'school'];
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var $ = function (id) { return document.getElementById(id); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var r2 = function (n) { return Math.round(n * 100) / 100; };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  };
  var SYM = { DOP: 'RD$', USD: 'US$' };
  var MF = {};
  ['DOP', 'USD'].forEach(function (c) {
    MF[c] = {
      0: new Intl.NumberFormat('es-DO', { style: 'currency', currency: c, minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      2: new Intl.NumberFormat('es-DO', { style: 'currency', currency: c, minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };
  });
  var fmt = function (n, c) { c = c || state.cur; return Number.isInteger(n) ? MF[c][0].format(n) : MF[c][2].format(n); };
  var fmtFull = function (n, c) { return MF[c || state.cur][2].format(n); };

  var storageOk = true;
  var syncStatus = 'local';
  function toKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function parseDate(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }

  function seed() {
    var now = new Date(), y = now.getFullYear(), m = now.getMonth(), td = now.getDate();
    var mk = function (off, day) {
      var d = new Date(y, m + off, 1);
      var last = new Date(y, m + off + 1, 0).getDate();
      var dd = Math.min(day, off === 0 ? td : last);
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(dd);
    };
    return {
      seeded: true,
      cur: 'DOP',
      rate: 60,
      savings: [],
      cats: clone(DEFAULT_CATS),
      txs: []
    };
  }

  function load() {
    try {
      var raw = encPlain || localStorage.getItem(KEY);
      encPlain = null;
      if (raw) {
        var d = JSON.parse(raw);
        if (d && Array.isArray(d.txs)) {
          if (!d.cats || !Array.isArray(d.cats.gasto) || !Array.isArray(d.cats.ingreso)) d.cats = clone(DEFAULT_CATS);
          if (!Array.isArray(d.savings)) d.savings = [];
          d.cur = d.cur === 'USD' ? 'USD' : 'DOP';
          if (!(d.rate > 0)) d.rate = 60;
          return d;
        }
      }
    } catch (e) { storageOk = false; }
    var s = seed();
    save(s);
    return s;
  }
  function save(s) {
    if (encKey) encWrite(JSON.stringify(s));
    else {
      try { localStorage.setItem(KEY, JSON.stringify(s)); }
      catch (e) { storageOk = false; }
    }
    updateFoot();
    schedulePush();
  }

  var state = load();
  if (!state.budgets || typeof state.budgets !== 'object') state.budgets = {};
  if (!state.goal) state.goal = null;
  if (!state.monthBudget) state.monthBudget = null;
  if (!Array.isArray(state.plan)) state.plan = [];
  if (!state.mBud || typeof state.mBud !== 'object') state.mBud = {};
  if (!state.cBud || typeof state.cBud !== 'object') state.cBud = {};
  state.welcomed = !!state.welcomed;
  if (!Array.isArray(state.tpl)) state.tpl = [];
  if (!Array.isArray(state.goals)) state.goals = [];
  if (!Array.isArray(state.trash)) state.trash = [];
  state.trash = state.trash.filter(function (x) { return x && x.tx && x.tx.id && Date.now() - x.at < 30 * 864e5; });
  if (!Array.isArray(state.transfers)) state.transfers = [];
  if (!Array.isArray(state.accounts) || !state.accounts.length) state.accounts = [{ id: 'a1', n: 'Efectivo' }, { id: 'a2', n: 'Banco' }, { id: 'a3', n: 'Tarjeta' }];
  var kind = 'gasto';
  var pctMode = 10;
  var filter = 'all', freshId = null, lastSparkKey = '';
  var view = toKey(new Date());
  var undoBuf = null;
  var toastTimer = null;

  /* Si dos categorías de gasto tienen el mismo color, la segunda recibe uno libre (hay 12). */
  function effColors() {
    var used = {}, out = {}, list = state.cats.gasto;
    list.forEach(function (c) { var n = c.c || 8; if (!used[n]) { used[n] = 1; out[c.n] = n; } else out[c.n] = 0; });
    list.forEach(function (c) {
      if (out[c.n]) return;
      var k;
      for (k = 1; k <= 12; k++) if (!used[k]) break;
      if (k > 12) k = c.c || 8;
      used[k] = 1; out[c.n] = k;
    });
    return out;
  }
  function catInfo(k, name) {
    var list = state.cats[k];
    for (var i = 0; i < list.length; i++) if (list[i].n === name) return k === 'gasto' ? { n: list[i].n, i: list[i].i, c: effColors()[name] || list[i].c } : list[i];
    return { n: name, i: 'tag', c: 8 };
  }
  function catColor(t) {
    return t.kind === 'ingreso' ? 'var(--good)' : 'var(--c' + (catInfo('gasto', t.cat).c || 8) + ')';
  }
  /* Monto del movimiento; las monedas no se mezclan: solo cuenta la que estás usando. */
  function val(t) {
    var c = t.cur || 'DOP';
    return c === state.cur ? t.amount : 0;
  }
  function inCur(t) { return (t.cur || 'DOP') === state.cur; }
  function sum(arr) { return r2(arr.reduce(function (a, t) { return a + val(t); }, 0)); }
  function monthTxs() { return state.txs.filter(function (t) { return inCur(t) && t.date.slice(0, 7) === view; }); }

  function monthLabel() {
    var p = view.split('-');
    var s = new Date(+p[0], +p[1] - 1, 1).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function shiftMonth(n) {
    var p = view.split('-');
    view = toKey(new Date(+p[0], +p[1] - 1 + n, 1));
    monthAnim(n);
    render();
  }

