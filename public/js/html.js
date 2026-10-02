/**
 * html.js — safe HTML building, shared by the build script (Node) and the browser.
 *
 * Every value placed into a template with html`...${value}...` is escaped automatically,
 * so customer or owner text can never become code. Only values wrapped with raw() (or
 * produced by another html`` template) are inserted as HTML.
 */

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes text for use in HTML content or attribute values. */
export function esc(value) {
  if (value === null || value === undefined || value === false) return '';
  return String(value).replace(/[&<>"']/g, (c) => ESC_MAP[c]);
}

/** A piece of HTML that is already safe. */
export class SafeHtml {
  constructor(s) { this.__html = s; }
  toString() { return this.__html; }
}

/** Marks a string as trusted HTML. Use ONLY for HTML produced by our own templates or the sanitizer. */
export function raw(s) {
  return s instanceof SafeHtml ? s : new SafeHtml(s === null || s === undefined ? '' : String(s));
}

function part(v) {
  if (v === null || v === undefined || v === false || v === true) return '';
  if (v instanceof SafeHtml) return v.__html;
  if (Array.isArray(v)) return v.map(part).join('');
  return esc(v);
}

/** Tagged template: html`<p>${name}</p>` — escapes every interpolated value. Arrays are joined. */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += part(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

/** Joins a list of SafeHtml/strings (strings are escaped). */
export function join(list, sep = '') {
  return new SafeHtml(list.map(part).join(sep));
}

/** Builds a class attribute value from a map: cls({a: true, b: false}, 'c') -> "a c". */
export function cls(...items) {
  const out = [];
  for (const it of items) {
    if (!it) continue;
    if (typeof it === 'string') out.push(it);
    else Object.keys(it).forEach((k) => { if (it[k]) out.push(k); });
  }
  return out.join(' ');
}

/** JSON for a <script type="application/json"> or JSON-LD block, safe against "</script>". */
export function jsonForScript(obj) {
  return raw(JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'));
}

/**
 * Allow-list sanitizer for owner-written rich text (product descriptions, policy pages) when it is
 * rendered by the BUILD (Node). The server cleans it on save too; this is a second, independent layer.
 *
 * The admin's Word-style editor (Phase 2) produces only these tags and "rt-…" classes, so formatting
 * works under the shop's strict security policy (no inline styles, no scripts):
 *   text: p br strong b em i u s del mark sub sup small span code pre blockquote hr h2 h3 h4
 *   lists: ul ol(start) li     links: a(href: https, http, mailto, tel, /shop-page, #anchor)
 *   tables: table caption thead tbody tfoot tr th(scope, colspan, rowspan) td(colspan, rowspan)
 *   layout: div figure figcaption     pictures: img (only from the shop's own /assets or /client/assets)
 * Anything else is removed; the contents of script/style/iframe/etc. are dropped entirely.
 */
const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'mark', 'sub', 'sup', 'small', 'span', 'code', 'pre',
  'blockquote', 'hr', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'table', 'caption', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'div', 'figure', 'figcaption', 'img']);
const VOID_TAGS = new Set(['br', 'hr', 'img']);
const DROP_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'math', 'textarea', 'select', 'head', 'title']);

/** Formatting classes the editor may use (styled in base.css → "Rich text"). */
export const RICH_CLASSES = new Set([
  'rt-left', 'rt-center', 'rt-right', 'rt-justify',
  'rt-xs', 'rt-sm', 'rt-lg', 'rt-xl',
  'rt-lh-1', 'rt-lh-15', 'rt-lh-2', 'rt-sp-0', 'rt-sp-1', 'rt-sp-2', 'rt-indent-1', 'rt-indent-2', 'rt-indent-3',
  'rt-c-primary', 'rt-c-accent', 'rt-c-red', 'rt-c-green', 'rt-c-blue', 'rt-c-orange', 'rt-c-purple', 'rt-c-grey',
  'rt-hl-yellow', 'rt-hl-green', 'rt-hl-blue', 'rt-hl-pink',
  'rt-f-heading', 'rt-f-mono', 'rt-caps',
  'rt-table-striped', 'rt-table-plain', 'rt-table-bordered', 'rt-w-25', 'rt-w-33', 'rt-w-50',
  'rt-list-check', 'rt-list-none', 'rt-note', 'rt-warn', 'rt-cols-2',
  'rt-img-left', 'rt-img-right', 'rt-img-center', 'rt-img-full'
]);

