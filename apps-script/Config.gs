/**
 * Config.gs — fixed limits (constants) and every owner-editable setting with its default.
 *
 * Two kinds of values live here:
 *  1. CONSTANTS — never editable from the admin (for example the 500 orders/day ceiling).
 *  2. DEFAULT_CONFIG — the starting value, type and allowed range of every row in the Config tab.
 *     The admin edits the Config tab through settings.set; this file decides what is allowed.
 *
 * Secrets are NEVER here. They live only in Script Properties (see PROP below and Menu.gs).
 */

var APP_VERSION = '1.8.0';
var IST_TZ = 'Asia/Kolkata';

/* ---------------------------------- Fixed limits ---------------------------------- */

/** Hard ceiling for online orders per day. Section 4.1 / 4.3. NOT editable in the UI. */
var TIER_CEILING = 500;
/** Google Sheets cell limit we design against (Section 15.4; 20M is treated as a bonus only). */
var SHEET_CELL_LIMIT = 10000000;
var SHEET_CELL_LIMIT_BONUS = 20000000;
var DB_WARN_PERCENT = 60;
var DB_EMERGENCY_ARCHIVE_PERCENT = 70;
var ARCHIVE_VOLUME_ROLLOVER_PERCENT = 60;

var RAZORPAY_HOLD_MINUTES = 10;
var LOCK_WAIT_MS = 10000;
var SLOW_CALL_MS = 4000;
/** Long jobs stop safely after this much time (the hard limit is 6 minutes). */
var JOB_SAFE_MS = 270000;
/** Never start a new piece of work in a job with less than this much time left. */
var JOB_MIN_SLICE_MS = 20000;

var PUBLISH_MAX_PER_DAY = 12;
var PUBLISH_MIN_GAP_MINUTES = 20;
var PUBLISH_MAX_FILES_PER_RUN = 40;
var CF_BUILDS_PER_MONTH = 500;
var CF_FILES_LIMIT = 20000;
var REPO_SIZE_LIMIT_BYTES = 1024 * 1024 * 1024;
var URLFETCH_DAILY_LIMIT = 20000;
var MAILAPP_DAILY_LIMIT = 100;

var CATALOG_TARGET = 3000;
var IMAGES_PER_FOLDER = 500;
var BACKUPS_KEEP = 14;
var ERRORS_KEEP_DAYS = 30;
var AUDIT_LIVE_DAYS = 90;
var USAGE_KEY_KEEP_DAYS = 7;
var ARCHIVE_MIN_AGE_DAYS = 30;

var SESSION_HOURS = 6;
var REFRESH_DAYS = 14;
var LOGIN_MAX_FAILS = 5;
var LOGIN_LOCK_MINUTES = 15;
var SETUP_CODE_HOURS = 24;

/** Rows kept ready below the last data row in each tab (keeps the grid small but avoids constant resizing). */
var SPARE_ROWS = 50;
/** How many rows are added at once when a tab runs out of room. */
var GROW_ROWS = 200;

/** Folder names in the owner's Google Drive. */
var DRIVE_FOLDERS = {
  STAGING: 'ShopMediaStaging',
  PROOFS: 'ShopPaymentProofs',
  INVOICES: 'ShopInvoices',
  BACKUPS: 'Shop Backups',
  ARCHIVES: 'Shop Archives'
};

