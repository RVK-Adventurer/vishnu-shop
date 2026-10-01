/**
 * i18n.js — every piece of on-screen text comes from strings/<lang>.json through t() (Section 10.12),
 * so another language (Tamil, Hindi…) can be added later by adding one file.
 * Also holds date formatting in India time (Section 23.5.4).
 */

let STRINGS = {};
let LANG = 'en';

/** The languages the shop can offer. Add a strings/<code>.json file and an entry here to add one. */
export const LANGUAGES = {
  en: { name: 'English', short: 'EN', locale: 'en-IN' },
  ta: { name: 'தமிழ்', short: 'த', locale: 'ta-IN' },
  hi: { name: 'हिन्दी', short: 'हि', locale: 'hi-IN' }
};

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

/** Deep copy of `base` with `over` laid on top (missing translations fall back to English). */
export function mergeStrings(base, over) {
  const out = {};
  Object.keys(base || {}).forEach((k) => { out[k] = isObj(base[k]) ? mergeStrings(base[k], {}) : base[k]; });
  Object.keys(over || {}).forEach((k) => {
    if (k.startsWith('_')) return;
    if (isObj(over[k]) && isObj(out[k])) out[k] = mergeStrings(out[k], over[k]);
    else if (typeof over[k] === 'string' && over[k].trim() !== '') out[k] = over[k];
    else if (isObj(over[k]) && out[k] === undefined) out[k] = mergeStrings({}, over[k]);
  });
  return out;
}

function getPath(obj, key) {
  let node = obj;
  for (const part of key.split('.')) {
    if (isObj(node) && part in node) node = node[part];
    else return undefined;
  }
  return node;
}

function setPath(obj, key, value) {
  const parts = key.split('.');
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!isObj(node[parts[i]])) node[parts[i]] = {};
    node = node[parts[i]];
  }
  node[parts[parts.length - 1]] = value;
}

/** The {placeholders} in a piece of text, sorted, e.g. "{n} items" -> ["n"]. */
export function placeholders(text) {
  return [...new Set(String(text || '').match(/\{(\w+)\}/g) || [])].map((x) => x.slice(1, -1)).sort();
}

/**
 * Checks one owner-written replacement for a shop sentence (Admin → Shop wording).
 * Rules: the sentence must exist, keep exactly the same {placeholders}, be plain text, and be at
 * most 300 characters. Returns '' when fine, otherwise the reason in plain words.
 */
export function checkOverride(base, key, text) {
  const original = getPath(base, key);
  if (typeof original !== 'string') return `"${key}" is not a sentence on the shop.`;
  const value = String(text ?? '');
  if (!value.trim()) return 'The new wording is empty.';
  if (value.length > 300) return 'Please keep it to 300 characters or fewer.';
  if (/[<>]/.test(value)) return 'Please don\'t use < or > (plain text only).';
  const a = placeholders(original).join(',');
  const b = placeholders(value).join(',');
  if (a !== b) return `Keep these exactly as they are: ${placeholders(original).map((x) => '{' + x + '}').join(' ') || '(none)'}.`;
  return '';
}

/**
 * Lays the owner's wording changes over the shop's text. Invalid ones are skipped and returned,
 * so the build can list them. overrides = { "cart.add": "Add to bag", … }.
 */
export function applyOverrides(strings, overrides) {
  const skipped = [];
  const out = mergeStrings(strings, {});
  Object.entries(overrides || {}).forEach(([key, text]) => {
    const problem = checkOverride(strings, key, text);
    if (problem) skipped.push({ key, problem });
    else setPath(out, key, String(text));
  });
  return { strings: out, skipped };
}

/** Used by the build and tests: give the strings object directly. */
export function setStrings(obj, lang = 'en') {
  STRINGS = obj || {};
  LANG = lang;
}

/**
 * Browser: loads the words for a language (English underneath, so any untranslated sentence still
 * shows in English), then the owner's wording changes for that language.
 */
export async function loadStrings(lang = 'en', overrides = null) {
  const get = (code) => fetch(`/strings/${code}.json`, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
  const base = await get('en');
  let merged = base;
  if (lang !== 'en' && LANGUAGES[lang]) {
    try { merged = mergeStrings(base, await get(lang)); } catch (e) { merged = base; }
  }
  if (overrides) merged = applyOverrides(merged, overrides).strings;
  setStrings(merged, lang);
}

export function currentLang() {
  return LANG;
}

export function currentLocale() {
  return (LANGUAGES[LANG] || LANGUAGES.en).locale;
}

function lookup(key) {
  const v = getPath(STRINGS, key);
  return typeof v === 'string' ? v : undefined;
}

/**
 * t('cart.title', {n: 3}) -> "Your cart (3)". Missing keys show the key itself, so a gap is easy to spot.
 * Plural helper: if vars.n is given and "<key>_one" exists and n === 1, that variant is used.
 */
export function t(key, vars) {
  let s;
  if (vars && vars.n === 1) s = lookup(key + '_one');
  if (s === undefined) s = lookup(key);
  if (s === undefined) return key;
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (all, name) => (vars[name] === undefined || vars[name] === null ? all : String(vars[name])));
}

/** True if the key exists (useful for optional help texts). */
export function has(key) {
  return lookup(key) !== undefined;
}

const TZ = 'Asia/Kolkata';

function parts(date) {
  const p = {};
  new Intl.DateTimeFormat(currentLocale(), { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    .formatToParts(date).forEach((x) => { p[x.type] = x.value; });
  return p;
}

/** "Thu, 3 Oct" — adds the year only when it isn't this year. */
export function formatDate(date, now = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const p = parts(d);
  const thisYear = parts(now).year;
  return `${p.weekday}, ${p.day} ${p.month}` + (p.year !== thisYear ? ` ${p.year}` : '');
}

/** "3:45 PM" */
export function formatTime(date) {
  const p = parts(date instanceof Date ? date : new Date(date));
  return `${p.hour}:${p.minute} ${String(p.dayPeriod || '').toUpperCase()}`;
}

/** "2 min ago", "3 h ago", then "Yesterday, 6:10 PM", then a date (Section 23.5.4). */
export function formatRelative(date, now = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const diff = Math.round((now.getTime() - d.getTime()) / 1000);
  if (diff < 45) return t('time.just_now');
  if (diff < 3600) return t('time.min_ago', { n: Math.max(1, Math.round(diff / 60)) });
  if (diff < 86400) return t('time.h_ago', { n: Math.round(diff / 3600) });
  const y = new Date(now.getTime() - 86400000);
  if (parts(y).day === parts(d).day && parts(y).month === parts(d).month && parts(y).year === parts(d).year) {
    return t('time.yesterday', { time: formatTime(d) });
  }
  return formatDate(d, now);
}
