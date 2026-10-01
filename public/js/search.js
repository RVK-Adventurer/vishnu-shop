/**
 * search.js — fast search that runs entirely in the browser from catalog.json (Section 10.5):
 * matches whole words, word starts and small typos (one letter wrong, missing or extra), across
 * product name, brand, category and tags. No server call while browsing.
 */

import { html, raw, esc } from './html.js';

export function normalize(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function tokens(s) {
  return normalize(s).split(' ').filter(Boolean);
}

/** True if a and b differ by at most one letter (changed, added or removed). */
export function withinOneEdit(a, b) {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la > lb) i++;
    else if (lb > la) j++;
    else { i++; j++; }
  }
  return edits + (la - i) + (lb - j) <= 1;
}

/** Search index for the catalog index (templates.indexCatalog). */
export function buildIndex(cat) {
  return cat.products.map((p) => {
    const c = cat.catById[p.category_id];
    const fields = [
      [tokens(p.name), 3],
      [tokens(p.brand), 2],
      [tokens(c ? c.name : ''), 2],
      [tokens((p.tags || []).join(' ')), 2],
      [tokens(p.short), 1]
    ];
    return { p, fields };
  });
}

function matchToken(q, fields) {
  let best = 0;
  for (const [words, weight] of fields) {
    for (const w of words) {
      let s = 0;
      if (w === q) s = 10;
      else if (w.startsWith(q)) s = q.length >= 2 ? 7 : 4;
      else if (q.length >= 3 && w.includes(q)) s = 3;
      else if (q.length >= 4 && (withinOneEdit(q, w) || withinOneEdit(q, w.slice(0, q.length)))) s = 2;
      if (s * weight > best) best = s * weight;
    }
  }
  return best;
}

/** Products matching every word of the query, best first. */
export function search(index, query) {
  const qs = tokens(query);
  if (!qs.length) return index.map((e) => e.p);
  const scored = [];
  for (const e of index) {
    let total = 0;
    let ok = true;
    for (const q of qs) {
      const s = matchToken(q, e.fields);
      if (!s) { ok = false; break; }
      total += s;
    }
    if (ok) scored.push({ p: e.p, s: total + (e.p.bestseller_rank ? 1 / e.p.bestseller_rank : 0) });
  }
  return scored.sort((a, b) => b.s - a.s).map((x) => x.p);
}

/** Up to `limit` products and 3 categories for the suggestion list. */
export function suggest(index, cat, query, limit = 6) {
  const qs = tokens(query);
  const products = search(index, query).slice(0, limit);
  const categories = qs.length ? cat.categories.filter((c) => {
    const words = tokens(c.name);
    return qs.every((q) => words.some((w) => w.startsWith(q) || (q.length >= 4 && withinOneEdit(q, w))));
  }).slice(0, 3) : [];
  return { products, categories };
}

/** The product name with the parts that match the query in bold (<mark>). Safe HTML. */
export function highlight(name, query) {
  const qs = tokens(query);
  if (!qs.length) return html`${name}`;
  const out = String(name).split(/(\s+)/).map((word) => {
    const n = normalize(word);
    const q = qs.find((x) => n.startsWith(x));
    if (!q || !n) return esc(word);
    const len = Math.min(word.length, q.length);
    return '<mark>' + esc(word.slice(0, len)) + '</mark>' + esc(word.slice(len));
  }).join('');
  return raw(out);
}
