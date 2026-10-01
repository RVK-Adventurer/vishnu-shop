/**
 * device.js — what this phone/computer/browser can do (Section 24.2). Shared by the shop and the admin.
 * Feature detection first. User-agent checks are used for exactly three things, all here:
 *   (a) iOS/iPadOS vs Android vs desktop (to pick the UPI button style),
 *   (b) in-app browsers (WhatsApp, Instagram, Facebook),
 *   (c) the old-browser fallback (that one lives in legacy.js, which runs only on old browsers).
 * When unsure, we report "desktop", whose payment paths (QR, copy) work everywhere.
 */

const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';

function detectOs() {
  if (/android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  // iPadOS 13+ reports itself as a Mac; a touch screen gives it away.
  if (/Macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1) return 'ios';
  return 'desktop';
}

function detectInApp() {
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return 'facebook';
  if (/WhatsApp/i.test(ua)) return 'whatsapp';
  return null;
}

export const device = {
  os: detectOs(),
  inApp: detectInApp(),
  get isMobile() { return this.os === 'android' || this.os === 'ios'; },
  get isTouch() { return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0); },
  hasClipboard: typeof navigator !== 'undefined' && !!(navigator.clipboard && navigator.clipboard.writeText) && typeof window !== 'undefined' && window.isSecureContext,
  hasShare: typeof navigator !== 'undefined' && typeof navigator.share === 'function',
  hasDownloadAttr: typeof HTMLAnchorElement !== 'undefined' && 'download' in HTMLAnchorElement.prototype,
  hasBarcode: typeof window !== 'undefined' && 'BarcodeDetector' in window,
  hasAudio: typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext),
  canVibrate: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function',
  hasDialog: typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal === 'function',

  /** True if the share sheet can take this file (e.g. "Save to Files" on iPhone). */
  canShareFile(file) {
    try {
      return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
    } catch (e) {
      return false;
    }
  },

  /** True if the browser can make WebP pictures (for compressing photos before upload). */
  async canEncodeWebp() {
    try {
      const c = document.createElement('canvas');
      c.width = 2; c.height = 2;
      const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.8));
      return !!blob && blob.type === 'image/webp';
    } catch (e) {
      return false;
    }
  },

  /** Everything above as plain data (for the device report on tests.html). */
  report() {
    return {
      os: this.os, inApp: this.inApp, mobile: this.isMobile, touch: this.isTouch,
      clipboard: this.hasClipboard, share: this.hasShare, downloadAttr: this.hasDownloadAttr,
      barcode: this.hasBarcode, audio: this.hasAudio, vibrate: this.canVibrate, dialog: this.hasDialog,
      userAgent: ua
    };
  }
};
