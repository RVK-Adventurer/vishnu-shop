/**
 * ui/cart-drawer.js — the cart drawer and the full cart page share this code (Section 10.6, 23.2 CART):
 * line items with quantity steppers, remove with confirmation, subtotal, a clear note that the server
 * finalises totals at checkout, and the "Go to checkout" button (disabled with a reason when ordering
 * is closed). Also the add-to-cart moment: fly-to-cart picture, badge bump and toast (Section 23.6.5).
 */

import * as cart from '../cart.js';
import { loadCatalog } from '../catalog.js';
import { on, $, setHtml } from '../state.js';
import { html } from '../html.js';
import { t } from '../i18n.js';
import { formatRupees } from '../money.js';
import { cartLine, emptyState, icon, notice } from '../templates.js';
import { openDialog, confirmDialog } from './dialog.js';
import { toast } from './toast.js';
import { announce, prefersReducedMotion } from '../a11y.js';
import { settings, refreshStoreState, orderingBlockedReason } from '../settings.js';

let catIndex = null;

function ctx() {
  return { s: settings(), t, cat: catIndex, now: new Date() };
}

/* ------------------------------------------------------------------ badge */

export function updateBadge() {
  const n = cart.count();
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = n > 99 ? '99+' : String(n);
    el.hidden = n === 0;
  });
  document.querySelectorAll('[data-open-cart]').forEach((btn) => btn.setAttribute('aria-label', t('cart.open', { n })));
}

function bumpBadge() {
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.classList.remove('is-bumped');
    void el.offsetWidth;
    el.classList.add('is-bumped');
  });
}

/* ------------------------------------------------------------------ rendering */

/** Renders lines + summary into the given elements. mode: 'drawer' | 'page'. */
export async function renderCart({ body, foot, title, mode }) {
  catIndex = catIndex || await loadCatalog();
  const list = cart.lines(catIndex);
  const n = cart.count();
  if (title) title.textContent = n ? t('cart.title', { n }) : t('cart.title_plain');

  if (!list.length) {
    setHtml(body, emptyState({
      iconName: 'cart', title: t('cart.empty_title'), text: t('cart.empty_text'),
      action: mode === 'drawer'
        ? html`<button class="btn btn--ghost" type="button" data-close-dialog>${t('cart.continue')}</button>`
        : html`<a class="btn btn--primary" href="/">${t('cart.continue')}</a>`
    }));
    if (foot) { setHtml(foot, ''); if (mode === 'page') foot.hidden = true; }
    return;
  }

  setHtml(body, html`${cart.hasIssues(list) ? notice('warning', t('cart.issues_notice')) : ''}${list.map((l) => cartLine(l, ctx(), { compact: mode === 'drawer' }))}`);
  if (!foot) return;
  foot.hidden = false;
  const blocked = orderingBlockedReason();
  const sub = cart.subtotal(list);
  setHtml(foot, html`${mode === 'page' ? html`<h2 class="card__title">${t('cart.summary')}</h2>` : ''}
    <div class="cart-sum">
      <div class="cart-sum__row"><span>${t('cart.subtotal')} · ${t('cart.items', { n })}</span><strong class="num" data-subtotal>${formatRupees(sub)}</strong></div>
      <p class="cart-sum__note">${t('cart.final_note')}</p>
    </div>
    ${blocked
      ? html`<button class="btn btn--primary btn--lg btn--block" type="button" disabled aria-disabled="true">${t('cart.closed_button')}</button><p class="caption">${blocked}</p>`
      : html`<a class="btn btn--primary btn--lg btn--block btn--with-price" href="/checkout/" data-go-checkout><span>${t('cart.checkout')}</span><span class="btn__amount">${formatRupees(sub)}</span></a>`}
    ${mode === 'drawer' ? html`<a class="btn btn--ghost btn--block" href="/cart/">${t('cart.view_full')}</a>` : ''}`);
}

