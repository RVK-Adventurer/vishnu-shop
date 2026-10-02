/**
 * display.js — the owner's look-and-feel choices turned into design values (v1.9 addition).
 * Shared by the build (writes them into brand.css) and the style guide (live preview).
 *
 * Every setting is a short list of pre-tested choices instead of a free slider, so no combination
 * can make the shop unreadable or break the layout on a small phone.
 *
 *   page_width    STANDARD (1280 px) · WIDE (1600 px) · FULL (fills any screen)
 *   ui_corners    SHARP · STANDARD · ROUND
 *   ui_shadows    NONE · SOFT · STRONG
 *   ui_spacing    COMPACT · COMFORTABLE · AIRY
 *   ui_text_size  NORMAL · LARGE · XLARGE
 *   font_body / font_heading   'system' or a font id from /assets/fonts/fonts.json
 */

import { LIMITS, clampTo } from './limits.js';

export const DISPLAY_OPTIONS = {
  page_width: ['STANDARD', 'WIDE', 'FULL'],
  ui_corners: ['SHARP', 'STANDARD', 'ROUND'],
  ui_shadows: ['NONE', 'SOFT', 'STRONG'],
  ui_spacing: ['COMPACT', 'COMFORTABLE', 'AIRY'],
  ui_text_size: ['NORMAL', 'LARGE', 'XLARGE'],
  product_image_ratio: ['SQUARE', 'PORTRAIT', 'LANDSCAPE'],
  logo_mode: ['LOGO_AND_NAME', 'LOGO_ONLY', 'NAME_ONLY']
};

export const DISPLAY_DEFAULTS = {
  page_width: 'FULL',
  ui_corners: 'STANDARD',
  ui_shadows: 'SOFT',
  ui_spacing: 'COMFORTABLE',
  ui_text_size: 'NORMAL',
  product_image_ratio: 'SQUARE',
  logo_mode: 'LOGO_AND_NAME',
  logo_height_px: LIMITS.logo_height_px.default,
  font_body: 'system',
  font_heading: 'system'
};

const SYSTEM_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Helvetica Neue", Arial, "Noto Sans Tamil", "Noto Sans Devanagari", sans-serif';

const WIDTH = { STANDARD: '1280px', WIDE: '1600px', FULL: '100000px' };
const CORNERS = {
  SHARP: { sm: '3px', md: '4px', lg: '6px' },
  STANDARD: { sm: '8px', md: '12px', lg: '16px' },
  ROUND: { sm: '12px', md: '18px', lg: '24px' }
};
const SHADOWS = {
  NONE: {
    light: { sm: 'none', md: '0 2px 6px rgba(0, 0, 0, 0.06)' },
    dark: { sm: 'none', md: '0 2px 6px rgba(0, 0, 0, 0.35)' }
  },
  SOFT: {
    light: { sm: '0 1px 2px rgba(0, 0, 0, 0.06)', md: '0 4px 12px rgba(0, 0, 0, 0.08)' },
    dark: { sm: '0 1px 2px rgba(0, 0, 0, 0.4)', md: '0 4px 12px rgba(0, 0, 0, 0.45)' }
  },
  STRONG: {
    light: { sm: '0 2px 6px rgba(0, 0, 0, 0.10)', md: '0 8px 20px rgba(0, 0, 0, 0.14)' },
    dark: { sm: '0 2px 6px rgba(0, 0, 0, 0.5)', md: '0 8px 20px rgba(0, 0, 0, 0.6)' }
  }
};
/* Only the larger steps change, so small gaps inside buttons and the 44 px touch size stay the same. */
const SPACING = {
  COMPACT: { 5: 20, 6: 28, 7: 40, 8: 52, 9: 80 },
  COMFORTABLE: { 5: 24, 6: 32, 7: 48, 8: 64, 9: 96 },
  AIRY: { 5: 28, 6: 40, 7: 60, 8: 80, 9: 120 }
};
const RATIO = { SQUARE: '1 / 1', PORTRAIT: '4 / 5', LANDSCAPE: '4 / 3' };
const TEXT_SIZE = { NORMAL: '100%', LARGE: '112.5%', XLARGE: '125%' };

function pick(value, list, fallback) {
  return list.includes(value) ? value : fallback;
}

/** Cleans a settings object: unknown values fall back to the defaults. */
export function normalizeDisplay(s = {}) {
  const out = {};
  for (const [k, list] of Object.entries(DISPLAY_OPTIONS)) out[k] = pick(s[k], list, DISPLAY_DEFAULTS[k]);
  out.logo_height_px = clampTo(LIMITS.logo_height_px, s.logo_height_px ?? LIMITS.logo_height_px.default);
  out.font_body = s.font_body || 'system';
  out.font_heading = s.font_heading || 'system';
  return out;
}

function fontById(fonts, id) {
  return (fonts || []).find((f) => f.id === id) || null;
}

