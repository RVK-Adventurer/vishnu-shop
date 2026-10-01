/**
 * templates.js — every piece of storefront markup, written ONCE and used by both:
 *   • the build (Node) to pre-render real HTML pages (fast first paint, Google and WhatsApp previews), and
 *   • the browser to re-render parts (filters, search results, cart, quick-add).
 * Layouts follow Section 23.2; component anatomy follows Section 23.4.
 *
 * Every function receives `ctx` = { s: settings, t: text function, cat: catalog index, now: Date }.
 * catalog index (see indexCatalog below) = { categories, products, byId, bySlug, bySku, catById, catBySlug }.
 */

import { html, raw, join, cls, esc, sanitizeRichText } from './html.js';
import { formatRupees, percentOff } from './money.js';
import { formatPhone } from './validators.js';

export const ICON_SPRITE = '/icons/sprite.svg';
const NEW_DAYS = 14;

/* ------------------------------------------------------------------ catalog helpers */

/** Builds fast look-ups for a catalog object (shape in docs/DATA_FILES.md). */
export function indexCatalog(catalog) {
  const categories = (catalog.categories || []).slice().sort((a, b) => (a.sort || 0) - (b.sort || 0) || a.name.localeCompare(b.name));
  const products = catalog.products || [];
  const byId = {};
  const bySlug = {};
  const bySku = {};
  const catById = {};
  const catBySlug = {};
  products.forEach((p) => {
    byId[p.id] = p;
    bySlug[p.slug] = p;
    (p.variants || []).forEach((v) => { bySku[v.sku] = { product: p, variant: v }; });
  });
  categories.forEach((c) => { catById[c.id] = c; catBySlug[c.slug] = c; });
  return { version: catalog.catalog_version, isSample: !!catalog.is_sample, categories, products, byId, bySlug, bySku, catById, catBySlug };
}

export function productUrl(p) { return `/p/${encodeURIComponent(p.slug)}/`; }
export function categoryUrl(c) { return `/c/${encodeURIComponent(c.slug)}/`; }
export function pageUrl(slug) { return `/pages/${encodeURIComponent(slug)}/`; }

/** Cheapest variant that is in stock (or the cheapest overall if none are). */
export function leadVariant(p) {
  const vs = (p.variants || []).filter((v) => v.active !== false);
  if (!vs.length) return null;
  const inStock = vs.filter((v) => v.in_stock);
  const pool = inStock.length ? inStock : vs;
  return pool.slice().sort((a, b) => a.price - b.price)[0];
}

export function isInStock(p) {
  return (p.variants || []).some((v) => v.in_stock && v.active !== false);
}

export function isLowStock(p) {
  const vs = (p.variants || []).filter((v) => v.in_stock);
  return vs.length > 0 && vs.every((v) => v.low_stock);
}

export function isNew(p, now) {
  if (!p.created_at) return false;
  return now.getTime() - new Date(p.created_at).getTime() < NEW_DAYS * 86400000;
}

export function hasPriceRange(p) {
  const prices = (p.variants || []).map((v) => v.price);
  return prices.length > 1 && Math.min(...prices) !== Math.max(...prices);
}

export function bestDiscount(p) {
  return Math.max(0, ...(p.variants || []).map((v) => percentOff(v.price, v.mrp)));
}

/** "3 sizes · 2 colours" from the product's option names (Section 23.4 product card). */
export function variantHint(p, t) {
  const names = p.option_names || [];
  if (!names.length || (p.variants || []).length < 2) return '';
  return names.map((name) => {
    const values = new Set((p.variants || []).map((v) => (v.options || {})[name]).filter(Boolean));
    if (values.size < 2) return '';
    return `${values.size} ${pluralOption(name, values.size, t)}`;
  }).filter(Boolean).join(' · ');
}

function pluralOption(name, n, t) {
  const key = name.toLowerCase();
  const known = { size: 'option.sizes', colour: 'option.colours', color: 'option.colours', weight: 'option.weights', pack: 'option.packs', material: 'option.materials' };
  if (known[key]) return t(known[key]);
  return key + (n > 1 ? 's' : '');
}

/** Option text for one variant, e.g. "500 g · Red". */
export function optionText(p, v) {
  return (p.option_names || []).map((n) => (v.options || {})[n]).filter(Boolean).join(' · ');
}

/* ------------------------------------------------------------------ small parts */

export function icon(name, size = 20, extraClass = '') {
  return html`<svg class="${cls('icon', extraClass)}" width="${size}" height="${size}" aria-hidden="true" focusable="false"><use href="${ICON_SPRITE}#i-${name}"></use></svg>`;
}

/** Responsive <img> for a product image object {thumb, card, full, w, h, alt}. */
export function productImg(img, { sizes = '(min-width: 1024px) 25vw, 50vw', eager = false, className = '', alt = '' } = {}) {
  if (!img) return html`<img class="${className}" src="/assets/placeholder-product.svg" alt="" width="600" height="600" loading="lazy" decoding="async">`;
  const srcs = [];
  if (img.thumb) srcs.push(`${img.thumb} 320w`);
  if (img.card && img.card !== img.thumb) srcs.push(`${img.card} 640w`);
  if (img.full && img.full !== img.card) srcs.push(`${img.full} 1200w`);
  const unique = new Set([img.thumb, img.card, img.full].filter(Boolean)).size > 1;
  return html`<img class="${className}" src="${img.card || img.full || img.thumb}" ${unique ? raw(`srcset="${esc(srcs.join(', '))}" sizes="${esc(sizes)}"`) : ''} alt="${alt || img.alt || ''}" width="${img.w || 600}" height="${img.h || 600}" ${eager ? raw('fetchpriority="high" loading="eager"') : raw('loading="lazy"')} decoding="async">`;
}

export function stars(avg, count, t, size = 14) {
  const rounded = Math.round(Number(avg) || 0);
  const items = [];
  for (let i = 1; i <= 5; i++) items.push(icon('star', size, i <= rounded ? 'star star--on' : 'star star--off'));
  return html`<span class="stars" role="img" aria-label="${t('product.rated', { avg: (Number(avg) || 0).toFixed(1), n: count })}">${items}</span>`;
}

export function priceInline(price, mrp, { from = false, size = 'card' } = {}, t) {
  const off = percentOff(price, mrp);
  return html`<span class="${cls('price-line', 'price-line--' + size)}">${from ? html`<span class="price-line__from">${t('product.from')}</span> ` : ''}<span class="price">${formatRupees(price)}</span>${off ? html` <s class="mrp"><span class="sr-only">${t('product.mrp')} </span>${formatRupees(mrp)}</s> <span class="off">${t('product.percent_off', { n: off })}</span>` : ''}</span>`;
}

/** Up to two badges in priority order (Section 23.4). */
export function badges(p, ctx) {
  const { t } = ctx;
  const out = [];
  if (!isInStock(p)) out.push(html`<span class="badge badge--grey">${t('badge.out_of_stock')}</span>`);
  const off = bestDiscount(p);
  if (off > 0 && out.length < 2) out.push(html`<span class="badge badge--accent">${t('product.percent_off', { n: off })}</span>`);
  if (isNew(p, ctx.now) && out.length < 2) out.push(html`<span class="badge badge--blue">${t('badge.new')}</span>`);
  if (p.bestseller_rank && out.length < 2) out.push(html`<span class="badge badge--amber">${t('badge.bestseller')}</span>`);
  if (isInStock(p) && isLowStock(p) && out.length < 2) out.push(html`<span class="badge badge--amber">${t('badge.few_left')}</span>`);
  return out.length ? html`<span class="pcard__badges">${out}</span>` : '';
}

