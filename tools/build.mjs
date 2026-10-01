/**
 * tools/build.mjs — turns the shop's data into a fast, finished website. Cloudflare Pages runs it
 * on every publish:  Build command  node tools/build.mjs   ·   Output directory  dist
 *
 * What it does (Section 9.8):
 *  1. Checks client/store.config.json (refuses a LIVE build that still contains REPLACE_ME).
 *  2. Reads the published data: data/catalog.json + data/products/*.json, data/settings.public.json,
 *     data/pages.json, data/pincode-rules.json. Until the admin publishes for the first time it uses
 *     the sample files (data/sample-*.json) so the shop can be previewed straight away.
 *  3. Copies public/ to dist/, bundles the CSS, writes brand colours (brand.css), the PWA manifest,
 *     the service worker, sitemap.xml and robots.txt.
 *  4. Pre-renders a real HTML page for the home page, every category, every product and every policy
 *     page, with titles, descriptions, link previews and structured data — because WhatsApp and
 *     Facebook previews do not run JavaScript.
 *  A bad product never stops the build: it is skipped and listed in the build log.
 *
 * Uses only Node's built-in modules. Environment variables: PRODUCTION=1 for the live shop.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

import { checkConfig } from './check-config.mjs';
import { setStrings, t, mergeStrings, applyOverrides, LANGUAGES } from '../public/js/i18n.js';
import { displayCss, fontPreload, DISPLAY_DEFAULTS } from '../public/js/display.js';
import { brandCss, THEME_PRESETS } from '../public/js/color.js';
import { html, raw } from '../public/js/html.js';
import * as T from '../public/js/templates.js';
import * as SEO from '../public/js/seo.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');
const DATA = path.join(ROOT, 'data');
const PRODUCTION = process.env.PRODUCTION === '1';
const NOW = new Date();

const log = { warnings: [], skipped: [] };
const warn = (m) => { log.warnings.push(m); console.log('  ! ' + m); };

/* ======================================================================== helpers */

function readJson(file, fallback = undefined) {
  if (!fs.existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error('Missing file: ' + path.relative(ROOT, file));
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`${path.relative(ROOT, file)} is not valid JSON: ${e.message}`);
  }
}

function write(rel, content) {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function copyDir(src, dest, skip = () => false) {
  if (!fs.existsSync(src)) return 0;
  let n = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    const rel = path.relative(PUB, s).split(path.sep).join('/');
    if (skip(rel, entry)) continue;
    if (entry.isDirectory()) {
      n += copyDir(s, d, skip);
    } else {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
      n++;
    }
  }
  return n;
}

function hash(text, len = 10) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, len);
}

