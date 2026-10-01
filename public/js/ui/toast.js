/**
 * ui/toast.js — small messages at the bottom of phones / top-right of computers (Section 23.4 TOASTS).
 * At most 2 on screen; success/info disappear after 4 s; errors stay until closed; one optional action.
 */

import { icon } from '../templates.js';
import { setHtml } from '../state.js';
import { html } from '../html.js';
import { t } from '../i18n.js';

const MAX = 2;

/**
 * toast('Added to cart', { kind: 'success', action: 'View cart', onAction: fn, timeout: 4000 })
 * kind: 'info' | 'success' | 'error'. Returns a function that removes the toast.
 */
export function toast(text, { kind = 'info', action = '', onAction = null, timeout } = {}) {
  const region = document.querySelector('[data-toasts]');
  if (!region) return () => {};
  if (kind === 'error') region.setAttribute('aria-live', 'assertive');
  else region.setAttribute('aria-live', 'polite');

  while (region.children.length >= MAX) region.firstElementChild.remove();

  const el = document.createElement('div');
  el.className = 'toast toast--' + kind;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  const iconName = kind === 'success' ? 'check-circle' : kind === 'error' ? 'alert' : 'info';
  setHtml(el, html`${icon(iconName, 20)}<span class="toast__text">${text}</span>
    ${action ? html`<button class="toast__action" type="button" data-toast-action>${action}</button>` : ''}
    ${kind === 'error' || action ? html`<button class="icon-btn icon-btn--sm" type="button" data-toast-close aria-label="${t('common.dismiss')}">${icon('close', 16)}</button>` : ''}`);
  region.appendChild(el);

  let timer = null;
  const dismiss = () => {
    clearTimeout(timer);
    if (!el.isConnected) return;
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 250);
  };
  const actionBtn = el.querySelector('[data-toast-action]');
  if (actionBtn) actionBtn.addEventListener('click', () => { dismiss(); if (onAction) onAction(); });
  const closeBtn = el.querySelector('[data-toast-close]');
  if (closeBtn) closeBtn.addEventListener('click', dismiss);

  const ms = timeout ?? (kind === 'error' ? 0 : action ? 6000 : 4000);
  if (ms > 0) {
    timer = setTimeout(dismiss, ms);
    el.addEventListener('mouseenter', () => clearTimeout(timer));
    el.addEventListener('mouseleave', () => { timer = setTimeout(dismiss, 2000); });
  }
  return dismiss;
}

/** Keeps toasts above a sticky bottom bar (e.g. product page add-to-cart bar). */
export function liftToasts(px) {
  document.documentElement.style.setProperty('--toast-lift', px ? px + 'px' : '0px');
}
