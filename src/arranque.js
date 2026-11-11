/* Arranque: sin cifrado la app inicia de una vez; con cifrado, primero el PIN (o Face ID). */
(function () {
  var g = function (id) { return document.getElementById(id); };
  if (!window.MFC.rec() || !window.MFC.ok()) { window.MF_MAIN(); return; }
  var sp = g('splash'), lock = g('lock'), form = g('lock-form'), inp = g('lock-in'), err = g('lock-err'), bio = g('lock-bio'), fbtn = g('lock-forgot-btn'), fbox = g('lock-forgot'), word = g('lock-word'), reset = g('lock-reset'), busy = false;
  if (sp) sp.style.display = 'none';
  var say = function (m) { err.textContent = m; err.hidden = !m; };
  var bioId = ''; try { bioId = localStorage.getItem('finanzas-bio') || ''; } catch (e) {}
  lock.hidden = false; say(''); fbox.hidden = true;
  fbox.querySelector('p').textContent = 'Tus datos están cifrados con el PIN y sin él no se pueden leer. Si lo olvidaste, escribe BORRAR para borrar los datos de este dispositivo y empezar de nuevo. Luego podrás recuperarlos desde la nube o un respaldo.';
  reset.textContent = 'Borrar datos de este dispositivo';
  bio.hidden = !(bioId && window.PublicKeyCredential);
  if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  setTimeout(function () { inp.focus(); }, 0);
  function enter(r) {
    window.__mf = r;
    form.removeEventListener('submit', onSub, true); bio.removeEventListener('click', onBio, true); fbtn.removeEventListener('click', onForgot, true); reset.removeEventListener('click', onReset, true);
    fbox.hidden = true; lock.hidden = true; inp.value = ''; say('');
    if (sp) sp.style.display = '';
    window.MF_MAIN();
  }
  function onSub(ev) {
    ev.preventDefault(); ev.stopImmediatePropagation();
    if (busy || !inp.value) return;
    busy = true; say('');
    window.MFC.tryPin(inp.value).then(enter, function (e) { say(e.msg); inp.value = ''; }).then(function () { busy = false; });
  }
  function onBio(ev) {
    ev.stopImmediatePropagation();
    var s = bioId.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: window.MFC.ub64(s) }], userVerification: 'required', timeout: 60000 } })
      .then(function () { return window.MFC.openWithStoredKey(); }).then(enter, function () { say('No se pudo verificar. Usa tu PIN.'); });
  }
  function onForgot(ev) { ev.stopImmediatePropagation(); fbox.hidden = !fbox.hidden; }
  function onReset(ev) {
    ev.stopImmediatePropagation();
    if (word.value.trim().toUpperCase() !== 'BORRAR') { say('Escribe BORRAR para confirmar.'); return; }
    window.MFC.wipe().then(function () { location.reload(); });
  }
  form.addEventListener('submit', onSub, true); bio.addEventListener('click', onBio, true); fbtn.addEventListener('click', onForgot, true); reset.addEventListener('click', onReset, true);
})();
