/**
 * router.js — the storefront is made of real pre-rendered pages (best for speed and Google). This
 * file picks the right controller for the current page (from <body data-page="…">) and loads only
 * the code that page needs. It also starts loading a product as soon as a finger or mouse lands on
 * its link, so it opens faster.
 */

import { prefetchProduct } from './catalog.js';

const PAGES = {
  home: () => import('./pages/home.js'),
  category: () => import('./pages/listing.js'),
  search: () => import('./pages/listing.js'),
  product: () => import('./product.js'),
  cart: () => import('./pages/cart-page.js'),
  'checkout-soon': () => import('./pages/checkout-soon.js'),
  offline: () => import('./pages/offline.js')
};

/** Register an extra page controller (later phases add checkout, pay and track pages this way). */
export function registerPage(name, loader) {
  PAGES[name] = loader;
}

export async function route() {
  const name = document.body.getAttribute('data-page') || '';
  const loader = PAGES[name];
  if (!loader) return;
  try {
    const mod = await loader();
    if (mod && typeof mod.init === 'function') await mod.init();
  } catch (e) {
    console.error('Page script failed', e);
  }
}

export function initPrefetch() {
  const handler = (e) => {
    const a = e.target && e.target.closest ? e.target.closest('[data-prefetch]') : null;
    if (a) prefetchProduct(a.getAttribute('data-prefetch'));
  };
  document.addEventListener('pointerenter', handler, { capture: true, passive: true });
  document.addEventListener('touchstart', handler, { capture: true, passive: true });
}

/** Reads ?name= from the address. */
export function param(name) {
  return new URLSearchParams(location.search).get(name);
}
