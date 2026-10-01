/**
 * catalog.js — loads catalog.json once per page (the service worker keeps it fresh) and the
 * per-product detail files, plus the "recently viewed" list kept on this device.
 */

import { indexCatalog } from './templates.js';
import { local } from './state.js';

let catalogPromise = null;
const detailCache = new Map();
const RECENT_KEY = 'recent:v1';
const RECENT_MAX = 12;

/** The catalog index (see templates.indexCatalog). Never throws: returns an empty index on failure. */
export function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch('/catalog.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => indexCatalog(json))
      .catch(() => indexCatalog({ categories: [], products: [] }));
  }
  return catalogPromise;
}

/** Full details of one product (description, all photos). */
export function loadProductDetail(slug) {
  if (!detailCache.has(slug)) {
    detailCache.set(slug, fetch(`/products/${encodeURIComponent(slug)}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null));
  }
  return detailCache.get(slug);
}

/** Starts loading a product's details early (on hover / touch) so its page opens faster (Section 16.4). */
export function prefetchProduct(slug) {
  if (!slug || detailCache.has(slug)) return;
  const conn = navigator.connection;
  if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return;
  loadProductDetail(slug);
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = `/p/${encodeURIComponent(slug)}/`;
  document.head.appendChild(link);
}

export function addRecent(productId) {
  const list = (local.get(RECENT_KEY) || []).filter((id) => id !== productId);
  list.unshift(productId);
  local.set(RECENT_KEY, list.slice(0, RECENT_MAX));
}

export function recentIds() {
  return local.get(RECENT_KEY) || [];
}
