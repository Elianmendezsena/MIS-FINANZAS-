  /* ---- Tema claro / oscuro ---- */
  var THEME_KEY = 'finanzas-theme';
  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function themeIcon() {
    $('theme-btn').innerHTML = '<i data-lucide="' + (isDark() ? 'sun' : 'moon') + '"></i><span>' + (isDark() ? 'Modo claro' : 'Modo oscuro') + '</span>';
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }
  try { var savedTheme = localStorage.getItem(THEME_KEY); if (savedTheme === 'dark' || savedTheme === 'light') document.documentElement.setAttribute('data-theme', savedTheme); } catch (e) { /* sin almacenamiento */ }
  $('theme-btn').addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* sin almacenamiento */ }
    themeIcon();
  });

