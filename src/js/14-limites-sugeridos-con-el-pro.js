  /* ---- Límites sugeridos con el promedio ---- */
  $('bud-avg').addEventListener('click', function () {
    var y = +view.slice(0, 4), m = +view.slice(5, 7) - 1, tot = {}, used = 0, i;
    for (i = 1; i <= 3; i++) {
      var map = expByCat(toKey(new Date(y, m - i, 1))), has = false;
      Object.keys(map).forEach(function (c) { tot[c] = (tot[c] || 0) + map[c]; has = true; });
      if (has) used++;
    }
    if (!used) { toast('Aún no hay meses anteriores con gastos para promediar'); return; }
    var cur = limMap(view).m, add = {};
    Object.keys(tot).forEach(function (c) {
      if (cur[c] && cur[c].amount > 0) return;
      if (!state.cats.gasto.some(function (x) { return x.n === c; })) return;
      var a = Math.round(tot[c] / used / 50) * 50;
      if (a > 0) add[c] = a;
    });
    var keys = Object.keys(add);
    if (!keys.length) { toast('Ya tienes límite en todas las categorías donde gastas'); return; }
    var mk = view, own = state.cBud[mk] !== undefined, before = own ? clone(state.cBud[mk]) : null;
    lmEdit(function (mm) { keys.forEach(function (c) { mm[c] = { amount: add[c], cur: state.cur }; }); }, mk);
    save(state); render();
    toast(keys.length + (keys.length === 1 ? ' límite sugerido' : ' límites sugeridos') + ' (promedio de ' + used + (used === 1 ? ' mes' : ' meses') + ')', 'Deshacer', function () {
      if (own) state.cBud[mk] = before; else delete state.cBud[mk];
      save(state); render();
    });
  });

