/**
 * Schema.gs — THE single source of truth for every Sheet tab, column and allowed value.
 *
 * Every other file looks columns up BY NAME through the helpers at the bottom of this file
 * (never by position), so a column added later at the end of a tab never breaks anything.
 *
 * TIME RULE (used everywhere, Section 3.7):
 *   Every timestamp is stored as an ISO 8601 text string in India time with its offset,
 *   for example 2026-10-01T20:48:05.123+05:30. Business dates ("day keys") are 2026-10-01.
 *   Helpers in Util.gs: nowIso_(), toIso_(), parseIso_(), dayKey_().
 *
 * MONEY RULE: every money column ends in _paise and holds a whole number of paise (₹1 = 100).
 *
 * COLUMN TYPE SUFFIXES used in TAB_SPECS below:
 *   (none) text      — stored as plain text so Sheets never changes it (phones, ids, codes)
 *   #      integer   — whole numbers: paise, quantities, counts
 *   %      decimal   — numbers that may have decimals: GST rate (2.5), rating average (4.3)
 *   ?      boolean   — TRUE / FALSE
 *   @      timestamp — ISO text string (see TIME RULE)
 *   {}     JSON      — compact JSON text
 */

var SCHEMA_VERSION = 1;

/** Tab names. Use TABS.ORDERS etc. everywhere — never type a tab name by hand. */
var TABS = {
  CONFIG: 'Config',
  USERS: 'Users',
  SESSIONS: 'Sessions',
  CATEGORIES: 'Categories',
  PRODUCTS: 'Products',
  VARIANTS: 'Variants',
  STOCK_LEDGER: 'Stock_Ledger',
  HOLDS: 'Holds',
  MEDIA: 'Media',
  FOLDERS: 'Folders',
  ORDERS: 'Orders',
  ORDER_ITEMS: 'Order_Items',
  PAYMENTS: 'Payments',
  PAYMENT_METHODS: 'Payment_Methods',
  PAYEE_DETAILS: 'Payee_Details',
  MANUAL_PAYMENTS: 'Manual_Payments',
  ORDER_EDITS: 'Order_Edits',
  CONTACT_LOG: 'Contact_Log',
  CUSTOMER_TRUST: 'Customer_Trust',
  COUPONS: 'Coupons',
  COUPON_USAGE: 'Coupon_Usage',
  PINCODES: 'Pincodes',
  REVIEWS: 'Reviews',
  PAGES: 'Pages',
  CONTACT_MESSAGES: 'Contact_Messages',
  INVOICE_LAYOUTS: 'Invoice_Layouts',
  AUDIT_LOGS: 'Audit_Logs',
  USAGE_LOG: 'Usage_Log',
  PUBLISH_LOG: 'Publish_Log',
  ERRORS_LOG: 'Errors_Log',
  ARCHIVE_INDEX: 'Archive_Index',
  COUNTERS: 'Counters'
};

/**
 * Column lists, in the order they are created. Suffixes explained at the top of the file.
 * Two small additions beyond Section 5.2, both needed by the spec's own rules:
 *   Orders.invoice_file_id  — the cached invoice PDF in Drive (Section 12.2 "referenced from the order row")
 *   Orders.grace_extended   — remembers the single one-time grace extension (Sections 7.7.b, 7.14.4)
 *   Usage_Log.reserve_p95_ms / verify_p95_ms — daily checkout speed (Section 15.7 f)
 *   Contact_Messages tab   — where the Contact page form is stored (Section 10.3 "stored in a sheet")
 */
