/**
 * pages/checkout-soon.js — until online checkout is installed (Phase 3), the checkout page sends the
 * cart to the shop as a ready-made WhatsApp message, so no order is ever lost. Shows the in-app
 * browser helper too (Section 24.6).
 */

import * as cart from '../cart.js';
import { loadCatalog } from '../catalog.js';
import { html } from '../html.js';
import { t } from '../i18n.js';
import { formatRupees } from '../money.js';
import { setHtml, $ } from '../state.js';
import { settings } from '../settings.js';
import { whatsappUrl } from '../share.js';
import { showInAppHelper } from '../ui/inapp.js';

export async function init() {
  const root = $('[data-checkout-soon]');
  if (!root) return;
  showInAppHelper();
  const cat = await loadCatalog();
  const list = cart.lines(cat).filter((l) => l.status === 'ok' || l.status === 'price_changed');
  const summary = $('[data-checkout-soon-summary]', root);
  const link = $('[data-wa-order]', root);
  if (!list.length) {
    setHtml(summary, html`<p class="muted">${t('checkout_soon.empty')}</p>`);
    if (link) link.hidden = true;
    return;
  }
  const sub = cart.subtotal(list);
  setHtml(summary, html`<div class="cart-sum">${list.map((l) => html`<div class="cart-sum__row"><span>${l.qty} × ${l.name}${l.option_text ? ' (' + l.option_text + ')' : ''}</span><span>${formatRupees(l.price * l.qty)}</span></div>`)}
    <div class="cart-sum__row cart-sum__row--total"><span>${t('cart.subtotal')}</span><span>${formatRupees(sub)}</span></div>
    <p class="cart-sum__note">${t('cart.final_note')}</p></div>`);
  if (link) {
    const lines = list.map((l) => `• ${l.qty} × ${l.name}${l.option_text ? ' (' + l.option_text + ')' : ''}. ${formatRupees(l.price * l.qty)} [${l.sku}]`);
    const text = [t('checkout_soon.message_intro'), ...lines, t('checkout_soon.message_total', { amount: formatRupees(sub) })].join('\n');
    link.href = whatsappUrl(settings().whatsapp_number, text);
  }
}
