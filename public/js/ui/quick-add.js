/**
 * ui/quick-add.js — the round "+" on product cards (Section 23.4 PRODUCT CARD, 23.8 VARIANT BOTTOM SHEET).
 * One-option products go straight into the cart; others open a small sheet to choose the option first.
 */

import { loadCatalog } from '../catalog.js';
import { html } from '../html.js';
import { t } from '../i18n.js';
import { setHtml } from '../state.js';
import { formatRupees } from '../money.js';
import { icon, leadVariant, variantSelectors, stepper, priceInline } from '../templates.js';
import { wireVariantPicker, variantImageIndex } from '../variants.js';
import { openDialog, closeDialog } from './dialog.js';
import { addAndCelebrate } from './cart-drawer.js';
import { stepperValue } from './stepper.js';

async function quickAdd(btn) {
  const cat = await loadCatalog();
  const p = cat.byId[btn.getAttribute('data-quick-add')];
  if (!p) return;
  const card = btn.closest('.pcard');
  const img = card ? card.querySelector('.pcard__img') : null;
  const buyable = (p.variants || []).filter((v) => v.in_stock);
  if ((p.variants || []).length === 1 && buyable.length === 1) {
    addAndCelebrate(p, buyable[0], 1, img);
    return;
  }
  openSheet(p, btn, img);
}

function openSheet(p, opener, cardImg) {
  const dlg = document.getElementById('quick-add');
  const body = dlg && dlg.querySelector('[data-quick-add-body]');
  if (!body) return;
  let variant = leadVariant(p);
  const photo = (i) => (p.images || [])[i] || (p.images || [])[0];

  const render = () => {
    const ph = photo(variantImageIndex(variant));
    setHtml(body, html`<div class="qa__head">
        ${ph ? html`<img class="qa__thumb" src="${ph.thumb || ph.card}" alt="" width="64" height="64" data-qa-img>` : ''}
        <div><h2 class="qa__name" id="quick-add-title">${p.name}</h2><p data-qa-price>${priceInline(variant.price, variant.mrp, {}, t)}</p></div>
        <button class="icon-btn qa__close" type="button" data-close-dialog aria-label="${t('common.close')}">${icon('close', 24)}</button>
      </div>
      <form class="qa__body" data-qa-form novalidate>
        ${variantSelectors(p, variant, t)}
        <div class="pdp__qty"><span class="pdp__qty-label">${t('product.quantity')}</span>${stepper({ value: 1, label: t('product.quantity'), t })}</div>
        <p class="pdp__stock" data-qa-stock aria-live="polite"></p>
        <button class="btn btn--primary btn--lg btn--block btn--with-price" type="submit" data-qa-add><span>${t('cart.add')}</span><span class="btn__amount" data-qa-amount>${formatRupees(variant.price)}</span></button>
      </form>`);
  };
  render();

  const form = body.querySelector('[data-qa-form]');
  const update = () => {
    const qty = stepperValue(form.querySelector('[data-stepper]'));
    setHtml(body.querySelector('[data-qa-price]'), priceInline(variant.price, variant.mrp, {}, t));
    body.querySelector('[data-qa-amount]').textContent = formatRupees(variant.price * qty);
    const add = body.querySelector('[data-qa-add]');
    add.disabled = !variant.in_stock;
    body.querySelector('[data-qa-stock]').textContent = variant.in_stock ? (variant.low_stock ? t('badge.few_left') : '') : t('product.variant_out_of_stock');
    const ph = photo(variantImageIndex(variant));
    const imgEl = body.querySelector('[data-qa-img]');
    if (imgEl && ph) imgEl.src = ph.thumb || ph.card;
  };
  wireVariantPicker(form, p, variant, (v) => { variant = v; update(); });
  form.addEventListener('stepper:change', update);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!variant || !variant.in_stock) return;
    const qty = stepperValue(form.querySelector('[data-stepper]'));
    closeDialog(dlg);
    addAndCelebrate(p, variant, qty, cardImg);
  });
  update();
  openDialog(dlg, { opener });
}

export function initQuickAdd() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-quick-add]');
    if (!btn) return;
    e.preventDefault();
    quickAdd(btn);
  });
}