/* ------------------------------------------------------------------ product card */

export function productCard(p, ctx, { eager = false } = {}) {
  const { t, s } = ctx;
  const lead = leadVariant(p);
  if (!lead) return '';
  const inStock = isInStock(p);
  const img = (p.images || [])[0];
  const img2 = (p.images || [])[1];
  const hint = variantHint(p, t);
  const showRating = s.reviews_enabled && p.rating_count > 0;
  const fit = s.product_image_fit === 'cover' ? 'fit-cover' : 'fit-contain';
  return html`<article class="${cls('pcard', { 'pcard--oos': !inStock })}" data-pid="${p.id}">
  <a class="pcard__link" href="${productUrl(p)}" data-prefetch="${p.slug}">
    <span class="${cls('pcard__media', fit)}">
      ${productImg(img, { eager, className: 'pcard__img', alt: p.name, sizes: '(min-width: 1440px) 18vw, (min-width: 1024px) 23vw, (min-width: 768px) 31vw, 48vw' })}
      ${img2 ? productImg(img2, { className: 'pcard__img2', alt: '', sizes: '(min-width: 1024px) 23vw, 48vw' }) : ''}
      ${badges(p, ctx)}
    </span>
    <span class="pcard__body">
      ${p.brand ? html`<span class="pcard__brand">${p.brand}</span>` : ''}
      <span class="pcard__name">${p.name}</span>
      ${showRating ? html`<span class="pcard__rating">${stars(p.rating_avg, p.rating_count, t)}<span class="pcard__count">(${p.rating_count})</span></span>` : ''}
      <span class="pcard__price">${priceInline(lead.price, lead.mrp, { from: hasPriceRange(p) }, t)}</span>
      ${hint ? html`<span class="pcard__hint">${hint}</span>` : ''}
    </span>
  </a>
  ${inStock ? html`<button class="pcard__add" type="button" data-quick-add="${p.id}" aria-label="${t('cart.add_named', { name: p.name })}">${icon('plus', 20)}</button>` : ''}
</article>`;
}

export function productGrid(products, ctx, { eagerCount = 0, label = '' } = {}) {
  return html`<div class="grid" data-grid ${label ? raw(`aria-label="${esc(label)}"`) : ''}>${products.map((p, i) => productCard(p, ctx, { eager: i < eagerCount }))}</div>`;
}

export function skeletonCards(n) {
  const one = html`<div class="pcard pcard--skeleton" aria-hidden="true"><span class="skel skel--media"></span><span class="skel skel--line"></span><span class="skel skel--line skel--short"></span><span class="skel skel--price"></span></div>`;
  return html`${Array.from({ length: n }, () => one)}`;
}

/* ------------------------------------------------------------------ rows, tiles, hero */

export function productRow({ id, title, products, viewAll, ctx, hidden = false }) {
  const { t } = ctx;
  return html`<section class="row" aria-labelledby="row-${id}" data-row="${id}" ${hidden ? raw('hidden') : ''}>
  <div class="row__head"><h2 class="row__title" id="row-${id}">${title}</h2>${viewAll ? html`<a class="btn btn--ghost btn--sm" href="${viewAll}">${t('common.view_all')}${icon('chevron-right', 16)}</a>` : ''}</div>
  <div class="row__track" data-row-track>${products.map((p) => productCard(p, ctx))}</div>
</section>`;
}

export function categoryTiles(categories, ctx) {
  const { t } = ctx;
  if (!categories.length) return '';
  return html`<section class="row row--cats" aria-labelledby="row-cats">
  <div class="row__head"><h2 class="row__title" id="row-cats">${t('home.shop_by_category')}</h2></div>
  <ul class="cat-tiles" role="list">${categories.map((c) => html`<li><a class="cat-tile" href="${categoryUrl(c)}">
    <span class="cat-tile__img">${c.image ? html`<img src="${c.image}" alt="" width="240" height="240" loading="lazy" decoding="async">` : icon('grid', 32)}</span>
    <span class="cat-tile__name">${c.name}</span></a></li>`)}</ul>
</section>`;
}

export function hero(ctx) {
  const { s, t } = ctx;
  const banners = Array.isArray(s.hero_banners_json) ? s.hero_banners_json.filter((b) => b && b.image) : [];
  if (!banners.length) {
    return html`<section class="hero hero--brand" aria-labelledby="hero-title">
  <div class="container hero__brand">
    <p class="hero__eyebrow">${t('home.welcome_to')}</p>
    <h1 class="hero__title" id="hero-title">${s.business_name}</h1>
    ${s.tagline ? html`<p class="hero__sub">${s.tagline}</p>` : ''}
    <a class="btn btn--light btn--lg" href="#main-products">${t('home.shop_now')}</a>
  </div>
  <span class="hero__shape hero__shape--a" aria-hidden="true"></span><span class="hero__shape hero__shape--b" aria-hidden="true"></span>
</section>`;
  }
  return html`<section class="hero" aria-roledescription="${t('home.carousel')}" aria-label="${t('home.highlights')}" data-hero ${s.hero_autorotate ? raw('data-autorotate') : ''}>
  <div class="hero__track" data-hero-track>${banners.map((b, i) => html`<div class="hero__slide" role="group" aria-roledescription="${t('home.slide')}" aria-label="${t('home.slide_n', { n: i + 1, total: banners.length })}">
    <picture>${b.image_mobile ? html`<source media="(max-width: 767px)" srcset="${b.image_mobile}">` : ''}<img class="hero__img" src="${b.image}" alt="${b.alt || ''}" width="1600" height="900" data-focal="${focalKey(b)}" ${i === 0 ? raw('fetchpriority="high" loading="eager"') : raw('loading="lazy"')} decoding="async"></picture>
    ${b.headline || b.subline || b.cta_text ? html`<span class="hero__overlay" aria-hidden="true"></span><div class="hero__text">
      ${b.headline ? (i === 0 ? html`<h1 class="hero__title">${b.headline}</h1>` : html`<p class="hero__title">${b.headline}</p>`) : ''}
      ${b.subline ? html`<p class="hero__sub">${b.subline}</p>` : ''}
      ${b.cta_text ? html`<a class="btn btn--primary btn--lg" href="${safeHref(b.cta_link || '#main-products')}">${b.cta_text}</a>` : ''}
    </div>` : ''}
  </div>`)}</div>
  ${banners.length > 1 ? html`<div class="hero__dots" role="tablist" aria-label="${t('home.choose_slide')}">${banners.map((b, i) => html`<button class="hero__dot" type="button" role="tab" aria-selected="${i === 0 ? 'true' : 'false'}" aria-label="${t('home.slide_n', { n: i + 1, total: banners.length })}" data-hero-dot="${i}"></button>`)}</div>` : ''}
  ${banners[0] && !banners[0].headline ? html`<h1 class="sr-only">${s.business_name}</h1>` : ''}
</section>`;
}

