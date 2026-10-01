/**
 * ui/menu.js — small menus: the "More" categories drop-down in the header and the footer sections
 * that fold up on phones (Section 23.2 GLOBAL FOOTER).
 */

import { watch } from './breakpoints.js';

export function initMenus() {
  // "More" drop-down: close on outside click, Esc, or after choosing.
  document.querySelectorAll('[data-more-menu]').forEach((details) => {
    document.addEventListener('click', (e) => {
      if (details.open && !details.contains(e.target)) details.open = false;
    });
    details.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && details.open) {
        details.open = false;
        details.querySelector('summary').focus();
      }
    });
  });

  // Footer: folded sections on phones, all open on large screens.
  const sections = Array.from(document.querySelectorAll('[data-acc]'));
  sections.forEach((sec) => {
    const btn = sec.querySelector('[data-acc-toggle]');
    const panel = sec.querySelector('[data-acc-panel]');
    if (!btn || !panel) return;
    if (!panel.id) panel.id = 'acc-' + Math.random().toString(36).slice(2, 8);
    btn.setAttribute('aria-controls', panel.id);
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
    });
  });
  watch('lg', (large) => {
    sections.forEach((sec) => {
      const btn = sec.querySelector('[data-acc-toggle]');
      const panel = sec.querySelector('[data-acc-panel]');
      if (!btn || !panel) return;
      btn.setAttribute('aria-expanded', String(large));
      panel.hidden = !large;
      if (large) btn.setAttribute('tabindex', '-1'); else btn.removeAttribute('tabindex');
    });
  });
}
