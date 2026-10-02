/**
 * preview/frame.js — one preview screen inside the Design preview (/preview/).
 *
 * Draws a real shop page (home, category, product, all products, cart, contact) in this frame with
 * the owner's DRAFT settings, using exactly the same page templates and the same look (look.js) as
 * the live shop, then starts the normal page code so menus, photos, options, banners and pop-ups
 * work. Nothing is saved, nothing is sent to the server, and customers never see any of it.
 *
 * Talks only to its parent page on the same address (postMessage):
 *   frame → parent: { type: 'ready' } · { type: 'rendered', title, favicon, warnings } ·
 *                   { type: 'scroll', y } · { type: 'navigate', page, slug }
 *   parent → frame: { type: 'render', settings, page, slug, lang, theme, firstVisit, images, scrollY }
 */

import { setPreviewSettings, setPreviewImages } from '../settings.js';
import { loadStrings, t, LANGUAGES } from '../i18n.js';
import * as T from '../templates.js';
import { html } from '../html.js';
import { setHtml } from '../state.js';
import { lookCss, heroMetaContent } from '../look.js';
import { normalizeCover, COVER_SPEC, checkCoverPicture, isBlocking, coverWarnings } from '../cover.js';
import { checkPaints } from '../theme.js';
import { LIMITS } from '../limits.js';

const ORIGIN = location.origin;
const inFrame = window.parent !== window;
let images = {};   // "client/assets/x.jpg" → blob: address of a picture the owner is trying out
let sizesKb = {};  // "client/assets/x.jpg" → file size in KB

const send = (msg) => { if (inFrame) window.parent.postMessage(msg, ORIGIN); };
const getJson = (url, fallback) => fetch(url, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : fallback)).catch(() => fallback);
const getText = (url) => fetch(url).then((r) => (r.ok ? r.text() : '')).catch(() => '');
const clean = (p) => decodeURI(String(p || '')).replace(/^\//, '');
const urlFor = (path) => images[clean(path)] || '/' + clean(path).replace(/ /g, '%20');

function imageDims(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** The same checks the build does, so the preview warns about exactly what the build would. */
async function prepare(s, warnings, iconNames) {
  if (s.logo_path) {
    const src = T.localImagePath(s.logo_path, { svg: true });
    const dims = src ? await imageDims(urlFor(src)) : null;
    if (!src) { warnings.push(`Logo: "${s.logo_path}" must be a picture inside client/assets. The shop name is shown instead.`); s.logo_path = ''; }
    else if (!dims) { warnings.push(`Logo: "${clean(src)}" was not found. Upload it to GitHub (client/assets), or try it in the Pictures tab.`); s.logo_path = ''; }
    else { s._logo_w = dims.width; s._logo_h = dims.height; }
  }
  const lh = Number(s.logo_height_px);
  if (s.logo_height_px !== undefined && (lh < LIMITS.logo_height_px.min || lh > LIMITS.logo_height_px.max)) {
    warnings.push(`Logo height must be ${LIMITS.logo_height_px.min} to ${LIMITS.logo_height_px.max} pixels; the nearest allowed value is used.`);
  }
  const c = normalizeCover(s.hero_cover_json);
  if (c) {
    c._dims = {};
    for (const slot of Object.keys(COVER_SPEC)) {
      if (!c[slot]) continue;
      const src = T.localImagePath(c[slot]);
      const dims = src ? await imageDims(urlFor(src)) : null;
      const problem = src ? checkCoverPicture(slot, dims && { ...dims, kb: sizesKb[clean(src)] }) : `${COVER_SPEC[slot].label} picture: must be a .jpg, .png or .webp file inside client/assets. It was not used.`;
      if (problem) warnings.push('Cover: ' + problem);
      if (isBlocking(problem) || !dims) { c[slot] = ''; continue; }
      c._dims[slot] = { w: dims.width, h: dims.height };
    }
    if (!c.desktop) { warnings.push('Cover: no usable computer picture (3 : 1, e.g. 1920 × 640), so the normal colour banner is shown.'); s.hero_cover_json = null; }
    else { coverWarnings(c).forEach((w) => warnings.push(w)); s.hero_cover_json = c; }
  }
  if (Array.isArray(s.trust_strip_json)) {
    s.trust_strip_json = s.trust_strip_json.map((it) => {
      if (it && it.icon && iconNames.size && !iconNames.has(it.icon)) { warnings.push(`Trust strip "${it.text}": there is no icon called "${it.icon}" (a tick is shown).`); return { ...it, icon: 'check' }; }
      return it;
    });
    if (s.trust_strip_json.length > LIMITS.trust_items) warnings.push(`Trust strip: the limit is ${LIMITS.trust_items} items.`);
  }
  if (Array.isArray(s.hero_banners_json) && s.hero_banners_json.length > LIMITS.banners) {
    warnings.push(`Banners: the limit is ${LIMITS.banners}; only the first ${LIMITS.banners} are shown.`);
    s.hero_banners_json = s.hero_banners_json.slice(0, LIMITS.banners);
  }
  if (s.tab_title_format && !String(s.tab_title_format).includes('{page}')) warnings.push('Tab names: tab_title_format must contain {page}. The standard format is used.');
  checkPaints(s).forEach((w) => warnings.push(w));
}

/** Pictures being tried out (not uploaded yet) are shown from this computer instead. */
function swapImages(root = document) {
  if (!Object.keys(images).length) return;
  root.querySelectorAll('img[src], source[srcset]').forEach((el) => {
    const attr = el.tagName === 'SOURCE' ? 'srcset' : 'src';
    const key = clean(el.getAttribute(attr));
    if (images[key]) el.setAttribute(attr, images[key]);
  });
}

function loadScript(src) {
  return new Promise((resolve) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = el.onerror = () => resolve();
    document.head.appendChild(el);
  });
}

/** "Pretend this is a customer's first visit": forget banners and pop-ups already seen here. */
function forgetSeen() {
  try {
    [localStorage, sessionStorage].forEach((store) => {
      Object.keys(store).filter((k) => /^(hero:|promo:|announce-dismissed)/.test(k)).forEach((k) => store.removeItem(k));
    });
  } catch (e) { /* private mode */ }
}

/** Links inside the preview open the matching preview page instead of the live shop. */
function wireLinks() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    const u = new URL(href, location.href);
    e.preventDefault();
    if (u.origin !== ORIGIN) { send({ type: 'note', text: `Outside link: ${u.href} (opens in a new tab on the real shop).` }); return; }
    const m = u.pathname.replace(/^\/(ta|hi|en)\//, '/').match(/^\/(?:(c|p)\/([^/]+)\/|(search|cart)\/|pages\/(contact)\/)?$/);
    if (!m) { send({ type: 'note', text: 'That page is not part of the preview.' }); return; }
    if (m[1] === 'c') send({ type: 'navigate', page: 'category', slug: decodeURIComponent(m[2]) });
    else if (m[1] === 'p') send({ type: 'navigate', page: 'product', slug: decodeURIComponent(m[2]) });
    else if (m[3]) send({ type: 'navigate', page: m[3] });
    else if (m[4]) send({ type: 'navigate', page: 'contact' });
    else send({ type: 'navigate', page: 'home' });
  }, true);
  document.addEventListener('submit', (e) => {
    if (e.target.matches('[data-search-form]')) { e.preventDefault(); send({ type: 'navigate', page: 'search' }); }
  }, true);
}