/** Key used to match a banner's focal point to a CSS rule in brand.css (no inline styles allowed). */
export function focalKey(b) {
  const x = Math.max(0, Math.min(100, Math.round(Number(b.focal_x ?? 50))));
  const y = Math.max(0, Math.min(100, Math.round(Number(b.focal_y ?? 50))));
  return `${x}-${y}`;
}

function safeHref(h) {
  const s = String(h || '').trim();
  return /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(s) && !/^\/\//.test(s) ? s : '#';
}

/* ------------------------------------------------------------------ settings-derived text */

/** The words a customer sees for each way of paying, built from enabled options (Section 23.6.3). */
export function paymentWays(s, t) {
  const out = [];
  const add = (x) => { if (!out.includes(x)) out.push(x); };
  (s.payment_options || []).forEach((o) => {
    if (o.id === 'RAZORPAY') {
      const sub = o.sub || [];
      ['upi', 'card', 'netbanking', 'wallet', 'emi', 'paylater'].forEach((k) => { if (sub.includes(k)) add(t('pay.sub.' + k)); });
    } else if (o.id === 'UPI_DIRECT') add(t('pay.sub.upi'));
    else if (o.id === 'BANK_TRANSFER') add(t('pay.bank'));
    else if (o.id === 'COD') add(t('pay.cod'));
  });
  return out;
}

export function codEnabled(s) {
  return (s.payment_options || []).some((o) => o.id === 'COD');
}

function upiEnabled(s) {
  return (s.payment_options || []).some((o) => o.id === 'UPI_DIRECT' || (o.id === 'RAZORPAY' && (o.sub || []).includes('upi')));
}

/** Announcement bar text: the owner's own, else built from settings (Section 23.6.1). '' = hidden. */
export function announcementText(s, t) {
  if (s.announcement_text) return s.announcement_text;
  if (s.announcement_auto === false) return '';
  if (s.shipping_mode !== 'FREE' && s.free_shipping_above_paise > 0) return t('announce.free_above', { amount: formatRupees(s.free_shipping_above_paise) });
  if (s.shipping_mode === 'FREE') return t('announce.free_delivery');
  if (codEnabled(s)) return t('announce.cod');
  return '';
}

/** Trust strip items (Section 23.6.2): the owner's own list, else built from settings. */
export function trustItems(s, t, { hasReturnPolicy = false } = {}) {
  if (Array.isArray(s.trust_strip_json) && s.trust_strip_json.length) return s.trust_strip_json.filter((x) => x && x.text).slice(0, 4);
  const items = [{ icon: 'shield', text: t('trust.secure') }];
  if (codEnabled(s)) items.push({ icon: 'cash', text: t('trust.cod') });
  if (upiEnabled(s)) items.push({ icon: 'upi', text: t('trust.upi') });
  if (hasReturnPolicy) items.push({ icon: 'refund', text: t('trust.returns') });
  if (items.length < 4 && s.default_delivery_days) items.push({ icon: 'truck', text: t('trust.delivery_days', { n: s.default_delivery_days }) });
  return items.slice(0, 4);
}

export function trustStrip(s, t, opts) {
  const items = trustItems(s, t, opts);
  if (!items.length) return '';
  return html`<ul class="trust" role="list" aria-label="${t('trust.label')}">${items.map((it) => html`<li class="trust__item">${icon(it.icon || 'check', 20)}<span>${it.text}</span></li>`)}</ul>`;
}

/* ------------------------------------------------------------------ page chrome */

export function announcementBar(ctx) {
  const text = announcementText(ctx.s, ctx.t);
  if (!text) return '';
  return html`<div class="announce" data-announce>
  <div class="container announce__inner"><p class="announce__text">${text}</p>
  <button class="icon-btn icon-btn--sm announce__close" type="button" data-announce-close aria-label="${ctx.t('common.dismiss')}">${icon('close', 16)}</button></div>
</div>`;
}

export function header(ctx) {
  const { s, t, cat } = ctx;
  const top = cat.categories.filter((c) => !c.parent_id);
  const inline = top.slice(0, 6);
  const more = top.slice(6);
  return html`<header class="site-header" data-header>
  <div class="container site-header__bar">
    <button class="icon-btn site-header__menu" type="button" data-open-dialog="menu-drawer" aria-label="${t('header.menu')}" aria-haspopup="dialog">${icon('menu', 24)}</button>
    <a class="brand" href="/" aria-label="${t('header.home_label', { name: s.business_name })}">
      ${s.logo_path ? html`<img class="brand__logo" src="${s.logo_path}" alt="" width="160" height="40">` : ''}
      <span class="${cls('brand__name', { 'brand__name--with-logo': !!s.logo_path })}">${s.business_name}</span>
    </a>
    <form class="site-search" role="search" action="/search/" method="get" data-search-form>
      <label class="sr-only" for="q-desktop">${t('search.label')}</label>
      <input class="input site-search__input" id="q-desktop" type="search" name="q" autocomplete="off" enterkeyhint="search"
        placeholder="${t('search.placeholder')}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="suggest-desktop" data-search-input>
      <button class="site-search__go" type="submit" aria-label="${t('search.submit')}">${icon('search', 20)}</button>
      <div class="suggest" id="suggest-desktop" role="listbox" aria-label="${t('search.suggestions')}" hidden data-suggest></div>
    </form>
    <div class="site-header__actions">
      <button class="icon-btn site-header__search" type="button" data-open-search aria-label="${t('search.open')}" aria-haspopup="dialog">${icon('search', 24)}</button>
      <button class="icon-btn cart-btn" type="button" data-open-cart aria-haspopup="dialog" aria-label="${t('cart.open', { n: 0 })}">${icon('cart', 24)}<span class="cart-btn__badge" data-cart-count hidden>0</span></button>
    </div>
  </div>
  ${top.length ? html`<nav class="catbar" aria-label="${t('header.categories')}">
    <div class="container catbar__inner">
      ${inline.map((c) => html`<a class="catbar__link" href="${categoryUrl(c)}" ${ctx.currentCategory === c.id ? raw('aria-current="page"') : ''}>${c.name}</a>`)}
      ${more.length ? html`<details class="catbar__more" data-more-menu><summary class="catbar__link">${t('header.more')}${icon('chevron-down', 16)}</summary>
        <div class="catbar__menu">${more.map((c) => html`<a class="catbar__menu-link" href="${categoryUrl(c)}">${c.name}</a>`)}</div></details>` : ''}
    </div>
  </nav>` : ''}
</header>
<div class="notices" data-notices aria-live="polite"></div>`;
}

