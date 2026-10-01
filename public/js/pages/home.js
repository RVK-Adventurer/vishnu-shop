/**
 * pages/home.js — home page extras: banner dots and optional auto-rotation, and the
 * "Recently viewed" row (shown only with 4+ products, Section 23.6.2). Layout B uses listing.js.
 */

import { loadCatalog, recentIds } from '../catalog.js';
import { productCard } from '../templates.js';
import { html } from '../html.js';
import { t } from '../i18n.js';
import { settings } from '../settings.js';
import { setHtml, $ } from '../state.js';
import { prefersReducedMotion } from '../a11y.js';

function initHero() {
  const hero = $('[data-hero]');
  if (!hero) return;
  const track = $('[data-hero-track]', hero);
  const dots = Array.from(hero.querySelectorAll('[data-hero-dot]'));
  const slides = Array.from(track.children);
  if (slides.length < 2) return;
  let current = 0;
  const mark = (i) => {
    current = i;
    dots.forEach((d, k) => d.setAttribute('aria-selected', k === i ? 'true' : 'false'));
  };
  const go = (i) => {
    const target = slides[(i + slides.length) % slides.length];
    track.scrollTo({ left: target.offsetLeft, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    mark(slides.indexOf(target));
  };
  dots.forEach((d, i) => d.addEventListener('click', () => { go(i); stop(); }));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting && en.intersectionRatio > 0.6) mark(slides.indexOf(en.target)); }), { root: track, threshold: [0.6] });
    slides.forEach((s) => io.observe(s));
  }
  // Auto-rotation only if the owner switched it on, never with reduced motion, paused on touch/hover/focus.
  let timer = null;
  const stop = () => { clearInterval(timer); timer = null; };
  if (hero.hasAttribute('data-autorotate') && !prefersReducedMotion()) {
    timer = setInterval(() => go(current + 1), 6000);
    ['pointerdown', 'mouseenter', 'focusin', 'touchstart'].forEach((ev) => hero.addEventListener(ev, stop, { passive: true }));
  }
}

async function initRecent() {
  const row = $('[data-row="recent"]');
  const ids = recentIds();
  if (!row || ids.length < 4) return;
  const cat = await loadCatalog();
  const items = ids.map((id) => cat.byId[id]).filter(Boolean).slice(0, 16);
  if (items.length < 4) return;
  const ctx = { s: settings(), t, cat, now: new Date() };
  setHtml($('[data-row-track]', row), html`${items.map((p) => productCard(p, ctx))}`);
  row.hidden = false;
}

export async function init() {
  initHero();
  initRecent();
  if ($('[data-listing]')) {
    const listing = await import('./listing.js');
    listing.init();
  }
}
