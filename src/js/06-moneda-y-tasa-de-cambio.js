  /* ---- Moneda y tasa de cambio ---- */
  function syncCur() {
    document.querySelectorAll('[data-cur]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-cur') === state.cur ? 'true' : 'false');
    });
    $('f-prefix').textContent = SYM[state.cur];
    document.querySelectorAll('[data-sym]').forEach(function (el) { el.textContent = SYM[state.cur]; });
  }
  document.querySelectorAll('[data-cur]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.cur = b.getAttribute('data-cur');
      save(state);
      render();
      updatePreview();
    });
  });

