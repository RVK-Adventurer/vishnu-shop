/**
 * tools/image-size.mjs — reads the width and height of a picture from its first bytes (no extra
 * packages). Used by the build to give the logo exact width/height (no page jumping while it
 * loads) and to warn about badly sized favicons, posters and logos.
 * Supports PNG, JPEG, WebP, GIF, AVIF and SVG. Returns { width, height, type } or null.
 */

import fs from 'node:fs';

export function imageSize(file) {
  let buf;
  try {
    const fd = fs.openSync(file, 'r');
    buf = Buffer.alloc(Math.min(fs.fstatSync(fd).size, 256 * 1024));
    fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
  } catch (e) {
    return null;
  }
  return sizeFromBuffer(buf, file);
}

export function sizeFromBuffer(buf, name = '') {
  if (buf.length < 12) return null;
  // PNG
  if (buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), type: 'png' };
  // GIF
  if (buf.toString('ascii', 0, 3) === 'GIF') return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8), type: 'gif' };
  // JPEG: walk the markers until a start-of-frame
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5), type: 'jpeg' };
      }
      i += 2 + len;
    }
    return null;
  }
  // WebP (lossy VP8, lossless VP8L, extended VP8X)
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const kind = buf.toString('ascii', 12, 16);
    if (kind === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff, type: 'webp' };
    if (kind === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1, type: 'webp' };
    }
    if (kind === 'VP8X') return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1, type: 'webp' };
    return null;
  }
  // AVIF: look for the 'ispe' box
  if (buf.toString('ascii', 4, 8) === 'ftyp' && /avi[fs]/.test(buf.toString('ascii', 8, 12))) {
    const at = buf.indexOf('ispe');
    if (at > 0 && at + 16 <= buf.length) return { width: buf.readUInt32BE(at + 8), height: buf.readUInt32BE(at + 12), type: 'avif' };
    return null;
  }
  // SVG: width/height attributes, else the viewBox
  const text = buf.toString('utf8', 0, Math.min(buf.length, 4096));
  if (/<svg[\s>]/i.test(text) || /\.svg$/i.test(name)) {
    const tag = (text.match(/<svg[^>]*>/i) || [''])[0];
    const num = (attr) => { const m = new RegExp(attr + '\\s*=\\s*["\']([\\d.]+)(px)?["\']', 'i').exec(tag); return m ? parseFloat(m[1]) : 0; };
    let width = num('width');
    let height = num('height');
    const vb = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(tag);
    if ((!width || !height) && vb) { width = parseFloat(vb[1]); height = parseFloat(vb[2]); }
    return width && height ? { width: Math.round(width), height: Math.round(height), type: 'svg' } : { width: 0, height: 0, type: 'svg' };
  }
  return null;
}
