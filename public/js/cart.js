/**
 * cart.js — the shopping cart (Section 10.6). Kept on this device in localStorage with a schema
 * version; stores only SKU + quantity + a display snapshot. Prices are always re-checked against
 * the latest catalog, and the server recalculates everything again at checkout.
 * Changes in one tab show up in the shop's other open tabs.
 */

import { local, emit } from './state.js';
import { productUrl, optionText } from './templates.js';

const KEY = 'cart:v1';
const VERSION = 1;
export const MAX_QTY = 99;

function read() {
  const data = local.get(KEY);
  if (!data || data.v !== VERSION || !Array.isArray(data.items)) return { v: VERSION, items: [] };
  data.items = data.items.filter((it) => it && typeof it.sku === 'string' && Number.isInteger(it.qty) && it.qty > 0);
  return data;
}

let cart = read();

function save() {
  cart.updated = Date.now();
  local.set(KEY, cart);
  emit('cart:change', { count: count() });
}

/** Snapshot shown in the cart before the catalog has loaded. */
export function snapshotFor(product, variant) {
  const img = variant && Number.isInteger(variant.image) && product.images && product.images[variant.image]
    ? product.images[variant.image] : (product.images || [])[0];
  return {
    pid: product.id,
    name: product.name,
    option_text: optionText(product, variant),
    price: variant.price,
    img: img ? (img.thumb || img.card) : '',
    url: productUrl(product)
  };
}

export function items() {
  return cart.items.slice();
}

export function count() {
  return cart.items.reduce((n, it) => n + it.qty, 0);
}

export function qtyOf(sku) {
  const it = cart.items.find((x) => x.sku === sku);
  return it ? it.qty : 0;
}

/** Adds qty of a SKU. Returns the new quantity (capped at MAX_QTY). */
export function add(sku, qty, snap) {
  const n = Math.max(1, Math.floor(qty || 1));
  const it = cart.items.find((x) => x.sku === sku);
  if (it) {
    it.qty = Math.min(MAX_QTY, it.qty + n);
    if (snap) it.snap = snap;
  } else {
    cart.items.push({ sku, qty: Math.min(MAX_QTY, n), snap: snap || null, added: Date.now() });
  }
  save();
  return qtyOf(sku);
}

export function setQty(sku, qty) {
  const it = cart.items.find((x) => x.sku === sku);
  if (!it) return 0;
  const n = Math.floor(Number(qty) || 0);
  if (n <= 0) { remove(sku); return 0; }
  it.qty = Math.min(MAX_QTY, n);
  save();
  return it.qty;
}

/** Removes a line and returns it with its position, so "Undo" can put it back. */
export function remove(sku) {
  const index = cart.items.findIndex((x) => x.sku === sku);
  if (index === -1) return null;
  const [removed] = cart.items.splice(index, 1);
  save();
  return { item: removed, index };
}

export function restore(removed) {
  if (!removed || !removed.item) return;
  if (cart.items.some((x) => x.sku === removed.item.sku)) return;
  cart.items.splice(Math.min(removed.index, cart.items.length), 0, removed.item);
  save();
}

export function clear() {
  cart = { v: VERSION, items: [] };
  save();
}

/**
 * Cart lines checked against the current catalog index. Each line has a status:
 * 'ok' · 'price_changed' (price differs from when it was added) · 'out_of_stock' · 'removed'.
 */
export function lines(cat) {
  return cart.items.map((it) => {
    const snap = it.snap || {};
    const entry = cat && cat.bySku ? cat.bySku[it.sku] : null;
    if (!cat || !cat.products || !cat.products.length) {
      return { sku: it.sku, qty: it.qty, name: snap.name || it.sku, option_text: snap.option_text || '', img: snap.img || '', url: snap.url || '#', price: snap.price || 0, status: 'ok' };
    }
    if (!entry) {
      return { sku: it.sku, qty: it.qty, name: snap.name || it.sku, option_text: snap.option_text || '', img: snap.img || '', url: snap.url || '#', price: snap.price || 0, status: 'removed' };
    }
    const { product, variant } = entry;
    const fresh = snapshotFor(product, variant);
    let status = 'ok';
    if (!variant.in_stock) status = 'out_of_stock';
    else if (Number.isInteger(snap.price) && snap.price !== variant.price) status = 'price_changed';
    return { sku: it.sku, qty: it.qty, ...fresh, old_price: snap.price, status, product, variant };
  });
}

/** Marks price changes as seen (the customer has been shown the new prices). */
export function acceptPrices(cat) {
  let changed = false;
  cart.items.forEach((it) => {
    const entry = cat.bySku[it.sku];
    if (entry && it.snap && it.snap.price !== entry.variant.price) {
      it.snap = snapshotFor(entry.product, entry.variant);
      changed = true;
    }
  });
  if (changed) save();
}

/** Sum of lines that can still be bought (paise). */
export function subtotal(list) {
  return list.filter((l) => l.status === 'ok' || l.status === 'price_changed').reduce((s, l) => s + l.price * l.qty, 0);
}

export function hasIssues(list) {
  return list.some((l) => l.status !== 'ok');
}

/* Keep tabs in sync (Section 10.6). */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cart = read();
      emit('cart:change', { count: count(), external: true });
    }
  });
}