/** The dialogs every page shares: category menu, cart drawer, search overlay, quick-add sheet, zoom. */
export function sharedDialogs(ctx) {
  const { t, cat, s } = ctx;
  const top = cat.categories.filter((c) => !c.parent_id);
  return html`<dialog class="drawer drawer--left" id="menu-drawer" aria-labelledby="menu-drawer-title">
  <div class="drawer__head"><h2 class="drawer__title" id="menu-drawer-title">${t('header.shop_by_category')}</h2>
    <button class="icon-btn" type="button" data-close-dialog aria-label="${t('common.close')}">${icon('close', 24)}</button></div>
  <nav class="drawer__body" aria-label="${t('header.categories')}">
    <ul class="menu-list" role="list">
      <li><a class="menu-list__link" href="/search/">${icon('grid', 20)}<span>${t('header.all_products')}</span>${icon('chevron-right', 16, 'menu-list__chev')}</a></li>
      ${top.map((c) => html`<li><a class="menu-list__link" href="${categoryUrl(c)}"><span>${c.name}</span>${icon('chevron-right', 16, 'menu-list__chev')}</a></li>`)}
    </ul>
    <ul class="menu-list menu-list--secondary" role="list">
      <li><a class="menu-list__link" href="/cart/">${icon('cart', 20)}<span>${t('cart.title_plain')}</span></a></li>
      <li><a class="menu-list__link" href="${pageUrl('contact')}">${icon('phone', 20)}<span>${t('footer.contact')}</span></a></li>
      ${s.whatsapp_number ? html`<li><a class="menu-list__link" href="https://wa.me/91${s.whatsapp_number}" rel="noopener" target="_blank">${icon('whatsapp', 20)}<span>${t('footer.whatsapp_us')}</span></a></li>` : ''}
    </ul>
  </nav>
</dialog>
<dialog class="drawer drawer--right" id="cart-drawer" aria-labelledby="cart-drawer-title">
  <div class="drawer__head"><h2 class="drawer__title" id="cart-drawer-title" data-cart-title>${t('cart.title_plain')}</h2>
    <button class="icon-btn" type="button" data-close-dialog aria-label="${t('common.close')}">${icon('close', 24)}</button></div>
  <div class="drawer__body" data-cart-body></div>
  <div class="drawer__foot" data-cart-foot></div>
</dialog>
<dialog class="search-sheet" id="search-overlay" aria-label="${t('search.label')}">
  <form class="search-sheet__bar" role="search" action="/search/" method="get" data-search-form>
    <button class="icon-btn" type="button" data-close-dialog aria-label="${t('common.back')}">${icon('arrow-left', 24)}</button>
    <label class="sr-only" for="q-mobile">${t('search.label')}</label>
    <input class="input search-sheet__input" id="q-mobile" type="search" name="q" autocomplete="off" enterkeyhint="search"
      placeholder="${t('search.placeholder')}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="suggest-mobile" data-search-input>
    <button class="icon-btn" type="submit" aria-label="${t('search.submit')}">${icon('search', 24)}</button>
  </form>
  <div class="search-sheet__body"><div id="suggest-mobile" role="listbox" aria-label="${t('search.suggestions')}" data-suggest data-suggest-sheet></div></div>
</dialog>
<dialog class="sheet" id="quick-add" aria-labelledby="quick-add-title"><div class="sheet__inner" data-quick-add-body></div></dialog>
<dialog class="sheet sheet--wide" id="zoom-dialog" aria-label="${t('product.zoom')}"><div class="sheet__inner zoom" data-zoom-body></div></dialog>
<dialog class="sheet" id="confirm-dialog" aria-labelledby="confirm-title"><div class="sheet__inner" data-confirm-body></div></dialog>
<div class="toasts" data-toasts aria-live="polite"></div>
<div class="sr-only" aria-live="assertive" data-live-assertive></div>
<div class="sr-only" aria-live="polite" data-live-polite></div>`;
}

export function footer(ctx, pages) {
  const { s, t } = ctx;
  const year = ctx.now.getFullYear();
  const footerPages = (pages || []).filter((p) => p.show_in_footer && p.slug !== 'contact' && p.slug !== 'about');
  const social = s.social_json || {};
  const socials = ['instagram', 'facebook', 'youtube', 'x'].filter((k) => social[k]);
  const address = [s.address_line1, s.address_line2, [s.city, s.shop_pincode].filter(Boolean).join(' '), s.state].filter(Boolean).join(', ');
  const ways = paymentWays(s, t);
  return html`<footer class="site-footer">
  <div class="container">
    <div class="footer-contact">
      <p class="footer-contact__name">${s.business_name}</p>
      ${address ? html`<p class="footer-contact__addr">${icon('map-pin', 16)}<span>${address}</span></p>` : ''}
      <p class="footer-contact__links">
        ${s.contact_phone ? html`<a class="footer-link" href="tel:+91${s.contact_phone}" data-tel="${s.contact_phone}">${icon('phone', 16)}${formatPhone(s.contact_phone)}</a>` : ''}
        ${s.whatsapp_number ? html`<a class="pill pill--whatsapp" href="https://wa.me/91${s.whatsapp_number}" rel="noopener" target="_blank">${icon('whatsapp', 16)}${t('footer.shop_on_whatsapp')}</a>` : ''}
      </p>
    </div>
    <div class="footer-cols">
      <section class="footer-sec" data-acc>
        <h2 class="footer-sec__title"><button class="footer-sec__toggle" type="button" aria-expanded="true" data-acc-toggle>${t('footer.about')}${icon('chevron-down', 16)}</button></h2>
        <div class="footer-sec__panel" data-acc-panel>
          ${s.tagline ? html`<p class="footer-sec__text">${s.tagline}</p>` : ''}
          ${s.hours_text ? html`<p class="footer-sec__text">${icon('clock', 16)} ${s.hours_text}</p>` : ''}
          <ul class="footer-list" role="list"><li><a class="footer-link" href="${pageUrl('about')}">${t('footer.about_us')}</a></li></ul>
          ${socials.length ? html`<p class="footer-social">${socials.map((k) => html`<a class="icon-btn" href="${social[k]}" rel="noopener" target="_blank" aria-label="${t('social.' + k)}">${icon(k, 20)}</a>`)}</p>` : ''}
        </div>
      </section>
      <section class="footer-sec" data-acc>
        <h2 class="footer-sec__title"><button class="footer-sec__toggle" type="button" aria-expanded="true" data-acc-toggle>${t('footer.care')}${icon('chevron-down', 16)}</button></h2>
        <div class="footer-sec__panel" data-acc-panel><ul class="footer-list" role="list">
          <li><a class="footer-link" href="${pageUrl('contact')}">${t('footer.contact')}</a></li>
          <li><a class="footer-link" href="/cart/">${t('cart.title_plain')}</a></li>
          ${footerPages.filter((p) => /shipping|refund|return/.test(p.slug)).map((p) => html`<li><a class="footer-link" href="${pageUrl(p.slug)}">${p.title}</a></li>`)}
        </ul></div>
      </section>
      <section class="footer-sec" data-acc>
        <h2 class="footer-sec__title"><button class="footer-sec__toggle" type="button" aria-expanded="true" data-acc-toggle>${t('footer.policies')}${icon('chevron-down', 16)}</button></h2>
        <div class="footer-sec__panel" data-acc-panel><ul class="footer-list" role="list">
          ${footerPages.filter((p) => !/shipping|refund|return/.test(p.slug)).map((p) => html`<li><a class="footer-link" href="${pageUrl(p.slug)}">${p.title}</a></li>`)}
        </ul></div>
      </section>
      <section class="footer-sec" data-acc>
        <h2 class="footer-sec__title"><button class="footer-sec__toggle" type="button" aria-expanded="true" data-acc-toggle>${t('footer.we_accept')}${icon('chevron-down', 16)}</button></h2>
        <div class="footer-sec__panel" data-acc-panel>
          ${ways.length ? html`<ul class="pay-badges" role="list">${ways.map((w) => html`<li class="pay-badge">${w}</li>`)}</ul>` : ''}
          ${s.gstin ? html`<p class="footer-sec__text">${t('footer.gstin')}: ${s.gstin}</p>` : ''}
          ${s.legal_name && s.legal_name !== s.business_name ? html`<p class="footer-sec__text">${s.legal_name}</p>` : ''}
        </div>
      </section>
    </div>
    ${s.footer_text ? html`<p class="footer-note">${s.footer_text}</p>` : ''}
    <p class="footer-copy">© ${year} ${s.legal_name || s.business_name}</p>
  </div>
</footer>`;
}

