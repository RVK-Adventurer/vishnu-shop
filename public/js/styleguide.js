/**
 * styleguide.js — builds the living style guide (Section 23.9) from the REAL templates and CSS,
 * so what you approve here is exactly what the shop uses. No real data, no server calls.
 */

import { loadStrings, t } from './i18n.js';
import { html, raw } from './html.js';
import { setHtml, $ } from './state.js';
import { THEME_PRESETS, brandVariables, contrast } from './color.js';
import { productCard, priceBlock, variantSelectors, stepper, emptyState, notice, icon, skeletonCards, indexCatalog } from './templates.js';
import { wireVariantPicker } from './variants.js';
import { initDialogs, openDialog, confirmDialog } from './ui/dialog.js';
import { initSteppers } from './ui/stepper.js';
import { toast } from './ui/toast.js';
import { formatRupees } from './money.js';
import { DISPLAY_OPTIONS, DISPLAY_DEFAULTS, applyDisplayInline } from './display.js';

const DAY = 86400000;

function img(label, hue) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'><rect width='600' height='600' fill='hsl(${hue},60%,92%)'/><circle cx='300' cy='300' r='170' fill='hsl(${hue},55%,82%)'/><text x='300' y='320' font-family='sans-serif' font-size='48' text-anchor='middle' fill='hsl(${hue},45%,30%)'>${label}</text></svg>`;
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return { thumb: url, card: url, full: url, w: 600, h: 600, alt: '' };
}

function sample(id, name, opts = {}) {
  const variants = opts.variants || [{ sku: id + '-1', options: {}, price: 49900, mrp: 49900, in_stock: true, low_stock: false, image: 0 }];
  return {
    id, slug: id, name, brand: opts.brand || 'Sample Brand', category_id: 'c1', tags: [], short: '',
    rating_avg: opts.rating ?? 4.4, rating_count: opts.count ?? 86, images: [img(opts.label || 'Photo', opts.hue ?? 240)],
    option_names: opts.option_names || [], variants, created_at: new Date(Date.now() - (opts.age ?? 60) * DAY).toISOString(),
    bestseller_rank: opts.best || null, order_mode: 'DEFAULT', sold_30d: opts.sold || 0, sold_total: 0
  };
}

const PRODUCTS = [
  sample('n1', 'Normal product card', { label: 'Normal', hue: 220 }),
  sample('n2', 'On sale — 20% off', { label: 'Sale', hue: 30, variants: [{ sku: 'n2-1', options: {}, price: 79900, mrp: 99900, in_stock: true, low_stock: false }] }),
  sample('n3', 'Brand new arrival', { label: 'New', hue: 200, age: 2 }),
  sample('n4', 'Bestseller with sizes', {
    label: 'Best', hue: 140, best: 1, sold: 230, option_names: ['Size'],
    variants: ['S', 'M', 'L'].map((s, i) => ({ sku: 'n4-' + i, options: { Size: s }, price: 59900, mrp: 69900, in_stock: true, low_stock: false }))
  }),
  sample('n5', 'Only a few left', { label: 'Low', hue: 45, variants: [{ sku: 'n5-1', options: {}, price: 25000, mrp: 25000, in_stock: true, low_stock: true }] }),
  sample('n6', 'Out of stock item', { label: 'Sold', hue: 0, variants: [{ sku: 'n6-1', options: {}, price: 120000, mrp: 120000, in_stock: false, low_stock: false }] }),
  sample('n7', 'கைத்தறி பருத்தி சேலை — மிக நீளமான தயாரிப்பு பெயர் சோதனை', { label: 'தமிழ்', hue: 330, rating: 4.8, count: 1204 })
];