var TAB_SPECS = {
  Config: 'key value updated_at@ updated_by',

  Users: 'user_id name username password_hash salt role permissions_json{} active? ' +
    'must_change_password? created_at@ last_login_at@ failed_logins#',

  Sessions: 'token_hash user_id kind expires_at@ created_at@ user_agent revoked?',

  Categories: 'category_id name slug parent_id image_path sort# active? show_in_menu? seo_title',

  Products: 'product_id slug name description_html category_id tags brand base_price_paise# mrp_paise# ' +
    'gst_rate_percent% hsn track_inventory low_stock_threshold# order_mode image_ids_json{} seo_title ' +
    'seo_description active? created_at@ updated_at@ rating_avg% rating_count# ' +
    'short highlights_json{} specs_json{} option_names_json{} swatches_json{} gallery_json{}',

  Variants: 'sku product_id option_values_json{} price_paise# mrp_paise# stock# thumbnail_image_id ' +
    'image_ids_json{} active? sort#',

  Stock_Ledger: 'ts@ sku delta# reason ref user',

  Holds: 'hold_id checkout_id order_id sku qty# created_at@ expires_at@',

  Media: 'image_id folder filename path bytes# width# height# variant_label product_id status ' +
    'staged_drive_id created_at@',

  Folders: 'folder_path created_by created_at@ file_count# is_active_target?',

  Orders: 'order_id idempotency_key channel order_mode status payment_status payment_method ' +
    'payment_method_requested razorpay_method_used payee_snapshot_json{} method_fee_paise# ' +
    'admin_discount_paise# admin_discount_reason customer_note request_holds_stock? day_key ' +
    'created_at@ confirmed_at@ expires_at@ customer_name phone email address_json{} pincode state ' +
    'subtotal_paise# discount_paise# coupon_code shipping_paise# tax_paise# total_paise# ' +
    'razorpay_order_id razorpay_payment_id invoice_no invoice_layout_version# access_token_hash ' +
    'courier tracking_url notes cancel_reason return_reason amount_collected_paise# refunded_paise# ' +
    'refund_reference last_reconcile_at@ reconcile_attempts# created_by confirmed_by ' +
    'invoice_file_id grace_extended?',

  Order_Items: 'order_id sku product_id name option_text hsn gst_rate_percent% qty# unit_price_paise# ' +
    'line_discount_paise# taxable_paise# tax_paise# line_total_paise#',

  Payments: 'payment_row_id order_id razorpay_order_id razorpay_payment_id amount_paise# currency status ' +
    'method captured_at@ verified_by method_detail external_ref refund_id refund_paise# ' +
    'raw_status_json{} created_at@',

  Payment_Methods: 'method_id enabled? display_label customer_hint sort# min_order_paise# max_order_paise# ' +
    'fee_paise# sub_methods_json{} window_minutes# updated_at@ updated_by',

  Payee_Details: 'field value updated_at@ updated_by',

  Manual_Payments: 'submission_id order_id method reference reference_normalized payer_name payer_note ' +
    'proof_image_drive_id submitted_at@ submitted_via status amount_received_paise# verified_by ' +
    'verified_at@ reject_reason',

  Order_Edits: 'edit_id order_id ts@ user before_json{} after_json{} reason',

  Contact_Log: 'log_id order_id ts@ purpose channel outcome user note',

  Customer_Trust: 'phone display_name successful_cod_deliveries# cod_cancellations# cod_rto_count# ' +
    'cod_no_show_count# transfer_rejected_count# request_no_show_count# request_cancellations# ' +
    'total_online_orders# cod_blocked? transfer_blocked? request_blocked? blocked_reason blocked_by ' +
    'blocked_at@ notes updated_at@',

  Coupons: 'code type value% min_cart_paise# max_discount_paise# starts_at@ ends_at@ total_uses_limit# ' +
    'per_phone_limit# used_count# active?',

  Coupon_Usage: 'code order_id phone ts@',

  Pincodes: 'rule_id mode pattern delivery_days# shipping_override_paise# cod_allowed? request_only? note',

  Reviews: 'review_id product_id order_id name rating# text status created_at@',

  Pages: 'slug title html updated_at@ show_in_footer?',

  Contact_Messages: 'message_id ts@ name phone email message status',

  Invoice_Layouts: 'version_id# logo_align accent_header_color accent_border_color accent_heading_color ' +
    'show_hsn? show_tax_breakdown? show_signature_block? signature_image_id block_order_json{} ' +
    'legal_terms_html is_current? created_at@ created_by',

  Audit_Logs: 'ts@ user_name user_id role action entity entity_id details session_id user_agent result',

  Usage_Log: 'day_key orders# pending_peak# pos_orders# fetch_calls# publishes# busy_retries# warn_sent? ' +
    'full_sent? notes reserve_p95_ms# verify_p95_ms#',

  Publish_Log: 'ts@ reason files_count# commit_sha catalog_version result',

  Errors_Log: 'ts@ where code message context_json{}',

  Archive_Index: 'volume_id spreadsheet_id url from_date to_date cells_used# status',

  Counters: 'name value#'
};

