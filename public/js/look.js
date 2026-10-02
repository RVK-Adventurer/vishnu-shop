/**
 * look.js — turns the owner's settings into the shop's look, in ONE place. The build writes the
 * result to css/brand.css; the Design preview (/preview/) puts the very same CSS on its preview
 * pages. So what the owner sees in the preview is exactly what customers will get.
 */

import { brandCss, brandVariables } from './color.js';
import { displayCss } from './display.js';
import { themeCss } from './theme.js';
import { coverCss, normalizeCover } from './cover.js';
import { focalKey, homeSections } from './templates.js';

/**
 * The settings the owner changes to style the shop (the "display" section of store.config.json
 * today; the admin's look screens from Phase 2). Shared by the build and the preview.
 */
export const OWNER_KEYS = [
  'theme_preset', 'primary_color', 'secondary_color', 'accent_color',
  'page_width', 'ui_corners', 'ui_shadows', 'ui_spacing', 'ui_text_size', 'font_body', 'font_heading',
  'logo_path', 'favicon_path', 'logo_mode', 'logo_height_px', 'tab_title_format', 'tab_title_home',
  'header_bg', 'catbar_bg', 'announcement_bg', 'footer_bg', 'hero_bg', 'button_bg', 'page_bg',
  'hero_cover_json', 'hero_banners_json', 'hero_autorotate', 'banner_frequency', 'banner_start',
  'announcement_text', 'announcement_starts_at', 'announcement_ends_at',
  'home_layout', 'home_sections_json', 'show_category_menu', 'show_all_products_link',
  'trust_strip_json', 'show_trust_strip',
  'product_image_fit', 'product_image_ratio', 'reviews_enabled', 'sold_counts_mode', 'sold_counts_min',
  'delivery_display', 'delivery_custom_text',
  'footer_sections_json', 'footer_columns_json', 'footer_about_text', 'footer_show_contact', 'footer_show_social',
  'footer_show_hours', 'footer_copyright_text', 'footer_text', 'footer_show_logo', 'footer_logo_height_px',
  'ui_text_case', 'brand_gradient', 'brand_gradient_areas', 'announcement_auto', 'home_pinned_rows_json',
  'popups_json', 'text_overrides_json', 'languages_json', 'default_language'
];

/** A short, stable fingerprint (FNV-1a) — used to notice when the banners changed. */
export function shortHash(text) {
  let h = 0x811c9dc5;
  const s = String(text);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}

/** The banners that can still show (expired ones are dropped). */
export function liveBanners(s, now = new Date()) {
  return (Array.isArray(s.hero_banners_json) ? s.hero_banners_json : [])
    .filter((b) => b && b.image && !(b.ends_at && Date.parse(b.ends_at) <= now.getTime()));
}

/**
 * <meta name="x-hero"> content for the home page (read by early.js), or '' when the banner simply
 * shows every visit starting at banner 1.
 */
export function heroMetaContent(s, now = new Date()) {
  const n = liveBanners(s, now).length;
  const freq = ['ALWAYS', 'SESSION', 'DAY'].includes(s.banner_frequency) ? s.banner_frequency : 'ALWAYS';
  const start = ['FIRST', 'RANDOM', 'NEXT'].includes(s.banner_start) ? s.banner_start : 'FIRST';
  const shown = s.home_layout !== 'B' && homeSections(s).includes('banner');
  if (!shown || (freq === 'ALWAYS' && (start === 'FIRST' || n < 2))) return '';
  return [freq, start, n, shortHash(JSON.stringify(s.hero_banners_json || []) + JSON.stringify(s.hero_cover_json || {}) + freq)].join('|');
}

/**
 * Text style of the shop's own wording. "TITLE" (the default, the owner's choice) makes every word start
 * with a capital ("Add To Cart") on buttons, menus, headings, tabs, badges, notes and other short texts.
 * "SENTENCE" keeps the wording as written ("Add to cart"). Done with CSS so it follows any wording
 * change. It never touches the owner's product names, option values ("250 g") or full sentences. Tamil and
 * Hindi have no capitals, so they are unaffected.
 */
export function textCaseCss(s) {
  if (s.ui_text_case === 'SENTENCE' || s.ui_text_case === 'AS_WRITTEN') return '';
  return `/* Every word capital (Admin, Look and feel, Text style). Generated. */
:is(.btn, .catbar__link, .catbar__menu-link, .menu-list__link, .drawer__title, .sheet__title, .row__title, .pdp__h2, .pdp__hl-title,
  .listing__title, .cart-page__title, .checkout-soon__title, .empty__title, .card__title, .footer-sec__toggle, .footer-link, .trust__item,
  .badge, .chip, .pay-badge, .hero__eyebrow, .sort__label, .filters__legend, .filters .check, .field__label, .vsel__legend, .pin-check__label,
  .pdp__qty-label, .spec-group__title, .lang__item, .toast__action, .pill, .crumbs__item a, .pdp__ways strong, .price-block__save,
  .pcard__hint, .fchip, .label-caps, .stepper, .quick-add__title, .announce__text, .off, .pcard__sold, .listing__count, .crumbs__item,
  .static-page__title, .pdp__rating > span, .pdp__rating-big > span, .price-block__tax, .spec-table th, .sort select, .skip-link,
  .contact-card__addr, .footer-copy, .hero__sub, .hero__title, .pdp__delivery-title, .empty__action, .menu-list__title, .empty__text,
  .footer-sec__text, .footer-contact__addr, .muted, .hl-list__item, .pdp__sold, .pdp__ways, .checkout-soon p, .toast__text, .caption,
  .pin-check, .pdp__delivery, .promo__title, .promo__text, .trust__text, .announce__link, .filters, .sort, .field, .static-page__lead) { text-transform: capitalize; }
:is(.vsel__value, .vsel__text, .pcard__name, .pdp__title, .spec-table td, .prose, a[href^="mailto:"], input, textarea, select) { text-transform: none; }
`;
}

/** Footer logo height (the logo sits on the left of the footer, big). */
export function footerLogoCss(s) {
  const n = Math.round(Number(s.footer_logo_height_px));
  const h = Number.isFinite(n) ? Math.max(32, Math.min(120, n)) : 72;
  return `:root { --footer-logo-h: ${h}px; }\n`;
}

/** All of the owner's look as CSS (brand colours, display choices, banners, cover, area colours). */
export function lookCss(s, fonts = [], now = new Date()) {
  const colours = { primary: s.primary_color, secondary: s.secondary_color, accent: s.accent_color };
  const banners = liveBanners(s, now);
  const n = banners.length;
  const order = [];
  for (let k = 1; k < n; k++) {
    for (let j = 1; j <= n; j++) order.push(`html[data-hero-start="${k}"] .hero__slide:nth-child(${j}), html[data-hero-start="${k}"] .hero__dot:nth-child(${j}) { --hero-order: ${(j - 1 - k + n) % n}; }`);
  }
  const focal = [...new Set(banners.map((b) => focalKey(b)))]
    .map((k) => { const [x, y] = k.split('-'); return `.hero__img[data-focal="${k}"] { object-position: ${x}% ${y}%; }`; }).join('\n');
  const vars = brandVariables(colours).light;
  return brandCss(colours)
    + (focal ? '\n' + focal + '\n' : '')
    + '\n' + displayCss(s, fonts)
    + coverCss(normalizeCover(s.hero_cover_json))
    + (order.length ? '\n' + order.join('\n') + '\n' : '')
    + '\n' + themeCss(s, { accent: vars['--accent-color'], primaryText: vars['--primary-text'] })
    + '\n' + textCaseCss(s) + footerLogoCss(s);
}
