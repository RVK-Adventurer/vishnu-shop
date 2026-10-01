/**
 * ui/inapp.js — helper banner for the WhatsApp / Instagram / Facebook built-in browsers (Section 24.6).
 * Shown only on checkout, pay, confirmation and track pages — never while browsing.
 * Android: "Open in Chrome" (intent link). iPhone: how to open in Safari, plus "Copy page link".
 */

import { device } from '../device.js';
import { html } from '../html.js';
import { t } from '../i18n.js';
import { icon } from '../templates.js';
import { setHtml, session } from '../state.js';
import { copyText } from '../share.js';

export function chromeIntentUrl(href = location.href) {
  const u = new URL(href);
  const withoutScheme = u.host + u.pathname + u.search + u.hash;
  return `intent://${withoutScheme}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`;
}

export function showInAppHelper() {
  if (!device.inApp || session.get('inapp-dismissed')) return;
  const slot = document.querySelector('[data-notices]');
  if (!slot) return;
  const box = document.createElement('div');
  box.className = 'notice notice--info notice--page';
  box.setAttribute('role', 'status');
  setHtml(box, html`${icon('info', 20)}<div class="notice__text inapp">
      <p>${t('inapp.banner')}</p>
      ${device.os === 'ios' ? html`<p>${t('inapp.ios_hint')}</p>` : ''}
      <div class="inapp__actions">
        ${device.os === 'android' ? html`<a class="btn btn--primary btn--sm" href="${chromeIntentUrl()}">${icon('external', 16)}${t('inapp.open_chrome')}</a>` : ''}
        <button class="btn btn--secondary btn--sm" type="button" data-inapp-copy>${icon('copy', 16)}${t('inapp.copy_link')}</button>
      </div></div>
    <button class="icon-btn icon-btn--sm" type="button" data-inapp-close aria-label="${t('common.dismiss')}">${icon('close', 16)}</button>`);
  slot.appendChild(box);
  box.querySelector('[data-inapp-copy]').addEventListener('click', () => copyText(location.href, { toastText: t('inapp.link_copied') }));
  box.querySelector('[data-inapp-close]').addEventListener('click', () => { session.set('inapp-dismissed', true); box.remove(); });
}
