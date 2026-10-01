/**
 * ui/gallery.js — product photos (Section 10.4, 23.2 PRODUCT PAGE): swipe on phones with dots,
 * thumbnails on large screens, arrow keys, and tap/click to open a zoomable full-size photo.
 */

import { html } from '../html.js';
import { setHtml } from '../state.js';
import { t } from '../i18n.js';
import { icon } from '../templates.js';
import { openDialog } from './dialog.js';
import { prefersReducedMotion } from '../a11y.js';

export function initGallery(root, images) {
  const track = root.querySelector('[data-gallery-track]');
  if (!track) return { goTo() {} };
  const slides = Array.from(track.querySelectorAll('[data-slide]'));
  const dots = Array.from(root.querySelectorAll('[data-dot]'));
  const thumbs = Array.from(root.querySelectorAll('[data-thumb]'));
  let current = 0;

  const mark = (i) => {
    current = i;
    dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
    thumbs.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
  };

  const goTo = (i) => {
    const target = slides[Math.max(0, Math.min(slides.length - 1, i))];
    if (!target) return;
    track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    mark(slides.indexOf(target));
  };

  if ('IntersectionObserver' in window && slides.length > 1) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting && en.intersectionRatio > 0.6) mark(slides.indexOf(en.target)); });
    }, { root: track, threshold: [0.6] });
    slides.forEach((s) => io.observe(s));
  }

  thumbs.forEach((b, i) => b.addEventListener('click', () => goTo(i)));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
  });

  root.addEventListener('click', (e) => {
    const z = e.target.closest('[data-zoom]');
    if (!z) return;
    openZoom(images, Number(z.getAttribute('data-zoom')) || 0, z);
  });

  return { goTo, current: () => current };
}

function openZoom(images, i, opener) {
  const dlg = document.getElementById('zoom-dialog');
  const body = dlg && dlg.querySelector('[data-zoom-body]');
  if (!body || !images[i]) return;
  let idx = i;
  const render = () => {
    const img = images[idx];
    setHtml(body, html`<div class="zoom__bar">
        ${images.length > 1 ? html`<button class="icon-btn" type="button" data-zoom-prev aria-label="${t('product.show_image_n', { n: idx === 0 ? images.length : idx })}">${icon('chevron-left', 24)}</button>
        <button class="icon-btn" type="button" data-zoom-next aria-label="${t('product.show_image_n', { n: idx + 2 > images.length ? 1 : idx + 2 })}">${icon('chevron-right', 24)}</button>` : ''}
        <button class="icon-btn" type="button" data-close-dialog aria-label="${t('common.close')}">${icon('close', 24)}</button></div>
      <img class="zoom__img" src="${img.full || img.card}" alt="${img.alt || ''}" width="${img.w || 1200}" height="${img.h || 1200}">`);
  };
  render();
  body.onclick = (e) => {
    if (e.target.closest('[data-zoom-prev]')) { idx = (idx - 1 + images.length) % images.length; render(); }
    if (e.target.closest('[data-zoom-next]')) { idx = (idx + 1) % images.length; render(); }
  };
  openDialog(dlg, { opener });
}
