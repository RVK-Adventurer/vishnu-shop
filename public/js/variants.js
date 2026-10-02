/**
 * variants.js — choosing a product option (size, colour, weight…). Shared by the product page and
 * the quick-add sheet (Section 23.4 VARIANT SELECTOR). Unavailable choices stay focusable and are
 * announced as "out of stock" instead of being hidden.
 */

import { t } from './i18n.js';

/** The variant whose options exactly match `opts`, or null. */
export function findVariant(p, opts) {
  const names = p.option_names || [];
  return (p.variants || []).find((v) => names.every((n) => (v.options || {})[n] === opts[n])) || null;
}

/** Can `value` for option `name` be bought, given the other options currently chosen? */
export function isAvailable(p, name, value, current) {
  const names = (p.option_names || []).filter((n) => n !== name);
  return (p.variants || []).some((v) => v.in_stock && (v.options || {})[name] === value && names.every((n) => !current[n] || (v.options || {})[n] === current[n]));
}

/**
 * New selection after choosing name=value: keeps the other choices when that exact combination
 * exists, otherwise switches to the closest in-stock combination with that value.
 */
export function pick(p, current, name, value) {
  const wanted = { ...current, [name]: value };
  const exact = findVariant(p, wanted);
  if (exact) return exact;
  const names = p.option_names || [];
  const candidates = (p.variants || []).filter((v) => (v.options || {})[name] === value);
  if (!candidates.length) return null;
  const score = (v) => names.reduce((s, n) => s + ((v.options || {})[n] === current[n] ? 1 : 0), 0) + (v.in_stock ? 10 : 0);
  return candidates.slice().sort((a, b) => score(b) - score(a))[0];
}

/**
 * Wires the option buttons inside `root` for product `p`, starting at `variant`.
 * Calls onChange(variant) after every choice. Returns { get: () => current variant }.
 */
export function wireVariantPicker(root, p, variant, onChange) {
  let current = variant;
  const fieldsets = Array.from(root.querySelectorAll('[data-option]'));

  root.querySelectorAll('[data-swatch-fill]').forEach((el) => { el.style.background = el.getAttribute('data-swatch-fill'); });

  function apply() {
    const opts = (current && current.options) || {};
    fieldsets.forEach((fs) => {
      const name = fs.getAttribute('data-option');
      const label = fs.querySelector('[data-option-value]');
      if (label) label.textContent = opts[name] || '';
      fs.querySelectorAll('[data-value]').forEach((btn) => {
        const value = btn.getAttribute('data-value');
        const selected = value === opts[name];
        const available = isAvailable(p, name, value, opts);
        btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
        btn.classList.toggle('is-unavailable', !available);
        btn.setAttribute('aria-label', available ? value : t('product.unavailable_option', { value }));
      });
    });
  }

  fieldsets.forEach((fs) => {
    const name = fs.getAttribute('data-option');
    fs.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-value]');
      if (!btn) return;
      const next = pick(p, (current && current.options) || {}, name, btn.getAttribute('data-value'));
      if (!next) return;
      current = next;
      apply();
      onChange(current);
    });
    // Arrow keys move between choices in a row (like a radio group).
    fs.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      const buttons = Array.from(fs.querySelectorAll('[data-value]'));
      const i = buttons.indexOf(document.activeElement);
      if (i === -1) return;
      e.preventDefault();
      const next = buttons[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length];
      next.focus();
    });
  });

  apply();
  return { get: () => current };
}

/** The photo index to show for a variant (its own photo if it has one). */
export function variantImageIndex(variant) {
  return variant && Number.isInteger(variant.image) ? variant.image : 0;
}

/**
 * The photos to show for a variant (up to 6, as positions in the product's photo list):
 * the variant's own set (e.g. the photos of the Red colour) when it has one, otherwise the
 * product's main set (`gallery`, else the first 6 photos).
 */
export function photoSet(p, variant, max = 6) {
  const n = (p.images || []).length;
  const valid = (list) => (Array.isArray(list) ? list.filter((i, k, a) => Number.isInteger(i) && i >= 0 && i < n && a.indexOf(i) === k).slice(0, max) : []);
  const own = valid(variant && variant.images);
  if (own.length) return own;
  const main = valid(p.gallery);
  if (main.length) return main;
  return Array.from({ length: Math.min(n, max) }, (x, i) => i);
}