/** The order tabs are created in (and appear in the Sheet). */
var TAB_ORDER = [
  'Config', 'Payment_Methods', 'Payee_Details', 'Products', 'Variants', 'Categories', 'Orders',
  'Order_Items', 'Payments', 'Manual_Payments', 'Order_Edits', 'Contact_Log', 'Customer_Trust',
  'Holds', 'Stock_Ledger', 'Coupons', 'Coupon_Usage', 'Pincodes', 'Reviews', 'Pages',
  'Contact_Messages', 'Invoice_Layouts', 'Media', 'Folders', 'Users', 'Sessions', 'Audit_Logs',
  'Usage_Log', 'Publish_Log', 'Errors_Log', 'Archive_Index', 'Counters'
];

/** The column that holds each tab's unique id (used for fast look-ups). Tabs without one are logs. */
var TAB_KEYS = {
  Config: 'key', Users: 'user_id', Sessions: 'token_hash', Categories: 'category_id',
  Products: 'product_id', Variants: 'sku', Holds: 'hold_id', Media: 'image_id', Folders: 'folder_path',
  Orders: 'order_id', Payments: 'payment_row_id', Payment_Methods: 'method_id', Payee_Details: 'field',
  Manual_Payments: 'submission_id', Order_Edits: 'edit_id', Contact_Log: 'log_id',
  Customer_Trust: 'phone', Coupons: 'code', Pincodes: 'rule_id', Reviews: 'review_id', Pages: 'slug',
  Contact_Messages: 'message_id', Invoice_Layouts: 'version_id', Archive_Index: 'volume_id',
  Counters: 'name', Usage_Log: 'day_key'
};