function fontStack(fonts, id) {
  const f = fontById(fonts, id);
  if (!f) return SYSTEM_STACK;
  return `"${f.name}", ${f.fallback === 'serif' ? 'Georgia, "Times New Roman", serif, ' : ''}${SYSTEM_STACK}`;
}

/** CSS variables for the chosen display settings: { root: {...}, light: {...}, dark: {...} }. */
export function displayVariables(settings, fonts = []) {
  const d = normalizeDisplay(settings);
  const sp = SPACING[d.ui_spacing];
  const root = {
    '--container': WIDTH[d.page_width],
    '--radius-sm': CORNERS[d.ui_corners].sm,
    '--radius-md': CORNERS[d.ui_corners].md,
    '--radius-lg': CORNERS[d.ui_corners].lg,
    '--space-5': sp[5] + 'px',
    '--space-6': sp[6] + 'px',
    '--space-7': sp[7] + 'px',
    '--space-8': sp[8] + 'px',
    '--space-9': sp[9] + 'px',
    '--img-ratio': RATIO[d.product_image_ratio],
    '--img-aspect': { SQUARE: '1', PORTRAIT: '0.8', LANDSCAPE: '1.3333' }[d.product_image_ratio],
    '--logo-h': d.logo_height_px + 'px',
    '--font-body': fontStack(fonts, d.font_body),
    '--font-heading': fontStack(fonts, d.font_heading === 'system' ? d.font_body : d.font_heading)
  };
  return {
    root,
    textSize: TEXT_SIZE[d.ui_text_size],
    light: { '--shadow-sm': SHADOWS[d.ui_shadows].light.sm, '--shadow-md': SHADOWS[d.ui_shadows].light.md },
    dark: { '--shadow-sm': SHADOWS[d.ui_shadows].dark.sm, '--shadow-md': SHADOWS[d.ui_shadows].dark.md },
    settings: d
  };
}

/** @font-face rules for the chosen fonts only (nothing is downloaded when 'system' is chosen). */
export function fontFaceCss(settings, fonts = []) {
  const d = normalizeDisplay(settings);
  const ids = [...new Set([d.font_body, d.font_heading].filter((id) => id && id !== 'system'))];
  const rules = [];
  ids.forEach((id) => {
    const f = fontById(fonts, id);
    if (!f) return;
    f.files.forEach((file) => {
      const range = (f.unicode_ranges || {})[file.subset];
      rules.push(`@font-face { font-family: "${f.name}"; font-style: normal; font-weight: ${file.weight}; font-display: swap; src: url("${file.file}") format("woff2");${range ? ` unicode-range: ${range};` : ''} }`);
    });
  });
  return rules.join('\n');
}

/** The one font file worth preloading (body font, Latin, regular), or ''. */
export function fontPreload(settings, fonts = []) {
  const d = normalizeDisplay(settings);
  const f = fontById(fonts, d.font_body);
  if (!f) return '';
  const file = f.files.find((x) => x.subset === 'latin' && x.weight === 400);
  return file ? file.file : '';
}

/** Complete CSS text for the display settings (appended to brand.css by the build). */
export function displayCss(settings, fonts = []) {
  const v = displayVariables(settings, fonts);
  const block = (vars, indent = '  ') => Object.keys(vars).map((k) => `${indent}${k}: ${vars[k]};`).join('\n');
  return `/* Display settings (Admin → Settings → Branding → Look and feel). Generated — do not edit by hand. */
${fontFaceCss(settings, fonts)}
html { font-size: ${v.textSize}; }
:root {
${block(v.root)}
${block(v.light)}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${block(v.dark, '    ')}
  }
}
:root[data-theme="dark"] {
${block(v.dark)}
}
`;
}

/** Applies display settings directly on the page (used by the style guide's live preview). */
export function applyDisplayInline(settings, fonts = [], dark = false) {
  const v = displayVariables(settings, fonts);
  const el = document.documentElement;
  Object.entries({ ...v.root, ...(dark ? v.dark : v.light) }).forEach(([k, val]) => el.style.setProperty(k, val));
  el.style.fontSize = v.textSize;
  // The security policy forbids inline <style> tags, so fonts are added with the FontFace API instead.
  const d = normalizeDisplay(settings);
  [d.font_body, d.font_heading].forEach((id) => {
    const f = fontById(fonts, id);
    if (!f || !('FontFace' in window)) return;
    f.files.forEach((file) => {
      const key = f.name + file.subset + file.weight;
      if (loadedFaces.has(key)) return;
      loadedFaces.add(key);
      const range = (f.unicode_ranges || {})[file.subset];
      const face = new FontFace(f.name, `url("${file.file}")`, { weight: String(file.weight), display: 'swap', ...(range ? { unicodeRange: range } : {}) });
      document.fonts.add(face);
      face.load().catch(() => {});
    });
  });
}

const loadedFaces = new Set();