export function breadcrumbs(items, t) {
  return html`<nav class="crumbs" aria-label="${t('common.breadcrumb')}"><ol class="crumbs__list">${items.map((it, i) => (i === items.length - 1
    ? html`<li class="crumbs__item" aria-current="page">${it.name}</li>`
    : html`<li class="crumbs__item"><a href="${it.href}">${it.name}</a>${icon('chevron-right', 16)}</li>`))}</ol></nav>`;
}

export function emptyState({ iconName = 'info', title, text = '', action = '' }) {
  return html`<div class="empty"><span class="empty__icon">${icon(iconName, 56)}</span><h3 class="empty__title">${title}</h3>${text ? html`<p class="empty__text">${text}</p>` : ''}${action}</div>`;
}

export function notice(kind, text, extra = '') {
  const iconName = { info: 'info', warning: 'alert', danger: 'alert', success: 'check' }[kind] || 'info';
  return html`<div class="${cls('notice', 'notice--' + kind)}" role="${kind === 'danger' ? 'alert' : 'status'}">${icon(iconName, 20)}<p class="notice__text">${text}</p>${extra}</div>`;
}

/* ------------------------------------------------------------------ page bodies */

/** HOME — Layout A (category-driven) or B (straight to the grid), Section 23.2. */
export function homeMain(ctx, { hasReturnPolicy = false, pinnedRows = [] } = {}) {
  const { s, t, cat } = ctx;
  const active = cat.products.filter((p) => leadVariant(p));
  if (s.home_layout === 'B') {
    return html`<h1 class="sr-only">${s.business_name}</h1>
${trustStrip(s, t, { hasReturnPolicy })}
${listingMain(ctx, { mode: 'all', title: t('home.all_products'), products: active, hideTitle: true })}`;
  }
  const inStockFirst = (list) => list.slice().sort((a, b) => Number(isInStock(b)) - Number(isInStock(a)));
  const best = inStockFirst(active.filter((p) => p.bestseller_rank).sort((a, b) => a.bestseller_rank - b.bestseller_rank)).slice(0, 8);
  const newest = active.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 8);
  const deals = active.filter((p) => bestDiscount(p) > 0 && isInStock(p)).sort((a, b) => bestDiscount(b) - bestDiscount(a)).slice(0, 8);
  const rows = [];
  pinnedRows.forEach((r, i) => {
    const list = (r.product_ids || []).map((id) => cat.byId[id]).filter(Boolean);
    if (list.length >= 4) rows.push(productRow({ id: 'pin' + i, title: r.title, products: list.slice(0, 8), ctx }));
  });
  if (best.length >= 4) rows.push(productRow({ id: 'best', title: t('home.bestsellers'), products: best, viewAll: '/search/?sort=bestseller', ctx }));
  if (newest.length >= 4) rows.push(productRow({ id: 'new', title: t('home.new_arrivals'), products: newest, viewAll: '/search/?sort=newest', ctx }));
  if (deals.length >= 4) rows.push(productRow({ id: 'deals', title: t('home.deals'), products: deals, viewAll: '/search/?sort=discount', ctx }));
  const topCats = cat.categories.filter((c) => !c.parent_id);
  return html`${hero(ctx)}
<div class="container home">
  ${trustStrip(s, t, { hasReturnPolicy })}
  <div id="main-products" class="home__rows">
    ${categoryTiles(topCats, ctx)}
    ${rows}
    ${productRow({ id: 'recent', title: t('home.recently_viewed'), products: [], ctx, hidden: true })}
    ${!rows.length && active.length ? html`<section class="row" aria-labelledby="row-all"><div class="row__head"><h2 class="row__title" id="row-all">${t('home.all_products')}</h2><a class="btn btn--ghost btn--sm" href="/search/">${t('common.view_all')}</a></div>${productGrid(active.slice(0, 12), ctx)}</section>` : ''}
    ${!active.length ? emptyState({ iconName: 'box', title: t('home.no_products_title'), text: t('home.no_products_text') }) : ''}
  </div>
</div>`;
}

export const SORTS = ['relevance', 'bestseller', 'price_asc', 'price_desc', 'newest', 'discount', 'rating'];

/** Filter form, shared by the sidebar (large screens) and the bottom sheet (phones). */
export function filterForm(ctx, { mode, categories = [] }) {
  const { s, t } = ctx;
  return html`<form class="filters__form" data-filter-form novalidate>
  <fieldset class="filters__group"><legend class="filters__legend">${t('filters.price')}</legend>
    <div class="range" data-range>
      <div class="range__track"><span class="range__fill" data-range-fill></span>
        <input class="range__input" type="range" name="min_r" aria-label="${t('filters.min_price')}" data-range-min>
        <input class="range__input" type="range" name="max_r" aria-label="${t('filters.max_price')}" data-range-max></div>
      <div class="range__boxes">
        <label class="field field--inline"><span class="field__label">${t('filters.min')}</span><span class="input-affix"><span class="input-affix__pre">₹</span><input class="input" type="number" inputmode="numeric" min="0" name="min" data-min-box></span></label>
        <label class="field field--inline"><span class="field__label">${t('filters.max')}</span><span class="input-affix"><span class="input-affix__pre">₹</span><input class="input" type="number" inputmode="numeric" min="0" name="max" data-max-box></span></label>
      </div>
    </div>
  </fieldset>
  ${mode !== 'category' && categories.length ? html`<fieldset class="filters__group"><legend class="filters__legend">${t('filters.category')}</legend>
    ${categories.map((c) => html`<label class="check"><input type="checkbox" name="cat" value="${c.slug}"><span>${c.name}</span></label>`)}</fieldset>` : ''}
  ${s.reviews_enabled ? html`<fieldset class="filters__group"><legend class="filters__legend">${t('filters.rating')}</legend>
    <label class="check"><input type="radio" name="rating" value="" checked><span>${t('filters.any_rating')}</span></label>
    <label class="check"><input type="radio" name="rating" value="4"><span>${t('filters.rating_up', { n: 4 })}</span></label>
    <label class="check"><input type="radio" name="rating" value="3"><span>${t('filters.rating_up', { n: 3 })}</span></label></fieldset>` : ''}
  <fieldset class="filters__group"><legend class="filters__legend">${t('filters.availability')}</legend>
    <label class="check"><input type="checkbox" name="avail" value="1"><span>${t('filters.in_stock_only')}</span></label></fieldset>
  <div class="filters__actions">
    <button class="btn btn--ghost" type="button" data-clear-filters>${t('filters.clear_all')}</button>
    <button class="btn btn--primary filters__apply" type="submit">${t('filters.show_results')}</button>
  </div>
</form>`;
}

