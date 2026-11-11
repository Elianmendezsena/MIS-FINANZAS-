  /* ---- Deslizar en el historial ---- */
  var rsw = null, lpT = null, lpAt = 0, rsRow = null, rsAt = 0;
  function rowSheet(open, row) {
    var box = $('rowsheet');
    if (!open) { box.hidden = true; rsRow = null; return; }
    rsRow = row; rsAt = Date.now();
    var nm = row.querySelector('.hmain .font-semibold'), am = row.querySelector('.hamt');
    $('rs-title').textContent = (nm ? nm.textContent : '') + (am ? ' · ' + am.textContent : '');
    $('rs-collect').hidden = !row.querySelector('[data-collect]');
    box.hidden = false;
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    var f = box.querySelector('.sheet-item:not([hidden])'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
  }
  function lpFire(row) { lpAt = Date.now(); vib(15); rowSheet(true, row); }
  $('rowsheet').addEventListener('click', function (ev) {
    if (Date.now() - rsAt < 450) return;
    var b = ev.target.closest('[data-rs]'), row = rsRow;
    if (!b) { if (ev.target === $('rowsheet')) rowSheet(false); return; }
    var k = b.getAttribute('data-rs');
    rowSheet(false);
    if (k === 'close' || !row) return;
    var sel = { edit: '[data-edit]', dup: '[data-dup]', collect: '[data-collect]', del: '[data-del]' }[k];
    var t = sel && row.querySelector(sel);
    if (t) t.click();
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !$('rowsheet').hidden) rowSheet(false); });
  $('hist').addEventListener('contextmenu', function (ev) {
    var row = ev.target.closest('.hrow');
    if (!row) return;
    ev.preventDefault();
    if (!$('rowsheet').hidden) return;
    lpAt = Date.now();
    rowSheet(true, row);
  });
  $('hist').addEventListener('click', function (ev) {
    if (Date.now() - lpAt < 700) return;
    if (ev.target.closest('button')) return;
    var row = ev.target.closest('.hrow');
    if (row) row.classList.toggle('open');
  });
  $('hist').addEventListener('touchstart', function (ev) {
    var row = ev.target.closest('.hrow');
    if (!row || ev.touches.length !== 1 || ev.target.closest('button')) { rsw = null; return; }
    rsw = { row: row, x: ev.touches[0].clientX, y: ev.touches[0].clientY, dx: 0, lock: false, long: false };
    clearTimeout(lpT);
    lpT = setTimeout(function () { if (rsw && !rsw.lock && rsw.row === row) { rsw.long = true; lpFire(row); } }, 520);
  }, { passive: true });
  $('hist').addEventListener('touchmove', function (ev) {
    if (!rsw) return;
    var dx = ev.touches[0].clientX - rsw.x, dy = ev.touches[0].clientY - rsw.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) clearTimeout(lpT);
    if (rsw.long) return;
    if (!rsw.lock) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { rsw = null; return; }
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) rsw.lock = true;
    }
    if (rsw.lock) {
      rsw.dx = dx;
      rsw.row.style.transform = 'translateX(' + Math.max(-110, Math.min(110, dx)) + 'px)';
      rsw.row.style.background = dx < 0 ? 'var(--bad-bg)' : 'var(--good-bg)';
    }
  }, { passive: true });
  $('hist').addEventListener('touchend', function () {
    clearTimeout(lpT);
    if (!rsw) return;
    if (rsw.long) { rsw = null; return; }
    var row = rsw.row, dx = rsw.dx, lock = rsw.lock;
    row.style.transform = '';
    row.style.background = '';
    rsw = null;
    if (!lock || Math.abs(dx) < 80) return;
    if (dx < 0) { var del = row.querySelector('[data-del]'); if (del) del.click(); }
    else { var ed = row.querySelector('[data-edit]'); if (ed) ed.click(); }
  });
  $('hist').addEventListener('touchcancel', function () {
    clearTimeout(lpT);
    if (rsw) { rsw.row.style.transform = ''; rsw.row.style.background = ''; rsw = null; }
  });

