  /* ---- Filtros del historial ---- */
  var FLT = ['h-cat', 'h-acc', 'h-min', 'h-max', 'h-from', 'h-to', 'h-q'];
  FLT.forEach(function (id) {
    ['input', 'change'].forEach(function (name) {
      $(id).addEventListener(name, function () { renderHistory(); refreshIcons(); });
    });
  });
  $('flt-toggle').addEventListener('click', function () {
    var p = $('flt-panel');
    p.hidden = !p.hidden;
    this.setAttribute('aria-expanded', p.hidden ? 'false' : 'true');
  });
  $('flt-clear').addEventListener('click', function () {
    FLT.forEach(function (id) { $(id).value = ''; });
    renderHistory();
    refreshIcons();
  });

  $('breakdown').addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-k]');
    if (!el) return;
    var k = el.getAttribute('data-k'), root = $('breakdown'), svg = root.querySelector('.dn-svg');
    var slice = svg.querySelector('.dn-slice[data-k="' + k + '"]');
    var was = slice.classList.contains('sel');
    root.querySelectorAll('.dn-slice, .dn-pill').forEach(function (x) { x.classList.remove('sel'); });
    var cl = svg.querySelector('.dn-clabel'), ct = svg.querySelector('.dn-ctotal');
    if (!svg._d) svg._d = { l: cl.textContent, t: ct.textContent, f: ct.style.fontSize };
    if (was) {
      cl.textContent = svg._d.l; ct.textContent = svg._d.t; ct.style.fontSize = svg._d.f;
      svg.classList.remove('has-sel');
      $('slice-info').textContent = INFO_DEFAULT;
      return;
    }
    slice.classList.add('sel');
    var cn = slice.getAttribute('data-cat') || '';
    cl.textContent = cn.length > 14 ? cn.slice(0, 13) + '…' : cn;
    ct.textContent = slice.getAttribute('data-pt'); ct.style.fontSize = '16px';
    root.querySelector('.dn-pill[data-k="' + k + '"]').classList.add('sel');
    svg.classList.add('has-sel');
    $('slice-info').innerHTML = esc(el.getAttribute('data-info')) + ' <button type="button" class="link-btn" data-seekind="' + bkKind + '" data-seecat="' + esc(el.getAttribute('data-cat') || '') + '">Ver movimientos<i data-lucide="chevron-right" class="sm"></i></button>';
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  });
  $('slice-info').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-seecat]');
    if (!b) return;
    var cat = b.getAttribute('data-seecat'), kd = b.getAttribute('data-seekind') === 'ingreso' ? 'ingreso' : 'gasto';
    filter = kd;
    document.querySelectorAll('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-filter') === kd ? 'true' : 'false'); });
    setView('historial');
    renderHistory();
    $('h-cat').value = kd + '|' + cat;
    renderHistory();
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  });
  $('breakdown').addEventListener('keydown', function (ev) {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.classList && ev.target.classList.contains('dn-slice')) {
      ev.preventDefault();
      ev.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });

