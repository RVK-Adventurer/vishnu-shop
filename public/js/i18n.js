/**
 * i18n.js — every piece of on-screen text comes from strings/<lang>.json through t() (Section 10.12),
 * so another language (Tamil, Hindi…) can be added later by adding one file.
 * Also holds date formatting in India time (Section 23.5.4).
 */

let STRINGS = {};
let LANG = 'en';

/** Used by the build (Node) and by tests: give the strings object directly. */
export function setStrings(obj, lang = 'en') {
  STRINGS = obj || {};
  LANG = lang;
}

/** Browser: loads /strings/<lang>.json once (the service worker keeps a copy for offline use). */
export async function loadStrings(lang = 'en') {
  const res = await fetch(`/strings/${lang}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error('strings ' + res.status);
  setStrings(await res.json(), lang);
}

export function currentLang() {
  return LANG;
}

function lookup(key) {
  let node = STRINGS;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = node[part];
    else return undefined;
  }
  return typeof node === 'string' ? node : undefined;
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
  new Intl.DateTimeFormat('en-IN', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
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
