/**
 * tools/check-config.mjs — checks client/store.config.json for missing or wrong values.
 *
 * Used by tools/build.mjs on every build. You can also run it yourself:
 *     node tools/check-config.mjs            (practice mode: problems are warnings)
 *     PRODUCTION=1 node tools/check-config.mjs   (live mode: problems stop the build)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RE, INDIAN_STATES } from '../public/js/validators.js';
import { THEME_PRESETS } from '../public/js/color.js';
import { DISPLAY_OPTIONS } from '../public/js/display.js';

const MARK = 'REPLACE_ME';

/** Every "a.b.c" path in the object whose value still contains REPLACE_ME. */
export function findPlaceholders(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj || {})) {
    if (k.startsWith('_')) continue;
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') out.push(...findPlaceholders(v, p));
    else if (typeof v === 'string' && v.includes(MARK)) out.push(p);
  }
  return out;
}

/**
 * Returns { errors: [...], warnings: [...] } in plain English.
 * In production (live) mode every problem is an error; in practice mode REPLACE_ME values are
 * only warnings so the seller can preview the shop before all details are known.
 */
export function checkConfig(cfg, { production = false } = {}) {
  const errors = [];
  const warnings = [];
  const problem = (msg, alwaysError = false) => ((production || alwaysError) ? errors : warnings).push(msg);

  if (!cfg || typeof cfg !== 'object') return { errors: ['client/store.config.json is missing or is not valid JSON.'], warnings };

  for (const p of findPlaceholders(cfg)) problem(`"${p}" still says REPLACE_ME — fill it in.`);

  const site = cfg.site || {};
  const biz = cfg.business || {};
  const brand = cfg.branding || {};
  const isSet = (v) => typeof v === 'string' && v.trim() !== '' && !v.includes(MARK);

  if (isSet(site.url) && !/^https:\/\/[^\s/]+(\/[^\s]*)?$/.test(site.url)) problem('site.url must start with https:// (for example https://myshop.pages.dev).', true);
  if (isSet(site.url) && /\/$/.test(site.url)) warnings.push('site.url should not end with "/". It will be trimmed automatically.');
  if (isSet(site.apps_script_url) && !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(site.apps_script_url)) {
    problem('site.apps_script_url must be the Web app URL from Apps Script, ending in /exec.', true);
  }
  if (site.razorpay_key_id && !/^rzp_(test|live)_[A-Za-z0-9]{6,40}$/.test(site.razorpay_key_id)) {
    problem('site.razorpay_key_id must start with rzp_test_ or rzp_live_ (or be left empty if Razorpay is not used).', true);
  }
  if (production && site.razorpay_key_id && site.razorpay_key_id.startsWith('rzp_test_')) {
    warnings.push('site.razorpay_key_id is a TEST key on a live build. Switch to the live key when you go live (see GO_LIVE_CHECKLIST).');
  }

  for (const k of ['phone', 'whatsapp']) {
    if (isSet(biz[k]) && !RE.PHONE10.test(String(biz[k]).replace(/\s/g, ''))) problem(`business.${k} must be a 10-digit Indian mobile number without +91, like 9876543210.`, true);
  }
  if (isSet(biz.email) && !RE.EMAIL.test(biz.email)) problem('business.email is not a valid email address.', true);
  if (isSet(biz.pincode) && !RE.PINCODE.test(biz.pincode)) problem('business.pincode must be a 6-digit pincode.', true);
  if (isSet(biz.state) && !INDIAN_STATES.includes(biz.state)) problem(`business.state must be written exactly as one of: ${INDIAN_STATES.join(', ')}.`, true);
  if (biz.gstin && !biz.gstin.includes(MARK) && !RE.GSTIN.test(biz.gstin)) problem('business.gstin is not a valid 15-character GSTIN (leave it empty if not registered).', true);

  if (brand.theme_preset && !THEME_PRESETS[brand.theme_preset] && brand.theme_preset !== 'CUSTOM') {
    problem(`branding.theme_preset must be one of: ${Object.keys(THEME_PRESETS).join(', ')}, CUSTOM.`, true);
  }
  for (const k of ['primary_color', 'secondary_color', 'accent_color']) {
    if (brand[k] && !/^#[0-9A-Fa-f]{6}$/.test(brand[k])) problem(`branding.${k} must be a colour code like #4338CA.`, true);
  }
  if (brand.home_layout && !['A', 'B'].includes(brand.home_layout)) problem('branding.home_layout must be "A" or "B".', true);

  // v1.9 "display" section: a wrong value is never fatal — the build uses the default instead.
  const disp = cfg.display || {};
  const choice = (k, list) => {
    if (disp[k] !== undefined && !list.includes(disp[k])) warnings.push(`display.${k} should be one of ${list.join(', ')} — using the default.`);
  };
  Object.entries(DISPLAY_OPTIONS).forEach(([k, list]) => choice(k, list));
  choice('sold_counts_mode', ['OFF', 'MONTH', 'TOTAL', 'BOTH']);
  const fonts = ['system', 'poppins', 'lora', 'mukta', 'hind-madurai', 'noto-sans-tamil', 'baloo-2'];
  choice('font_body', fonts);
  choice('font_heading', fonts);
  if (disp.languages_json !== undefined && (!Array.isArray(disp.languages_json) || disp.languages_json.some((c) => !['en', 'ta', 'hi'].includes(c)))) {
    warnings.push('display.languages_json should look like ["en"] or ["en", "ta"].');
  }
  if (disp.default_language && Array.isArray(disp.languages_json) && !disp.languages_json.includes(disp.default_language)) {
    warnings.push('display.default_language must also be listed in display.languages_json.');
  }
  const isDate = (v) => !v || !Number.isNaN(Date.parse(v));
  ['announcement_starts_at', 'announcement_ends_at'].forEach((k) => { if (!isDate(disp[k])) warnings.push(`display.${k} is not a valid date-time (example: 2026-10-20T09:00:00+05:30).`); });
  (Array.isArray(disp.popups_json) ? disp.popups_json : []).forEach((pp, i) => {
    if (!pp || !pp.id) warnings.push(`display.popups_json item ${i + 1} needs an "id".`);
    else {
      if (!isDate(pp.starts_at) || !isDate(pp.ends_at)) warnings.push(`Popup "${pp.id}": starts_at / ends_at must be date-times like 2026-10-20T00:00:00+05:30.`);
      if (pp.frequency && !['DAY', 'SESSION', 'ONCE'].includes(pp.frequency)) warnings.push(`Popup "${pp.id}": frequency should be DAY, SESSION or ONCE.`);
    }
  });

  return { errors, warnings };
}

/* Run directly from the command line. */
const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  const root = path.resolve(path.dirname(thisFile), '..');
  const file = path.join(root, 'client', 'store.config.json');
  let cfg = null;
  try { cfg = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`Cannot read ${file}: ${e.message}`); process.exit(1); }
  const production = process.env.PRODUCTION === '1';
  const { errors, warnings } = checkConfig(cfg, { production });
  warnings.forEach((w) => console.log('  ! ' + w));
  errors.forEach((e) => console.log('  ✗ ' + e));
  console.log(errors.length ? `\n${errors.length} problem(s) must be fixed.` : '\nConfig looks good.');
  process.exit(errors.length ? 1 : 0);
}
