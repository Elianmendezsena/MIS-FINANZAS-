  /* ---- Gestión de categorías ---- */
  var catKind = 'gasto';
  var editing = null;
  var confirmDel = null;
  var draft = null;

  function usage(k, name) { return state.txs.filter(function (t) { return t.kind === k && t.cat === name; }).length; }
  function nextColor() {
    var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], best = 1, i;
    state.cats.gasto.forEach(function (c) { counts[c.c || 8]++; });
    for (i = 2; i <= 12; i++) if (counts[i] < counts[best]) best = i;
    return best;
  }
  function fallbackFor(k, idx) {
    var list = state.cats[k], pref = k === 'gasto' ? 'Otros gastos' : 'Otros ingresos', f = null;
    list.forEach(function (c, j) { if (j !== idx && c.n === pref) f = c; });
    if (!f) list.forEach(function (c, j) { if (!f && j !== idx) f = c; });
    return f;
  }
  function refreshIcons() { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); }
  function refreshCats() { renderCats(); refreshIcons(); }

  function editorHtml(isNew) {
    var sw = '';
    if (catKind === 'gasto') {
      sw = '<div class="flex flex-col gap-1.5"><p class="lbl">Color</p><div class="swatches" role="group" aria-label="Color de la categoría">';
      for (var n = 1; n <= 12; n++) {
        sw += '<button type="button" class="swatch" data-c="' + n + '" style="background:var(--c' + n + ')" aria-label="' + COLOR_NAMES[n - 1] + '" aria-pressed="' + (draft.c === n) + '"></button>';
      }
      sw += '</div></div>';
    }
    var ic = '<div class="flex flex-col gap-1.5"><p class="lbl">Ícono</p><div class="icons" role="group" aria-label="Ícono de la categoría">' +
      ICONS.map(function (name) {
        return '<button type="button" class="icon-opt" data-i="' + name + '" aria-label="Ícono ' + name + '" title="' + name + '" aria-pressed="' + (draft.i === name) + '"><i data-lucide="' + name + '"></i></button>';
      }).join('') + '</div></div>';
    return '<div class="editor">' +
      '<label class="lbl" for="e-name">' + (isNew ? 'Nombre de la nueva categoría' : 'Nombre') +
        '<input id="e-name" class="field" type="text" maxlength="24" autocomplete="off" placeholder="Ej. Mascotas" value="' + esc(draft.name) + '"></label>' +
      sw + ic +
      '<p id="cat-err" class="err" role="alert" hidden></p>' +
      '<div class="flex flex-wrap gap-2"><button type="button" class="btn-primary" id="save-cat" style="width:auto;padding:0 1.1rem">Guardar</button>' +
      '<button type="button" class="btn-ghost" id="cancel-cat">Cancelar</button></div>' +
    '</div>';
  }

  function renderCats() {
    ['gasto', 'ingreso'].forEach(function (x) { $('ck-' + x).setAttribute('aria-pressed', x === catKind ? 'true' : 'false'); });
    var list = state.cats[catKind];
    var html = '<ul class="cat-list">' + list.map(function (c, i) {
      if (editing === i) return '<li>' + editorHtml(false) + '</li>';
      var col = catKind === 'gasto' ? 'var(--c' + (effColors()[c.n] || c.c || 8) + ')' : 'var(--good)';
      var n = usage(catKind, c.n);
      var row = '<li><div class="flex items-center gap-3">' +
        '<span class="chip" style="color:' + col + ';background:color-mix(in srgb, ' + col + ' 16%, transparent)"><i data-lucide="' + esc(c.i) + '" class="sm"></i></span>' +
        '<div class="min-w-0 grow"><div class="font-semibold" style="overflow-wrap:anywhere">' + esc(c.n) + '</div><div class="note">' + n + (n === 1 ? ' movimiento' : ' movimientos') + '</div></div>' +
        '<button type="button" class="icon-btn neutral" data-cedit="' + i + '" aria-label="Editar categoría ' + esc(c.n) + '"><i data-lucide="pencil"></i></button>' +
        '<button type="button" class="icon-btn" data-cdel="' + i + '" aria-label="Eliminar categoría ' + esc(c.n) + '"><i data-lucide="trash-2"></i></button>' +
      '</div>';
      if (confirmDel === i) {
        var f = fallbackFor(catKind, i);
        if (!f) {
          row += '<div class="confirm"><span>Debe quedar al menos una categoría.</span><button type="button" class="btn-ghost" id="cdel-cancel">Entendido</button></div>';
        } else {
          row += '<div class="confirm"><span>' + (n ? n + (n === 1 ? ' movimiento pasará' : ' movimientos pasarán') + ' a «' + esc(f.n) + '».' : 'Esta categoría no tiene movimientos.') + '</span>' +
            '<span class="flex gap-2"><button type="button" class="btn-ghost btn-danger" data-cconfirm="' + i + '">Eliminar</button><button type="button" class="btn-ghost" id="cdel-cancel">Cancelar</button></span></div>';
        }
      }
      return row + '</li>';
    }).join('') + '</ul>';
    html += editing === 'new'
      ? editorHtml(true)
      : '<div><button type="button" class="btn-ghost" id="add-cat"><i data-lucide="plus" class="sm"></i>Nueva categoría</button></div>';
    $('cats-body').innerHTML = html;
  }

  function syncName() { var el = $('e-name'); if (el && draft) draft.name = el.value; }
  function focusName() { var e = $('e-name'); if (e) { e.focus(); e.select(); } }

  function saveCat() {
    syncName();
    var name = (draft.name || '').trim(), list = state.cats[catKind], err = '';
    if (!name) err = 'Escribe un nombre para la categoría.';
    else if (list.some(function (c, i) { return i !== editing && c.n.toLowerCase() === name.toLowerCase(); })) err = 'Ya existe una categoría con ese nombre.';
    if (err) { var e = $('cat-err'); e.textContent = err; e.hidden = false; $('e-name').focus(); return; }
    var selected = $('f-cat').value, keep = null, msg;
    if (editing === 'new') {
      var c = { n: name, i: draft.i };
      if (catKind === 'gasto') c.c = draft.c;
      list.push(c);
      keep = name;
      msg = 'Categoría agregada: ' + name;
    } else {
      var old = list[editing];
      if (old.n !== name) {
        if (catKind === 'gasto' && old.n !== name) {
          [state.budgets].concat(Object.keys(state.cBud).map(function (k) { return state.cBud[k]; })).forEach(function (m) { if (m && m[old.n]) { m[name] = m[old.n]; delete m[old.n]; } });
        }
        state.txs.forEach(function (t) { if (t.kind === catKind && t.cat === old.n) t.cat = name; });
        if (selected === old.n) selected = name;
      }
      old.n = name;
      old.i = draft.i;
      if (catKind === 'gasto') old.c = draft.c;
      keep = selected;
      msg = 'Categoría actualizada';
    }
    editing = null;
    draft = null;
    save(state);
    fillCats(catKind === kind ? keep : null);
    render();
    toast(msg);
  }

  function deleteCat(i) {
    var list = state.cats[catKind], c = list[i], f = fallbackFor(catKind, i);
    if (!c || !f) return;
    var ck = catKind, moved = state.txs.filter(function (t) { return t.kind === ck && t.cat === c.n; }).map(function (t) { return t.id; });
    state.txs.forEach(function (t) { if (t.kind === catKind && t.cat === c.n) t.cat = f.n; });
    list.splice(i, 1);
    confirmDel = null;
    save(state);
    fillCats();
    render();
    toast('Categoría eliminada: ' + c.n, 'Deshacer', function () {
      state.cats[ck].splice(Math.min(i, state.cats[ck].length), 0, c);
      state.txs.forEach(function (t) { if (moved.indexOf(t.id) >= 0) t.cat = c.n; });
      save(state); fillCats(); render(); refreshIcons();
    });
  }

  function openCats() {
    catKind = kind; editing = null; confirmDel = null; draft = null;
    setView('categorias');
  }

  $('open-cats').addEventListener('click', openCats);
  ['gasto', 'ingreso'].forEach(function (k) {
    $('ck-' + k).addEventListener('click', function () { catKind = k; editing = null; confirmDel = null; draft = null; refreshCats(); });
  });

  $('cats-body').addEventListener('input', function (ev) {
    if (ev.target.id === 'e-name' && draft) draft.name = ev.target.value;
  });
  $('cats-body').addEventListener('keydown', function (ev) {
    if (ev.target.id === 'e-name' && ev.key === 'Enter') { ev.preventDefault(); saveCat(); }
  });
  $('cats-body').addEventListener('click', function (ev) {
    var b = ev.target.closest('button');
    if (!b) return;
    var list = state.cats[catKind];
    if (b.hasAttribute('data-cedit')) {
      var i = +b.getAttribute('data-cedit');
      editing = i; confirmDel = null;
      draft = { name: list[i].n, c: list[i].c || 8, i: list[i].i };
      refreshCats(); focusName();
    } else if (b.hasAttribute('data-cdel')) {
      confirmDel = +b.getAttribute('data-cdel'); editing = null; draft = null;
      refreshCats();
    } else if (b.hasAttribute('data-cconfirm')) {
      deleteCat(+b.getAttribute('data-cconfirm'));
    } else if (b.id === 'cdel-cancel') {
      confirmDel = null; refreshCats();
    } else if (b.id === 'add-cat') {
      editing = 'new'; confirmDel = null;
      draft = { name: '', c: nextColor(), i: 'tag' };
      refreshCats(); focusName();
    } else if (b.hasAttribute('data-c')) {
      syncName(); draft.c = +b.getAttribute('data-c'); refreshCats();
    } else if (b.hasAttribute('data-i')) {
      syncName(); draft.i = b.getAttribute('data-i'); refreshCats();
    } else if (b.id === 'save-cat') {
      saveCat();
    } else if (b.id === 'cancel-cat') {
      editing = null; draft = null; refreshCats();
    }
  });