/** Category, search and "all products" pages (Section 23.2 CATEGORY / SEARCH RESULTS). */
export function listingMain(ctx, { mode, title, products, category = null, crumbs = null, hideTitle = false, perPage = 24 }) {
  const { t, s, cat } = ctx;
  const first = products.slice(0, perPage);
  const topCats = cat.categories.filter((c) => !c.parent_id);
  return html`<div class="container listing-page">
  ${crumbs ? breadcrumbs(crumbs, t) : ''}
  <div class="listing__head ${hideTitle ? 'listing__head--compact' : ''}">
    ${hideTitle ? '' : html`<h1 class="listing__title" data-listing-title>${title}</h1>`}
    <p class="listing__count" data-result-count aria-live="polite">${products.length ? t('listing.count', { n: products.length }) : ''}</p>
  </div>
  <div class="listing" data-listing data-mode="${mode}" ${category ? raw(`data-category="${esc(category.id)}"`) : ''}>
    <aside class="filters" aria-label="${t('filters.title')}" data-filters-aside>${filterForm(ctx, { mode, categories: topCats })}</aside>
    <div class="listing__main">
      <div class="listing__bar">
        <button class="btn btn--secondary btn--sm listing__filter-btn" type="button" data-open-filters aria-haspopup="dialog">${icon('filter', 18)}${t('filters.title')}<span class="count-dot" data-filter-count hidden></span></button>
        <label class="sort"><span class="sort__label">${t('sort.label')}</span>
          <select class="select select--sm" name="sort" data-sort>
            ${SORTS.filter((k) => (k !== 'rating' || s.reviews_enabled) && (k !== 'relevance' || mode === 'search')).map((k) => html`<option value="${k}">${t('sort.' + k)}</option>`)}
          </select></label>
      </div>
      <div class="chips" data-active-filters></div>
      ${first.length ? productGrid(first, ctx, { eagerCount: 2, label: title }) : html`<div class="grid" data-grid></div>`}
      <div data-listing-empty ${first.length || mode === 'search' ? raw('hidden') : ''}>${emptyState({ iconName: 'search', title: t('listing.empty_title'), text: t('listing.empty_text'), action: html`<button class="btn btn--ghost" type="button" data-clear-filters>${t('filters.clear_all')}</button>` })}</div>
      <div class="listing__more"><button class="btn btn--secondary" type="button" data-load-more ${products.length > perPage ? '' : raw('hidden')}>${t('listing.load_more')}</button></div>
    </div>
  </div>
</div>
<dialog class="sheet" id="filters-sheet" aria-labelledby="filters-sheet-title"><div class="sheet__inner">
  <div class="sheet__head"><h2 class="sheet__title" id="filters-sheet-title">${t('filters.title')}</h2><button class="icon-btn" type="button" data-close-dialog aria-label="${t('common.close')}">${icon('close', 24)}</button></div>
  <div class="sheet__body" data-filters-sheet-body></div>
</div></dialog>`;
}

const COLOUR_NAMES = {
  black: '#111827', white: '#F9FAFB', red: '#DC2626', maroon: '#7F1D1D', pink: '#EC4899', rose: '#F43F5E', orange: '#EA580C',
  yellow: '#FACC15', mustard: '#CA8A04', gold: '#D4A017', golden: '#D4A017', green: '#16A34A', 'bottle green': '#14532D',
  olive: '#4D7C0F', teal: '#0F766E', blue: '#2563EB', navy: '#1E3A8A', 'navy blue': '#1E3A8A', 'sky blue': '#38BDF8',
  purple: '#7E22CE', violet: '#7C3AED', lavender: '#C4B5FD', brown: '#78350F', beige: '#E7D7B9', cream: '#FDF6E3',
  grey: '#6B7280', gray: '#6B7280', silver: '#C0C0C0', magenta: '#C026D3', peach: '#FDBA74', turquoise: '#2DD4BF', multicolour: ''
};

export function colourHex(value) {
  const k = String(value || '').trim().toLowerCase();
  return COLOUR_NAMES[k] || '';
}

export function isColourOption(name) {
  return /colou?r|shade/i.test(String(name || ''));
}

/** Variant selector rows (Section 23.4 VARIANT SELECTOR). Selection state is applied by product.js. */
export function variantSelectors(p, selected, t) {
  const names = p.option_names || [];
  if (!names.length || (p.variants || []).length < 2) return '';
  return html`${names.map((name) => {
    const values = [];
    (p.variants || []).forEach((v) => {
      const val = (v.options || {})[name];
      if (val && !values.includes(val)) values.push(val);
    });
    const colour = isColourOption(name);
    const current = selected ? (selected.options || {})[name] : '';
    return html`<fieldset class="vsel" data-option="${name}">
      <legend class="vsel__legend">${name}: <span class="vsel__value" data-option-value>${current || ''}</span></legend>
      <div class="vsel__opts">${values.map((val) => {
        const hex = colour ? colourHex(val) : '';
        return html`<button type="button" class="${cls('vsel__opt', { 'vsel__opt--swatch': colour && !!hex })}" data-value="${val}" aria-pressed="${val === current ? 'true' : 'false'}" ${colour && hex ? raw(`aria-label="${esc(val)}" data-swatch="${esc(hex)}"`) : ''}>
          ${colour && hex ? html`<span class="vsel__swatch" data-swatch-fill="${hex}"></span>` : html`<span class="vsel__text">${val}</span>`}${icon('check', 16, 'vsel__check')}</button>`;
      })}</div>
    </fieldset>`;
  })}`;
}

export function priceBlock(p, v, t, s) {
  const off = percentOff(v.price, v.mrp);
  return html`<div class="price-block" data-price-block>
  <p class="price-block__row"><span class="price-block__price">${formatRupees(v.price)}</span>${off ? html`<s class="price-block__mrp"><span class="sr-only">${t('product.mrp')} </span>${formatRupees(v.mrp)}</s><span class="chip chip--success">${t('product.percent_off', { n: off })}</span>` : ''}</p>
  ${s.show_inclusive_tax_note !== false && s.prices_include_tax !== false ? html`<p class="price-block__tax">${t('product.incl_taxes')}</p>` : ''}
  ${off ? html`<p class="price-block__save">${t('product.you_save', { amount: formatRupees(v.mrp - v.price) })}</p>` : ''}
</div>`;
}

export function stepper({ value = 1, min = 1, max = 99, label, name = 'qty', trashAtMin = false, t }) {
  return html`<div class="stepper" data-stepper ${trashAtMin ? raw('data-trash="1"') : ''}>
  <button class="stepper__btn" type="button" data-step="-1" aria-label="${trashAtMin && value <= min ? t('cart.remove') : t('common.decrease')}" ${!trashAtMin && value <= min ? raw('disabled') : ''}>${icon(trashAtMin && value <= min ? 'trash' : 'minus', 18)}</button>
  <input class="stepper__input" type="number" inputmode="numeric" name="${name}" value="${value}" min="${min}" max="${max}" aria-label="${label}" data-step-input>
  <button class="stepper__btn" type="button" data-step="1" aria-label="${t('common.increase')}" ${value >= max ? raw('disabled') : ''}>${icon('plus', 18)}</button>
</div>`;
}