/** Script Property names. Secrets (marked *) are write-only from the Sheet menu and never returned to a browser. */
var PROP = {
  SPREADSHEET_ID: 'SPREADSHEET_ID',
  RAZORPAY_KEY_ID: 'RAZORPAY_KEY_ID',
  RAZORPAY_KEY_SECRET: 'RAZORPAY_KEY_SECRET',      // *
  GITHUB_TOKEN: 'GITHUB_TOKEN',                    // *
  GITHUB_REPO: 'GITHUB_REPO',
  GITHUB_BRANCH: 'GITHUB_BRANCH',
  GITHUB_TOKEN_EXPIRES: 'GITHUB_TOKEN_EXPIRES',
  OWNER_ALERT_EMAIL: 'OWNER_ALERT_EMAIL',
  OWNER_WHATSAPP: 'OWNER_WHATSAPP',
  SETUP_CODE: 'SETUP_CODE',                        // * (stored only as a hash)
  SCHEMA_VERSION: 'SCHEMA_VERSION',
  SETUP_DONE_AT: 'SETUP_DONE_AT',
  HEARTBEAT_TICK: 'HEARTBEAT_TICK',
  HEARTBEAT_DAILY: 'HEARTBEAT_DAILY',
  PAYEE_HASH: 'PAYEE_HASH'
};

/* ------------------------------- Owner-editable settings ------------------------------- */
/*
 * Each entry: key: { v: default, t: type, g: group, pub: published to settings.public.json?,
 *                    min/max (numbers), e: ENUMS name (choices), len: max text length }
 * Types: 'text', 'int', 'paise', 'dec', 'bool', 'json', 'enum', 'color', 'paint', 'phone', 'email'.
 * Groups match the settings screens and their permissions (Section 11.9):
 *   branding, store, tax_shipping, payments, capacity, layout, features, checklist.
 */
