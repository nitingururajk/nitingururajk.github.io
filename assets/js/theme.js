(function () {
  'use strict';
  // Apply the saved choice or system theme before painting.
  var preference = 'system';
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') preference = saved;
  } catch (_) { /* Follow the system when browser storage is disabled. */ }
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = preference === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preference;
  var favicon = document.querySelector('link[rel="icon"][data-logo-light]');
  if (favicon) favicon.href = document.documentElement.dataset.theme === 'dark' ? favicon.dataset.logoDark : favicon.dataset.logoLight;
})();
