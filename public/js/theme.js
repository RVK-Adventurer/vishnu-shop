/**
 * theme.js — the owner's own colours and gradients for the big areas of the shop: top bar
 * (header), category bar, announcement bar, footer, welcome banner, main buttons and the page
 * background. Shared by the build (writes them into brand.css) and the admin's live preview.
 *
 * A "paint" can be written three ways:
 *   "#7C3AED"                                         one colour
 *   "linear-gradient(135deg, #7C3AED, #DB2777)"       a gradient (2 or 3 colours, any angle)
 *   { "colors": ["#7C3AED", "#DB2777"], "angle": 135, "style": "linear" | "radial" }
 *
 * Safety and readability, automatically:
 *  - Only real colour codes are accepted, so nothing else can be slipped into the page's styles.
 *  - The text colour on each area (white or near-black) is chosen to be readable on EVERY part of
 *    the gradient; if no text colour can be read well, the build says so.
 *  - In dark mode a light area is darkened, so the shop never flashes bright at night.
 */

import { isHex, hexToRgb, rgbToHex, luminance, contrast, rgba, shade, WHITE, DARK_TEXT, DARK_SURFACE } from './color.js';

/** The areas the owner can paint. key = setting name. */
export const PAINT_AREAS = {
  header_bg: 'Top bar (logo, search, cart)',
  catbar_bg: 'Category bar (under the top bar)',
  announcement_bg: 'Announcement bar (very top)',
  footer_bg: 'Footer (bottom of every page)',
  hero_bg: 'Welcome banner (when no banner photo is set)',
  button_bg: 'Main buttons (Add to cart, Buy now…)',
  page_bg: 'Page background (light colours only)'
};

const HEX = '#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})';

function normHex(h) {
  let s = String(h).trim();
  if (/^#[0-9a-f]{3}$/i.test(s)) s = '#' + s.slice(1).split('').map((c) => c + c).join('');
  return isHex(s) ? s.toUpperCase() : null;
}

/** Reads a paint value. Returns { style, angle, stops: [hex…] } or null when empty/invalid. */
export function parsePaint(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    const s = value.trim();
    const one = normHex(s);
    if (one) return { style: 'solid', angle: 0, stops: [one] };
    const m = new RegExp(`^(linear|radial)-gradient\\(\\s*(?:(\\d{1,3})deg\\s*,\\s*)?(${HEX})\\s*,\\s*(${HEX})(?:\\s*,\\s*(${HEX}))?\\s*\\)$`, 'i').exec(s);
    if (!m) return null;
    const stops = [m[3], m[4], m[5]].filter(Boolean).map(normHex);
    return { style: m[1].toLowerCase(), angle: Math.min(360, Number(m[2] ?? 135)), stops };
  }
  if (typeof value === 'object' && Array.isArray(value.colors)) {
    const stops = value.colors.slice(0, 3).map(normHex);
    if (!stops.length || stops.some((x) => !x)) return null;
    if (stops.length === 1) return { style: 'solid', angle: 0, stops };
    const angle = Math.max(0, Math.min(360, Math.round(Number(value.angle ?? 135)) || 0));
    return { style: value.style === 'radial' ? 'radial' : 'linear', angle, stops };
  }
  return null;
}

/** The CSS for a paint (safe: built only from checked colour codes and a number). */
export function paintCss(p) {
  if (!p) return '';
  if (p.style === 'solid' || p.stops.length === 1) return p.stops[0];
  if (p.style === 'radial') return `radial-gradient(circle at 30% 20%, ${p.stops.join(', ')})`;
  return `linear-gradient(${p.angle}deg, ${p.stops.join(', ')})`;
}

function mix(a, b, t) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex({ r: Math.round(x.r + (y.r - x.r) * t), g: Math.round(x.g + (y.g - x.g) * t), b: Math.round(x.b + (y.b - x.b) * t) });
}

/** Every colour that appears in the paint: the stops plus the halfway points between them. */
function samples(p) {
  const out = p.stops.slice();
  for (let i = 0; i + 1 < p.stops.length; i++) out.push(mix(p.stops[i], p.stops[i + 1], 0.5));
  return out;
}

function worstContrast(text, p) {
  return Math.min(...samples(p).map((c) => contrast(text, c)));
}

/** White or near-black text — whichever is readable on the WHOLE paint. { color, ratio } */
export function textOnPaint(p) {
  const w = worstContrast(WHITE, p);
  const d = worstContrast(DARK_TEXT, p);
  return w >= d ? { color: WHITE, ratio: w } : { color: DARK_TEXT, ratio: d };
}

/** The faintest see-through version of `text` that is still readable (≥ target) on the paint. */
function softText(text, p, from, target) {
  for (let a = from; a < 1; a += 0.04) {
    const ok = samples(p).every((c) => contrast(mix(c, text, a), c) >= target);
    if (ok) return rgba(text, Math.round(a * 100) / 100);
  }
  return text;
}

/** Dark-mode version: light colours are pulled towards the dark page colour. */
export function darkPaint(p) {
  if (!p) return null;
  return { ...p, stops: p.stops.map((c) => (luminance(c) > 0.3 ? mix(c, DARK_SURFACE, 0.72) : c)) };
}

/**
 * CSS variables for an area painted with `p`. Everything inside the area (text, soft text, borders,
 * hover fills, links) is re-tuned for that background.
 */