var DEFAULT_CONFIG = {
  /* Branding */
  business_name:      { v: 'My Shop', t: 'text', g: 'branding', pub: true, len: 80 },
  tagline:            { v: 'Quality products, delivered to your door', t: 'text', g: 'branding', pub: true, len: 140 },
  logo_path:          { v: '', t: 'text', g: 'branding', pub: true, len: 300 },
  favicon_path:       { v: '', t: 'text', g: 'branding', pub: true, len: 300 },
  theme_preset:       { v: 'ROYAL_INDIGO', t: 'enum', e: 'THEME_PRESET', g: 'branding', pub: true },
  primary_color:      { v: '#4338CA', t: 'color', g: 'branding', pub: true },
  secondary_color:    { v: '#0F766E', t: 'color', g: 'branding', pub: true },
  accent_color:       { v: '#F59E0B', t: 'color', g: 'branding', pub: true },
  font_body:          { v: 'system', t: 'enum', e: 'FONT', g: 'branding', pub: true },
  font_heading:       { v: 'system', t: 'enum', e: 'FONT', g: 'branding', pub: true },
  /* v1.9: look and feel (pre-tested choices, never free values) */
  page_width:         { v: 'FULL', t: 'enum', e: 'PAGE_WIDTH', g: 'layout', pub: true },
  ui_corners:         { v: 'STANDARD', t: 'enum', e: 'UI_CORNERS', g: 'branding', pub: true },
  ui_shadows:         { v: 'SOFT', t: 'enum', e: 'UI_SHADOWS', g: 'branding', pub: true },
  ui_spacing:         { v: 'COMFORTABLE', t: 'enum', e: 'UI_SPACING', g: 'branding', pub: true },
  ui_text_size:       { v: 'NORMAL', t: 'enum', e: 'UI_TEXT_SIZE', g: 'branding', pub: true },
  product_image_fit:  { v: 'contain', t: 'enum', e: 'IMAGE_FIT', g: 'branding', pub: true },
  hero_banners_json:  { v: [], t: 'json', g: 'branding', pub: true },
  hero_autorotate:    { v: false, t: 'bool', g: 'branding', pub: true },
  announcement_text:  { v: '', t: 'text', g: 'branding', pub: true, len: 140 },
  announcement_starts_at: { v: '', t: 'text', g: 'branding', pub: true, len: 40 },
  announcement_ends_at:   { v: '', t: 'text', g: 'branding', pub: true, len: 40 },
  popups_json:        { v: [], t: 'json', g: 'branding', pub: true },
  text_overrides_json: { v: {}, t: 'json', g: 'branding', pub: true },
  languages_json:     { v: ['en'], t: 'json', g: 'layout', pub: true },
  default_language:   { v: 'en', t: 'enum', e: 'LANGUAGE', g: 'layout', pub: true },
  announcement_auto:  { v: true, t: 'bool', g: 'branding', pub: true },
  trust_strip_json:   { v: [], t: 'json', g: 'branding', pub: true },   // up to 6 × { icon, text, link?, show? }
  show_trust_strip:   { v: true, t: 'bool', g: 'branding', pub: true },
  /* 1.4: logo, favicon, tab names (limits in public/js/limits.js) */
  logo_mode:          { v: 'LOGO_AND_NAME', t: 'enum', e: 'LOGO_MODE', g: 'branding', pub: true },
  logo_height_px:     { v: 40, t: 'int', g: 'branding', pub: true, min: 24, max: 72 },
  tab_title_format:   { v: '{page} — {shop}', t: 'text', g: 'branding', pub: true, len: 60 },
  tab_title_home:     { v: '', t: 'text', g: 'branding', pub: true, len: 70 },
  /* 1.4: banners */
  banner_frequency:   { v: 'ALWAYS', t: 'enum', e: 'BANNER_FREQUENCY', g: 'branding', pub: true },
  banner_start:       { v: 'FIRST', t: 'enum', e: 'BANNER_START', g: 'branding', pub: true },
  /* 1.5: cover picture for the welcome banner (public/js/cover.js: 3:1 computer, 2:1 tablet, 1:1 phone) */
  hero_cover_json:    { v: {}, t: 'json', g: 'branding', pub: true },
  /* 1.4: colours and gradients for each area ('' = theme colour) */
  header_bg:          { v: '', t: 'paint', g: 'branding', pub: true },
  catbar_bg:          { v: '', t: 'paint', g: 'branding', pub: true },
  announcement_bg:    { v: '', t: 'paint', g: 'branding', pub: true },
  footer_bg:          { v: '', t: 'paint', g: 'branding', pub: true },
  hero_bg:            { v: '', t: 'paint', g: 'branding', pub: true },
  button_bg:          { v: '', t: 'paint', g: 'branding', pub: true },
  page_bg:            { v: '', t: 'paint', g: 'branding', pub: true },
  /* 1.4: product pages */
  product_image_ratio: { v: 'SQUARE', t: 'enum', e: 'IMAGE_RATIO', g: 'branding', pub: true },
  delivery_display:   { v: 'DATE', t: 'enum', e: 'DELIVERY_DISPLAY', g: 'tax_shipping', pub: true },
  delivery_custom_text: { v: '', t: 'text', g: 'tax_shipping', pub: true, len: 80 },
  /* 1.4: footer */
  footer_sections_json: { v: ['about', 'care', 'policies', 'payments'], t: 'json', g: 'layout', pub: true },
  footer_columns_json:  { v: [], t: 'json', g: 'layout', pub: true },   // up to 4 × { title, links: up to 8 × { text, href } }
  footer_about_text:    { v: '', t: 'text', g: 'layout', pub: true, len: 300 },
  footer_show_contact:  { v: true, t: 'bool', g: 'layout', pub: true },
  footer_show_social:   { v: true, t: 'bool', g: 'layout', pub: true },
  footer_show_hours:    { v: true, t: 'bool', g: 'layout', pub: true },
  footer_copyright_text: { v: '© {year} {shop}', t: 'text', g: 'layout', pub: true, len: 120 },

  /* Layout */
  home_layout:            { v: 'A', t: 'enum', e: 'HOME_LAYOUT', g: 'layout', pub: true },
  home_pinned_rows_json:  { v: [], t: 'json', g: 'layout', pub: true },
  // Home page sections in order; leave a name out to hide it. Names: banner, trust, categories, pinned,
  // bestsellers, new_arrivals, deals, recently_viewed, all_products (used with home_layout "A").
  home_sections_json:     { v: ['banner', 'trust', 'categories', 'pinned', 'bestsellers', 'new_arrivals', 'deals', 'recently_viewed'], t: 'json', g: 'layout', pub: true },
  show_category_menu:     { v: true, t: 'bool', g: 'layout', pub: true },   // categories in the header bar, phone menu and home tiles
  show_all_products_link: { v: true, t: 'bool', g: 'layout', pub: true },   // "All products" link at the start of the header bar

  /* Store details */
  store_open:         { v: true, t: 'bool', g: 'store', pub: true },
  weekly_hours_json:  { v: {}, t: 'json', g: 'store', pub: true },
  closed_message:     { v: 'We are currently closed. You can still browse — ordering opens again soon.', t: 'text', g: 'store', pub: true, len: 300 },
  hours_text:         { v: '', t: 'text', g: 'store', pub: true, len: 140 },
  legal_name:         { v: '', t: 'text', g: 'store', pub: true, len: 120 },
  contact_phone:      { v: '', t: 'phone', g: 'store', pub: true },
  contact_email:      { v: '', t: 'email', g: 'store', pub: true },
  whatsapp_number:    { v: '', t: 'phone', g: 'store', pub: true },
  address_line1:      { v: '', t: 'text', g: 'store', pub: true, len: 120 },
  address_line2:      { v: '', t: 'text', g: 'store', pub: true, len: 120 },
  city:               { v: '', t: 'text', g: 'store', pub: true, len: 60 },
  state:              { v: 'Tamil Nadu', t: 'text', g: 'store', pub: true, len: 60 },
  shop_pincode:       { v: '', t: 'text', g: 'store', pub: true, len: 6 },
  maps_url:           { v: '', t: 'text', g: 'store', pub: true, len: 300 },
  social_json:        { v: {}, t: 'json', g: 'store', pub: true },
  gstin:              { v: '', t: 'text', g: 'store', pub: true, len: 15 },
  gst_mode:           { v: 'UNREGISTERED', t: 'enum', e: 'GST_MODE', g: 'store', pub: true },
  invoice_prefix:     { v: 'INV', t: 'text', g: 'store', pub: false, len: 10 },
  footer_text:        { v: '', t: 'text', g: 'store', pub: true, len: 300 },
  show_busy_banner:   { v: false, t: 'bool', g: 'store', pub: true },

  /* Tax and shipping */
  prices_include_tax:         { v: true, t: 'bool', g: 'tax_shipping', pub: true },
  show_inclusive_tax_note:    { v: true, t: 'bool', g: 'tax_shipping', pub: true },
  shipping_mode:              { v: 'FLAT', t: 'enum', e: 'SHIPPING_MODE', g: 'tax_shipping', pub: true },
  shipping_flat_paise:        { v: 4900, t: 'paise', g: 'tax_shipping', pub: true, min: 0, max: 10000000 },
  shipping_percent:           { v: 0, t: 'dec', g: 'tax_shipping', pub: true, min: 0, max: 100 },
  free_shipping_above_paise:  { v: 49900, t: 'paise', g: 'tax_shipping', pub: true, min: 0, max: 100000000 },
  charges_gst_rate_percent:   { v: 18, t: 'dec', g: 'tax_shipping', pub: false, min: 0, max: 40 },
  default_delivery_days:      { v: 5, t: 'int', g: 'tax_shipping', pub: true, min: 0, max: 60 },
  skip_sundays_delivery:      { v: false, t: 'bool', g: 'tax_shipping', pub: true },

  /* Payments (Section 7.0.2) — read live by checkout, never published except the COD limit for display */
  cod_confirmation_threshold_paise: { v: 100000, t: 'paise', g: 'payments', pub: false, min: 0, max: 100000000 },
  cod_max_order_paise:              { v: 500000, t: 'paise', g: 'payments', pub: true, min: 0, max: 100000000 },
  cod_confirmation_window_hours:    { v: 24, t: 'int', g: 'payments', pub: false, min: 12, max: 72 },
  cod_confirmation_grace_hours:     { v: 6, t: 'int', g: 'payments', pub: false, min: 1, max: 24 },
  cod_auto_block_rto_count:         { v: 2, t: 'int', g: 'payments', pub: false, min: 1, max: 20 },
  cod_auto_block_noshow_count:      { v: 3, t: 'int', g: 'payments', pub: false, min: 1, max: 20 },
  request_mode:                     { v: 'OFF', t: 'enum', e: 'REQUEST_MODE', g: 'payments', pub: false },
  request_above_paise:              { v: 0, t: 'paise', g: 'payments', pub: false, min: 0, max: 1000000000 },
  request_holds_stock:              { v: true, t: 'bool', g: 'payments', pub: false },
  request_window_hours:             { v: 24, t: 'int', g: 'payments', pub: false, min: 4, max: 72 },
  request_grace_hours:              { v: 6, t: 'int', g: 'payments', pub: false, min: 1, max: 24 },
  request_payment_window_hours:     { v: 24, t: 'int', g: 'payments', pub: false, min: 1, max: 168 },
  request_auto_block_noshow_count:  { v: 3, t: 'int', g: 'payments', pub: false, min: 1, max: 20 },
  request_max_admin_discount_percent: { v: 20, t: 'int', g: 'payments', pub: false, min: 0, max: 100 },
  request_button_label:             { v: 'Send order request', t: 'text', g: 'payments', pub: false, len: 40 },
  request_explainer_text:           { v: "No payment now. We'll call you within {request_window_text} to confirm the details, delivery and payment.", t: 'text', g: 'payments', pub: false, len: 300 },
  transfer_verify_sla_hours:        { v: 12, t: 'int', g: 'payments', pub: false, min: 1, max: 168 },
  transfer_verify_hint:             { v: 'a few hours during shop hours', t: 'text', g: 'payments', pub: false, len: 100 },
  late_transfer_claim_days:         { v: 7, t: 'int', g: 'payments', pub: false, min: 1, max: 60 },
  transfer_auto_block_reject_count: { v: 2, t: 'int', g: 'payments', pub: false, min: 1, max: 20 },
  transfer_proof_upload:            { v: 'OPTIONAL', t: 'enum', e: 'PROOF_UPLOAD', g: 'payments', pub: false },
  payment_proof_retention_days:     { v: 90, t: 'int', g: 'payments', pub: false, min: 7, max: 730 },
  max_active_orders_per_phone:      { v: 3, t: 'int', g: 'payments', pub: false, min: 1, max: 20 },
  ship_sla_hours:                   { v: 24, t: 'int', g: 'payments', pub: false, min: 1, max: 336 },

  /* Daily order limit (Section 4.3) */
  daily_order_cap:        { v: 100, t: 'int', g: 'capacity', pub: false, min: 1, max: TIER_CEILING },
  warn_percent:           { v: 80, t: 'int', g: 'capacity', pub: false, min: 50, max: 95 },
  day_start_hour:         { v: 0, t: 'int', g: 'capacity', pub: false, min: 0, max: 23 },
  orders_paused:          { v: false, t: 'bool', g: 'capacity', pub: false },
  extra_orders_today_json: { v: {}, t: 'json', g: 'capacity', pub: false },
  customer_full_message:  { v: 'Thank you for shopping with us! We have received the maximum number of orders we can handle today. Please come back {reopen_time} — your cart is saved.', t: 'text', g: 'capacity', pub: true, len: 300 },
  customer_busy_message:  { v: 'We are very busy right now. Please try again in a few minutes — your cart is saved.', t: 'text', g: 'capacity', pub: true, len: 300 },
  reopen_time_text:       { v: 'tomorrow morning', t: 'text', g: 'capacity', pub: true, len: 60 },
  upgrade_contact_text:   { v: 'Contact your website provider to discuss an upgrade.', t: 'text', g: 'capacity', pub: false, len: 300 },

  /* Features and housekeeping */
  reviews_enabled:            { v: true, t: 'bool', g: 'features', pub: true },
  sold_counts_mode:           { v: 'MONTH', t: 'enum', e: 'SOLD_COUNTS_MODE', g: 'features', pub: true },
  sold_counts_min:            { v: 10, t: 'int', g: 'features', pub: true, min: 1, max: 100000 },
  inventory_tracking_enabled: { v: true, t: 'bool', g: 'features', pub: false },
  auto_archive:               { v: true, t: 'bool', g: 'features', pub: false },
  archive_cutoff_days:        { v: 60, t: 'int', g: 'features', pub: false, min: 30, max: 730 },

  /* First-run checklist (Section 23.7.3) */
  setup_checklist_dismissed:  { v: false, t: 'bool', g: 'checklist', pub: false }
};

