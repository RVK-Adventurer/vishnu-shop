/**
 * product.js — the product page (Section 10.4, 23.2 PRODUCT PAGE, 23.6.3): options update the price,
 * photo and stock; add to cart / buy now; delivery check by pincode with "Delivery by <date>" and COD
 * availability; share; ask on WhatsApp; the sticky add-to-cart bar on phones; recently viewed.
 */

import { html } from './html.js';
import { t, formatDate } from './i18n.js';
import { formatRupees } from './money.js';
import { setHtml, local, $ } from './state.js';
import { settings } from './settings.js';
import { loadCatalog, addRecent, recentIds } from './catalog.js';
import { priceBlock, productCard, icon, leadVariant, codEnabled } from './templates.js';
import { matchPincode, isPincode, deliveryDate } from './validators.js';
import { wireVariantPicker, variantImageIndex } from './variants.js';
import { initGallery } from './ui/gallery.js';
import { stepperValue } from './ui/stepper.js';
import { addAndCelebrate } from './ui/cart-drawer.js';
import { liftToasts } from './ui/toast.js';
import { shareLink } from './share.js';
import * as cart from './cart.js';

let rulesPromise = null;
function pincodeRules() {
  if (!rulesPromise) {
    rulesPromise = fetch('/pincode-rules.json').then((r) => (r.ok ? r.json() : { rules: [] })).then((j) => j.rules || []).catch(() => []);
  }
  return rulesPromise;
}

