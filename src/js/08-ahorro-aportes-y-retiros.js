  /* ---- Ahorro: aportes y retiros ---- */
  var svDir = 'aporte', undoSv = null;
  function svError(msg) {
    var e = $('sv-error');
    e.textContent = msg;
    e.hidden = !msg;
  }
  document.querySelectorAll('[data-dir]').forEach(function (b) {
    b.addEventListener('click', function () {
      svDir = b.getAttribute('data-dir');
      document.querySelectorAll('[data-dir]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      $('sv-submit-text').textContent = svDir === 'aporte' ? 'Guardar aporte' : 'Registrar retiro';
      svError('');
    });
  });
  $('sv-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var amount = r2(num($('sv-monto').value)), date = $('sv-fecha').value;
    if (!isFinite(amount) || amount <= 0) { svError('Escribe un monto mayor que cero.'); $('sv-monto').focus(); return; }
    if (!date) { svError('Elige la fecha del movimiento.'); $('sv-fecha').focus(); return; }
    var gid = $('sv-goal-wrap').hidden ? '' : $('sv-goal').value;
    if (svDir === 'retiro') {
      var l = ledger(), have = gid ? Math.max(0, goalSaved(gid)) : (l.length ? l[l.length - 1].run : 0);
      if (amount > have) { svError('No puedes retirar más de lo que tienes ahorrado' + (gid ? ' en esa meta' : '') + ' (' + fmtFull(have) + ').'); $('sv-monto').focus(); return; }
    }
    svError('');
    var sve = {
      id: 'sv' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      dir: svDir, acc: $('sv-acc').value, amount: amount, cur: state.cur, date: date, note: $('sv-nota').value.trim().slice(0, 60), ts: Date.now()
    };
    if (gid) sve.goal = gid;
    state.savings.push(sve);
    save(state);
    $('sv-monto').value = '';
    $('sv-nota').value = '';
    render();
    toast((svDir === 'aporte' ? 'Aporte guardado: ' : 'Retiro registrado: ') + fmtFull(amount));
    pulseInfo = { cls: 'trio-sav', text: (svDir === 'aporte' ? '+' : '−') + fmtFull(amount) };
    $('sv-monto').focus();
  });
  $('sv-list').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-svdel]');
    if (!b) return;
    var idx = state.savings.findIndex(function (e) { return e.id === b.getAttribute('data-svdel'); });
    if (idx < 0) return;
    undoSv = state.savings.splice(idx, 1)[0];
    save(state);
    render();
    toast('Movimiento de ahorro eliminado', 'Deshacer', function () {
      if (!undoSv) return;
      state.savings.push(undoSv);
      undoSv = null;
      save(state);
      render();
    });
  });

