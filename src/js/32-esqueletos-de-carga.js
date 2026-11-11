  /* ---- Esqueletos de carga ---- */
  var skelT = null;
  function startSkel() { $('app').classList.add('skel'); clearTimeout(skelT); skelT = setTimeout(endSkel, 8000); }
  function endSkel() { clearTimeout(skelT); var a = $('app'); if (a) a.classList.remove('skel'); }

