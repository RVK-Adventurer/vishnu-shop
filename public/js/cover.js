/**
 * cover.js — the cover picture for the welcome banner (the big area under the menu bar).
 * Shared by the build (checks the files, writes the CSS), the shop page (templates.js) and the
 * Design preview, so all three always agree.
 *
 * hero_cover_json = {
 *   "mode": "PHOTO" | "ARTWORK",
 *       PHOTO   = a photo; the shop's words (title, line, button) are written over it.
 *       ARTWORK = a finished design that already contains its own words; shown whole, never cropped.
 *   "desktop": "client/assets/cover-desktop.jpg",   required  — exactly 3 : 1, best 1920 × 640
 *   "tablet":  "client/assets/cover-tablet.jpg",    optional  — exactly 2 : 1, best 1536 × 768
 *   "mobile":  "client/assets/cover-mobile.jpg",    optional  — exactly 1 : 1, best 1080 × 1080
 *   "alt": "Diwali sweets on a brass plate",        describes the picture (read aloud to blind visitors)
 *   "background": "#7C2D12",      colour/gradient behind the picture: shows through a see-through picture
 *                                 and fills the sides of an ARTWORK picture on very wide screens
 *   "image_opacity": 100,         20–100 %  (lower = the background colour shows through)
 *   "overlay": "#000000",         colour or gradient laid over the photo to make words readable
 *   "overlay_opacity": 35,        0–80 %
 *   "overlay_style": "FULL" | "SIDE" | "BOTTOM",    whole picture, fading from the text side, or from the bottom
 *   "text_align": "LEFT" | "CENTER" | "RIGHT",
 *   "text_valign": "TOP" | "MIDDLE" | "BOTTOM",
 *   "text_color": "AUTO" | "LIGHT" | "DARK",
 *   "eyebrow": "", "title": "", "subtitle": "",     empty = "Welcome to" / shop name / tagline
 *   "show_eyebrow": true, "show_subtitle": true, "show_button": true,
 *   "button_text": "", "button_link": "",           empty = "Shop now" → the products below
 *   "link": "",                                     ARTWORK only: the whole picture opens this page
 *   "focal_x": 50, "focal_y": 50                    PHOTO only: the part that must stay visible when trimmed
 * }
 * A picture with the wrong shape is NOT used (the build log / preview says why), so the banner can
 * never look stretched, squashed or badly cut on any screen.
 */

import { parsePaint, paintCss, textOnPaint } from './theme.js';

export const COVER_SPEC = {
  desktop: { label: 'Computer', ratio: 3, ratioText: '3 : 1', best: [1920, 640], min: [1440, 480], kb: 600, from: 1280 },
  tablet: { label: 'Tablet', ratio: 2, ratioText: '2 : 1', best: [1536, 768], min: [1024, 512], kb: 450, from: 768 },
  mobile: { label: 'Phone', ratio: 1, ratioText: '1 : 1', best: [1080, 1080], min: [720, 720], kb: 350, from: 0 }
};
const TOLERANCE = 0.02; // 2 % — e.g. 1920 × 628 is accepted as 3 : 1, 1920 × 700 is not

const pick = (v, list, d) => (list.includes(v) ? v : d);
const num = (v, lo, hi, d) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d;
};
const str = (v, max) => String(v ?? '').trim().slice(0, max);

/** Cleans the owner's cover settings (unknown values fall back to safe defaults). null = no cover. */
export function normalizeCover(raw) {
  if (!raw || typeof raw !== 'object' || !raw.desktop) return null;
  return {
    mode: pick(raw.mode, ['PHOTO', 'ARTWORK'], 'PHOTO'),
    desktop: str(raw.desktop, 300), tablet: str(raw.tablet, 300), mobile: str(raw.mobile, 300),
    alt: str(raw.alt, 200),
    background: raw.background ?? '',
    image_opacity: num(raw.image_opacity ?? 100, 20, 100, 100),
    overlay: raw.overlay === undefined ? '#000000' : raw.overlay,
    overlay_opacity: num(raw.overlay_opacity ?? 35, 0, 80, 35),
    overlay_style: pick(raw.overlay_style, ['FULL', 'SIDE', 'BOTTOM'], 'FULL'),
    text_align: pick(raw.text_align, ['LEFT', 'CENTER', 'RIGHT'], 'LEFT'),
    text_valign: pick(raw.text_valign, ['TOP', 'MIDDLE', 'BOTTOM'], 'MIDDLE'),
    text_color: pick(raw.text_color, ['AUTO', 'LIGHT', 'DARK'], 'AUTO'),
    eyebrow: str(raw.eyebrow, 40), title: str(raw.title, 80), subtitle: str(raw.subtitle, 160),
    show_eyebrow: raw.show_eyebrow !== false, show_subtitle: raw.show_subtitle !== false, show_button: raw.show_button !== false,
    button_text: str(raw.button_text, 30), button_link: str(raw.button_link, 300), link: str(raw.link, 300),
    focal_x: num(raw.focal_x ?? 50, 0, 100, 50), focal_y: num(raw.focal_y ?? 50, 0, 100, 50),
    // Filled in by the build / preview after checking the files: { desktop: {w,h}, tablet: …, mobile: … }
    _dims: raw._dims && typeof raw._dims === 'object' ? raw._dims : {}
  };
}

