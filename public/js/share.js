/**
 * share.js — copy, share and download that work on every device (Section 24.7). Each function tries
 * the best way first and falls back step by step, and never fails silently.
 */

import { device } from './device.js';
import { toast } from './ui/toast.js';
import { openDialog } from './ui/dialog.js';
import { t } from './i18n.js';
import { html } from './html.js';
import { setHtml } from './state.js';

/**
 * Copies text. 1) Clipboard API  2) hidden text box + execCommand  3) shows the text selected in a
 * box with "press and hold to copy". Returns true when copied automatically.
 */
export async function copyText(text, { toastText } = {}) {
  const value = String(text ?? '');
  if (device.hasClipboard) {
    try {
      await navigator.clipboard.writeText(value);
      toast(toastText || t('common.copied'), { kind: 'success' });
      return true;
    } catch (e) { /* fall through */ }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.className = 'sr-only';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand('copy');
    ta.remove();
    if (ok) {
      toast(toastText || t('common.copied'), { kind: 'success' });
      return true;
    }
  } catch (e) { /* fall through */ }
  showCopyBox(value);
  return false;
}

/** Last resort: the text pre-selected in a dialog so the person can copy it by hand. */
function showCopyBox(value) {
  const dlg = document.getElementById('confirm-dialog');
  const body = dlg && dlg.querySelector('[data-confirm-body]');
  if (!body) { window.prompt(t('share.copy_fallback_title'), value); return; }
  setHtml(body, html`<div class="sheet__head"><h2 class="sheet__title" id="confirm-title">${t('share.copy_fallback_title')}</h2></div>
    <p class="muted">${t('share.copy_fallback_hint')}</p>
    <textarea class="textarea" readonly data-copy-box rows="3">${value}</textarea>
    <div class="sheet__actions"><button class="btn btn--primary" type="button" data-close-dialog>${t('common.close')}</button></div>`);
  openDialog(dlg);
  const box = body.querySelector('[data-copy-box]');
  box.focus();
  box.select();
}

/** Shares a link with the phone's share sheet, or copies it. */
export async function shareLink({ title, text, url }) {
  if (device.hasShare) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (e) {
      if (e && e.name === 'AbortError') return false;   // the person closed the share sheet
    }
  }
  return copyText(url, { toastText: t('share.copied') });
}

/**
 * Saves a file (e.g. the invoice PDF). Order (Section 24.7):
 *  1) <a download> (not inside in-app browsers, which silently drop blob downloads)
 *  2) share sheet with the file ("Save to Files" on iPhone)
 *  3) open the file in a new tab ("use your browser's share button")
 *  4) returns 'whatsapp' so the caller can offer "Send the Track link to my WhatsApp".
 * Returns which path was used: 'download' | 'share' | 'tab' | 'whatsapp'.
 */
export async function saveFile(blob, filename, onStatus = () => {}) {
  if (device.hasDownloadAttr && !device.inApp && device.os !== 'ios') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    onStatus('download');
    return 'download';
  }
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
  if (device.canShareFile(file)) {
    try {
      onStatus('share');
      await navigator.share({ files: [file], title: filename });
      return 'share';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'share';
    }
  }
  if (!device.inApp) {
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'noopener');
    if (win) {
      onStatus('tab');
      setTimeout(() => URL.revokeObjectURL(url), 120000);
      return 'tab';
    }
  }
  onStatus('whatsapp');
  return 'whatsapp';
}

/** wa.me link. number = 10-digit Indian mobile (or '' to let the person pick a chat). */
export function whatsappUrl(number, text) {
  const n = String(number || '').replace(/\D/g, '');
  const to = n ? (n.length === 10 ? '91' + n : n) : '';
  return `https://wa.me/${to}${text ? '?text=' + encodeURIComponent(text) : ''}`;
}

/**
 * Phone links: on phones a normal tel: link; on computers clicking the number copies it instead of
 * opening an app that may not exist (Section 24.7). Wires every [data-tel] link on the page.
 */
export function wirePhoneLinks(root = document) {
  if (device.isMobile) return;
  root.querySelectorAll('a[data-tel]').forEach((a) => {
    if (a.dataset.telWired) return;
    a.dataset.telWired = '1';
    a.addEventListener('click', (e) => {
      e.preventDefault();
      copyText('+91 ' + a.dataset.tel);
    });
  });
}