export async function init() {
  const page = $('[data-product-page]');
  const dataEl = document.getElementById('product-data');
  if (!page || !dataEl) return;
  let p;
  try { p = JSON.parse(dataEl.textContent); } catch (e) { return; }
  const s = settings();

  const fromUrl = new URLSearchParams(location.search).get('sku');
  let variant = (p.variants || []).find((v) => v.sku === fromUrl) || (p.variants || []).find((v) => v.sku === p.lead_sku) || leadVariant(p);
  if (!variant) return;

  const gallery = initGallery($('[data-gallery]', page), p.images || []);
  const form = $('[data-buy-form]', page);
  const stepperEl = $('[data-stepper]', form);
  const addBtn = $('[data-add-to-cart]', page);
  const buyBtn = $('[data-buy-now]', page);
  const stockEl = $('[data-stock]', page);
  const sticky = $('[data-sticky-buy]', page);
  const stickyPrice = $('[data-sticky-price]', page);
  const stickyAdd = $('[data-sticky-add]', page);

  const mainImg = () => {
    const slide = page.querySelector(`[data-slide="${gallery.current ? gallery.current() : 0}"] img`);
    return slide || page.querySelector('.gallery__img');
  };

  function showVariant(v, { scroll = true } = {}) {
    variant = v;
    const block = $('[data-price-block]', page);
    if (block) block.outerHTML = priceBlock(p, v, t, s).toString();
    stockEl.textContent = v.in_stock ? (v.low_stock ? t('badge.few_left') : '') : t('product.variant_out_of_stock');
    addBtn.disabled = !v.in_stock;
    buyBtn.disabled = !v.in_stock;
    if (stickyAdd) stickyAdd.disabled = !v.in_stock;
    if (stickyPrice) stickyPrice.textContent = formatRupees(v.price);
    if (scroll && (p.variants || []).length > 1) gallery.goTo(variantImageIndex(v));
    if ((p.variants || []).length > 1) history.replaceState(null, '', location.pathname + '?sku=' + encodeURIComponent(v.sku));
  }

  wireVariantPicker(form, p, variant, (v) => showVariant(v));
  showVariant(variant, { scroll: !!fromUrl });

  const doAdd = () => {
    if (!variant.in_stock) return false;
    addAndCelebrate(p, variant, stepperValue(stepperEl), mainImg());
    return true;
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); doAdd(); });
  if (stickyAdd) stickyAdd.addEventListener('click', doAdd);
  buyBtn.addEventListener('click', () => {
    if (!variant.in_stock) return;
    if (!cart.qtyOf(variant.sku)) cart.add(variant.sku, stepperValue(stepperEl), cart.snapshotFor(p, variant));
    location.href = '/checkout/';
  });

  /* ---- sticky add-to-cart bar (phones only, after the main button scrolls away) */
  if (sticky && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([en]) => {
      const show = !en.isIntersecting && en.boundingClientRect.top < 0 && window.innerWidth < 768;
      sticky.hidden = !show;
      liftToasts(show ? sticky.offsetHeight : 0);
      document.documentElement.style.setProperty('--footer-lift', show ? sticky.offsetHeight + 'px' : '0px');
    });
    io.observe(addBtn);
  }

  /* ---- delivery check */
  const pinForm = $('[data-pin-check]', page);
  const pinInput = $('[data-pin-input]', page);
  const pinResult = $('[data-pin-result]', page);
  const check = async (pin) => {
    if (!isPincode(pin)) {
      setHtml(pinResult, html`<p class="pin-line pin-line--no">${icon('alert', 16)}<span>${t('product.pin_invalid')}</span></p>`);
      pinInput.setAttribute('aria-invalid', 'true');
      return;
    }
    pinInput.removeAttribute('aria-invalid');
    local.set('pincode', pin);
    const rules = await pincodeRules();
    const m = matchPincode(pin, rules);
    if (!m.serviceable) {
      setHtml(pinResult, html`<p class="pin-line pin-line--no">${icon('alert', 16)}<span>${t('product.pin_no', { pincode: pin })}</span></p>`);
      return;
    }
    const days = m.rule && Number.isInteger(m.rule.delivery_days) ? m.rule.delivery_days : s.default_delivery_days;
    const date = deliveryDate(new Date(), days, s.skip_sundays_delivery);
    const codHere = codEnabled(s) && !(m.rule && m.rule.cod_allowed === false);
    setHtml(pinResult, html`<p class="pin-line pin-line--ok">${icon('check-circle', 16)}<span>${t('product.pin_yes', { date: formatDate(date) })}</span></p>
      ${codEnabled(s) ? html`<p class="pin-line pin-line--info">${icon(codHere ? 'cash' : 'info', 16)}<span>${codHere ? t('product.pin_cod_yes') : t('product.pin_cod_no')}</span></p>` : ''}
      ${m.rule && m.rule.request_only ? html`<p class="pin-line pin-line--info">${icon('phone', 16)}<span>${t('product.pin_request')}</span></p>` : ''}`);
  };
  pinForm.addEventListener('submit', (e) => { e.preventDefault(); check(pinInput.value.trim()); });
  pinInput.addEventListener('input', () => {
    pinInput.value = pinInput.value.replace(/\D/g, '').slice(0, 6);
    if (pinInput.value.length === 6) check(pinInput.value);
  });
  const savedPin = local.get('pincode');
  if (savedPin && isPincode(savedPin)) { pinInput.value = savedPin; check(savedPin); }

  /* ---- share */
  const shareBtn = $('[data-share]', page);
  if (shareBtn) shareBtn.addEventListener('click', () => shareLink({ title: p.name, text: t('product.share_text', { name: p.name }), url: location.origin + location.pathname }));
  const ask = $('[data-ask-whatsapp]', page);
  if (ask) {
    const u = new URL(ask.href);
    u.searchParams.set('text', t('product.ask_text', { name: p.name }) + ' — ' + location.origin + location.pathname);
    ask.href = u.toString();
  }

  /* ---- recently viewed */
  const before = recentIds().filter((id) => id !== p.id);
  addRecent(p.id);
  const row = page.querySelector('[data-row="recent"]');
  if (row && before.length >= 2) {
    const cat = await loadCatalog();
    const items = before.map((id) => cat.byId[id]).filter(Boolean).slice(0, 8);
    if (items.length >= 2) {
      const ctx = { s, t, cat, now: new Date() };
      setHtml(row.querySelector('[data-row-track]'), html`${items.map((x) => productCard(x, ctx))}`);
      row.hidden = false;
    }
  }
}
