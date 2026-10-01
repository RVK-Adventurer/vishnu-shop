/**
 * state.js — safe browser storage (it can be blocked in private windows) and a tiny event bus
 * so different parts of the page can react to changes (for example the cart badge).
 */

function safeStore(kind) {
  let area = null;
  try {
    area = window[kind];
    const probe = '__probe__';
    area.setItem(probe, '1');
    area.removeItem(probe);
  } catch (e) {
    area = null;
  }
  const memory = new Map();
  return {
    available: !!area,
    get(key, fallback = null) {
      try {
        const raw = area ? area.getItem(key) : memory.get(key);
        return raw === null || raw === undefined ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      const raw = JSON.stringify(value);
      try {
        if (area) area.setItem(key, raw); else memory.set(key, raw);
        return true;
      } catch (e) {
        memory.set(key, raw);
        return false;
      }
    },
    remove(key) {
      try { if (area) area.removeItem(key); } catch (e) { /* ignore */ }
      memory.delete(key);
    }
  };
}

/** localStorage (kept between visits). Falls back to memory if the browser blocks it. */
export const local = safeStore('localStorage');
/** sessionStorage (this tab only). */
export const session = safeStore('sessionStorage');

const bus = new EventTarget();

/** Listen for an app event. Returns a function that stops listening. */
export function on(name, handler) {
  const fn = (e) => handler(e.detail);
  bus.addEventListener(name, fn);
  return () => bus.removeEventListener(name, fn);
}

/** Announce an app event, e.g. emit('cart:change', {count: 3}). */
export function emit(name, detail) {
  bus.dispatchEvent(new CustomEvent(name, { detail }));
}

/** Reads a <meta name="x-…"> value written by the build. */
export function meta(name) {
  const el = document.querySelector(`meta[name="${name}"]`);
  return el ? el.getAttribute('content') || '' : '';
}

/** Runs fn at most once every `ms` milliseconds after calls stop (debounce). */
export function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Parses HTML text into a DocumentFragment. Only ever used with our own escaped templates. */
export function fragment(htmlText) {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(htmlText);
  return tpl.content;
}

/** Replaces an element's children with our own (escaped) template output. */
export function setHtml(el, htmlText) {
  if (!el) return;
  el.replaceChildren(fragment(htmlText));
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