/** Allowed values. Order matters only for display. */
var ENUMS = {
  ORDER_STATUS: [
    'PAYMENT_PENDING', 'PENDING_CONFIRMATION', 'REQUEST_RECEIVED', 'AWAITING_PAYMENT',
    'PAYMENT_VERIFICATION', 'LATE_PAYMENT_REVIEW', 'PAYMENT_REJECTED', 'CONFIRMED', 'PACKED',
    'SHIPPED', 'DELIVERED', 'PAYMENT_FAILED', 'EXPIRED', 'CANCELLED', 'ABORTED_MISMATCH',
    'REFUND_PENDING', 'REFUNDED', 'RETURNED'
  ],
  /** Online orders in these states use a "pending slot" under the daily limit (Section 4.2). */
  PENDING_SLOT_STATUSES: [
    'PAYMENT_PENDING', 'PENDING_CONFIRMATION', 'REQUEST_RECEIVED', 'AWAITING_PAYMENT',
    'PAYMENT_VERIFICATION', 'LATE_PAYMENT_REVIEW'
  ],
  PAYMENT_STATUS: [
    'UNPAID', 'PAID', 'COD_PENDING', 'COD_COLLECTED', 'TRANSFER_SUBMITTED', 'REFUND_PENDING',
    'PARTIALLY_REFUNDED', 'REFUNDED'
  ],
  PAYMENT_METHOD: [
    'RAZORPAY', 'UPI_DIRECT', 'BANK_TRANSFER', 'COD', 'CASH', 'UPI_MANUAL', 'CARD_MANUAL', 'UNDECIDED'
  ],
  /** What a customer may pick at checkout (Section 6.3). */
  CHECKOUT_METHOD: ['RAZORPAY', 'UPI_DIRECT', 'BANK_TRANSFER', 'COD', 'REQUEST'],
  /** Every value the Orders.payment_method_requested column can hold (online picks + POS modes). */
  REQUESTED_METHOD: ['RAZORPAY', 'UPI_DIRECT', 'BANK_TRANSFER', 'COD', 'REQUEST', 'CASH', 'UPI_MANUAL', 'CARD_MANUAL'],
  /** Rows of the Payment_Methods tab — created by Setup, never added or deleted by the UI. */
  PAYMENT_METHOD_ID: ['RAZORPAY', 'UPI_DIRECT', 'BANK_TRANSFER', 'COD'],
  RAZORPAY_SUB_METHOD: ['upi', 'card', 'netbanking', 'wallet', 'emi', 'paylater'],
  CHANNEL: ['ONLINE', 'POS'],
  ORDER_MODE: ['INSTANT', 'REQUEST'],
  PRODUCT_ORDER_MODE: ['DEFAULT', 'REQUEST_ONLY'],
  TRACK_INVENTORY: ['TRUE', 'FALSE', 'DEFAULT'],
  ROLE: ['SUPER_ADMIN', 'STAFF'],
  SESSION_KIND: ['SESSION', 'REFRESH'],
  STOCK_REASON: ['SALE', 'POS', 'RESTOCK', 'ADJUST', 'CANCEL_RESTORE', 'REFUND_RESTORE'],
  MEDIA_VARIANT: ['thumb', 'card', 'full'],
  MEDIA_STATUS: ['STAGED', 'PUBLISHED'],
  CONTACT_PURPOSE: ['COD_CONFIRM', 'REQUEST_CONFIRM', 'PAYMENT_FOLLOWUP', 'OTHER'],
  CONTACT_CHANNEL: ['CALL', 'WHATSAPP'],
  CONTACT_OUTCOME: ['REACHED', 'NO_ANSWER', 'CALL_BACK_LATER', 'WRONG_NUMBER'],
  RETURN_REASON: ['CUSTOMER_RETURN', 'RTO', 'OTHER'],
  VERIFIED_BY: ['CLIENT_VERIFY', 'RECONCILE', 'ADMIN_VERIFY'],
  MANUAL_METHOD: ['UPI_DIRECT', 'BANK_TRANSFER'],
  MANUAL_SUBMITTED_VIA: ['PAY_PAGE', 'TRACK_PAGE', 'ADMIN_ON_BEHALF'],
  MANUAL_STATUS: ['SUBMITTED', 'VERIFIED', 'REJECTED', 'SUPERSEDED'],
  COUPON_TYPE: ['PERCENT', 'FLAT'],
  PINCODE_MODE: ['ALLOW', 'BLOCK'],
  REVIEW_STATUS: ['PENDING', 'APPROVED', 'REJECTED'],
  CONTACT_MESSAGE_STATUS: ['NEW', 'READ', 'DONE'],
  LOGO_ALIGN: ['LEFT', 'CENTER', 'RIGHT'],
  REQUEST_MODE: ['OFF', 'OPTIONAL', 'ONLY'],
  PROOF_UPLOAD: ['OFF', 'OPTIONAL', 'REQUIRED'],
  GST_MODE: ['REGISTERED', 'UNREGISTERED', 'COMPOSITION'],
  SHIPPING_MODE: ['FREE', 'FLAT', 'PERCENT'],
  HOME_LAYOUT: ['A', 'B'],
  IMAGE_FIT: ['contain', 'cover'],
  THEME_PRESET: ['ROYAL_INDIGO', 'FRESH_GREEN', 'SAFFRON', 'ROSE', 'OCEAN', 'CHARCOAL_GOLD', 'CUSTOM'],
  ARCHIVE_STATUS: ['ACTIVE', 'FULL', 'CLOSED'],
  PAYEE_FIELD: [
    'upi_id', 'upi_payee_name', 'upi_static_qr_image_id', 'bank_account_name', 'bank_account_number',
    'bank_ifsc', 'bank_name', 'bank_branch', 'bank_account_type'
  ],
  CAPACITY_STATE: ['OPEN', 'WARN', 'BUSY', 'FULL'],
  /* v1.9 additions (docs/V1.9_ADDITIONS.md) */
  PAGE_WIDTH: ['STANDARD', 'WIDE', 'FULL'],
  UI_CORNERS: ['SHARP', 'STANDARD', 'ROUND'],
  UI_SHADOWS: ['NONE', 'SOFT', 'STRONG'],
  UI_SPACING: ['COMPACT', 'COMFORTABLE', 'AIRY'],
  UI_TEXT_SIZE: ['NORMAL', 'LARGE', 'XLARGE'],
  FONT: ['system', 'poppins', 'lora', 'mukta', 'hind-madurai', 'noto-sans-tamil', 'baloo-2'],
  SOLD_COUNTS_MODE: ['OFF', 'MONTH', 'TOTAL', 'BOTH'],
  LANGUAGE: ['en', 'ta', 'hi'],
  POPUP_FREQUENCY: ['DAY', 'SESSION', 'ONCE'],
  POPUP_PAGES: ['ALL', 'HOME'],
  /* 1.4 additions */
  LOGO_MODE: ['LOGO_AND_NAME', 'LOGO_ONLY', 'NAME_ONLY'],
  BANNER_FREQUENCY: ['ALWAYS', 'SESSION', 'DAY'],
  BANNER_START: ['FIRST', 'RANDOM', 'NEXT'],
  IMAGE_RATIO: ['SQUARE', 'PORTRAIT', 'LANDSCAPE'],
  DELIVERY_DISPLAY: ['DATE', 'DAYS', 'TEXT', 'HIDDEN'],
  TEXT_CASE: ['TITLE', 'SENTENCE']
};