/** The four rows of the Payment_Methods tab on a fresh install (Section 1.6 "Default payment setup"). */
var DEFAULT_PAYMENT_METHODS = [
  { method_id: 'RAZORPAY', enabled: true, display_label: 'UPI, Cards & Net Banking',
    customer_hint: 'Pay securely online', sort: 1, min_order_paise: 100, max_order_paise: 0, fee_paise: 0,
    sub_methods_json: { upi: true, card: true, netbanking: true, wallet: true, emi: true, paylater: true },
    window_minutes: 0 },
  { method_id: 'UPI_DIRECT', enabled: false, display_label: 'UPI — pay the shop directly',
    customer_hint: 'Pay from any UPI app. No extra charges.', sort: 2, min_order_paise: 100,
    max_order_paise: 0, fee_paise: 0, sub_methods_json: {}, window_minutes: 60 },
  { method_id: 'BANK_TRANSFER', enabled: false, display_label: 'Bank transfer (NEFT / IMPS)',
    customer_hint: 'Send money from your bank app to our account.', sort: 3, min_order_paise: 100,
    max_order_paise: 0, fee_paise: 0, sub_methods_json: {}, window_minutes: 60 },
  { method_id: 'COD', enabled: true, display_label: 'Cash on Delivery',
    customer_hint: 'Pay in cash when your order arrives.', sort: 4, min_order_paise: 0,
    max_order_paise: 0, fee_paise: 0, sub_methods_json: {}, window_minutes: 0 }
];

