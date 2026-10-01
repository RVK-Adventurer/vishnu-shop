/**
 * money.js — all money is a whole number of PAISE (₹1 = 100 paise). Shared by build, browser and tests.
 * The server (Apps Script Tax.gs) uses exactly the same rules, checked by test-vectors.json.
 */

/** True if v is a safe whole number of paise (may be 0 or negative for discounts). */
export function isPaise(v) {
  return typeof v === 'number' && Number.isSafeInteger(v);
}

/** Groups digits the Indian way: 1234567 -> "12,34,567". */
export function groupIndian(n) {
  const s = String(Math.abs(Math.trunc(n)));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return rest + ',' + last3;
}

/**
 * 12450000 -> "₹1,24,500"; 124050 -> "₹1,240.50"; paise shown only when not zero (Section 23.5.4).
 */
export function formatRupees(paise) {
  const p = Math.round(Number(paise) || 0);
  const neg = p < 0;
  const a = Math.abs(p);
  const rupees = Math.floor(a / 100);
  const rest = a % 100;
  const out = '₹' + groupIndian(rupees) + (rest ? '.' + String(rest).padStart(2, '0') : '');
  return neg ? '−' + out : out;
}

/** Rupees as a plain number string with exactly 2 decimals (for UPI links): 124050 -> "1240.50". */
export function paiseToDecimal(paise) {
  const p = Math.round(Number(paise) || 0);
  const a = Math.abs(p);
  return (p < 0 ? '-' : '') + Math.floor(a / 100) + '.' + String(a % 100).padStart(2, '0');
}

/** Whole "% off" from MRP, rounded DOWN so we never overstate a discount. 0 when no saving. */
export function percentOff(price, mrp) {
  if (!mrp || !price || mrp <= price) return 0;
  return Math.floor(((mrp - price) * 100) / mrp);
}

/**
 * Integer division rounded half-up, for non-negative numerators: roundDiv(5, 2) = 3.
 * Works for negatives too (rounds half away from zero).
 */
export function roundDiv(numerator, denominator) {
  if (denominator <= 0) throw new Error('roundDiv: bad denominator');
  const neg = numerator < 0;
  const n = Math.abs(numerator);
  const q = Math.floor((2 * n + denominator) / (2 * denominator));
  return neg ? -q : q;
}

/** GST rate (e.g. 18 or 2.5) as basis points (1800 or 250), exact. */
export function rateToBp(ratePercent) {
  return Math.round(Number(ratePercent) * 100);
}

/** Tax inside a GST-INCLUSIVE amount: round(amount × r / (100 + r)) (Section 7.3). */
export function taxFromInclusive(amountPaise, ratePercent) {
  const bp = rateToBp(ratePercent);
  if (!bp) return 0;
  return roundDiv(amountPaise * bp, 10000 + bp);
}

/** Tax ON TOP of a GST-EXCLUSIVE amount: round(amount × r / 100). */
export function taxOnExclusive(amountPaise, ratePercent) {
  const bp = rateToBp(ratePercent);
  if (!bp) return 0;
  return roundDiv(amountPaise * bp, 10000);
}

/**
 * Splits `total` paise across items in proportion to `weights` so the parts add up EXACTLY to
 * `total` (largest-remainder method, Section 7.3). Ties go to the earlier item.
 */
export function allocateLargestRemainder(total, weights) {
  if (!weights.length) return [];
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    const out = weights.map(() => 0);
    out[0] = total;
    return out;
  }
  // BigInt keeps total × weight exact even for very large bills.
  const T = BigInt(total);
  const S = BigInt(sum);
  const base = weights.map((w) => Number((T * BigInt(w)) / S));
  const rema = weights.map((w, i) => ({ i, r: (T * BigInt(w)) % S }));
  let left = total - base.reduce((a, b) => a + b, 0);
  rema.sort((a, b) => (a.r === b.r ? a.i - b.i : (b.r > a.r ? 1 : -1)));
  for (let k = 0; k < rema.length && left > 0; k++, left--) base[rema[k].i] += 1;
  return base;
}

/** Sum of paise values. */
export function sumPaise(list) {
  return list.reduce((a, b) => a + (Number(b) || 0), 0);
}