export function zoneVariables(p, brand = {}) {
  const text = textOnPaint(p).color;
  const firstSolid = p.stops[0];
  const accentOk = brand.accent && worstContrast(brand.accent, p) >= 4.5;
  const linkOk = brand.primaryText && worstContrast(brand.primaryText, p) >= 4.5;
  return {
    '--zone-bg': paintCss(p),
    '--surface': firstSolid,
    '--surface-2': rgba(text, 0.12),
    '--text': text,
    '--text-2': softText(text, p, 0.84, 4.5),
    '--muted': softText(text, p, 0.7, 4.5),
    '--border': rgba(text, 0.18),
    '--primary-text': linkOk ? brand.primaryText : text,
    '--link-hover': accentOk ? brand.accent : text,
    '--focus': text
  };
}

/** Plain-words problems with the owner's paints (for the build log and the admin). */
export function checkPaints(settings) {
  const s = withBrandGradient(settings);
  const out = [];
  if (settings.brand_gradient && !parsePaint(settings.brand_gradient)) out.push('brand_gradient: is not a colour gradient. Use something like "linear-gradient(135deg, #7C3AED, #DB2777)".');
  Object.keys(PAINT_AREAS).forEach((key) => {
    const v = s[key];
    if (v === undefined || v === null || v === '') return;
    const p = parsePaint(v);
    if (!p) { out.push(`${key}: "${typeof v === 'string' ? v : JSON.stringify(v)}" is not a colour. Use a colour code like "#7C3AED" or "linear-gradient(135deg, #7C3AED, #DB2777)". The normal colour is used.`); return; }
    if (key === 'page_bg') {
      if (p.stops.some((c) => luminance(c) < 0.75)) out.push('page_bg: please choose light colours for the page background (text must stay readable). It was not used.');
      return;
    }
    const tx = textOnPaint(p);
    if (tx.ratio < 4.5) out.push(`${key}: text will be hard to read on these colours (contrast ${tx.ratio.toFixed(1)} : 1, needs 4.5). Choose colours that are both dark or both light.`);
  });
  return out;
}

const DARK_SEL = (sel, body) => `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) ${sel} { ${body} }\n}\n:root[data-theme="dark"] ${sel} { ${body} }`;
const decl = (vars) => Object.keys(vars).map((k) => `${k}: ${vars[k]};`).join(' ');

/**
 * The CSS for all of the owner's paints (empty when none are set). `brand` gives the brand link
 * and accent colours so links stay on-brand where they are readable.
 */
/**
 * The brand gradient (brand_gradient) is used on the areas ticked in brand_gradient_areas, unless
 * that area has its own colour. Returns the settings with those area colours filled in.
 */
export const GRADIENT_AREAS = { header: 'header_bg', catbar: 'catbar_bg', announcement: 'announcement_bg', buttons: 'button_bg', hero: 'hero_bg', footer: 'footer_bg' };
export function withBrandGradient(s) {
  const g = parsePaint(s.brand_gradient);
  const areas = Array.isArray(s.brand_gradient_areas) ? s.brand_gradient_areas : [];
  if (!g || !areas.length) return s;
  const out = { ...s };
  areas.forEach((a) => { const key = GRADIENT_AREAS[a]; if (key && !parsePaint(out[key])) out[key] = s.brand_gradient; });
  return out;
}

export function themeCss(settings, brand = {}) {
  const s = withBrandGradient(settings);
  const parts = [];
  const zone = (key, selector, extra = '') => {
    const p = parsePaint(s[key]);
    if (!p) return;
    const light = zoneVariables(p, brand);
    const dark = zoneVariables(darkPaint(p), {});
    parts.push(`${selector} { ${decl(light)} background: var(--zone-bg); color: var(--text); ${extra}}`);
    parts.push(DARK_SEL(selector, `${decl(dark)}`));
  };
  zone('announcement_bg', '.announce');
  zone('header_bg', '.site-header');
  zone('catbar_bg', '.catbar');
  zone('footer_bg', '.site-footer');
  zone('hero_bg', '.hero--brand', '--on-primary: var(--text); ');
  // Main buttons: gradient or colour, with a slightly darker hover.
  const b = parsePaint(s.button_bg);
  if (b && textOnPaint(b).ratio >= 3) {
    const hover = { ...b, stops: b.stops.map((c) => shade(c, 6)) };
    const db = darkPaint(b);
    const vars = (p, h) => decl({ '--btn-primary-bg': paintCss(p), '--btn-primary-hover': paintCss(h), '--btn-primary-text': textOnPaint(p).color });
    parts.push(`:root { ${vars(b, hover)} }`);
    if (db.stops.join() !== b.stops.join()) parts.push(DARK_SEL('', vars(db, { ...db, stops: db.stops.map((c) => shade(c, -6)) })));
  }
  // Page background: light colours only, light mode only.
  const pg = parsePaint(s.page_bg);
  if (pg && pg.stops.every((c) => luminance(c) >= 0.75)) {
    parts.push(`@media not all and (prefers-color-scheme: dark) { :root:not([data-theme="dark"]) body { background: ${paintCss(pg)} fixed; } }\n:root[data-theme="light"] body { background: ${paintCss(pg)} fixed; }`);
  }
  if (!parts.length) return '';
  // Pop-up menus inside a painted area keep the normal page colours (readable lists).
  parts.push(`.site-header .suggest, .site-header .catbar__menu, .site-header .lang__menu, .site-footer .lang__menu { --surface: var(--base-surface); --surface-2: var(--base-surface-2); --text: var(--base-text); --text-2: var(--base-text-2); --muted: var(--base-muted); --border: var(--base-border); --primary-text: var(--base-primary-text); color: var(--text); }`);
  return `/* The owner's own colours and gradients (Admin → Settings → Branding → Colours). Generated. */\n${parts.join('\n')}\n`;
}