/** Version 1 of the printed bill design (Section 12.5). */
var DEFAULT_INVOICE_LAYOUT = {
  version_id: 1,
  logo_align: 'LEFT',
  accent_header_color: '#4338CA',
  accent_border_color: '#CBD5E1',
  accent_heading_color: '#0F172A',
  show_hsn: true,
  show_tax_breakdown: true,
  show_signature_block: false,
  signature_image_id: '',
  block_order_json: ['legal_terms', 'signature'],
  legal_terms_html: '<p>Goods once sold are subject to our Refund &amp; Returns policy shown on our website. ' +
    'This is a computer-generated invoice. Please have this wording reviewed by your CA.</p>',
  is_current: true
};

/* ------------------------------ Reading and writing settings ------------------------------ */

var CONFIG_CACHE_KEY_ = 'cfg_all_v1';
var CONFIG_MEMO_ = null;

/** All settings as typed values (defaults filled in for any key missing from the tab). Cached. */
function getAllConfig_() {
  if (CONFIG_MEMO_) return CONFIG_MEMO_;
  var cached = cacheGetJson_(CONFIG_CACHE_KEY_);
  if (cached) { CONFIG_MEMO_ = cached; return cached; }

  var out = {};
  Object.keys(DEFAULT_CONFIG).forEach(function (k) { out[k] = cloneJson_(DEFAULT_CONFIG[k].v); });
  readObjects_(TABS.CONFIG).forEach(function (row) {
    var def = DEFAULT_CONFIG[row.key];
    if (!def) return; // unknown key typed by hand: ignored
    try { out[row.key] = parseConfigValue_(row.key, row.value); } catch (e) { /* keep default */ }
  });
  cachePutJson_(CONFIG_CACHE_KEY_, out, 600);
  CONFIG_MEMO_ = out;
  return out;
}