/** Drop-down lists added to the Sheet for anyone editing it by hand ("Tab.column": ENUMS key). */
var ENUM_COLUMNS = {
  'Users.role': 'ROLE',
  'Sessions.kind': 'SESSION_KIND',
  'Products.track_inventory': 'TRACK_INVENTORY',
  'Products.order_mode': 'PRODUCT_ORDER_MODE',
  'Stock_Ledger.reason': 'STOCK_REASON',
  'Media.variant_label': 'MEDIA_VARIANT',
  'Media.status': 'MEDIA_STATUS',
  'Orders.channel': 'CHANNEL',
  'Orders.order_mode': 'ORDER_MODE',
  'Orders.status': 'ORDER_STATUS',
  'Orders.payment_status': 'PAYMENT_STATUS',
  'Orders.payment_method': 'PAYMENT_METHOD',
  'Orders.payment_method_requested': 'REQUESTED_METHOD',
  'Orders.return_reason': 'RETURN_REASON',
  'Payments.verified_by': 'VERIFIED_BY',
  'Payment_Methods.method_id': 'PAYMENT_METHOD_ID',
  'Payee_Details.field': 'PAYEE_FIELD',
  'Manual_Payments.method': 'MANUAL_METHOD',
  'Manual_Payments.submitted_via': 'MANUAL_SUBMITTED_VIA',
  'Manual_Payments.status': 'MANUAL_STATUS',
  'Contact_Log.purpose': 'CONTACT_PURPOSE',
  'Contact_Log.channel': 'CONTACT_CHANNEL',
  'Contact_Log.outcome': 'CONTACT_OUTCOME',
  'Coupons.type': 'COUPON_TYPE',
  'Pincodes.mode': 'PINCODE_MODE',
  'Reviews.status': 'REVIEW_STATUS',
  'Contact_Messages.status': 'CONTACT_MESSAGE_STATUS',
  'Invoice_Layouts.logo_align': 'LOGO_ALIGN',
  'Archive_Index.status': 'ARCHIVE_STATUS'
};

/** Tabs that get a stronger, explicit warning banner because editing them by hand is risky. */
var SENSITIVE_TABS = ['Payee_Details', 'Users', 'Sessions', 'Counters', 'Invoice_Layouts'];

