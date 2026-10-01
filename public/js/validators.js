/**
 * validators.js — the same input rules the server uses (Section 7.1, 14.3), plus Indian states and
 * delivery-area (pincode) rule matching. Shared by the build, the browser and tests.
 */

export const RE = {
  PHONE10: /^[6-9]\d{9}$/,
  PINCODE: /^[1-9][0-9]{5}$/,
  EMAIL: /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/,
  IFSC: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  UPI_ID: /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/,
  GSTIN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
  REFERENCE: /^[A-Z0-9]{6,22}$/,
  ORDER_ID: /^ORD-\d{6}-[0-9A-HJKMNP-TV-Z]{5}$/
};

/** States and union territories of India, in the order shown in the checkout drop-down. */
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

/** "+91 98765-43210" / "098765 43210" / "919876543210" -> "9876543210"; '' if not a valid Indian mobile. */
export function normalizePhone(raw) {
  if (raw === null || raw === undefined) return '';
  let s = String(raw).replace(/[\s\-().]/g, '');
  if (s.startsWith('+91')) s = s.slice(3);
  else if (s.length === 12 && s.startsWith('91')) s = s.slice(2);
  else if (s.length === 11 && s.startsWith('0')) s = s.slice(1);
  return RE.PHONE10.test(s) ? s : '';
}

/** "9876543210" -> "98765 43210" (display format, Section 23.5.4). */
export function formatPhone(p10) {
  const p = normalizePhone(p10);
  return p ? p.slice(0, 5) + ' ' + p.slice(5) : String(p10 || '');
}

export function isPincode(v) {
  return RE.PINCODE.test(String(v || '').trim());
}

export function isEmail(v) {
  return RE.EMAIL.test(String(v || '').trim());
}

/**
 * How many pincodes a rule pattern covers (smaller = more specific).
 * Accepted shapes (Section 11.14): "641001" exact · "641001-641999" range · "6410*" prefix.
 * Returns null for an invalid pattern.
 */
export function patternInfo(pattern) {
  const p = String(pattern || '').trim();
  if (/^[1-9]\d{5}$/.test(p)) return { kind: 'exact', lo: +p, hi: +p, size: 1 };
  const r = /^([1-9]\d{5})\s*-\s*([1-9]\d{5})$/.exec(p);
  if (r) {
    const lo = +r[1];
    const hi = +r[2];
    if (hi < lo) return null;
    return { kind: 'range', lo, hi, size: hi - lo + 1 };
  }
  const x = /^([1-9]\d{0,5})\*$/.exec(p);
  if (x) {
    const digits = x[1];
    const free = 6 - digits.length;
    const lo = +(digits + '0'.repeat(free));
    const hi = +(digits + '9'.repeat(free));
    return { kind: 'prefix', lo, hi, size: Math.pow(10, free) };
  }
  return null;
}

/**
 * Decides whether we deliver to a pincode (Section 7.2), using the owner's Delivery-area rules.
 *  - Any matching BLOCK rule → not delivered.
 *  - If at least one ALLOW rule exists, the pincode must match an ALLOW rule.
 *  - If there are no rules at all, we deliver everywhere.
 * The most specific matching ALLOW rule supplies delivery days, shipping override, COD and request flags.
 * Returns { serviceable, rule|null }.
 */
export function matchPincode(pincode, rules) {
  const pin = String(pincode || '').trim();
  if (!isPincode(pin)) return { serviceable: false, rule: null, invalid: true };
  const n = +pin;
  const list = Array.isArray(rules) ? rules : [];
  let bestAllow = null;
  let bestSize = Infinity;
  let anyAllow = false;
  for (const rule of list) {
    const info = patternInfo(rule.pattern);
    if (!info) continue;
    if (rule.mode === 'ALLOW') anyAllow = true;
    if (n < info.lo || n > info.hi) continue;
    if (rule.mode === 'BLOCK') return { serviceable: false, rule };
    if (info.size < bestSize) { bestSize = info.size; bestAllow = rule; }
  }
  if (anyAllow && !bestAllow) return { serviceable: false, rule: null };
  return { serviceable: true, rule: bestAllow };
}

/**
 * The expected delivery date: `days` after `from`, optionally not counting Sundays.
 * Returns a Date.
 */
export function deliveryDate(from, days, skipSundays) {
  const d = new Date(from.getTime());
  let left = Math.max(0, Number(days) || 0);
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (skipSundays && d.getDay() === 0) continue;
    left--;
  }
  if (skipSundays && d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d;
}
