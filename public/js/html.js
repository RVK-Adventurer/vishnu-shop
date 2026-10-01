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
 * Allow-list sanitizer for owner-written rich text (product descriptions, policy pages) when it
 * is rendered by the BUILD (Node). The server sanitizes on save too; this is a second layer.
 * Allowed: p br strong b em i u ul ol li h2 h3 h4 a(href http/https/mailto/tel/relative) blockquote table thead tbody tr th td.
 */
const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'a',
  'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span']);

export function sanitizeRichText(input) {
  const s = String(input || '');
  let out = '';
  const re = /<\/?([a-zA-Z0-9]+)([^>]*)>|([^<]+)|(<)/g;
  let m;
  const stack = [];
  while ((m = re.exec(s))) {
    if (m[3] !== undefined) { out += esc(decodeEntities(m[3])); continue; }
    if (m[4] !== undefined) { out += '&lt;'; continue; }
    const tag = m[1].toLowerCase();
    const closing = m[0].charAt(1) === '/';
    if (!ALLOWED_TAGS.has(tag)) continue;
    if (closing) {
      const idx = stack.lastIndexOf(tag);
      if (idx !== -1) {
        while (stack.length > idx) out += '</' + stack.pop() + '>';
      }
      continue;
    }
    if (tag === 'br') { out += '<br>'; continue; }
    let attrs = '';
    if (tag === 'a') {
      const hm = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[2]);
      const href = hm ? (hm[2] ?? hm[3] ?? hm[4] ?? '') : '';
      const h = decodeEntities(href).trim();
      if (/^(https?:|mailto:|tel:|\/|#)/i.test(h) && !/^\/\//.test(h)) {
        attrs = ' href="' + esc(h) + '"';
        if (/^https?:/i.test(h)) attrs += ' rel="noopener noreferrer" target="_blank"';
      }
    }
    out += '<' + tag + attrs + '>';
    stack.push(tag);
  }
  while (stack.length) out += '</' + stack.pop() + '>';
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
    if (k.startsWith('#x')) return String.fromCodePoint(parseInt(k.slice(2), 16));
    if (k.startsWith('#')) return String.fromCodePoint(parseInt(k.slice(1), 10));
    return all;
  });
}