let rendered = false;

async function render(msg) {
  if (rendered) return; // one draw per frame load; the parent reloads the frame for every change
  rendered = true;
  images = msg.images || {};
  sizesKb = msg.sizes || {};
  const warnings = [];
  const [base, catalog, pagesList, fontsJson, sprite] = await Promise.all([
    getJson('/settings.public.json', {}), getJson('/catalog.json', { categories: [], products: [] }),
    getJson('/pages.json', []), getJson('/assets/fonts/fonts.json', { fonts: [] }), getText('/icons/sprite.svg')
  ]);
  const iconNames = new Set([...sprite.matchAll(/id="i-([a-z0-9-]+)"/g)].map((m) => m[1]));
  const s = { ...base, ...(msg.settings || {}) };
  if (msg.popups === false) s.popups_json = []; // pop-ups are switched off while the owner styles the shop
  const root = document.documentElement;
  const lang = LANGUAGES[msg.lang] ? msg.lang : (s.default_language || 'en');
  root.setAttribute('data-lang', lang);
  root.setAttribute('lang', (LANGUAGES[lang] || LANGUAGES.en).locale);
  if (msg.theme === 'light' || msg.theme === 'dark') root.setAttribute('data-theme', msg.theme);
  else root.removeAttribute('data-theme');

  await prepare(s, warnings, iconNames);
  if (msg.firstVisit !== false) forgetSeen();
  setPreviewSettings(s);
  setPreviewImages(images);
  await loadStrings(lang, (s.text_overrides_json || {})[lang] || null);
  T.setBase('');

  const cat = T.indexCatalog(catalog);
  const now = new Date();
  const ctx = { s, t, cat, now, langs: [], currentCategory: null };
  const sortList = (list) => list.slice().sort((a, b) => Number(T.isInStock(b)) - Number(T.isInStock(a)) || (a.bestseller_rank || 999) - (b.bestseller_rank || 999));
  let page = msg.page || 'home';
  let main = '';
  let title = '';
  const attrs = {};
  if (page === 'category') {
    const c = cat.categories.find((x) => x.slug === msg.slug) || cat.categories[0];
    if (!c) page = 'home';
    else {
      const list = sortList(cat.products.filter((p) => p.category_id === c.id || (cat.catById[p.category_id] && cat.catById[p.category_id].parent_id === c.id)));
      ctx.currentCategory = c.id;
      attrs['data-category'] = c.id;
      main = T.listingMain(ctx, { mode: 'category', title: c.name, products: list, category: c, crumbs: [{ name: t('common.home'), href: '/' }, { name: c.name }] });
      title = c.seo_title || T.tabTitle(s, c.name);
    }
  }
  if (page === 'product') {
    const p = cat.products.find((x) => x.slug === msg.slug) || cat.products[0];
    if (!p) page = 'home';
    else {
      let detail = await getJson(`/products/${encodeURIComponent(p.slug)}.json`, null);
      const over = msg.productOverride && msg.productOverride.slug === p.slug ? msg.productOverride : null;
      if (over) {
        // Product Page Try Out: the owner's trial description, key features and specifications.
        detail = { ...(detail || {}) };
        if (typeof over.description_html === 'string') detail.description_html = over.description_html;
        if (Array.isArray(over.highlights)) detail.highlights = over.highlights.map((x) => String(x).trim()).filter(Boolean);
        if (Array.isArray(over.specs)) detail.specs = over.specs;
      }
      const related = sortList(cat.products.filter((x) => x.id !== p.id && x.category_id === p.category_id));
      ctx.currentCategory = p.category_id;
      attrs['data-slug'] = p.slug;
      main = T.productMain(ctx, p, detail, related);
      title = (detail && detail.seo_title) || T.tabTitle(s, p.name);
    }
  }
  if (page === 'search') { main = T.listingMain(ctx, { mode: 'search', title: t('search.title_all'), products: sortList(cat.products), crumbs: [{ name: t('common.home'), href: '/' }, { name: t('search.title_all') }] }); title = T.tabTitle(s, t('search.title_all')); }
  if (page === 'cart') { main = T.cartPageMain(ctx); title = T.tabTitle(s, t('cart.title_plain')); }
  if (page === 'contact') { main = T.contactMain(ctx, null); title = T.tabTitle(s, t('footer.contact')); }
  if (page === 'home' || !main) {
    page = 'home';
    main = T.homeMain(ctx, { hasReturnPolicy: pagesList.some((x) => /refund|return/.test(x.slug)), pinnedRows: s.home_pinned_rows_json || [] });
    title = T.tabTitle(s, '') || s.business_name;
  }
  document.title = title;

  // Look: the very same CSS the build writes to brand.css.
  const css = lookCss(s, fontsJson.fonts || [], now);
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    document.adoptedStyleSheets = [sheet];
  } catch (e) {
    warnings.push('This browser is too old to show the preview colours. Please use a recent Chrome, Edge, Firefox or Safari.');
  }

  // Banner timing (the same tiny script the shop runs before drawing).
  document.querySelectorAll('meta[name="x-hero"]').forEach((m) => m.remove());
  root.classList.remove('hero-off');
  root.removeAttribute('data-hero-start');
  const heroMeta = page === 'home' ? heroMetaContent(s, now) : '';
  if (heroMeta) {
    const m = document.createElement('meta');
    m.name = 'x-hero';
    m.content = heroMeta;
    document.head.appendChild(m);
    await loadScript('/js/early.js?preview=' + Date.now());
  }

  document.body.setAttribute('data-page', page);
  Object.entries(attrs).forEach(([k, v]) => document.body.setAttribute(k, v));
  setHtml(document.body, html`<a class="skip-link" href="#main">${t('common.skip')}</a>
${T.announcementBar(ctx)}${T.header(ctx)}
<main id="main" tabindex="-1">${main}</main>
${T.footer(ctx, pagesList)}${T.sharedDialogs(ctx)}`);
  swapImages();

  wireLinks();
  const app = await import('../app.js');
  await app.boot({ preview: true });
  swapImages();
  new MutationObserver((list) => list.forEach((r) => r.addedNodes.forEach((n) => { if (n.nodeType === 1) swapImages(n); }))).observe(document.body, { childList: true, subtree: true });

  if (msg.scrollY) requestAnimationFrame(() => window.scrollTo(0, msg.scrollY));
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    setTimeout(() => { ticking = false; send({ type: 'scroll', y: Math.round(window.scrollY) }); }, 200);
  }, { passive: true });

  const fav = s.favicon_path ? T.localImagePath(s.favicon_path, { svg: true }) : '';
  send({ type: 'rendered', page, title, favicon: fav ? urlFor(fav) : '/client/assets/favicon.svg', warnings: [...new Set(warnings)] });
}

window.addEventListener('message', (e) => {
  if (e.origin !== ORIGIN || e.source !== window.parent || !e.data || e.data.type !== 'render') return;
  render(e.data).catch((err) => {
    send({ type: 'rendered', title: 'Preview problem', warnings: ['The preview could not draw this page: ' + (err && err.message ? err.message : err)] });
  });
});

if (inFrame) send({ type: 'ready' });
else {
  // Opened on its own: show the draft saved in this browser (or the live settings).
  let draft = {};
  try { draft = JSON.parse(localStorage.getItem('preview:draft') || '{}'); } catch (e) { draft = {}; }
  const q = new URLSearchParams(location.search);
  render({ type: 'render', settings: draft, page: q.get('page') || 'home', slug: q.get('slug') || '', lang: q.get('lang') || '', firstVisit: true });
}