/** PRODUCT PAGE (Section 23.2 PRODUCT PAGE). `detail` adds description, specs and all images. */
export function productMain(ctx, p, detail, related) {
  const { s, t, cat } = ctx;
  const lead = leadVariant(p);
  const images = (detail && detail.images && detail.images.length ? detail.images : p.images) || [];
  const category = cat.catById[p.category_id];
  const crumbs = [{ name: t('common.home'), href: '/' }];
  if (category) crumbs.push({ name: category.name, href: categoryUrl(category) });
  crumbs.push({ name: p.name });
  const showRating = s.reviews_enabled && p.rating_count > 0;
  const ways = paymentWays(s, t);
  const fit = s.product_image_fit === 'cover' ? 'fit-cover' : 'fit-contain';
  const inStock = isInStock(p);
  const specs = (detail && detail.specs) || [];
  const data = {
    id: p.id, slug: p.slug, name: p.name, option_names: p.option_names || [], variants: p.variants || [],
    images, lead_sku: lead ? lead.sku : '', category_id: p.category_id, order_mode: p.order_mode || 'DEFAULT'
  };
  return html`<div class="container product-page" data-product-page>
  ${breadcrumbs(crumbs, t)}
  <div class="pdp">
    <div class="pdp__gallery gallery" data-gallery>
      <div class="${cls('gallery__track', fit)}" data-gallery-track tabindex="0" aria-label="${t('product.images_label', { name: p.name })}">
        ${images.length ? images.map((img, i) => html`<figure class="gallery__slide" data-slide="${i}">
          <button class="gallery__zoom" type="button" data-zoom="${i}" aria-label="${t('product.zoom_n', { n: i + 1 })}">${productImg(img, { eager: i === 0, className: 'gallery__img', alt: i === 0 ? (img.alt || p.name) : (img.alt || ''), sizes: '(min-width: 1024px) 50vw, 100vw' })}</button>
        </figure>`) : html`<figure class="gallery__slide">${productImg(null, { className: 'gallery__img' })}</figure>`}
      </div>
      ${images.length > 1 ? html`<div class="gallery__dots" aria-hidden="true">${images.map((x, i) => html`<span class="${cls('gallery__dot', { 'is-active': i === 0 })}" data-dot="${i}"></span>`)}</div>
      <div class="gallery__thumbs" role="list">${images.map((img, i) => html`<button class="gallery__thumb" type="button" role="listitem" data-thumb="${i}" aria-label="${t('product.show_image_n', { n: i + 1 })}" aria-current="${i === 0 ? 'true' : 'false'}"><img src="${img.thumb || img.card}" alt="" width="64" height="64" loading="lazy" decoding="async"></button>`)}</div>` : ''}
    </div>
    <div class="pdp__info">
      ${p.brand ? html`<p class="pdp__brand">${p.brand}</p>` : ''}
      <h1 class="pdp__title">${p.name}</h1>
      ${showRating ? html`<a class="pdp__rating" href="#reviews">${stars(p.rating_avg, p.rating_count, t, 16)}<span>${t('product.reviews_count', { n: p.rating_count })}</span></a>` : ''}
      ${lead ? priceBlock(p, lead, t, s) : ''}
      <form class="pdp__buy" data-buy-form novalidate>
        ${variantSelectors(p, lead, t)}
        <div class="pdp__qty"><span class="pdp__qty-label" id="qty-label">${t('product.quantity')}</span>${stepper({ value: 1, label: t('product.quantity'), t })}</div>
        <p class="pdp__stock" data-stock aria-live="polite">${inStock ? (isLowStock(p) ? t('badge.few_left') : '') : t('product.out_of_stock_long')}</p>
        <div class="pdp__actions">
          <button class="btn btn--primary btn--lg" type="submit" data-add-to-cart ${inStock ? '' : raw('disabled')}>${icon('cart', 20)}${t('cart.add')}</button>
          <button class="btn btn--secondary btn--lg" type="button" data-buy-now ${inStock ? '' : raw('disabled')}>${t('product.buy_now')}</button>
        </div>
      </form>
      <form class="pin-check" data-pin-check novalidate>
        <label class="pin-check__label" for="pin-input">${icon('truck', 20)}${t('product.check_delivery')}</label>
        <div class="pin-check__row">
          <input class="input" id="pin-input" type="text" inputmode="numeric" autocomplete="postal-code" maxlength="6" pattern="[0-9]*" placeholder="${t('product.pincode_placeholder')}" data-pin-input>
          <button class="btn btn--secondary" type="submit">${t('product.check')}</button>
        </div>
        <p class="pin-check__result" data-pin-result aria-live="polite"></p>
      </form>
      ${ways.length ? html`<p class="pdp__ways">${icon('lock', 16)}<span><strong>${t('product.ways_to_pay')}</strong> ${ways.join(' · ')}</span></p>` : ''}
      <div class="pdp__links">
        <button class="btn btn--ghost btn--sm" type="button" data-share>${icon('share', 18)}${t('product.share')}</button>
        ${s.whatsapp_number ? html`<a class="btn btn--ghost btn--sm" href="https://wa.me/91${s.whatsapp_number}?text=${encodeURIComponent(t('product.ask_text', { name: p.name }))}" rel="noopener" target="_blank" data-ask-whatsapp>${icon('whatsapp', 18)}${t('product.ask_whatsapp')}</a>` : ''}
      </div>
    </div>
  </div>
  ${detail && detail.description_html ? html`<section class="pdp__section" aria-labelledby="desc-title"><h2 class="pdp__h2" id="desc-title">${t('product.description')}</h2><div class="prose">${sanitizeRichText(detail.description_html)}</div></section>` : ''}
  ${specs.length ? html`<section class="pdp__section" aria-labelledby="spec-title"><h2 class="pdp__h2" id="spec-title">${t('product.specifications')}</h2>
    <table class="spec-table"><tbody>${specs.map((row) => html`<tr><th scope="row">${row[0]}</th><td>${row[1]}</td></tr>`)}</tbody></table></section>` : ''}
  ${showRating ? html`<section class="pdp__section" id="reviews" aria-labelledby="rev-title"><h2 class="pdp__h2" id="rev-title">${t('product.reviews')}</h2>
    <p class="pdp__rating-big"><span class="pdp__rating-num">${Number(p.rating_avg).toFixed(1)}</span>${stars(p.rating_avg, p.rating_count, t, 20)}<span>${t('product.reviews_count', { n: p.rating_count })}</span></p></section>` : ''}
  ${related && related.length >= 2 ? productRow({ id: 'related', title: t('product.related'), products: related.slice(0, 8), ctx }) : ''}
  ${productRow({ id: 'recent', title: t('home.recently_viewed'), products: [], ctx, hidden: true })}
  <div class="sticky-buy" data-sticky-buy hidden>
    <div class="sticky-buy__price" data-sticky-price>${lead ? formatRupees(lead.price) : ''}</div>
    <button class="btn btn--primary btn--lg" type="button" data-sticky-add ${inStock ? '' : raw('disabled')}>${t('cart.add')}</button>
  </div>
  <script type="application/json" id="product-data">${raw(JSON.stringify(data).replace(/</g, '\\u003c'))}</script>
</div>`;
}

