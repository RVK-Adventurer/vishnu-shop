/**
 * app.js — starts the storefront on every page. Loads the shop's words and settings, wires the shared
 * parts (header search, cart drawer, menus, dialogs, quick-add), then hands over to the page's own
 * controller (router.js). Nothing here blocks the first paint: the page is already complete HTML.
 */

import { loadStrings } from './i18n.js';
import { loadSettings, refreshStoreState, settings } from './settings.js';
import { setBase } from './templates.js';
import { initSchedules } from './ui/schedule.js';
import { initPromos } from './ui/promo.js';
import { initRows } from './ui/rows.js';
import { session } from './state.js';
import { initDialogs } from './ui/dialog.js';
import { initDrawers } from './ui/drawer.js';
import { initMenus } from './ui/menu.js';
import { initSteppers } from './ui/stepper.js';
import { initCartDrawer } from './ui/cart-drawer.js';
import { initSearch } from './ui/search-box.js';
import { initQuickAdd } from './ui/quick-add.js';
import { wirePhoneLinks } from './share.js';
import { route, initPrefetch } from './router.js';
import { initPwa } from './pwa.js';

function initAnnouncement() {
  const bar = document.querySelector('[data-announce]');
  if (!bar) return;
  if (session.get('announce-dismissed')) { bar.hidden = true; return; }
  const close = bar.querySelector('[data-announce-close]');
  if (close) close.addEventListener('click', () => { bar.hidden = true; session.set('announce-dismissed', true); });
}

function initHeaderShadow() {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  let ticking = false;
  const update = () => { header.classList.toggle('is-scrolled', window.scrollY > 8); ticking = false; };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

async function boot() {
  document.documentElement.classList.add('js');
  initAnnouncement();
  initHeaderShadow();
  const root = document.documentElement;
  const lang = root.getAttribute('data-lang') || 'en';
  setBase(root.getAttribute('data-base') || '');
  initSchedules();
  try {
    await loadSettings();
    const overrides = (settings().text_overrides_json || {})[lang] || null;
    await loadStrings(lang, overrides);
  } catch (e) {
    console.warn('Could not load shop text or settings', e);
  }
  initDialogs();
  initDrawers();
  initMenus();
  initSteppers();
  initCartDrawer();
  initSearch();
  initQuickAdd();
  initPrefetch();
  wirePhoneLinks();
  refreshStoreState();
  initRows();
  await route();
  initPwa();
  initPromos();
}

boot();