/** One typed setting. Throws on an unknown key so typos are caught early. */
function getConfig_(key) {
  if (!DEFAULT_CONFIG[key]) throw new Error('Unknown setting: ' + key);
  return getAllConfig_()[key];
}

/** Only the settings that are safe to publish to settings.public.json. */
function getPublicConfig_() {
  var all = getAllConfig_();
  var out = {};
  Object.keys(DEFAULT_CONFIG).forEach(function (k) { if (DEFAULT_CONFIG[k].pub) out[k] = all[k]; });
  return out;
}

/**
 * Saves several settings at once. `values` = {key: newValue}. Every value is validated first;
 * if any fails, NOTHING is saved and a VALIDATION error lists the problems.
 * Returns {changed: [{key, before, after}]}.
 */
function setConfigValues_(values, userName) {
  var problems = [];
  var typed = {};
  Object.keys(values || {}).forEach(function (k) {
    try { typed[k] = validateConfigValue_(k, values[k]); } catch (e) { problems.push(e.message); }
  });
  if (problems.length) throw appError_('VALIDATION', problems.join(' '));

  var before = getAllConfig_();
  var changed = [];
  var sheet = getSheet_(TABS.CONFIG);
  var map = headerMap_(sheet);
  var rowsByKey = {};
  readObjects_(TABS.CONFIG).forEach(function (r) { rowsByKey[r.key] = r._row; });
  var now = nowIso_();
  var appends = [];

  Object.keys(typed).forEach(function (k) {
    var cell = serializeConfigValue_(k, typed[k]);
    if (serializeConfigValue_(k, before[k]) === cell && rowsByKey[k]) return;
    changed.push({ key: k, before: before[k], after: typed[k] });
    var rowObj = { key: k, value: cell, updated_at: now, updated_by: userName || 'SYSTEM' };
    if (rowsByKey[k]) {
      writeRowObject_(sheet, map, rowsByKey[k], rowObj, TABS.CONFIG);
    } else {
      appends.push(rowObj);
    }
  });
  if (appends.length) appendObjects_(TABS.CONFIG, appends);
  clearConfigCache_();
  return { changed: changed };
}