/**
 * Checks one picture against its slot. dims = { width, height, kb }. Returns '' when fine,
 * otherwise the problem in plain words (the picture is then not used).
 */
export function checkCoverPicture(slot, dims) {
  const spec = COVER_SPEC[slot];
  if (!dims || !dims.width || !dims.height) return `${spec.label} picture: could not be read. Use a JPG, PNG or WebP file.`;
  const ratio = dims.width / dims.height;
  if (Math.abs(ratio - spec.ratio) / spec.ratio > TOLERANCE) {
    return `${spec.label} picture is ${dims.width} × ${dims.height} (shape ${ratio.toFixed(2)} : 1). It must be ${spec.ratioText} — for example ${spec.best[0]} × ${spec.best[1]} pixels. It was not used.`;
  }
  if (dims.width < spec.min[0]) return `${spec.label} picture is only ${dims.width} pixels wide — it would look blurry. Use at least ${spec.min[0]} × ${spec.min[1]} (best ${spec.best[0]} × ${spec.best[1]}). It was not used.`;
  if (dims.kb && dims.kb > spec.kb) return `${spec.label} picture is ${dims.kb} KB — please save it smaller than ${spec.kb} KB (JPG quality 75–80 or WebP) so the shop opens fast. It is used, but slows the page.`;
  return '';
}

/** Is the problem from checkCoverPicture serious enough to drop the picture? */
export function isBlocking(problem) {
  return !!problem && /was not used|could not be read/.test(problem);
}

/** The text colour over the cover: AUTO looks at the overlay colour and how strong it is. */
export function coverTextTone(c) {
  if (c.text_color === 'LIGHT') return 'light';
  if (c.text_color === 'DARK') return 'dark';
  const p = parsePaint(c.overlay);
  if (!p || c.overlay_opacity < 25) return 'light'; // photo with little overlay: light text + soft shadow
  return textOnPaint(p).color === '#FFFFFF' ? 'light' : 'dark';
}

/** Plain-words warnings about readability (shown in the build log and the preview). */
export function coverWarnings(c) {
  const out = [];
  if (!c) return out;
  if (c.mode === 'PHOTO' && c.overlay_opacity < 20) out.push('Cover: the overlay is very light (under 20 %). Words over a busy photo may be hard to read — try 30–45 %.');
  if (c.mode === 'ARTWORK' && !c.alt) out.push('Cover: add "alt" — the words written in your picture, so blind visitors and Google can read them.');
  if (c.mode === 'ARTWORK' && (!c.mobile || !c.tablet)) out.push('Cover: for an ARTWORK picture, please add the tablet and phone versions too; otherwise the computer picture is shown small on phones so its words are not cut off.');
  if (c.background && !parsePaint(c.background)) out.push('Cover: "background" is not a colour (use "#7C2D12" or a gradient). The theme colour is used.');
  if (c.overlay !== '' && c.overlay !== null && !parsePaint(c.overlay)) out.push('Cover: "overlay" is not a colour (use "#000000" or a gradient). Black is used.');
  return out;
}

/**
 * CSS for the cover (goes into brand.css — no inline styles): picture opacity, focal point and
 * overlay. Only numbers and checked colour codes are written.
 */
export function coverCss(c) {
  if (!c) return '';
  const p = parsePaint(c.overlay) || parsePaint('#000000');
  const solid = p.stops[0];
  const op = (c.overlay_opacity / 100).toFixed(2);
  let overlay = paintCss(p);
  if (c.overlay_style !== 'FULL') {
    // Fade from the text side (or the bottom) to clear, using the first overlay colour.
    const dir = c.overlay_style === 'BOTTOM' ? 'to top' : (c.text_align === 'RIGHT' ? 'to left' : c.text_align === 'CENTER' ? 'to top' : 'to right');
    overlay = `linear-gradient(${dir}, ${solid} 0%, ${solid} 25%, transparent 85%)`;
  }
  const lines = [
    `.hero--cover .hero-cover__img { opacity: ${(c.image_opacity / 100).toFixed(2)}; object-position: ${c.focal_x}% ${c.focal_y}%; }`,
    c.mode === 'PHOTO' && c.overlay_opacity > 0 ? `.hero--cover .hero-cover__overlay { background: ${overlay}; opacity: ${op}; }` : '.hero--cover .hero-cover__overlay { display: none; }'
  ];
  // If the picture is see-through, the colour behind it is the overlay's first colour (or the theme).
  const bg = parsePaint(c.background);
  if (bg) lines.push(`.hero--cover { background: ${paintCss(bg)}; }`);
  else if (c.image_opacity < 100) lines.push(`.hero--cover { background: ${solid}; }`);
  return `/* Cover picture (Admin → Settings → Branding → Cover). Generated. */\n${lines.join('\n')}\n`;
}
