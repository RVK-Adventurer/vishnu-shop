/**
 * pwa.js — installable app + offline support (Section 10.11):
 *  - registers the service worker,
 *  - shows "Store updated — Refresh" when a newer version of the shop or catalogue arrives (Section 9.6),
 *  - shows "You're offline — showing saved pages" while the connection is down.
 */

import { meta, $ } from './state.js';
import { toast } from './ui/toast.js';
import { t } from './i18n.js';
import { notice } from './templates.js';

let updateShown = false;

function offerRefresh() {
  if (updateShown) return;
  updateShown = true;
  toast(t('store.updated'), { action: t('store.refresh'), onAction: () => location.reload(), timeout: 0 });
}

function showOffline(offline) {
  const slot = $('[data-notices]');
  if (!slot) return;
  const existing = slot.querySelector('[data-offline-notice]');
  if (offline && !existing) {
    const div = document.createElement('div');
    div.setAttribute('data-offline-notice', '');
    div.innerHTML = notice('info', t('offline.banner')).toString().replace('class="notice', 'class="notice notice--page');
    slot.prepend(div);
  } else if (!offline && existing) {
    existing.remove();
  }
}

export function initPwa() {
  window.addEventListener('offline', () => showOffline(true));
  window.addEventListener('online', () => showOffline(false));
  if (navigator.onLine === false) showOffline(true);

  if (!('serviceWorker' in navigator)) return;
  const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!secure) return;

  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => { /* the shop works without it */ });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) offerRefresh();
  });
  navigator.serviceWorker.addEventListener('message', (e) => {
    const data = e.data || {};
    if (data.type === 'catalog-version' && data.version && meta('x-catalog-version') && data.version !== meta('x-catalog-version')) {
      offerRefresh();
    }
  });
}