const PICKER = sample('v1', 'Printed Kurti', {
  option_names: ['Size', 'Colour'],
  variants: [
    { sku: 'v1-1', options: { Size: 'S', Colour: 'Pink' }, price: 74900, mrp: 99900, in_stock: true },
    { sku: 'v1-2', options: { Size: 'M', Colour: 'Pink' }, price: 74900, mrp: 99900, in_stock: true },
    { sku: 'v1-3', options: { Size: 'L', Colour: 'Pink' }, price: 74900, mrp: 99900, in_stock: false },
    { sku: 'v1-4', options: { Size: 'S', Colour: 'Green' }, price: 79900, mrp: 99900, in_stock: true },
    { sku: 'v1-5', options: { Size: 'M', Colour: 'Green' }, price: 79900, mrp: 99900, in_stock: true },
    { sku: 'v1-6', options: { Size: 'L', Colour: 'Green' }, price: 79900, mrp: 99900, in_stock: true }
  ]
});

const SETTINGS = { sold_counts_mode: 'MONTH', sold_counts_min: 10, reviews_enabled: true, product_image_fit: 'contain', prices_include_tax: true, show_inclusive_tax_note: true };

function hexOf(cssColour) {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(cssColour);
  if (!m) return cssColour.trim().slice(0, 7);
  return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function token(name) {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return hexOf(c);
}

let mode = 'auto';
let preset = 'ROYAL_INDIGO';
let display = { ...DISPLAY_DEFAULTS, page_width: 'STANDARD' };
let FONTS = [];

function isDark() {
  return mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function applyTheme() {
  const root = document.documentElement;
  if (mode === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', mode);
  const p = THEME_PRESETS[preset];
  const { light, dark } = brandVariables({ primary: p.primary, secondary: p.secondary, accent: p.accent });
  const vars = isDark() ? { ...light, ...dark } : light;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  applyDisplayInline(display, FONTS, isDark());
  renderSwatches();
}

function ratioChip(fgVar, bgVar, label) {
  const fg = token(fgVar);
  const bg = token(bgVar);
  const r = contrast(fg, bg);
  return html`<div class="sg-swatch"><div class="sg-swatch__chip" data-fg="${fgVar}" data-bg="${bgVar}">Aa ${r.toFixed(1)}:1</div>
    <span class="sg-label">${label} ${r >= 4.5 ? '✓ AA' : (r >= 3 ? '✓ large/UI only' : '✗ too low')}</span></div>`;
}

function renderSwatches() {
  const slot = $('[data-sg-swatches]');
  if (!slot) return;
  const pairs = [
    ['--text', '--bg', 'Text on page'], ['--text', '--surface', 'Text on card'], ['--text-2', '--surface', 'Secondary text'],
    ['--muted', '--surface', 'Muted text'], ['--primary-text', '--surface', 'Links'], ['--on-primary', '--primary-color', 'Primary button'],
    ['--on-accent', '--accent-color', 'Accent badge'], ['--danger', '--surface', 'Error text'], ['--success', '--surface', 'Success text'],
    ['--border-strong', '--surface', 'Input border'],
    ['--st-green-fg', '--st-green-bg', 'Green status'], ['--st-amber-fg', '--st-amber-bg', 'Amber status'], ['--st-red-fg', '--st-red-bg', 'Red status'],
    ['--st-blue-fg', '--st-blue-bg', 'Blue status'], ['--st-grey-fg', '--st-grey-bg', 'Grey status']
  ];
  setHtml(slot, html`${pairs.map(([f, b, l]) => ratioChip(f, b, l))}`);
  slot.querySelectorAll('[data-fg]').forEach((el) => {
    el.style.color = `var(${el.dataset.fg})`;
    el.style.background = `var(${el.dataset.bg})`;
  });
}

function chart() {
  const values = [12, 18, 9, 22, 27, 19, 31];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const max = 35;
  const bars = values.map((v, i) => {
    const h = (v / max) * 150;
    return `<rect class="bar" x="${40 + i * 50}" y="${170 - h}" width="30" height="${h}" rx="4"><title>${days[i]}: ${v} orders</title></rect><text class="axis" x="${55 + i * 50}" y="188" text-anchor="middle">${days[i]}</text>`;
  }).join('');
  const lines = [0, 10, 20, 30].map((v) => `<line class="grid-line" x1="30" x2="400" y1="${170 - (v / max) * 150}" y2="${170 - (v / max) * 150}"/><text class="axis" x="24" y="${174 - (v / max) * 150}" text-anchor="end">${v}</text>`).join('');
  return raw(`<svg class="sg-chart" viewBox="0 0 410 200" role="img" aria-label="Orders per day, sample chart">${lines}${bars}</svg>`);
}

function page() {
  const cat = indexCatalog({ categories: [{ id: 'c1', name: 'Sample', slug: 'sample' }], products: PRODUCTS.concat([PICKER]) });
  const ctx = { s: SETTINGS, t, cat, now: new Date() };
  const statuses = ['PAYMENT_PENDING', 'PENDING_CONFIRMATION', 'REQUEST_RECEIVED', 'AWAITING_PAYMENT', 'PAYMENT_VERIFICATION', 'LATE_PAYMENT_REVIEW',
    'PAYMENT_REJECTED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'PAYMENT_FAILED', 'EXPIRED', 'CANCELLED', 'ABORTED_MISMATCH', 'REFUND_PENDING', 'REFUNDED', 'RETURNED'];
  const btn = (variant, size, label, extra = '') => html`<button class="btn btn--${variant} ${size ? 'btn--' + size : ''} ${extra}" type="button" ${extra.includes('disabled') ? raw('disabled') : ''}>${label}</button>`;
  return html`
<section class="sg-section"><h2>Colours and contrast</h2>
  <p class="muted">Every text pair must read at least 4.5:1 (borders 3:1). Switch theme and mode above to check them all.</p>
  <div class="sg-grid" data-sg-swatches></div></section>

<section class="sg-section"><h2>Type</h2><div class="sg-type sg-box">
  <p class="hero__title">Display — hero headline</p><h1>H1 — Page title</h1><h2>H2 — Section heading</h2><h3>H3 — Card heading</h3>
  <p>Body — the default reading size for descriptions and forms.</p><p class="small">Body small — meta and secondary text.</p>
  <p class="caption">Caption — helper text, timestamps</p><p class="label-caps">Caps label</p>
  <p><span class="price-block__price">${formatRupees(1245000)}</span> tabular price · <span class="price">${formatRupees(124050)}</span></p></div></section>

<section class="sg-section"><h2>Buttons</h2>
  ${['primary', 'secondary', 'ghost', 'danger'].map((v) => html`<div class="sg-row">${btn(v, 'sm', 'Small')}${btn(v, '', 'Medium')}${btn(v, 'lg', 'Large')}${btn(v, '', 'Disabled', 'disabled')}${btn(v, '', 'Loading', 'is-loading')}</div>`)}
  <div class="sg-row"><button class="icon-btn" type="button" aria-label="Notifications">${icon('bell', 24)}</button><button class="icon-btn" type="button" aria-label="Cart">${icon('cart', 24)}</button>
    <button class="btn btn--primary btn--lg btn--with-price" type="button"><span>Pay</span><span class="btn__amount">${formatRupees(124000)}</span></button>
    <a class="pill pill--whatsapp" href="#">${icon('whatsapp', 16)}Shop on WhatsApp</a></div></section>

<section class="sg-section"><h2>Form fields</h2><div class="sg-grid">
  <label class="field"><span class="field__label">Name</span><input class="input" value="Priya Raman" autocomplete="off"><span class="field__help">As on your ID</span></label>
  <label class="field"><span class="field__label">Phone</span><input class="input" type="tel" value="98765" aria-invalid="true" aria-describedby="sg-err"><span class="field__error" id="sg-err">${icon('alert', 16)}Enter a 10-digit mobile number, like 98765 43210</span></label>
  <label class="field"><span class="field__label">Disabled</span><input class="input" value="Can't change" disabled></label>
  <label class="field"><span class="field__label">State</span><select class="select"><option>Tamil Nadu</option><option>Kerala</option></select></label>
  <label class="field"><span class="field__label">Message <span class="field__optional">(optional)</span></span><textarea class="textarea" rows="3"></textarea></label>
  <div class="field"><span class="field__label">Choices</span><label class="check"><input type="checkbox" checked><span>In stock only</span></label><label class="check"><input type="radio" name="sgr" checked><span>Any rating</span></label></div>
  <div class="field"><span class="field__label">Switch</span><label class="switch"><input type="checkbox" checked data-sg-switch><span class="switch__track"></span><span class="switch__state" data-sg-switch-state>On</span><span>Cash on Delivery</span></label></div>
  <div class="field"><span class="field__label">Segmented</span><div class="segmented" role="group" aria-label="Sample"><button type="button" aria-pressed="true">Edit</button><button type="button" aria-pressed="false">Preview</button></div></div>
  <div class="field"><span class="field__label">Quantity</span>${stepper({ value: 2, label: 'Quantity', t })}</div>
</div></section>

<section class="sg-section"><h2>Badges, chips and statuses</h2>
  <div class="sg-row"><span class="badge badge--grey">Out of stock</span><span class="badge badge--accent">18% off</span><span class="badge badge--blue">New</span><span class="badge badge--amber">Bestseller</span><span class="badge badge--amber">Only few left</span></div>
  <div class="sg-row">${statuses.map((s) => html`<span class="status status--${t(`status.${s}.colour`)}">${t(`status.${s}.staff`)}</span>`)}</div>
  <div class="sg-row"><span class="countdown">${icon('clock', 16)}5 h 20 min left</span><span class="countdown countdown--amber">${icon('clock', 16)}40 min left</span><span class="countdown countdown--red">${icon('clock', 16)}6 min left</span></div>
  <div class="sg-row"><button class="fchip" type="button">Under ₹500${icon('close', 16)}</button><button class="fchip" type="button">4★ &amp; up${icon('close', 16)}</button><span class="count-dot">3</span></div></section>

<section class="sg-section"><h2>Product cards</h2><div class="grid sg-grid--cards">${PRODUCTS.map((p) => productCard(p, ctx))}</div>
  <h3>Loading</h3><div class="grid">${skeletonCards(4)}</div></section>

<section class="sg-section"><h2>Price block and options</h2><div class="sg-grid sg-grid--wide">
  <div class="sg-box sg-stack" data-sg-picker>${priceBlock(PICKER, PICKER.variants[0], t, SETTINGS)}<form>${variantSelectors(PICKER, PICKER.variants[0], t)}</form></div>
  <div class="sg-stack">
    <label class="pay-option is-selected"><input type="radio" name="sgpay" checked><span>${icon('card', 24)}</span><span class="pay-option__text"><span class="pay-option__label">UPI, Cards &amp; Net Banking</span><span class="pay-option__hint">Pay securely online</span><span class="pay-option__subs"><span class="chip">UPI</span><span class="chip">Cards</span><span class="chip">Net Banking</span></span></span><span class="pay-option__fee">Free</span></label>
    <label class="pay-option"><input type="radio" name="sgpay"><span>${icon('cash', 24)}</span><span class="pay-option__text"><span class="pay-option__label">Cash on Delivery</span><span class="pay-option__hint">Orders above ₹1,000 need a quick call</span></span><span class="pay-option__fee">+ ₹30</span></label>
    <label class="pay-option is-disabled"><input type="radio" name="sgpay" disabled><span>${icon('bank', 24)}</span><span class="pay-option__text"><span class="pay-option__label">Bank transfer</span><span class="pay-option__hint">Available for orders up to ₹5,000</span></span></label>
    <label class="pay-option pay-option--request"><input type="radio" name="sgpay"><span>${icon('clipboard', 24)}</span><span class="pay-option__text"><span class="pay-option__label">Send order request</span><span class="pay-option__hint">No payment now. We'll call you within 24 hours.</span></span></label>
  </div></div></section>

<section class="sg-section"><h2>Banners, toasts and dialogs</h2>
  <div class="sg-stack">${notice('info', 'We are currently closed. You can still browse.')}${notice('warning', 'We are very busy right now. Please try again in a few minutes.')}${notice('danger', 'We couldn\'t find your payment.')}${notice('success', 'Payment received — download your invoice.')}</div>
  <div class="sg-row">
    <button class="btn btn--secondary" type="button" data-sg-toast="success">Success toast</button>
    <button class="btn btn--secondary" type="button" data-sg-toast="error">Error toast</button>
    <button class="btn btn--secondary" type="button" data-sg-toast="undo">Toast with Undo</button>
    <button class="btn btn--secondary" type="button" data-sg-sheet>Bottom sheet / dialog</button>
    <button class="btn btn--danger" type="button" data-sg-confirm>Confirm dialog</button>
    <button class="btn btn--secondary" type="button" data-open-dialog="cart-drawer">Drawer</button>
  </div></section>

<section class="sg-section"><h2>Empty, error and loading states</h2><div class="sg-grid">
  <div class="sg-box">${emptyState({ iconName: 'cart', title: t('cart.empty_title'), text: t('cart.empty_text'), action: html`<button class="btn btn--primary" type="button">${t('cart.continue')}</button>` })}</div>
  <div class="sg-box">${emptyState({ iconName: 'alert', title: 'Something went wrong', text: t('errors.INTERNAL'), action: html`<button class="btn btn--secondary" type="button">${t('common.retry')}</button>` })}</div>
  <div class="sg-box"><div class="cart-line cart-line--skeleton"><span class="skel skel--thumb"></span><span class="skel skel--line"></span></div><div class="cart-line cart-line--skeleton"><span class="skel skel--thumb"></span><span class="skel skel--line"></span></div></div>
</div></section>

<section class="sg-section"><h2>Icons (names for the trust strip)</h2>
  <p class="muted">Use these names in "trust_strip_json", e.g. {"icon": "truck", "text": "Free delivery"}.</p>
  <ul class="sg-icons" role="list" data-sg-icons></ul></section>

<section class="sg-section"><h2>Rich text (product descriptions)</h2>
  <div class="prose sg-box">
    <h3>Heading</h3><p class="rt-lh-15">Normal text with <strong>bold</strong>, <em>italic</em>, <u>underline</u>, <s>strike</s>, <mark>highlight</mark>, <span class="rt-c-primary">brand colour</span>, <span class="rt-c-red">red</span>, <span class="rt-hl-green">green highlight</span>, H<sub>2</sub>O and x<sup>2</sup>.</p>
    <p class="rt-center rt-lg">Centred, larger text</p>
    <ul class="rt-list-check"><li>Tick list</li><li>Second point</li></ul><ol><li>Numbered</li><li>List</li></ol>
    <div class="rt-table-wrap"><table class="rt-table-striped"><thead><tr><th>Size</th><th>Chest</th><th>Length</th></tr></thead><tbody><tr><td>M</td><td>38</td><td>28</td></tr><tr><td>L</td><td>40</td><td>29</td></tr></tbody></table></div>
    <p class="rt-note">A note box for tips.</p><p class="rt-warn">A warning box.</p><blockquote>A quotation.</blockquote>
  </div></section>

<section class="sg-section"><h2>Admin pieces</h2><div class="sg-grid">
  <div class="card stat-card"><span class="stat-card__label">Today's revenue</span><span class="stat-card__value">${formatRupees(4567800)}</span><span class="stat-card__change stat-card__change--up">▲ 12% vs last week</span></div>
  <div class="card stat-card"><span class="stat-card__label">Orders needing action</span><span class="stat-card__value">7</span><span class="stat-card__change stat-card__change--down">▼ 2 overdue</span></div>
  <div class="card"><h3 class="card__title">Orders per day</h3>${chart()}</div></div>
  <div class="sg-admin-row"><span class="status status--amber">Check this payment</span><span><span class="sg-admin-row__id">ORD-260923-AB3K9</span><br><span class="caption">12 min ago · Priya R. · 98765 43210</span></span><strong class="num">${formatRupees(124000)}</strong>${icon('upi', 20)}<button class="btn btn--primary btn--sm" type="button">Check payment</button></div>
  <div class="sg-admin-card"><div class="sg-admin-card__top"><span class="status status--blue">Confirmed — to pack</span><span class="caption">2 h ago</span></div><span class="sg-admin-row__id">ORD-260923-7QM2X</span><span>Arun K. · 98400 12345</span><strong class="num">${formatRupees(89900)}</strong><button class="btn btn--primary btn--block" type="button">Mark packed</button></div>
</section>`;
}

async function boot() {
  await loadStrings('en');
  setHtml($('[data-sg-root]'), page());
  iconGallery();
  initDialogs();
  initSteppers();

  try { FONTS = (await (await fetch('/assets/fonts/fonts.json')).json()).fonts || []; } catch (e) { FONTS = []; }
  const nice = (v) => v.charAt(0) + v.slice(1).toLowerCase().replace('xlarge', 'Extra large');
  document.querySelectorAll('[data-sg-display]').forEach((el) => {
    const key = el.dataset.sgDisplay;
    const opts = key === 'font_body' ? [['system', 'Phone\'s own font'], ...FONTS.map((f) => [f.id, f.name])] : DISPLAY_OPTIONS[key].map((v) => [v, nice(v)]);
    setHtml(el, html`${opts.map(([v, label]) => html`<option value="${v}">${label}</option>`)}`);
    el.value = display[key];
    el.addEventListener('change', () => { display = { ...display, [key]: el.value, ...(key === 'font_body' ? { font_heading: el.value } : {}) }; applyTheme(); });
  });
  const sel = $('[data-sg-preset]');
  setHtml(sel, html`${Object.entries(THEME_PRESETS).map(([k, p]) => html`<option value="${k}">${p.name}</option>`)}`);
  sel.addEventListener('change', () => { preset = sel.value; applyTheme(); });
  $('[data-sg-mode]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    mode = b.dataset.mode;
    document.querySelectorAll('[data-sg-mode] [data-mode]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    applyTheme();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  const picker = $('[data-sg-picker]');
  wireVariantPicker(picker, PICKER, PICKER.variants[0], (v) => {
    picker.querySelector('[data-price-block]').outerHTML = priceBlock(PICKER, v, t, SETTINGS).toString();
  });

  const sw = $('[data-sg-switch]');
  sw.addEventListener('change', () => { $('[data-sg-switch-state]').textContent = sw.checked ? 'On' : 'Off'; });

  document.addEventListener('click', async (e) => {
    const tb = e.target.closest('[data-sg-toast]');
    if (tb) {
      const k = tb.dataset.sgToast;
      if (k === 'success') toast('Added to cart', { kind: 'success', action: 'View cart' });
      if (k === 'error') toast(t('errors.INTERNAL'), { kind: 'error' });
      if (k === 'undo') toast('Marked as packed', { action: 'Undo' });
    }
    if (e.target.closest('[data-sg-sheet]')) {
      const dlg = document.getElementById('sg-sheet');
      setHtml(dlg.querySelector('[data-sg-sheet-body]'), html`<div class="sheet__head"><h2 class="sheet__title" id="sg-sheet-title">Sample sheet</h2><button class="icon-btn" type="button" data-close-dialog aria-label="Close">${icon('close', 24)}</button></div>
        <div class="sheet__body"><p>On phones this slides up from the bottom (drag down to close). On larger screens it's a centred dialog.</p></div>
        <div class="sheet__actions"><button class="btn btn--secondary" type="button" data-close-dialog>Cancel</button><button class="btn btn--primary" type="button" data-close-dialog>Save</button></div>`);
      openDialog(dlg, { opener: e.target });
    }
    if (e.target.closest('[data-sg-confirm]')) {
      const ok = await confirmDialog({ title: 'Refund ₹1,240 to Priya?', text: 'This can\'t be undone.', confirmLabel: 'Refund', cancelLabel: 'Keep order', danger: true });
      toast(ok ? 'Confirmed' : 'Cancelled');
    }
  });
  applyTheme();
}

boot();

/* Icon gallery: reads every icon name from the sprite so the list is always complete. */
async function iconGallery() {
  const list = document.querySelector('[data-sg-icons]');
  if (!list) return;
  try {
    const txt = await (await fetch('/icons/sprite.svg')).text();
    const names = [...txt.matchAll(/id="i-([a-z0-9-]+)"/g)].map((m) => m[1]);
    setHtml(list, html`${names.map((n) => html`<li class="sg-icon">${icon(n, 24)}<code>${n}</code></li>`)}`);
  } catch (e) { /* offline: no gallery */ }
}
