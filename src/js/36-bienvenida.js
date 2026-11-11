  /* ---- Bienvenida ---- */
  function welcomeActive() {
    var real = state.txs.some(function (t) { return !t.ex; }) || state.savings.some(function (e) { return !e.ex; }) || state.transfers.length > 0;
    return !state.welcomed && !real && !(state.cur !== 'DOP' && state.txs.some(function (t) { return t.ex; }));
  }
  function renderWelcome() {
    var el = $('welcome');
    if (!welcomeActive()) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="card p-4 flex flex-col gap-3" style="position:relative"><button type="button" class="icon-btn" data-welcome="done" aria-label="Cerrar la guía" style="position:absolute;top:8px;right:8px"><i data-lucide="x"></i></button><div style="padding-right:36px"><h2 class="text-xl font-bold">Bienvenido a Mis Finanzas</h2>' +
      '<p class="text-sm muted">Tres pasos para dejarla lista.</p></div>' +
      '<button type="button" class="btn-ghost" data-go="cuentas" style="justify-content:flex-start;width:100%">1. Revisa tus cuentas</button>' +
      '<button type="button" class="btn-ghost" data-go="gastos" style="justify-content:flex-start;width:100%">2. Pon un presupuesto del mes</button>' +
      '<button type="button" class="btn-ghost" data-go="registrar" style="justify-content:flex-start;width:100%">3. Registra tu primer movimiento</button>' +
      '<button type="button" class="link-btn" data-welcome="done" style="align-self:flex-start">Ocultar esta guía</button></div>';
  }
  $('welcome').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-welcome]');
    if (!b) return;
    if (b.getAttribute('data-welcome') === 'clear') { var c = document.getElementById('clear-ex'); if (c) c.click(); }
    state.welcomed = true;
    save(state);
    render();
  });