function gzipSize(text) {
  return zlib.gzipSync(Buffer.from(text), { level: 9 }).length;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* ======================================================================== settings */

/** The public settings a fresh shop starts with (mirrors the "pub" settings in apps-script/Config.gs). */
function defaultPublicSettings() {
  return {
    business_name: 'My Shop', tagline: 'Quality products, delivered to your door', logo_path: '', favicon_path: '',
    theme_preset: 'ROYAL_INDIGO', primary_color: '#4338CA', secondary_color: '#0F766E', accent_color: '#F59E0B',
    font_body: 'system', font_heading: 'system', product_image_fit: 'contain', hero_banners_json: [], hero_autorotate: false,
    announcement_text: '', announcement_auto: true, trust_strip_json: [], home_layout: 'A', home_pinned_rows_json: [],
    store_open: true, weekly_hours_json: {}, closed_message: 'We are currently closed. You can still browse — ordering opens again soon.',
    hours_text: '', legal_name: '', contact_phone: '', contact_email: '', whatsapp_number: '', address_line1: '', address_line2: '',
    city: '', state: 'Tamil Nadu', shop_pincode: '', maps_url: '', social_json: {}, gstin: '', gst_mode: 'UNREGISTERED',
    footer_text: '', show_busy_banner: false, prices_include_tax: true, show_inclusive_tax_note: true, shipping_mode: 'FLAT',
    shipping_flat_paise: 4900, shipping_percent: 0, free_shipping_above_paise: 49900, default_delivery_days: 5,
    skip_sundays_delivery: false, cod_max_order_paise: 500000,
    customer_full_message: 'Thank you for shopping with us! We have received the maximum number of orders we can handle today. Please come back {reopen_time} — your cart is saved.',
    customer_busy_message: 'We are very busy right now. Please try again in a few minutes — your cart is saved.',
    reopen_time_text: 'tomorrow morning', reviews_enabled: true,
    // v1.9 additions (owner-controlled; see docs/V1.9_ADDITIONS.md)
    ...DISPLAY_DEFAULTS,
    sold_counts_mode: 'MONTH', sold_counts_min: 10,
    text_overrides_json: {}, languages_json: ['en'], default_language: 'en',
    popups_json: [], announcement_starts_at: '', announcement_ends_at: '',
    payment_options: [
      { id: 'RAZORPAY', label: 'UPI, Cards & Net Banking', sub: ['upi', 'card', 'netbanking', 'wallet', 'emi', 'paylater'] },
      { id: 'COD', label: 'Cash on Delivery', sub: [] }
    ]
  };
}

/** Practice-mode stand-ins for details still marked REPLACE_ME, so the preview looks complete. */
const DEMO = {
  name: 'Demo Shop', legal_name: 'Demo Shop (sample details)', phone: '9876543210', whatsapp: '9876543210',
  email: 'hello@example.com', address_line1: '12, Market Road', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641001',
  default_title: 'Demo Shop — shop online', default_description: 'Fresh sweets, spices, kitchenware and clothing, delivered to your door.'
};

function cfgValue(v, demoKey) {
  if (typeof v === 'string' && v.includes('REPLACE_ME')) return PRODUCTION ? '' : (DEMO[demoKey] ?? '');
  return v ?? '';
}

/**
 * Settings for this build: the admin-published data/settings.public.json when it exists, otherwise
 * the starting values from client/store.config.json on top of the defaults.
 */
function buildSettings(cfg) {
  const published = readJson(path.join(DATA, 'settings.public.json'), null);
  const s = defaultPublicSettings();
  if (published) return { ...s, ...published, _source: 'published' };
  const b = cfg.business || {};
  const br = cfg.branding || {};
  Object.assign(s, {
    business_name: cfgValue(b.name, 'name') || s.business_name,
    legal_name: cfgValue(b.legal_name, 'legal_name'),
    tagline: cfgValue(b.tagline, 'tagline') || s.tagline,
    contact_phone: String(cfgValue(b.phone, 'phone')).replace(/\s/g, ''),
    whatsapp_number: String(cfgValue(b.whatsapp, 'whatsapp')).replace(/\s/g, ''),
    contact_email: cfgValue(b.email, 'email'),
    address_line1: cfgValue(b.address_line1, 'address_line1'),
    address_line2: cfgValue(b.address_line2),
    city: cfgValue(b.city, 'city'),
    state: cfgValue(b.state, 'state') || s.state,
    shop_pincode: cfgValue(b.pincode, 'pincode'),
    gstin: cfgValue(b.gstin),
    hours_text: cfgValue(b.hours_text),
    theme_preset: br.theme_preset || s.theme_preset,
    primary_color: br.primary_color || s.primary_color,
    secondary_color: br.secondary_color || s.secondary_color,
    accent_color: br.accent_color || s.accent_color,
    home_layout: br.home_layout || 'A',
    logo_path: br.logo ? '/' + br.logo.replace(/^\//, '') : '',
    favicon_path: br.favicon ? '/' + br.favicon.replace(/^\//, '') : '',
    social_json: Object.fromEntries(Object.entries(cfg.social || {}).filter(([, v]) => v && !String(v).includes('REPLACE_ME')))
  });
  s.gst_mode = s.gstin ? 'REGISTERED' : 'UNREGISTERED';
  // Until the admin website exists, the owner's v1.9 choices can be tried from the "display" section.
  const DISPLAY_KEYS = ['page_width', 'ui_corners', 'ui_shadows', 'ui_spacing', 'ui_text_size', 'font_body', 'font_heading',
    'sold_counts_mode', 'sold_counts_min', 'reviews_enabled', 'text_overrides_json', 'languages_json', 'default_language',
    'popups_json', 'announcement_text', 'announcement_starts_at', 'announcement_ends_at', 'hero_banners_json', 'hero_autorotate',
    'product_image_fit', 'trust_strip_json'];
  Object.entries(cfg.display || {}).forEach(([k, v]) => { if (DISPLAY_KEYS.includes(k) && v !== null && v !== undefined) s[k] = v; });
  if (!(cfg.site || {}).razorpay_key_id) s.payment_options = s.payment_options.filter((o) => o.id !== 'RAZORPAY');
  if (THEME_PRESETS[s.theme_preset] && !br.primary_color) {
    const p = THEME_PRESETS[s.theme_preset];
    Object.assign(s, { primary_color: p.primary, secondary_color: p.secondary, accent_color: p.accent });
  }
  s._source = 'config';
  return s;
}

/* ======================================================================== catalog */

function validProduct(p) {
  const problems = [];
  if (!p || typeof p !== 'object') return ['not an object'];
  if (!p.id) problems.push('missing id');
  if (!p.slug || !SLUG_RE.test(p.slug)) problems.push(`bad slug "${p.slug}"`);
  if (!p.name) problems.push('missing name');
  if (!Array.isArray(p.variants) || !p.variants.length) problems.push('no variants');
  (p.variants || []).forEach((v) => {
    if (!v.sku) problems.push('variant without SKU');
    if (!Number.isSafeInteger(v.price) || v.price < 0) problems.push(`SKU ${v.sku}: price must be whole paise`);
    if (v.mrp !== undefined && v.mrp !== null && !Number.isSafeInteger(v.mrp)) problems.push(`SKU ${v.sku}: MRP must be whole paise`);
  });
  return problems;
}

/**
 * Loads the catalog. Real shops: data/catalog.json (light list) + data/products/<slug>.json (details),
 * both written by the admin's Publish. Before the first publish: data/sample-catalog.json.
 * Returns { light, details: {slug: detail}, sample }.
 */
function loadCatalog() {
  const realFile = path.join(DATA, 'catalog.json');
  let raw;
  let sample = false;
  if (fs.existsSync(realFile)) {
    raw = readJson(realFile);
  } else {
    raw = readJson(path.join(DATA, 'sample-catalog.json'));
    sample = true;
  }
  const categories = (raw.categories || []).filter((c) => {
    if (!c.id || !c.name || !c.slug || !SLUG_RE.test(c.slug)) { log.skipped.push(`Category ${c.id || c.name}: bad id, name or slug`); return false; }
    return c.active !== false;
  });
  const catIds = new Set(categories.map((c) => c.id));
  const products = [];
  const details = {};
  const seenSlugs = new Set();
  for (const p of raw.products || []) {
    const problems = validProduct(p);
    if (seenSlugs.has(p.slug)) problems.push(`duplicate slug "${p.slug}"`);
    if (problems.length) { log.skipped.push(`Product ${p.id || p.name || '?'}: ${problems.join('; ')}`); continue; }
    if (p.active === false) continue;
    seenSlugs.add(p.slug);
    let detail = null;
    if (sample) {
      detail = { id: p.id, slug: p.slug, description_html: p.description_html || '', specs: p.specs || [], images: p.images || [], seo_title: p.seo_title || '', seo_description: p.seo_description || '' };
    } else {
      detail = readJson(path.join(DATA, 'products', p.slug + '.json'), null);
    }
    const createdAt = sample ? new Date(NOW.getTime() - (p.created_days_ago || 30) * 86400000).toISOString() : p.created_at;
    const variants = p.variants.filter((v) => v.active !== false).map((v) => ({
      sku: v.sku, options: v.options || {}, price: v.price, mrp: Number.isSafeInteger(v.mrp) && v.mrp > v.price ? v.mrp : v.price,
      in_stock: !!v.in_stock, low_stock: !!v.low_stock, image: Number.isInteger(v.image) ? v.image : 0
    }));
    const prices = variants.map((v) => v.price);
    const light = {
      id: p.id, slug: p.slug, name: p.name, short: p.short || '', category_id: catIds.has(p.category_id) ? p.category_id : '',
      tags: p.tags || [], brand: p.brand || '', gst_rate: p.gst_rate ?? 0,
      price_min: Math.min(...prices), price_max: Math.max(...prices),
      rating_avg: p.rating_avg || 0, rating_count: p.rating_count || 0,
      images: (p.images || []).slice(0, 2), option_names: p.option_names || [], variants,
      created_at: createdAt || '', bestseller_rank: p.bestseller_rank || null, order_mode: p.order_mode || 'DEFAULT',
      // "Bought" counts are always published rounded down (100+, 1K+…), never exact.
      sold_30d: T.roundSold(p.sold_30d), sold_total: T.roundSold(p.sold_total)
    };
    products.push(light);
    if (detail) details[p.slug] = { ...detail, images: detail.images && detail.images.length ? detail.images : light.images };
  }
  const body = { format: 1, is_sample: sample, generated_at: NOW.toISOString(), categories, products };
  body.catalog_version = raw.catalog_version && !sample ? raw.catalog_version : hash(JSON.stringify({ categories, products }), 16);
  return { light: body, details, sample };
}

function loadPages(settings) {
  const real = path.join(DATA, 'pages.json');
  const list = readJson(fs.existsSync(real) ? real : path.join(DATA, 'sample-pages.json'), []);
  const address = [settings.address_line1, settings.address_line2, [settings.city, settings.shop_pincode].filter(Boolean).join(' '), settings.state].filter(Boolean).join(', ');
  const fill = (s) => String(s || '')
    .replace(/\{business_name\}/g, settings.business_name)
    .replace(/\{legal_name\}/g, settings.legal_name || settings.business_name)
    .replace(/\{address\}/g, address || '—')
    .replace(/\{email\}/g, settings.contact_email || '—')
    .replace(/\{phone\}/g, settings.contact_phone ? '+91 ' + settings.contact_phone : '—')
    .replace(/\{gstin\}/g, settings.gstin || 'Not registered')
    .replace(/\{state\}/g, settings.state || 'India');
  return list.filter((p) => p && p.slug && SLUG_RE.test(p.slug) && p.title).map((p) => ({ ...p, html: fill(p.html) }));
}

/* ======================================================================== sample images */

const SAMPLE_STYLE = {
  'cat-sweets': { hue: 28, glyph: 'box' },
  'cat-spices': { hue: 8, glyph: 'jar' },
  'cat-kitchen': { hue: 200, glyph: 'pot' },
  'cat-clothing': { hue: 330, glyph: 'shirt' }
};

const GLYPHS = {
  box: '<rect x="200" y="250" width="200" height="150" rx="14"/><path d="M190 250h220v-40H190z"/><path d="M300 210v190M250 210c0-40 50-40 50 0M350 210c0-40-50-40-50 0"/>',
  jar: '<rect x="215" y="230" width="170" height="190" rx="28"/><rect x="230" y="190" width="140" height="40" rx="10"/><path d="M245 290h110M245 330h110"/>',
  pot: '<path d="M190 260h220v80a90 60 0 0 1-220 0z"/><path d="M190 280h-30M410 280h30M240 260v-25h120v25"/>',
  shirt: '<path d="M240 200l-70 40 25 55 40-20v145h130V275l40 20 25-55-70-40c-10 25-30 35-60 35s-50-10-60-35z"/>'
};

function sampleSvg(label, catId, variant) {
  const st = SAMPLE_STYLE[catId] || { hue: 240, glyph: 'box' };
  const h = (st.hue + (variant === 2 ? 18 : 0)) % 360;
  const bg = `hsl(${h}, 60%, ${variant === 2 ? 88 : 93}%)`;
  const disc = `hsl(${h}, 55%, ${variant === 2 ? 78 : 83}%)`;
  const ink = `hsl(${h}, 45%, 32%)`;
  const safe = String(label).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
<rect width="600" height="600" fill="${bg}"/>
<circle cx="300" cy="300" r="${variant === 2 ? 190 : 170}" fill="${disc}"/>
<g fill="none" stroke="${ink}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[st.glyph]}</g>
<text x="300" y="540" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="30" font-weight="600" fill="${ink}" text-anchor="middle">${safe}</text>
</svg>`;
}

function writeSampleImages(catalog) {
  let n = 0;
  for (const p of catalog.products) {
    for (const [i, img] of (p.images || []).entries()) {
      if (img.full && img.full.startsWith('/assets/images/sample/')) { write(img.full, sampleSvg(p.name, p.category_id, i + 1)); n++; }
    }
  }
  for (const c of catalog.categories) {
    if (c.image && c.image.startsWith('/assets/images/sample/')) { write(c.image, sampleSvg(c.name, c.id, 1)); n++; }
  }
  return n;
}

/* ======================================================================== page shell */

let SHELL = '';

/**
 * Assembles one complete HTML page from public/index.html (the shell) and the given parts.
 * page: { path, type, title, description, image, noindex, jsonld, main, bodyAttrs, currentCategory }
 */
function renderPage(ctx, page, common) {
  const s = ctx.s;
  const L = common.lang;
  const rawPath = T.stripBase(page.path, L.codes);
  const langs = L.codes.map((code) => ({
    code, name: LANGUAGES[code].name, short: LANGUAGES[code].short,
    href: (code === L.default ? '' : '/' + code) + rawPath, current: code === L.current
  }));
  const head = SEO.headTags({
    alternates: L.codes.length > 1 && !page.noindex ? langs.map((l) => ({ hreflang: LANGUAGES[l.code].locale, href: l.href })).concat([{ hreflang: 'x-default', href: rawPath }]) : [],
    title: page.title, description: page.description, path: page.path, image: page.image || common.ogImage,
    imageWidth: page.image ? null : 1200, imageHeight: page.image ? null : 630,
    type: page.type === 'product' ? 'product' : 'website', noindex: page.noindex || !PRODUCTION,
    jsonld: page.jsonld || [], siteUrl: common.siteUrl, siteName: s.business_name
  });
  const meta = html`<meta name="x-api-url" content="${common.apiUrl}">
<meta name="x-build" content="${common.buildId}">
<meta name="x-catalog-version" content="${common.catalogVersion}">
<meta name="x-production" content="${PRODUCTION ? '1' : '0'}">
${common.preload ? html`<link rel="preload" href="${common.preload}" as="font" type="font/woff2" crossorigin>` : ''}`;
  const pageCtx = { ...ctx, currentCategory: page.currentCategory || null, langs };
  const bodyAttrs = Object.entries({ 'data-page': page.type, ...(page.bodyAttrs || {}) })
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`).join(' ');
  const fill = {
    '{{HEAD}}': head.toString(),
    '{{META}}': meta.toString(),
    '{{THEME_COLOR}}': s.primary_color,
    '{{LANG}}': LANGUAGES[L.current].locale,
    '{{LANG_CODE}}': L.current,
    '{{BASE}}': T.getBase(),
    '{{BUILD}}': common.buildId,
    '{{SKIP}}': t('common.skip'),
    '{{BODY_ATTRS}}': bodyAttrs,
    '{{ANNOUNCE}}': T.announcementBar(pageCtx).toString(),
    '{{HEADER}}': T.header(pageCtx).toString(),
    '{{MAIN}}': page.main.toString(),
    '{{FOOTER}}': T.footer(pageCtx, common.pages).toString(),
    '{{DIALOGS}}': T.sharedDialogs(pageCtx).toString()
  };
  // split/join (not String.replace) so "$" signs in product text are never treated specially.
  return SHELL.replace(/\{\{[A-Z_]+\}\}/g, (token) => (token in fill ? '\u0000' + token + '\u0000' : token))
    .split('\u0000').map((piece) => (piece in fill ? fill[piece] : piece)).join('');
}

/** Offer posters: the picture must be inside the shop, exist (spelling and capital letters matter) and be small. */
function checkPopupImages(settings) {
  (Array.isArray(settings.popups_json) ? settings.popups_json : []).forEach((pp) => {
    if (!pp || !pp.image) return;
    const name = `Popup "${pp.id || '?'}"`;
    const src = T.localImagePath(pp.image);
    if (!src) {
      warn(`${name}: the picture must be a .jpg, .png or .webp file inside client/assets (example: "client/assets/poster-diwali.jpg"). It was not shown.`);
      return;
    }
    const rel = decodeURI(src).replace(/^\//, '');
    const file = rel.startsWith('client/') ? path.join(ROOT, rel) : path.join(PUB, rel);
    if (!fs.existsSync(file)) {
      warn(`${name}: the picture "${rel}" was not found. Check the spelling and capital letters (Poster.JPG and poster.jpg are different).`);
      return;
    }
    const kb = Math.round(fs.statSync(file).size / 1024);
    if (kb > 500) warn(`${name}: the picture is ${kb} KB — please make it smaller than 500 KB (about 1080 × 1350 pixels, saved as JPG or WebP) so it opens quickly on phones.`);
    if (!pp.title && !pp.text && !pp.image_alt) warn(`${name}: add "image_alt" — a short description of the poster for blind customers (example: "Diwali sale, 20% off all sweets").`);
  });
}

/* ======================================================================== main */

function main() {
  const started = Date.now();
  console.log(`Building the shop (${PRODUCTION ? 'LIVE' : 'practice'} mode)…`);

  const cfg = readJson(path.join(ROOT, 'client', 'store.config.json'));
  const check = checkConfig(cfg, { production: PRODUCTION });
  check.warnings.forEach(warn);
  if (check.errors.length) {
    check.errors.forEach((e) => console.log('  ✗ ' + e));
    console.log(`\nBuild stopped: ${check.errors.length} problem(s) in client/store.config.json (see above).`);
    process.exit(1);
  }

  const EN = readJson(path.join(PUB, 'strings', 'en.json'));
  setStrings(EN, 'en');
  SHELL = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');

  const settings = buildSettings(cfg);
  checkPopupImages(settings);

  /* --- languages: the default at the site root, others under /<code>/ */
  const wanted = Array.isArray(settings.languages_json) ? settings.languages_json : ['en'];
  const codes = wanted.filter((c, i) => LANGUAGES[c] && wanted.indexOf(c) === i && fs.existsSync(path.join(PUB, 'strings', c + '.json')));
  wanted.filter((c) => !codes.includes(c)).forEach((c) => warn(`Language "${c}" isn't available (no strings/${c}.json) — skipped.`));
  if (!codes.length) codes.push('en');
  const defaultLang = codes.includes(settings.default_language) ? settings.default_language : codes[0];
  const overridesAll = settings.text_overrides_json && typeof settings.text_overrides_json === 'object' ? settings.text_overrides_json : {};
  const stringsFor = (code) => {
    const base = code === 'en' ? EN : mergeStrings(EN, readJson(path.join(PUB, 'strings', code + '.json')));
    const { strings, skipped } = applyOverrides(base, overridesAll[code] || {});
    skipped.forEach((x) => warn(`Wording change for "${x.key}" (${code}) was not used: ${x.problem}`));
    return strings;
  };
  const fontsList = readJson(path.join(PUB, 'assets', 'fonts', 'fonts.json'), { fonts: [] }).fonts;
  const { light: catalog, details, sample } = loadCatalog();
  const pages = loadPages(settings);
  const pincodeRules = readJson(path.join(DATA, 'pincode-rules.json'), null);
  const cat = T.indexCatalog(catalog);
  const ctx = { s: settings, t, cat, now: NOW };

  const siteUrl = String(cfgValue((cfg.site || {}).url) || 'https://example.pages.dev').replace(/\/$/, '');
  const apiUrl = cfgValue((cfg.site || {}).apps_script_url);
  const seoCfg = cfg.seo || {};
  const defaultTitle = cfgValue(seoCfg.default_title, 'default_title') || settings.business_name;
  const defaultDesc = cfgValue(seoCfg.default_description, 'default_description') || settings.tagline;

  /* --- dist folder and static files */
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  const TEMPLATE_FILES = new Set(['index.html', '404.html', 'offline.html', 'manifest.webmanifest', 'sw.js', 'robots.txt', '_headers']);
  const copied = copyDir(PUB, DIST, (rel) => TEMPLATE_FILES.has(rel));
  copyDir(path.join(ROOT, 'client', 'assets'), path.join(DIST, 'client', 'assets'));

  /* --- CSS: one bundled stylesheet + brand colours */
  const cssParts = ['tokens.css', 'base.css', 'components.css', 'layout.css', 'pages.css'].map((f) => fs.readFileSync(path.join(PUB, 'css', f), 'utf8'));
  const siteCss = cssParts.join('\n');
  write('css/site.css', siteCss);
  const banners = Array.isArray(settings.hero_banners_json) ? settings.hero_banners_json : [];
  const focalRules = [...new Set(banners.filter((b) => b && b.image).map((b) => T.focalKey(b)))]
    .map((k) => { const [x, y] = k.split('-'); return `.hero__img[data-focal="${k}"] { object-position: ${x}% ${y}%; }`; }).join('\n');
  const brand = brandCss({ primary: settings.primary_color, secondary: settings.secondary_color, accent: settings.accent_color }) + (focalRules ? '\n' + focalRules + '\n' : '')
    + '\n' + displayCss(settings, fontsList);
  write('css/brand.css', brand);

  /* --- build id = fingerprint of everything that affects the pages */
  const jsFiles = listFiles(path.join(PUB, 'js')).map((f) => fs.readFileSync(f, 'utf8')).join('');
  const buildId = hash(siteCss + brand + jsFiles + JSON.stringify(catalog) + JSON.stringify(settings) + JSON.stringify(pages) + SHELL, 12);

  /* --- data files the browser reads */
  const publicSettings = { ...settings };
  delete publicSettings._source;
  write('settings.public.json', JSON.stringify(publicSettings));
  write('catalog.json', JSON.stringify(catalog));
  for (const [slug, d] of Object.entries(details)) write(`products/${slug}.json`, JSON.stringify(d));
  write('pages.json', JSON.stringify(pages.map(({ slug, title, show_in_footer }) => ({ slug, title, show_in_footer }))));
  write('pincode-rules.json', JSON.stringify(pincodeRules && Array.isArray(pincodeRules.rules) ? pincodeRules : { rules: [] }));
  write('build.json', JSON.stringify({ build_id: buildId, built_at: NOW.toISOString(), catalog_version: catalog.catalog_version, production: PRODUCTION, sample }));
  const imgCount = sample ? writeSampleImages(catalog) : 0;

  /* --- pages (one full set per language) */
  const ogImage = '/' + String(cfgValue(seoCfg.og_image) || 'client/assets/og-default.png').replace(/^\//, '');
  const preload = fontPreload(settings, fontsList);
  const hasReturnPolicy = pages.some((p) => /refund|return/.test(p.slug));
  const sitemap = [];
  const orgLd = SEO.organizationLd(settings, siteUrl);
  let productPages = 0;

  for (const lang of codes) {
  setStrings(stringsFor(lang), lang);
  T.setBase(lang === defaultLang ? '' : lang);
  const dir = lang === defaultLang ? '' : lang + '/';
  const common = { siteUrl, apiUrl, buildId, catalogVersion: catalog.catalog_version, pages, ogImage, preload, lang: { codes, default: defaultLang, current: lang } };
  const out = (rel, pageHtml, loc, lastmod) => {
    write(dir + rel, pageHtml);
    if (loc) sitemap.push({ loc, lastmod });
  };

  // Home
  out('index.html', renderPage(ctx, {
    path: T.link('/'), type: 'home', title: defaultTitle, description: defaultDesc,
    jsonld: [orgLd, SEO.websiteLd(settings, siteUrl)],
    main: T.homeMain(ctx, { hasReturnPolicy, pinnedRows: settings.home_pinned_rows_json || [] })
  }, common), T.link('/'), null);

  // Categories
  for (const c of cat.categories) {
    const list = cat.products.filter((p) => p.category_id === c.id || (cat.catById[p.category_id] && cat.catById[p.category_id].parent_id === c.id));
    const sorted = list.slice().sort((a, b) => Number(T.isInStock(b)) - Number(T.isInStock(a)) || (a.bestseller_rank || 999) - (b.bestseller_rank || 999));
    const crumbs = [{ name: t('common.home'), href: T.link('/') }, { name: c.name }];
    out(`c/${c.slug}/index.html`, renderPage(ctx, {
      path: T.categoryUrl(c), type: 'category', title: `${c.name} — ${settings.business_name}`,
      description: t('listing.count', { n: list.length }) + ' · ' + c.name + ' · ' + settings.business_name,
      image: c.image && !c.image.endsWith('.svg') ? c.image : null,
      jsonld: [SEO.breadcrumbLd(crumbs.map((x, i) => (i === 0 ? { ...x } : { name: x.name, href: T.categoryUrl(c) })), siteUrl), SEO.itemListLd(sorted, siteUrl)],
      currentCategory: c.id, bodyAttrs: { 'data-category': c.id },
      main: T.listingMain(ctx, { mode: 'category', title: c.name, products: sorted, category: c, crumbs })
    }, common), T.categoryUrl(c), null);
  }

  // Products
  for (const p of cat.products) {
    try {
      const d = details[p.slug] || null;
      const category = cat.catById[p.category_id] || null;
      const related = cat.products.filter((x) => x.id !== p.id && (x.category_id === p.category_id || (x.tags || []).some((tg) => (p.tags || []).includes(tg))))
        .sort((a, b) => Number(b.category_id === p.category_id) - Number(a.category_id === p.category_id) || (a.bestseller_rank || 999) - (b.bestseller_rank || 999));
      const crumbs = [{ name: t('common.home'), href: T.link('/') }];
      if (category) crumbs.push({ name: category.name, href: T.categoryUrl(category) });
      crumbs.push({ name: p.name, href: T.productUrl(p) });
      const firstImg = ((d && d.images) || p.images || [])[0];
      const raster = firstImg && !/\.svg$/i.test(firstImg.full || '') ? (firstImg.full || firstImg.card) : null;
      out(`p/${p.slug}/index.html`, renderPage(ctx, {
        path: T.productUrl(p), type: 'product',
        title: (d && d.seo_title) || `${p.name} — ${settings.business_name}`,
        description: (d && d.seo_description) || p.short || SEO.stripTags(d && d.description_html) || p.name,
        image: raster, jsonld: [SEO.productLd(p, d, settings, siteUrl, category), SEO.breadcrumbLd(crumbs, siteUrl)],
        currentCategory: p.category_id, bodyAttrs: { 'data-slug': p.slug },
        main: T.productMain(ctx, p, d, related)
      }, common), T.productUrl(p), null);
      productPages++;
    } catch (e) {
      log.skipped.push(`Product ${p.id} page: ${e.message}`);
    }
  }

  // Policy and info pages
  for (const pg of pages) {
    const isContact = pg.slug === 'contact';
    out(`pages/${pg.slug}/index.html`, renderPage(ctx, {
      path: T.pageUrl(pg.slug), type: isContact ? 'contact' : 'static', title: `${pg.title} — ${settings.business_name}`,
      description: SEO.stripTags(pg.html) || pg.title,
      main: isContact ? T.contactMain(ctx, pg) : T.pageMain(ctx, pg)
    }, common), T.pageUrl(pg.slug), null);
  }
  if (!pages.some((p) => p.slug === 'contact')) {
    out('pages/contact/index.html', renderPage(ctx, { path: T.link('/pages/contact/'), type: 'contact', title: `${t('footer.contact')} — ${settings.business_name}`, description: t('footer.contact'), main: T.contactMain(ctx, null) }, common), T.link('/pages/contact/'), null);
  }

  // Search, cart, checkout (placeholder until Phase 3), 404, offline
  const allSorted = cat.products.slice().sort((a, b) => Number(T.isInStock(b)) - Number(T.isInStock(a)) || (a.bestseller_rank || 999) - (b.bestseller_rank || 999));
  out('search/index.html', renderPage(ctx, { path: T.link('/search/'), type: 'search', title: `${t('search.title_all')} — ${settings.business_name}`, description: defaultDesc, noindex: true,
    main: T.listingMain(ctx, { mode: 'search', title: t('search.title_all'), products: allSorted, crumbs: [{ name: t('common.home'), href: T.link('/') }, { name: t('search.title_all') }] }) }, common));
  out('cart/index.html', renderPage(ctx, { path: T.link('/cart/'), type: 'cart', title: `${t('cart.title_plain')} — ${settings.business_name}`, description: defaultDesc, noindex: true, main: T.cartPageMain(ctx) }, common));
  if (!fs.existsSync(path.join(PUB, 'js', 'checkout.js'))) {
    out('checkout/index.html', renderPage(ctx, { path: T.link('/checkout/'), type: 'checkout-soon', title: `${t('checkout_soon.title')} — ${settings.business_name}`, description: defaultDesc, noindex: true, main: T.checkoutSoonMain(ctx) }, common));
  }
  if (lang === defaultLang) {
  out('404.html', renderPage(ctx, { path: '/404.html', type: 'notfound', title: `${t('notfound.title')} — ${settings.business_name}`, description: defaultDesc, noindex: true, main: raw(fragment('404.html', T.notFoundMain(ctx))) }, common));
  out('offline.html', renderPage(ctx, { path: '/offline.html', type: 'offline', title: `${t('offline.title')} — ${settings.business_name}`, description: defaultDesc, noindex: true, main: raw(fragment('offline.html', T.offlineMain(ctx))) }, common));
  }
  }
  setStrings(stringsFor(defaultLang), defaultLang);
  T.setBase('');

  /* --- sitemap, robots, manifest, headers, service worker */
  const lastmod = NOW.toISOString().slice(0, 10);
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map((u) => `  <url><loc>${siteUrl}${u.loc}</loc><lastmod>${u.lastmod || lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  const robotsTpl = fs.readFileSync(path.join(PUB, 'robots.txt'), 'utf8');
  write('robots.txt', PRODUCTION
    ? robotsTpl.replace('__SITEMAP__', `${siteUrl}/sitemap.xml`)
    : '# Practice mode: search engines are asked not to list this test shop.\nUser-agent: *\nDisallow: /\n');

  const manifest = readJson(path.join(PUB, 'manifest.webmanifest'));
  Object.assign(manifest, {
    name: settings.business_name, short_name: settings.business_name.slice(0, 12),
    description: settings.tagline, theme_color: settings.primary_color
  });
  write('manifest.webmanifest', JSON.stringify(manifest, null, 2));

  let headers = fs.readFileSync(path.join(PUB, '_headers'), 'utf8');
  if (!PRODUCTION) headers += '\n# Practice mode: keep the test shop out of search engines.\n/*\n  X-Robots-Tag: noindex\n';
  write('_headers', headers);

  const precache = ['/', '/offline.html', `/css/site.css?v=${buildId}`, `/css/brand.css?v=${buildId}`, `/js/app.js?v=${buildId}`,
    '/icons/sprite.svg', ...codes.concat(['en']).filter((c, i, a) => a.indexOf(c) === i).map((c) => `/strings/${c}.json`), '/settings.public.json', '/catalog.json', '/manifest.webmanifest', '/assets/placeholder-product.svg',
    ...CORE_MODULES.map((m) => `/js/${m}`)];
  const sw = fs.readFileSync(path.join(PUB, 'sw.js'), 'utf8')
    .replace(/__BUILD_ID__/g, buildId)
    .replace('"__PRECACHE__"', JSON.stringify(precache));
  write('sw.js', sw);

  /* --- report */
  const coreJs = CORE_MODULES.map((m) => fs.readFileSync(path.join(PUB, 'js', m), 'utf8')).join('\n');
  const jsGz = gzipSize(coreJs + fs.readFileSync(path.join(PUB, 'js', 'app.js'), 'utf8'));
  const cssGz = gzipSize(siteCss + brand);
  const catGz = gzipSize(JSON.stringify(catalog));
  const fileCount = listFiles(DIST).length;

  console.log('');
  console.log(`  ✓ ${catalog.products.length} products, ${catalog.categories.length} categories${sample ? ' (SAMPLE catalogue — replaced when you first publish from the admin)' : ''}`);
  console.log(`  ✓ Languages: ${codes.map((c) => LANGUAGES[c].name + (c === defaultLang ? ' (main)' : ' (/' + c + '/)')).join(', ')}`);
  console.log(`  ✓ ${productPages} product pages, ${cat.categories.length} category pages, ${pages.length} info pages`);
  console.log(`  ✓ ${copied} files copied, ${imgCount} sample pictures drawn, ${fileCount} files in total (Cloudflare limit 20,000)`);
  console.log(`  ✓ Sizes (gzip): first-load JavaScript ${(jsGz / 1024).toFixed(1)} KB (budget 100), CSS ${(cssGz / 1024).toFixed(1)} KB (budget 30), catalogue ${(catGz / 1024).toFixed(1)} KB (budget 300)`);
  if (log.skipped.length) {
    console.log(`\n  Skipped ${log.skipped.length} item(s) — fix them in the admin, they will appear on the next publish:`);
    log.skipped.forEach((s) => console.log('   - ' + s));
  }
  if (!PRODUCTION) console.log('\n  Practice mode: search engines are told not to list this shop. Set PRODUCTION=1 when going live.');
  console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)} s. Build ${buildId}.`);
}

/** Modules loaded on every storefront page (pre-cached by the service worker and preloaded). */
export const CORE_MODULES = [
  'html.js', 'i18n.js', 'money.js', 'validators.js', 'templates.js', 'state.js', 'settings.js', 'catalog.js', 'cart.js',
  'api.js', 'device.js', 'share.js', 'a11y.js', 'pwa.js', 'router.js', 'search.js', 'seo.js', 'variants.js',
  'ui/dialog.js', 'ui/toast.js', 'ui/drawer.js', 'ui/menu.js', 'ui/stepper.js', 'ui/breakpoints.js', 'ui/cart-drawer.js', 'ui/search-box.js', 'ui/quick-add.js'
];

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p)); else out.push(p);
  }
  return out;
}

/** public/404.html and public/offline.html may hold a custom main section; otherwise the template is used. */
function fragment(file, fallback) {
  const p = path.join(PUB, file);
  if (!fs.existsSync(p)) return fallback.toString();
  const text = fs.readFileSync(p, 'utf8');
  const m = /<!--\s*MAIN\s*-->([\s\S]*?)<!--\s*\/MAIN\s*-->/.exec(text);
  return m && m[1].trim() ? m[1] : fallback.toString();
}

try {
  main();
} catch (e) {
  console.error('\nBuild failed: ' + e.message);
  console.error(e.stack);
  process.exit(1);
}
