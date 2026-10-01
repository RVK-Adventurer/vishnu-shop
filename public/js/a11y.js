/**
 * a11y.js — accessibility helpers (Section 10.10): screen-reader announcements, reduced motion,
 * and a focus trap used when the browser has no native <dialog>.
 */

/** Says something to screen-reader users without moving focus. */
export function announce(message, { assertive = false } = {}) {
  const region = document.querySelector(assertive ? '[data-live-assertive]' : '[data-live-polite]');
  if (!region) return;
  region.textContent = '';
  setTimeout(() => { region.textContent = message; }, 50);
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const FOCUSABLE = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

export function focusables(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

/** Keeps Tab / Shift+Tab inside `root`. Returns a function that removes the trap. */
export function trapFocus(root) {
  const onKey = (e) => {
    if (e.key !== 'Tab') return;
    const list = focusables(root);
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  root.addEventListener('keydown', onKey);
  return () => root.removeEventListener('keydown', onKey);
}
