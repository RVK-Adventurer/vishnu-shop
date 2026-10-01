/**
 * pages/offline.js — the "You're offline" page: Retry button and the products this phone has
 * viewed recently (their pages are usually saved, so they still open).
 */

import { loadCatalog, recentIds } from '../catalog.js';
import { productCard } from '../templates.js';
import { html } from '../html.js';
import { t } from '../i18n.js';
import { settings } from '../settings.js';
import { setHtml, $ } from '../state.js';

export async function init() {
  const retry = $('[data-retry]');
  if (retry) retry.addEventListener('click', () => location.reload());
  window.addEventListener('online', () => location.reload());
  const slot = $('[data-offline-recent]');
  const ids = recentIds();
  if (!slot || !ids.length) return;
  const cat = await loadCatalog();
  const items = ids.map((id) => cat.byId[id]).filter(Boolean).slice(0, 8);
  if (!items.length) return;
  const ctx = { s: settings(), t, cat, now: new Date() };
  setHtml(slot, html`<section class="row" aria-labelledby="off-recent"><div class="row__head"><h2 class="row__title" id="off-recent">${t('offline.recent')}</h2></div>
    <div class="row__track">${items.map((p) => productCard(p, ctx))}</div></section>`);
}