function clearConfigCache_() {
  CONFIG_MEMO_ = null;
  try { CacheService.getScriptCache().remove(CONFIG_CACHE_KEY_); } catch (e) { /* ignore */ }
}

/** Turns a cell's text into the setting's real type. */
function parseConfigValue_(key, cell) {
  var def = DEFAULT_CONFIG[key];
  if (cell === '' || cell === null || cell === undefined) return cloneJson_(def.v);
  var s = String(cell);
  switch (def.t) {
    case 'int': case 'paise': return parseInt(s, 10);
    case 'dec': return parseFloat(s);
    case 'bool': return s === 'TRUE' || s === 'true' || cell === true;
    case 'json': return JSON.parse(s);
    default: return s;
  }
}

/** Turns a typed setting into the text stored in the Config tab. */
function serializeConfigValue_(key, value) {
  var def = DEFAULT_CONFIG[key];
  if (def.t === 'json') return JSON.stringify(value);
  if (def.t === 'bool') return value ? 'TRUE' : 'FALSE';
  return String(value);
}

/** Validates and converts one incoming value. Throws Error with a plain-English message. */
function validateConfigValue_(key, value) {
  var def = DEFAULT_CONFIG[key];
  if (!def) throw new Error('"' + key + '" is not a setting.');
  var label = key.replace(/_/g, ' ');
  switch (def.t) {
    case 'int':
    case 'paise': {
      var n = typeof value === 'number' ? value : Number(String(value).trim());
      if (!isFinite(n) || Math.floor(n) !== n) throw new Error('Enter a whole number for ' + label + '.');
      if (def.min !== undefined && n < def.min) throw new Error(label + ' must be at least ' + def.min + '.');
      if (def.max !== undefined && n > def.max) throw new Error(label + ' must be at most ' + def.max + '.');
      return n;
    }
    case 'dec': {
      var d = typeof value === 'number' ? value : Number(String(value).trim());
      if (!isFinite(d)) throw new Error('Enter a number for ' + label + '.');
      if (def.min !== undefined && d < def.min) throw new Error(label + ' must be at least ' + def.min + '.');
      if (def.max !== undefined && d > def.max) throw new Error(label + ' must be at most ' + def.max + '.');
      return d;
    }
    case 'bool':
      if (value === true || value === 'TRUE' || value === 'true') return true;
      if (value === false || value === 'FALSE' || value === 'false') return false;
      throw new Error(label + ' must be on or off.');
    case 'json':
      if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch (e) { throw new Error(label + ' is not valid.'); }
      }
      if (value === null || typeof value !== 'object') throw new Error(label + ' is not valid.');
      if (JSON.stringify(value).length > 40000) throw new Error(label + ' is too long.');
      return value;
    case 'enum':
      if (!isEnumValue_(def.e, value)) throw new Error(label + ' must be one of: ' + ENUMS[def.e].join(', ') + '.');
      return value;
    case 'color':
      if (!/^#[0-9A-Fa-f]{6}$/.test(String(value))) throw new Error(label + ' must be a colour like #4338CA.');
      return String(value).toUpperCase();
    case 'paint': {
      // '' (use the theme), one colour "#7C3AED", or a gradient of 2–3 colours (same rules as public/js/theme.js).
      if (value === '' || value === null || value === undefined) return '';
      if (typeof value === 'object') {
        var cols = value.colors;
        if (!Array.isArray(cols) || cols.length < 1 || cols.length > 3 || cols.some(function (c) { return !/^#[0-9A-Fa-f]{6}$/.test(String(c)); })) throw new Error(label + ': choose 1 to 3 colours like #7C3AED.');
        var ang = Math.round(Number(value.angle || 135));
        if (!(ang >= 0 && ang <= 360)) throw new Error(label + ': the gradient angle must be 0–360.');
        return { colors: cols.map(function (c) { return String(c).toUpperCase(); }), angle: ang, style: value.style === 'radial' ? 'radial' : 'linear' };
      }
      var sv = String(value).trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(sv)) return sv.toUpperCase();
      if (/^(linear|radial)-gradient\(\s*(\d{1,3}deg\s*,\s*)?#[0-9A-Fa-f]{6}\s*,\s*#[0-9A-Fa-f]{6}(\s*,\s*#[0-9A-Fa-f]{6})?\s*\)$/i.test(sv)) return sv;
      throw new Error(label + ' must be a colour like #7C3AED or a gradient like linear-gradient(135deg, #7C3AED, #DB2777).');
    }
    case 'phone': {
      if (value === '' || value === null || value === undefined) return '';
      var p = normalizePhone10_(value);
      if (!p) throw new Error('Enter a 10-digit mobile number for ' + label + ', like 98765 43210.');
      return p;
    }
    case 'email':
      if (value === '' || value === null || value === undefined) return '';
      if (!REGEX.EMAIL.test(String(value).trim())) throw new Error('Enter a valid email address for ' + label + '.');
      return String(value).trim();
    default: {
      var t = sanitizePlainText_(value);
      if (def.len && t.length > def.len) throw new Error(label + ' must be ' + def.len + ' characters or fewer.');
      return t;
    }
  }
}

/** The request window as words, e.g. "24 hours", for {request_window_text}. */
function requestWindowText_() {
  var h = getConfig_('request_window_hours');
  return h === 1 ? '1 hour' : h + ' hours';
}
