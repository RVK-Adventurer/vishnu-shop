/**
 * color.js — colour maths for brand safety (Section 10.2 and 23.0.3). Shared by the build
 * (which writes brand.css), the style guide and the admin's live previews.
 */

/** The six one-tap theme presets (Section 23.0.3). */
export const THEME_PRESETS = {
  ROYAL_INDIGO: { name: 'Royal Indigo', primary: '#4338CA', secondary: '#0F766E', accent: '#F59E0B', goodFor: 'Any shop' },
  FRESH_GREEN: { name: 'Fresh Green', primary: '#15803D', secondary: '#0E7490', accent: '#FACC15', goodFor: 'Grocery, kirana, organic, plants' },
  SAFFRON: { name: 'Saffron', primary: '#C2410C', secondary: '#7C2D12', accent: '#FBBF24', goodFor: 'Sweets, snacks, puja items, spices' },
  ROSE: { name: 'Rose', primary: '#BE185D', secondary: '#6D28D9', accent: '#FDE68A', goodFor: 'Fashion, sarees, beauty, gifts' },
  OCEAN: { name: 'Ocean', primary: '#0369A1', secondary: '#1E3A8A', accent: '#FCD34D', goodFor: 'Electronics, mobiles, stationery' },
  CHARCOAL_GOLD: { name: 'Charcoal & Gold', primary: '#1F2937', secondary: '#78350F', accent: '#D4A017', goodFor: 'Jewellery, premium, handloom' }
};

export const LIGHT_SURFACE = '#FFFFFF';
export const DARK_SURFACE = '#111827';
export const DARK_TEXT = '#0F172A';
export const WHITE = '#FFFFFF';

export function isHex(hex) {
  return /^#[0-9a-fA-F]{6}$/.test(String(hex || ''));
}

export function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

export function rgbToHex({ r, g, b }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return ('#' + c(r) + c(g) + c(b)).toUpperCase();
}

export function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }) {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const hue = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return { r: hue(p, q, h + 1 / 3) * 255, g: hue(p, q, h) * 255, b: hue(p, q, h - 1 / 3) * 255 };
}

/** WCAG relative luminance. */
export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const f = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio between two colours, 1–21. */
export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** White or dark text — whichever reads better on this background. */
export function bestTextOn(bg) {
  return contrast(bg, WHITE) >= contrast(bg, DARK_TEXT) ? WHITE : DARK_TEXT;
}

/** Changes lightness in 4% steps (up = lighter) until the colour reaches `target` contrast against `against`. */
export function adjustForContrast(hex, against, target = 4.5, direction = 'auto') {
  let hsl = rgbToHsl(hexToRgb(hex));
  const dir = direction === 'auto' ? (luminance(against) < 0.5 ? 1 : -1) : (direction === 'up' ? 1 : -1);
  let out = rgbToHex(hslToRgb(hsl));
  for (let i = 0; i < 25 && contrast(out, against) < target; i++) {
    hsl = { ...hsl, l: Math.max(0, Math.min(100, hsl.l + dir * 4)) };
    out = rgbToHex(hslToRgb(hsl));
  }
  return out;
}

/** "rgba(r, g, b, a)" — used for soft tints (we avoid color-mix() for older phones). */
export function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Slightly darker (amount in % lightness) — used for hover states. */
export function shade(hex, amount) {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ ...hsl, l: Math.max(0, Math.min(100, hsl.l - amount)) }));
}

/**
 * Checks owner-picked brand colours (Section 10.2). Returns warnings in plain words and a
 * suggested accessible shade for each colour that fails.
 */
export function checkBrandColours({ primary, secondary, accent }) {
  const out = [];
  const check = (label, hex) => {
    if (!isHex(hex)) { out.push({ label, ok: false, message: `${label} colour is not a valid colour code.` }); return; }
    const text = bestTextOn(hex);
    const ratio = contrast(hex, text);
    if (ratio < 4.5) {
      const suggestion = adjustForContrast(hex, text, 4.5, text === WHITE ? 'down' : 'up');
      out.push({ label, ok: false, ratio, suggestion, message: `Text on the ${label.toLowerCase()} colour may be hard to read (${ratio.toFixed(1)}:1). Try ${suggestion}.` });
    } else {
      out.push({ label, ok: true, ratio, text });
    }
  };
  check('Primary', primary);
  check('Secondary', secondary);
  check('Accent', accent);
  return out;
}

/**
 * Every brand CSS variable for light and dark mode (Section 23.0.3).
 * Light: fills use the colour itself; links/outlines use a version that passes 4.5:1 on white.
 * Dark: links, focus rings and outlines use a lightened version that passes on #111827; filled
 * buttons keep the brand colour while their text still passes, otherwise use the lightened one.
 */
export function brandVariables({ primary, secondary, accent }) {
  const p = isHex(primary) ? primary.toUpperCase() : THEME_PRESETS.ROYAL_INDIGO.primary;
  const s = isHex(secondary) ? secondary.toUpperCase() : THEME_PRESETS.ROYAL_INDIGO.secondary;
  const a = isHex(accent) ? accent.toUpperCase() : THEME_PRESETS.ROYAL_INDIGO.accent;

  const onP = bestTextOn(p);
  const onS = bestTextOn(s);
  const onA = bestTextOn(a);
  const pLink = adjustForContrast(p, LIGHT_SURFACE, 4.5, 'down');
  const pDark = adjustForContrast(p, DARK_SURFACE, 4.5, 'up');
  const aDark = adjustForContrast(a, DARK_SURFACE, 4.5, 'up');
  // In dark mode keep the real brand colour for filled buttons only if its text passes AND the
  // button is still visible against the dark page (very dark brands like Charcoal would vanish).
  const keepFill = contrast(p, onP) >= 4.5 && contrast(p, DARK_SURFACE) >= 1.6;
  const darkFill = keepFill ? p : pDark;
  const darkOnFill = keepFill ? onP : bestTextOn(pDark);

  const light = {
    '--primary-color': p,
    '--on-primary': onP,
    '--primary-hover': shade(p, 6),
    '--primary-text': pLink,
    '--primary-tint-6': rgba(p, 0.06),
    '--primary-tint-10': rgba(p, 0.10),
    '--primary-tint-16': rgba(p, 0.16),
    '--secondary-color': s,
    '--on-secondary': onS,
    '--accent-color': a,
    '--on-accent': onA,
    '--focus': pLink
  };
  const dark = {
    '--primary-color': darkFill,
    '--on-primary': darkOnFill,
    '--primary-hover': shade(darkFill, -6),
    '--primary-text': pDark,
    '--primary-tint-6': rgba(pDark, 0.10),
    '--primary-tint-10': rgba(pDark, 0.16),
    '--primary-tint-16': rgba(pDark, 0.24),
    '--accent-color': contrast(a, onA) >= 4.5 ? a : aDark,
    '--on-accent': contrast(a, onA) >= 4.5 ? onA : DARK_TEXT,
    '--focus': pDark
  };
  return { light, dark };
}

/** brand.css text for the given colours (written by the build; also used by the style guide). */
export function brandCss(colours) {
  const { light, dark } = brandVariables(colours);
  const block = (vars) => Object.keys(vars).map((k) => `  ${k}: ${vars[k]};`).join('\n');
  return `/* Generated from the shop's brand colours. Do not edit by hand — change colours in Admin → Settings → Branding. */
:root {
${block(light)}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${block(dark).replace(/^/gm, '  ')}
  }
}
:root[data-theme="dark"] {
${block(dark)}
}
`;
}
