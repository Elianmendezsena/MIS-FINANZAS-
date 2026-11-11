  if (!dl) {
    /* Versión instalada (sin Claude): compartir/guardar con el navegador */
    dl = { save: function (o) {
      return new Promise(function (res, rej) {
        var ext = (o.filename.split('.').pop() || '').toLowerCase();
        var type = ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : ext === 'pdf' ? 'application/pdf' : ext === 'csv' ? 'text/csv;charset=utf-8' : ext === 'json' ? 'application/json' : 'application/octet-stream';
        var blob = new Blob([o.data], { type: type });
        function anchor() {
          var u = URL.createObjectURL(blob), a = document.createElement('a');
          a.href = u; a.download = o.filename; document.body.appendChild(a); a.click();
          setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 4000); res();
        }
        try {
          var f = new File([blob], o.filename, { type: type });
          if (navigator.canShare && navigator.canShare({ files: [f] })) {
            navigator.share({ files: [f], title: o.filename }).then(res, function (e) {
              if (e && e.name === 'AbortError') rej({ code: 'declined' }); else anchor();
            });
            return;
          }
        } catch (e) { /* sigue al respaldo */ }
        anchor();
      });
    } };
  }
  if ('serviceWorker' in navigator) {
    var swHad = !!navigator.serviceWorker.controller, lastTouch = Date.now(), pendingReload = false;
    ['pointerdown', 'keydown', 'input'].forEach(function (n) { document.addEventListener(n, function () { lastTouch = Date.now(); }, true); });
    var typing = function () { var a = document.activeElement; return !!a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName); };
    document.addEventListener('visibilitychange', function () { if (!document.hidden && pendingReload && !typing()) location.reload(); });
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!swHad || document.getElementById('upd-bar')) return;
      /* Versión nueva lista: si no estás escribiendo, se recarga sola */
      if (document.hidden) { pendingReload = true; return; }
      if (!typing() && Date.now() - lastTouch > 4000) { location.reload(); return; }
      var bar = document.createElement('div'); bar.id = 'upd-bar'; bar.setAttribute('role', 'status');
      bar.innerHTML = '<span>Hay una versión nueva</span><button type="button">Actualizar</button>';
      bar.querySelector('button').addEventListener('click', function () { location.reload(); });
      document.body.appendChild(bar);
    });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        reg.update().catch(function () {});
        document.addEventListener('visibilitychange', function () { if (!document.hidden) reg.update().catch(function () {}); });
      }).catch(function () {});
    });
  }