function attrsOf(text) {
  const out = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m;
  while ((m = re.exec(text || ''))) out[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? '');
  return out;
}

function safeImgSrc(src) {
  const s = String(src || '').trim();
  if (!/^\/(client\/assets|assets)\/[^?#<>"'`\s]+\.(jpe?g|png|webp|avif|gif)$/i.test(s) || s.includes('..')) return '';
  return s;
}

export function sanitizeRichText(input) {
  const s = String(input || '');
  let out = '';
  const re = /<!--[\s\S]*?-->|<\/?([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)|(<)/g;
  let m;
  const stack = [];
  const close = (tag) => (tag === 'table' ? '</table></div>' : '</' + tag + '>');
  while ((m = re.exec(s))) {
    if (m[0].startsWith('<!--')) continue;
    if (m[3] !== undefined) { out += esc(decodeEntities(m[3])); continue; }
    if (m[4] !== undefined) { out += '&lt;'; continue; }
    const tag = m[1].toLowerCase();
    const closing = m[0].charAt(1) === '/';
    if (DROP_CONTENT.has(tag)) {
      if (!closing && !/\/\s*>$/.test(m[0])) {
        const end = s.toLowerCase().indexOf('</' + tag, re.lastIndex);
        if (end === -1) break;
        const gt = s.indexOf('>', end);
        re.lastIndex = gt === -1 ? s.length : gt + 1;
      }
      continue;
    }
    if (!ALLOWED_TAGS.has(tag)) continue;
    if (closing) {
      const idx = stack.lastIndexOf(tag);
      if (idx !== -1) while (stack.length > idx) out += close(stack.pop());
      continue;
    }
    const a = attrsOf(m[2]);
    let attrs = '';
    const classes = String(a.class || '').split(/\s+/).filter((c) => RICH_CLASSES.has(c));
    if (classes.length) attrs += ' class="' + classes.join(' ') + '"';
    if (tag === 'a') {
      const h = String(a.href || '').trim();
      if (/^(https?:|mailto:|tel:|\/|#)/i.test(h) && !/^\/[\\/]/.test(h)) {
        attrs += ' href="' + esc(h) + '"';
        if (/^https?:/i.test(h)) attrs += ' rel="noopener noreferrer" target="_blank"';
      }
    }
    if (tag === 'td' || tag === 'th') {
      ['colspan', 'rowspan'].forEach((k) => { const n = parseInt(a[k], 10); if (n > 1 && n <= 20) attrs += ` ${k}="${n}"`; });
      if (tag === 'th' && (a.scope === 'row' || a.scope === 'col')) attrs += ` scope="${a.scope}"`;
    }
    if (tag === 'ol') { const n = parseInt(a.start, 10); if (n > 1 && n < 10000) attrs += ` start="${n}"`; }
    if (tag === 'img') {
      const src = safeImgSrc(a.src);
      if (!src) continue;
      const w = parseInt(a.width, 10);
      const h = parseInt(a.height, 10);
      out += `<img src="${esc(src)}" alt="${esc(String(a.alt || '').slice(0, 200))}"${attrs}${w > 0 && w <= 4000 ? ` width="${w}"` : ''}${h > 0 && h <= 4000 ? ` height="${h}"` : ''} loading="lazy" decoding="async">`;
      continue;
    }
    if (VOID_TAGS.has(tag)) { out += '<' + tag + attrs + '>'; continue; }
    out += (tag === 'table' ? '<div class="rt-table-wrap">' : '') + '<' + tag + attrs + '>';
    stack.push(tag);
  }
  while (stack.length) out += close(stack.pop());
  return raw(out);
}

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|#39|apos|nbsp);/gi, (all, e) => {
    const k = e.toLowerCase();
    if (k === 'amp') return '&';
    if (k === 'lt') return '<';
    if (k === 'gt') return '>';
    if (k === 'quot') return '"';
    if (k === '#39' || k === 'apos') return "'";
    if (k === 'nbsp') return '\u00a0';
    const code = k.startsWith('#x') ? parseInt(k.slice(2), 16) : k.startsWith('#') ? parseInt(k.slice(1), 10) : NaN;
    if (Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)) return String.fromCodePoint(code);
    if (k.startsWith('#')) return '';
    return all;
  });
}
