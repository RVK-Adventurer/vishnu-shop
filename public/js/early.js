/*
 * early.js — the only script that runs BEFORE the page is drawn (tiny, no modules, old-browser safe).
 * It applies the owner's banner choices so customers never see a banner flash and then vanish:
 *   <meta name="x-hero" content="FREQUENCY|START|COUNT|KEY">  (home page only, written by the build)
 *   FREQUENCY: ALWAYS (every visit) · SESSION (once per visit) · DAY (once per person per day)
 *   START:     FIRST · RANDOM (a different banner each visit) · NEXT (the next banner each visit)
 * home.js remembers that the banner was seen. Nothing here is sent anywhere.
 */
(function () {
  try {
    var meta = document.querySelector('meta[name="x-hero"]');
    if (!meta) return;
    var p = String(meta.getAttribute('content') || '').split('|');
    var freq = p[0], start = p[1], count = parseInt(p[2], 10) || 0, key = 'hero:' + (p[3] || '');
    var root = document.documentElement;
    var today = '';
    try { today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()); } catch (e) { today = new Date().toDateString(); }
    var hide = false;
    try {
      if (freq === 'DAY') hide = window.localStorage.getItem(key) === today;
      else if (freq === 'SESSION') hide = !!window.sessionStorage.getItem(key);
    } catch (e) { hide = false; }
    if (hide) root.className += ' hero-off';
    if (count > 1 && (start === 'RANDOM' || start === 'NEXT')) {
      var i = 0;
      if (start === 'RANDOM') i = Math.floor(Math.random() * count);
      else {
        try {
          var last = parseInt(window.localStorage.getItem(key + ':i'), 10);
          i = isNaN(last) ? 0 : (last + 1) % count;
          window.localStorage.setItem(key + ':i', String(i));
        } catch (e) { i = 0; }
      }
      if (i > 0) root.setAttribute('data-hero-start', String(i));
    }
  } catch (e) { /* never block the page */ }
})();
