/**
 * ui/promo.js — timed offer popups (v1.9). The owner creates offers in Admin → Offers & popups:
 *
 *   popups_json = [{
 *     id: "diwali26", active: true,
 *     title: "Diwali Sale", text: "20% off on all sweets",
 *     image: "client/assets/poster-diwali.jpg" (optional poster picture), image_alt: "Diwali sale, 20% off sweets",
 *     code: "DIWALI20" (optional — shown with a Copy button),
 *     cta_text: "Shop sweets", cta_link: "/c/sweets-snacks/" (optional),
 *     starts_at: "2026-10-20T00:00:00+05:30", ends_at: "2026-11-02T23:59:00+05:30",
 *     frequency: "DAY" | "SESSION" | "ONCE",   pages: "HOME" | "ALL",   delay_seconds: 2
 *   }]
 *
 * Kind to customers by design: one popup at a time, never on cart / checkout / payment / order pages,
 * always closable (button, Esc, tap outside, swipe down on phones), and shown at most as often as the
 * owner chose. On phones it slides up as a card instead of covering the page.
 *
 * Poster popups: give an `image` and leave `title` and `text` empty — the whole poster is shown (never
 * cropped) and tapping it opens `cta_link`. With a title too, the picture sits above the words.
 * The picture is loaded before the popup opens, so customers never see an empty box; if it can't be
 * loaded, a poster-only popup is quietly skipped (and tried again on the next page).
 */

import { settings } from '../settings.js';
import { local, session, setHtml } from '../state.js';
import { html } from '../html.js';
import { t, formatDate } from '../i18n.js';
import { icon, isLive, link, localImagePath } from '../templates.js';
import { openDialog, closeDialog } from './dialog.js';
import { copyText } from '../share.js';

const NEVER_ON = ['cart', 'checkout', 'checkout-soon', 'pay', 'order', 'track', 'offline', 'notfound'];

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

function seen(p) {
  const key = 'promo:' + p.id;
  if (p.frequency === 'SESSION') return !!session.get(key);
  if (p.frequency === 'ONCE') return !!local.get(key);
  return local.get(key) === todayKey();
}

function markSeen(p) {
  const key = 'promo:' + p.id;
  if (p.frequency === 'SESSION') session.set(key, 1);
  else if (p.frequency === 'ONCE') local.set(key, 1);
  else local.set(key, todayKey());
}

function safeLink(h) {
  const s = String(h || '').trim();
  if (/^\/(?!\/)/.test(s)) return link(s);
  return /^https?:\/\//i.test(s) ? s : '';
}

/** The offer to show on this page right now, or null. */
export function pickPromo(list, pageType, now = new Date()) {
  if (NEVER_ON.includes(pageType)) return null;
  return (Array.isArray(list) ? list : []).find((p) => p && p.id && p.active !== false
    && (p.title || p.text || localImagePath(p.image)) && isLive(p, now) && (p.pages !== 'HOME' || pageType === 'home') && !seen(p)) || null;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(false), 8000);
    img.onload = () => { clearTimeout(timer); resolve(img.naturalWidth > 0); };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = src;
  });
}

async function show(p) {
  const dlg = document.getElementById('promo-dialog');
  const body = dlg && dlg.querySelector('[data-promo-body]');
  if (!body) return;
  let image = localImagePath(p.image);
  const hasWords = !!(p.title || p.text);
  if (image && !(await loadImage(image))) {
    if (!hasWords) return;
    image = '';
  }
  if (document.querySelector('dialog[open]')) return;
  const poster = !!image && !hasWords;
  const href = safeLink(p.cta_link);
  const alt = String(p.image_alt || p.title || '').trim();
  const ends = p.ends_at && !Number.isNaN(Date.parse(p.ends_at)) ? formatDate(new Date(p.ends_at)) : '';
  const extras = html`${p.code ? html`<div class="promo__code"><span><span class="caption">${t('promo.use_code')}</span> <strong class="promo__code-value">${p.code}</strong></span>
        <button class="btn btn--secondary btn--sm" type="button" data-promo-copy>${icon('copy', 16)}${t('promo.copy_code')}</button></div>` : ''}
      ${ends ? html`<p class="caption">${t('promo.ends', { date: ends })}</p>` : ''}`;
  const pic = image ? html`<img class="${poster ? 'promo__poster-img' : 'promo__img'}" src="${image}" alt="${poster ? (alt || t('promo.label')) : ''}" decoding="async">` : '';

  dlg.classList.toggle('promo--poster', poster);
  if (poster) {
    dlg.removeAttribute('aria-labelledby');
    dlg.setAttribute('aria-label', alt || t('promo.label'));
    const showButton = href && p.cta_text;
    setHtml(body, html`<button class="icon-btn promo__close" type="button" data-close-dialog aria-label="${t('promo.close')}">${icon('close', 24)}</button>
      ${href ? html`<a class="promo__poster" href="${href}" data-promo-cta>${pic}</a>` : html`<div class="promo__poster">${pic}</div>`}
      ${(p.code || ends || showButton) ? html`<div class="promo__body">${extras}
        ${showButton ? html`<a class="btn btn--primary btn--lg btn--block" href="${href}" data-promo-cta>${p.cta_text}</a>` : ''}</div>` : ''}`);
  } else {
    dlg.removeAttribute('aria-label');
    dlg.setAttribute('aria-labelledby', 'promo-title');
    setHtml(body, html`<button class="icon-btn promo__close" type="button" data-close-dialog aria-label="${t('promo.close')}">${icon('close', 24)}</button>
    ${image ? html`<div class="promo__media">${pic}</div>` : ''}
    <div class="promo__body">
      <p class="label-caps">${t('promo.label')}</p>
      <h2 class="promo__title" id="promo-title">${p.title || ''}</h2>
      ${p.text ? html`<p class="promo__text">${p.text}</p>` : ''}
      ${extras}
      ${href ? html`<a class="btn btn--primary btn--lg btn--block" href="${href}" data-promo-cta>${p.cta_text || t('promo.shop_now')}</a>` : ''}
    </div>`);
  }
  const copyBtn = body.querySelector('[data-promo-copy]');
  if (copyBtn) copyBtn.addEventListener('click', () => copyText(p.code, { toastText: t('promo.code_copied') }));
  body.querySelectorAll('[data-promo-cta]').forEach((a) => a.addEventListener('click', () => closeDialog(dlg)));
  markSeen(p);
  openDialog(dlg);
}

export function initPromos() {
  const p = pickPromo(settings().popups_json, document.body.getAttribute('data-page') || '');
  if (!p) return;
  const delay = Math.max(0, Math.min(30, Number(p.delay_seconds ?? 2))) * 1000;
  setTimeout(() => show(p), delay);
}