/** Wires quantity / remove / checkout inside a container (event delegation, set once). */
export function wireCartActions(container, rerender) {
  if (container.dataset.cartWired) return;
  container.dataset.cartWired = '1';
  container.addEventListener('stepper:change', async (e) => {
    const lineEl = e.target.closest('[data-line]');
    if (!lineEl) return;
    const sku = lineEl.getAttribute('data-line');
    if (e.detail.value === 0) {
      await removeWithConfirm(sku);
    } else {
      cart.setQty(sku, e.detail.value);
      announce(t('cart.subtotal') + ' ' + formatRupees(cart.subtotal(cart.lines(catIndex))));
    }
    rerender();
  });
  container.addEventListener('click', async (e) => {
    const rm = e.target.closest('[data-remove-line]');
    if (rm) {
      e.preventDefault();
      await removeWithConfirm(rm.getAttribute('data-remove-line'));
      rerender();
      return;
    }
    if (e.target.closest('[data-go-checkout]') && catIndex) cart.acceptPrices(catIndex);
  });
}

async function removeWithConfirm(sku) {
  const line = cart.lines(catIndex).find((l) => l.sku === sku);
  const name = line ? line.name : '';
  const ok = await confirmDialog({
    title: t('cart.remove_confirm_title'),
    text: t('cart.remove_confirm_text', { name }),
    confirmLabel: t('cart.remove'),
    cancelLabel: t('cart.keep'),
    danger: true
  });
  if (!ok) return;
  const removed = cart.remove(sku);
  toast(t('cart.removed'), { action: t('cart.undo'), onAction: () => cart.restore(removed) });
}

/* ------------------------------------------------------------------ drawer */

const drawer = () => document.getElementById('cart-drawer');

function renderDrawer() {
  const d = drawer();
  if (!d) return Promise.resolve();
  return renderCart({ body: $('[data-cart-body]', d), foot: $('[data-cart-foot]', d), title: $('[data-cart-title]', d), mode: 'drawer' });
}

export async function openCart(opener) {
  const d = drawer();
  if (!d) { location.href = '/cart/'; return; }
  await renderDrawer();
  openDialog(d, { opener });
  refreshStoreState({ live: true }).then(() => { if (d.open) renderDrawer(); });
}

export function initCartDrawer() {
  updateBadge();
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-cart]');
    if (btn) { e.preventDefault(); openCart(btn); }
  });
  const d = drawer();
  if (d) wireCartActions(d, renderDrawer);
  on('cart:change', () => {
    updateBadge();
    const dd = drawer();
    if (dd && dd.open) renderDrawer();
  });
}

/* ------------------------------------------------------------------ add to cart moment */

/** Flies a copy of the product photo to the cart icon (skipped with reduced motion). */
export function flyToCart(img) {
  const target = Array.from(document.querySelectorAll('[data-open-cart]')).find((b) => b.offsetParent !== null);
  if (!img || !target || prefersReducedMotion() || !img.animate) return;
  const from = img.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width) return;
  const clone = document.createElement('img');
  clone.src = img.currentSrc || img.src;
  clone.alt = '';
  clone.className = 'fly';
  document.body.appendChild(clone);
  const sx = from.left + from.width / 2 - 28;
  const sy = from.top + from.height / 2 - 28;
  const ex = to.left + to.width / 2 - 28;
  const ey = to.top + to.height / 2 - 28;
  clone.style.left = '0px';
  clone.style.top = '0px';
  clone.animate([
    { transform: `translate(${sx}px, ${sy}px) scale(1)`, opacity: 1 },
    { transform: `translate(${(sx + ex) / 2}px, ${Math.min(sy, ey) - 60}px) scale(0.8)`, opacity: 0.9, offset: 0.6 },
    { transform: `translate(${ex}px, ${ey}px) scale(0.25)`, opacity: 0.2 }
  ], { duration: 600, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }).onfinish = () => clone.remove();
}

/** Adds to cart with all the feedback. Returns the new quantity of that SKU. */
export function addAndCelebrate(product, variant, qty, img) {
  const before = cart.qtyOf(variant.sku);
  const now = cart.add(variant.sku, qty, cart.snapshotFor(product, variant));
  if (now === before) {
    toast(t('cart.max_qty', { n: cart.MAX_QTY }), { kind: 'info' });
    return now;
  }
  flyToCart(img);
  setTimeout(bumpBadge, prefersReducedMotion() ? 0 : 450);
  const d = drawer();
  if (!d || !d.open) {
    document.querySelectorAll('[data-open-cart]').forEach((b) => {
      b.classList.remove('is-shaking');
      void b.offsetWidth;
      b.classList.add('is-shaking');
    });
  }
  toast(t('cart.added'), { kind: 'success', action: t('cart.view'), onAction: () => openCart() });
  announce(t('cart.added') + ': ' + product.name);
  return now;
}

export { icon };
