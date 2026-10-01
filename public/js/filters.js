/**
 * filters.js — filtering and sorting of product lists (Section 10.5). The current filters live in the
 * web address (?cat=…&min=…&max=…&rating=…&avail=1&sort=…&page=…) so a filtered page can be shared,
 * bookmarked, and survives the back button.
 */

import { leadVariant, isInStock, bestDiscount } from './templates.js';
import { search } from './search.js';
import { formatRupees } from './money.js';

/** Reads the filter state from a URLSearchParams. Prices are whole rupees. */
export function readState(params, { mode } = {}) {
  const num = (k) => {
    const v = params.get(k);
    if (v === null || v === '') return null;
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const q = (params.get('q') || '').trim().slice(0, 100);
  const defaultSort = mode === 'search' && q ? 'relevance' : 'bestseller';
  return {
    q,
    cats: (params.get('cat') || '').split(',').map((s) => s.trim()).filter(Boolean),
    min: num('min'),
    max: num('max'),
    rating: num('rating'),
    avail: params.get('avail') === '1',
    sort: params.get('sort') || defaultSort,
    page: Math.max(1, num('page') || 1),
    defaultSort
  };
}

/** Writes the state back to a query string ('' when nothing is set). */
export function writeState(state) {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.cats.length) p.set('cat', state.cats.join(','));
  if (state.min !== null) p.set('min', String(state.min));
  if (state.max !== null) p.set('max', String(state.max));
  if (state.rating) p.set('rating', String(state.rating));
  if (state.avail) p.set('avail', '1');
  if (state.sort && state.sort !== state.defaultSort) p.set('sort', state.sort);
  if (state.page > 1) p.set('page', String(state.page));
  const s = p.toString();
  return s ? '?' + s : '';
}

export function activeCount(state) {
  return (state.cats.length ? 1 : 0) + (state.min !== null || state.max !== null ? 1 : 0) + (state.rating ? 1 : 0) + (state.avail ? 1 : 0);
}

function price(p) {
  const v = leadVariant(p);
  return v ? v.price : 0;
}

/** Lowest and highest product price in whole rupees (for the price slider). */
export function priceBounds(products) {
  if (!products.length) return { min: 0, max: 0 };
  const prices = products.map(price);
  return { min: Math.floor(Math.min(...prices) / 100), max: Math.ceil(Math.max(...prices) / 100) };
}

/**
 * Applies the filters and sort. `base` = the products this page starts from (a category's products,
 * or everything). `index` = search index, needed when state.q is set.
 */
export function apply(base, state, cat, index) {
  let list = state.q && index ? search(index.filter((e) => base.includes(e.p)), state.q) : base.slice();
  if (state.cats.length) {
    const ids = new Set(state.cats.map((slug) => cat.catBySlug[slug]).filter(Boolean).map((c) => c.id));
    list = list.filter((p) => ids.has(p.category_id) || (cat.catById[p.category_id] && ids.has(cat.catById[p.category_id].parent_id)));
  }
  if (state.min !== null) list = list.filter((p) => price(p) >= state.min * 100);
  if (state.max !== null) list = list.filter((p) => price(p) <= state.max * 100);
  if (state.rating) list = list.filter((p) => (p.rating_avg || 0) >= state.rating && p.rating_count > 0);
  if (state.avail) list = list.filter(isInStock);

  const byStock = (a, b) => Number(isInStock(b)) - Number(isInStock(a));
  const sorters = {
    relevance: null,
    bestseller: (a, b) => byStock(a, b) || (a.bestseller_rank || 9999) - (b.bestseller_rank || 9999) || (b.rating_count || 0) - (a.rating_count || 0),
    price_asc: (a, b) => price(a) - price(b),
    price_desc: (a, b) => price(b) - price(a),
    newest: (a, b) => String(b.created_at).localeCompare(String(a.created_at)),
    discount: (a, b) => byStock(a, b) || bestDiscount(b) - bestDiscount(a),
    rating: (a, b) => (b.rating_avg || 0) - (a.rating_avg || 0) || (b.rating_count || 0) - (a.rating_count || 0)
  };
  const fn = sorters[state.sort];
  if (fn) list.sort(fn);
  return list;
}

/** Removable chips for the active filters: [{key, label}]. */
export function chips(state, cat, t) {
  const out = [];
  state.cats.forEach((slug) => {
    const c = cat.catBySlug[slug];
    if (c) out.push({ key: 'cat:' + slug, label: c.name });
  });
  if (state.min !== null && state.max !== null) out.push({ key: 'price', label: t('filters.chip_price', { min: formatRupees(state.min * 100), max: formatRupees(state.max * 100) }) });
  else if (state.max !== null) out.push({ key: 'price', label: t('filters.chip_under', { max: formatRupees(state.max * 100) }) });
  else if (state.min !== null) out.push({ key: 'price', label: t('filters.chip_over', { min: formatRupees(state.min * 100) }) });
  if (state.rating) out.push({ key: 'rating', label: t('filters.rating_up', { n: state.rating }) });
  if (state.avail) out.push({ key: 'avail', label: t('filters.in_stock_only') });
  return out;
}

/** Removes one chip's filter from the state (returns a new state). */
export function removeChip(state, key) {
  const s = { ...state, cats: state.cats.slice(), page: 1 };
  if (key.startsWith('cat:')) s.cats = s.cats.filter((x) => x !== key.slice(4));
  if (key === 'price') { s.min = null; s.max = null; }
  if (key === 'rating') s.rating = null;
  if (key === 'avail') s.avail = false;
  return s;
}

export function clearAll(state) {
  return { ...state, cats: [], min: null, max: null, rating: null, avail: false, page: 1 };
}
