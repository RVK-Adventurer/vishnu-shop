/**
 * pages/cart-page.js — the full cart page (Section 23.2 CART full page): same lines as the drawer,
 * with the summary as a sticky card on the right (bottom bar on phones).
 */

import { renderCart, wireCartActions } from '../ui/cart-drawer.js';
import { refreshStoreState } from '../settings.js';
import { on, $ } from '../state.js';

export async function init() {
  const page = $('[data-cart-page]');
  if (!page) return;
  const body = $('[data-cart-page-lines]', page);
  const foot = $('[data-cart-page-summary]', page);
  const title = $('[data-cart-page-title]', page);
  const render = () => renderCart({ body, foot, title, mode: 'page' });
  wireCartActions(page, render);
  await render();
  on('cart:change', render);
  await refreshStoreState({ live: true });
  render();
}