/* ------------------------------------------------------------------------------------------ */
/* Helpers — the ONLY way other files learn about columns.                                    */
/* ------------------------------------------------------------------------------------------ */

var SCHEMA_CACHE_ = null;

/**
 * Returns the parsed definition of a tab:
 * { name, columns: [{name, type}], names: [..], types: {name: type}, key }
 * type is one of: 'text', 'int', 'dec', 'bool', 'ts', 'json'.
 */
function tabDef_(tab) {
  if (!SCHEMA_CACHE_) {
    SCHEMA_CACHE_ = {};
    Object.keys(TAB_SPECS).forEach(function (t) {
      var cols = TAB_SPECS[t].split(/\s+/).filter(String).map(parseColumnSpec_);
      var types = {};
      cols.forEach(function (c) { types[c.name] = c.type; });
      SCHEMA_CACHE_[t] = {
        name: t,
        columns: cols,
        names: cols.map(function (c) { return c.name; }),
        types: types,
        key: TAB_KEYS[t] || null
      };
    });
  }
  var def = SCHEMA_CACHE_[tab];
  if (!def) throw new Error('Unknown tab: ' + tab);
  return def;
}

/** "total_paise#" -> {name: "total_paise", type: "int"} */
function parseColumnSpec_(spec) {
  if (/\{\}$/.test(spec)) return { name: spec.slice(0, -2), type: 'json' };
  var last = spec.charAt(spec.length - 1);
  var map = { '#': 'int', '%': 'dec', '?': 'bool', '@': 'ts' };
  if (map[last]) return { name: spec.slice(0, -1), type: map[last] };
  return { name: spec, type: 'text' };
}

/** All column names of a tab, in creation order. */
function columnsOf_(tab) {
  return tabDef_(tab).names.slice();
}

/** Type of one column ('text', 'int', 'dec', 'bool', 'ts', 'json'). Throws on a typo. */
function columnType_(tab, column) {
  var t = tabDef_(tab).types[column];
  if (!t) throw new Error('Unknown column ' + tab + '.' + column);
  return t;
}

/** True if value is one of the allowed values of ENUMS[enumName]. */
function isEnumValue_(enumName, value) {
  var list = ENUMS[enumName];
  if (!list) throw new Error('Unknown enum: ' + enumName);
  return list.indexOf(value) !== -1;
}

/** Self-check used by Setup and the self-tests: every reference in this file is consistent. */
function validateSchema_() {
  var problems = [];
  TAB_ORDER.forEach(function (t) {
    if (!TAB_SPECS[t]) problems.push('TAB_ORDER lists ' + t + ' but TAB_SPECS has no columns for it');
  });
  Object.keys(TAB_SPECS).forEach(function (t) {
    if (TAB_ORDER.indexOf(t) === -1) problems.push(t + ' is missing from TAB_ORDER');
    var names = columnsOf_(t);
    var seen = {};
    names.forEach(function (n) {
      if (seen[n]) problems.push('Duplicate column ' + t + '.' + n);
      seen[n] = true;
    });
    if (TAB_KEYS[t] && names.indexOf(TAB_KEYS[t]) === -1) problems.push('Key column missing: ' + t + '.' + TAB_KEYS[t]);
  });
  Object.keys(TABS).forEach(function (k) {
    if (!TAB_SPECS[TABS[k]]) problems.push('TABS.' + k + ' points to unknown tab ' + TABS[k]);
  });
  Object.keys(ENUM_COLUMNS).forEach(function (ref) {
    var parts = ref.split('.');
    if (!TAB_SPECS[parts[0]] || columnsOf_(parts[0]).indexOf(parts[1]) === -1) problems.push('ENUM_COLUMNS bad column ' + ref);
    if (!ENUMS[ENUM_COLUMNS[ref]]) problems.push('ENUM_COLUMNS bad enum for ' + ref);
  });
  SENSITIVE_TABS.forEach(function (t) { if (!TAB_SPECS[t]) problems.push('SENSITIVE_TABS bad tab ' + t); });
  return problems;
}