export function pageMain(ctx, page) {
  const { t } = ctx;
  return html`<div class="container container--prose static-page">
  ${breadcrumbs([{ name: t('common.home'), href: '/' }, { name: page.title }], t)}
  <h1 class="static-page__title">${page.title}</h1>
  <div class="prose">${sanitizeRichText(page.html)}</div>
  ${page.is_template ? html`<p class="static-page__note">${icon('info', 16)}${t('pages.template_note')}</p>` : ''}
</div>`;
}

export function contactMain(ctx, page) {
  const { s, t } = ctx;
  const address = [s.address_line1, s.address_line2, [s.city, s.shop_pincode].filter(Boolean).join(' '), s.state].filter(Boolean).join(', ');
  const maps = s.maps_url || (address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.business_name + ', ' + address) : '');
  return html`<div class="container static-page">
  ${breadcrumbs([{ name: t('common.home'), href: '/' }, { name: page ? page.title : t('footer.contact') }], t)}
  <h1 class="static-page__title">${page ? page.title : t('footer.contact')}</h1>
  ${page && page.html ? html`<div class="prose">${sanitizeRichText(page.html)}</div>` : ''}
  <div class="contact-grid">
    <section class="card contact-card" aria-labelledby="reach-title">
      <h2 class="card__title" id="reach-title">${t('contact.reach_us')}</h2>
      <div class="contact-card__buttons">
        ${s.whatsapp_number ? html`<a class="btn btn--primary btn--lg btn--block" href="https://wa.me/91${s.whatsapp_number}" rel="noopener" target="_blank">${icon('whatsapp', 20)}${t('contact.whatsapp')}</a>` : ''}
        ${s.contact_phone ? html`<a class="btn btn--secondary btn--lg btn--block" href="tel:+91${s.contact_phone}" data-tel="${s.contact_phone}">${icon('phone', 20)}${t('contact.call', { phone: formatPhone(s.contact_phone) })}</a>` : ''}
        ${s.contact_email ? html`<a class="btn btn--secondary btn--lg btn--block" href="mailto:${s.contact_email}">${icon('mail', 20)}${s.contact_email}</a>` : ''}
      </div>
      ${address ? html`<p class="contact-card__addr">${icon('map-pin', 20)}<span>${address}${maps ? html`<br><a href="${maps}" rel="noopener" target="_blank">${t('contact.open_maps')}</a>` : ''}</span></p>` : ''}
      ${s.hours_text ? html`<p class="contact-card__addr">${icon('clock', 20)}<span>${s.hours_text}</span></p>` : ''}
    </section>
    <section class="card contact-card" aria-labelledby="msg-title" data-contact-form-slot>
      <h2 class="card__title" id="msg-title">${t('contact.message_title')}</h2>
      <p class="muted">${t('contact.form_soon')}</p>
    </section>
  </div>
</div>`;
}

export function cartPageMain(ctx) {
  const { t } = ctx;
  return html`<div class="container cart-page" data-cart-page>
  <h1 class="cart-page__title" data-cart-page-title>${t('cart.title_plain')}</h1>
  <div class="cart-layout">
    <div class="cart-layout__lines" data-cart-page-lines>${skeletonLines(2)}</div>
    <aside class="card cart-summary" data-cart-page-summary aria-label="${t('cart.summary')}"></aside>
  </div>
  <noscript><p class="notice notice--info">${t('common.needs_js')}</p></noscript>
</div>`;
}

function skeletonLines(n) {
  return html`${Array.from({ length: n }, () => html`<div class="cart-line cart-line--skeleton" aria-hidden="true"><span class="skel skel--thumb"></span><span class="skel skel--line"></span></div>`)}`;
}

/** Until online checkout is installed (Phase 3), orders go to the shop on WhatsApp. */
export function checkoutSoonMain(ctx) {
  const { s, t } = ctx;
  return html`<div class="container container--narrow checkout-soon" data-checkout-soon>
  <div class="card checkout-soon__card">
    <span class="empty__icon">${icon('whatsapp', 48)}</span>
    <h1 class="checkout-soon__title">${t('checkout_soon.title')}</h1>
    <p>${t('checkout_soon.text')}</p>
    <div data-checkout-soon-summary></div>
    ${s.whatsapp_number ? html`<a class="btn btn--primary btn--lg btn--block" href="https://wa.me/91${s.whatsapp_number}" rel="noopener" target="_blank" data-wa-order>${icon('whatsapp', 20)}${t('checkout_soon.send')}</a>` : ''}
    <a class="btn btn--ghost btn--block" href="/cart/">${t('checkout_soon.back')}</a>
  </div>
</div>`;
}

export function notFoundMain(ctx) {
  const { t } = ctx;
  return html`<div class="container center-page">${emptyState({ iconName: 'search', title: t('notfound.title'), text: t('notfound.text'), action: html`<a class="btn btn--primary btn--lg" href="/">${t('notfound.back')}</a>` })}</div>`;
}

export function offlineMain(ctx) {
  const { t } = ctx;
  return html`<div class="container center-page">${emptyState({ iconName: 'wifi-off', title: t('offline.title'), text: t('offline.text'), action: html`<button class="btn btn--primary btn--lg" type="button" data-retry>${t('offline.retry')}</button>` })}
  <div data-offline-recent></div></div>`;
}

/* ------------------------------------------------------------------ cart line (browser) */

export function cartLine(line, ctx, { compact = true } = {}) {
  const { t } = ctx;
  const changed = line.status === 'price_changed';
  const gone = line.status === 'removed' || line.status === 'out_of_stock';
  return html`<div class="${cls('cart-line', { 'cart-line--issue': changed || gone })}" data-line="${line.sku}">
  <a class="cart-line__thumb" href="${line.url || '#'}">${line.img ? html`<img src="${line.img}" alt="" width="64" height="64" loading="lazy" decoding="async">` : icon('box', 32)}</a>
  <div class="cart-line__info">
    <a class="cart-line__name" href="${line.url || '#'}">${line.name}</a>
    ${line.option_text ? html`<p class="cart-line__opt">${line.option_text}</p>` : ''}
    ${changed ? html`<p class="cart-line__flag cart-line__flag--warn">${icon('alert', 16)}${t('cart.price_changed', { old: formatRupees(line.old_price), now: formatRupees(line.price) })}</p>` : ''}
    ${line.status === 'out_of_stock' ? html`<p class="cart-line__flag cart-line__flag--danger">${icon('alert', 16)}${t('cart.out_of_stock')}</p>` : ''}
    ${line.status === 'removed' ? html`<p class="cart-line__flag cart-line__flag--danger">${icon('alert', 16)}${t('cart.not_available')}</p>` : ''}
    <div class="cart-line__row">
      ${gone ? html`<button class="btn btn--ghost btn--sm" type="button" data-remove-line="${line.sku}">${icon('trash', 16)}${t('cart.remove')}</button>`
        : stepper({ value: line.qty, min: 1, max: 99, label: t('cart.qty_for', { name: line.name }), name: 'qty-' + line.sku, trashAtMin: true, t })}
      <span class="cart-line__total">${gone ? '' : formatRupees(line.price * line.qty)}</span>
    </div>
  </div>
  ${!compact && !gone ? html`<button class="icon-btn cart-line__remove" type="button" data-remove-line="${line.sku}" aria-label="${t('cart.remove_named', { name: line.name })}">${icon('trash', 20)}</button>` : ''}
</div>`;
}

export { html, raw, join, esc, cls };
