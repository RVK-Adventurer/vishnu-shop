/*
 * legacy.js — runs ONLY on browsers too old for the modern shop (loaded with "nomodule", Section 24.9).
 * Written in old-style JavaScript on purpose. It shows a friendly notice with a WhatsApp button.
 * The pre-rendered pages still show products and prices, so the catalogue can be read.
 */
(function () {
  'use strict';
  function ready(fn) {
    if (document.readyState !== 'loading') { fn(); } else { document.addEventListener('DOMContentLoaded', fn); }
  }
  ready(function () {
    var waLink = document.querySelector('a[href^="https://wa.me/"]');
    var number = '';
    if (waLink) {
      var m = /wa\.me\/(\d+)/.exec(waLink.getAttribute('href'));
      if (m) { number = m[1]; }
    }
    var title = document.title || '';
    var text = 'Hello! I would like to order: ' + title + ' ' + window.location.href;

    var box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.className = 'notice notice--warning notice--page';
    box.style.cssText = 'display:block;padding:16px;background:#FEF3C7;color:#92400E;font-family:sans-serif;font-size:16px;line-height:1.5;';

    var p = document.createElement('p');
    p.appendChild(document.createTextNode('This browser is too old to place orders here. Please update it, open this page in Chrome or Safari, or order with us on WhatsApp.'));
    box.appendChild(p);

    if (number) {
      var a = document.createElement('a');
      a.href = 'https://wa.me/' + number + '?text=' + encodeURIComponent(text);
      a.appendChild(document.createTextNode('Order on WhatsApp'));
      a.style.cssText = 'display:inline-block;margin-top:8px;padding:10px 16px;background:#128C7E;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;';
      box.appendChild(a);
    }
    document.body.insertBefore(box, document.body.firstChild);

    // Hide controls that need the modern shop (they would do nothing here).
    var selectors = ['[data-quick-add]', '[data-add-to-cart]', '[data-buy-now]', '[data-open-cart]'];
    for (var i = 0; i < selectors.length; i++) {
      var els = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < els.length; j++) { els[j].style.display = 'none'; }
    }
  });
})();
