/**
 * Util.gs — small shared helpers used by every other file.
 *
 * Sections: time · randomness and hashing · validation · text · cache/properties ·
 *           errors and logging · locking and counters · Sheet reading/writing · grid size.
 */

/* ===================================== Time (IST) ===================================== */

/** Now as ISO text in India time, e.g. 2026-10-01T20:48:05.123+05:30. */
function nowIso_() {
  return toIso_(new Date());
}

/** Any Date (or ms number) as ISO text in India time. India has no daylight saving, so +05:30 is fixed. */
function toIso_(d) {
  if (d === null || d === undefined || d === '') return '';
  var date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  return Utilities.formatDate(date, IST_TZ, "yyyy-MM-dd'T'HH:mm:ss.SSS") + '+05:30';
}

/** ISO text (or a Date the Sheet created) back into a Date. Returns null when empty or invalid. */
function parseIso_(s) {
  if (s === null || s === undefined || s === '') return null;
  if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
  var d = new Date(String(s));
  return isNaN(d.getTime()) ? null : d;
}

/** Milliseconds since 1970 for an ISO value (0 when empty) — handy for comparisons. */
function isoMs_(s) {
  var d = parseIso_(s);
  return d ? d.getTime() : 0;
}

/** Adds minutes to a Date and returns a new Date. */
function addMinutes_(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

/**
 * The business DAY (Section 4.2) as "yyyy-MM-dd" in India time. A day starts at
 * `startHour` (setting day_start_hour, default 0 = midnight).
 */
function dayKey_(date, startHour) {
  var d = date || new Date();
  var h = startHour || 0;
  return Utilities.formatDate(new Date(d.getTime() - h * 3600000), IST_TZ, 'yyyy-MM-dd');
}

/** Today's business day key using the shop's setting. */
function todayKey_() {
  var startHour = 0;
  try { startHour = getConfig_('day_start_hour'); } catch (e) { /* tab not ready yet */ }
  return dayKey_(new Date(), startHour);
}

/** Indian financial year label for a date, e.g. 1 Oct 2026 -> "2026-27"; 15 Mar 2027 -> "2026-27". */
function fyLabel_(date) {
  var d = date || new Date();
  var y = Number(Utilities.formatDate(d, IST_TZ, 'yyyy'));
  var m = Number(Utilities.formatDate(d, IST_TZ, 'M'));
  var start = m >= 4 ? y : y - 1;
  var endShort = String((start + 1) % 100);
  if (endShort.length < 2) endShort = '0' + endShort;
  return start + '-' + endShort;
}

/** A time-budget helper for long jobs: dl.left() = ms remaining, dl.expired(). */
function deadline_(budgetMs) {
  var started = Date.now();
  return {
    started: started,
    left: function () { return budgetMs - (Date.now() - started); },
    expired: function () { return Date.now() - started >= budgetMs; },
    elapsed: function () { return Date.now() - started; }
  };
}

/* ============================== Randomness and hashing =============================== */

var BASE32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford: no I, L, O, U

/** n cryptographically-strong random bytes (values 0–255). Built from UUID v4 randomness, hashed. */
function randomBytes_(n) {
  var out = [];
  while (out.length < n) {
    var seed = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid() + Date.now();
    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, seed, Utilities.Charset.UTF_8);
    for (var i = 0; i < digest.length && out.length < n; i++) out.push(digest[i] & 0xff);
  }
  return out;
}

/** n random characters from the Base32 alphabet above (each byte & 31 is perfectly uniform). */
function randomBase32_(n) {
  return randomBytes_(n).map(function (b) { return BASE32_ALPHABET.charAt(b & 31); }).join('');
}

/** A 256-bit random token as URL-safe text (for sessions, order access tokens). */
function randomToken_() {
  var bytes = randomBytes_(32).map(function (b) { return b > 127 ? b - 256 : b; });
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

/** Signed byte array (as Apps Script returns) -> lowercase hex string. */
function bytesToHex_(bytes) {
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i] & 0xff;
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hex;
}

/** SHA-256 of a text, as hex. */
function sha256Hex_(text) {
  return bytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8));
}

/** HMAC-SHA256 of message with key, as hex (Razorpay signature format). */
function hmacSha256Hex_(message, key) {
  return bytesToHex_(Utilities.computeHmacSha256Signature(String(message), String(key), Utilities.Charset.UTF_8));
}

/** Compares two strings in constant time (the time taken doesn't reveal where they differ). */
function constantTimeEqual_(a, b) {
  a = String(a === null || a === undefined ? '' : a);
  b = String(b === null || b === undefined ? '' : b);
  var len = Math.max(a.length, b.length);
  var diff = a.length ^ b.length;
  for (var i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/* ====================================== Validation ====================================== */

var REGEX = {
  PHONE10: /^[6-9]\d{9}$/,
  PINCODE: /^[1-9][0-9]{5}$/,
  IFSC: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  UPI_ID: /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/,
  GSTIN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
  EMAIL: /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/,
  REFERENCE: /^[A-Z0-9]{6,22}$/,
  HEX_COLOR: /^#[0-9A-Fa-f]{6}$/,
  ORDER_ID: /^ORD-\d{6}-[0-9A-HJKMNP-TV-Z]{5}$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  RAZORPAY_KEY_ID: /^rzp_(test|live)_[A-Za-z0-9]{6,40}$/,
  GITHUB_REPO: /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/,
  BANK_ACCOUNT: /^[0-9]{6,20}$/
};

/**
 * Any Indian mobile number as typed ("+91 98765 43210", "098765-43210", "919876543210")
 * -> "9876543210". Returns '' when it isn't a valid Indian mobile number.
 */
function normalizePhone10_(raw) {
  if (raw === null || raw === undefined) return '';
  var s = String(raw).replace(/[\s\-().]/g, '');
  if (s.indexOf('+91') === 0) s = s.slice(3);
  else if (s.length === 12 && s.indexOf('91') === 0) s = s.slice(2);
  else if (s.length === 11 && s.charAt(0) === '0') s = s.slice(1);
  return REGEX.PHONE10.test(s) ? s : '';
}

/** "9876543210" -> "+919876543210" (how phones are stored). Returns '' for invalid input. */
function toE164_(raw) {
  var p = normalizePhone10_(raw);
  return p ? '+91' + p : '';
}

/** Payment reference as typed -> upper case, letters and digits only (for the duplicate check). */
function normalizeReference_(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/* ========================================= Text ========================================= */

/** Plain text from any input: removes control characters (keeps line breaks) and trims. */
function sanitizePlainText_(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

/** Escapes text for safe use inside HTML. */
function escapeHtml_(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Shows only the last `keep` characters: "ab12@okhdfc" -> "••••hdfc". */
function maskTail_(s, keep) {
  var k = keep || 4;
  var str = String(s || '');
  if (!str) return '';
  return '••••' + str.slice(-k);
}

/** Deep copy of plain JSON data. */
function cloneJson_(v) {
  return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
}

/** JSON.parse that returns `fallback` instead of throwing. */
function jsonParse_(s, fallback) {
  if (s === null || s === undefined || s === '') return fallback;
  if (typeof s === 'object') return s;
  try { return JSON.parse(String(s)); } catch (e) { return fallback; }
}

/** 124500 paise -> "₹1,245"; 124050 -> "₹1,240.50" (Indian grouping, Section 23.5.4). */
function formatRupees_(paise) {
  var p = Math.round(Number(paise) || 0);
  var neg = p < 0;
  p = Math.abs(p);
  var rupees = Math.floor(p / 100);
  var rest = p % 100;
  var s = String(rupees);
  var last3 = s.slice(-3);
  var other = s.slice(0, -3);
  if (other) last3 = ',' + last3;
  var grouped = other.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + last3;
  var out = '₹' + grouped + (rest ? '.' + (rest < 10 ? '0' : '') + rest : '');
  return neg ? '-' + out : out;
}

/* ================================ Cache and properties ================================ */

function cacheGetJson_(key) {
  try {
    var s = CacheService.getScriptCache().get(key);
    return s ? JSON.parse(s) : null;
  } catch (e) { return null; }
}

/** Stores JSON for `seconds` (max 21,600). Silently skips values over ~95 KB (the limit is 100 KB). */
function cachePutJson_(key, value, seconds) {
  try {
    var s = JSON.stringify(value);
    if (s.length > 95000) return false;
    CacheService.getScriptCache().put(key, s, Math.min(seconds || 600, 21600));
    return true;
  } catch (e) { return false; }
}

function getProp_(name) {
  return PropertiesService.getScriptProperties().getProperty(name);
}

function setProp_(name, value) {
  PropertiesService.getScriptProperties().setProperty(name, String(value));
}

function deleteProp_(name) {
  PropertiesService.getScriptProperties().deleteProperty(name);
}

/* ================================== Errors and logging ================================== */

/**
 * Creates an error the API turns into a friendly response.
 * code = one of the codes in Section 6.2; extra may hold {data, retry_after_ms}.
 */
function appError_(code, message, extra) {
  var e = new Error(message || code);
  e.code = code;
  e.extra = extra || {};
  return e;
}

/** Keys whose values must never be written to a log. */
var SECRET_KEY_PATTERN_ = /secret|token|password|signature|salt|hash|otp|setup_code|upi|account|ifsc|payee/i;

/** Copies an object for logging with secrets hidden and phones/emails masked. */
function scrubForLog_(value, depth) {
  var d = depth || 0;
  if (d > 4) return '[…]';
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(function (v) { return scrubForLog_(v, d + 1); });
  if (typeof value === 'object') {
    var out = {};
    Object.keys(value).forEach(function (k) {
      if (SECRET_KEY_PATTERN_.test(k)) { out[k] = '[hidden]'; return; }
      if (/phone|contact|mobile/i.test(k)) { out[k] = maskTail_(value[k], 4); return; }
      if (/email/i.test(k)) { out[k] = value[k] ? '[email]' : ''; return; }
      if (/name|address/i.test(k) && typeof value[k] === 'string') { out[k] = value[k] ? '[personal]' : ''; return; }
      out[k] = scrubForLog_(value[k], d + 1);
    });
    return out;
  }
  if (typeof value === 'string' && value.length > 300) return value.slice(0, 300) + '…';
  return value;
}

/** Writes one row to Errors_Log. Never throws (logging must not break the real work). */
function logError_(where, code, message, context) {
  try {
    var ctx = '';
    try { ctx = JSON.stringify(scrubForLog_(context || {})).slice(0, 2000); } catch (e) { ctx = '{}'; }
    appendObjects_(TABS.ERRORS_LOG, [{
      ts: nowIso_(), where: String(where || '').slice(0, 100), code: String(code || 'INTERNAL').slice(0, 40),
      message: String(message || '').slice(0, 500), context_json: ctx
    }]);
  } catch (e) {
    console.error('logError_ failed: ' + e + ' | original: ' + where + ' ' + code + ' ' + message);
  }
}

/* ================================== Locking and counters ================================== */

/**
 * Runs fn() while holding the script lock (Section 6.6). Keep fn SHORT and do no network calls in it.
 * If the lock can't be had within LOCK_WAIT_MS, throws BUSY_RETRY so the browser retries.
 */
function withScriptLock_(fn, waitMs) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(waitMs || LOCK_WAIT_MS);
  } catch (e) {
    throw appError_('BUSY_RETRY', 'The shop is busy. Please try again.', { retry_after_ms: 1000 + Math.floor(Math.random() * 2000) });
  }
  try {
    return fn();
  } finally {
    try { SpreadsheetApp.flush(); } catch (e) { /* ignore */ }
    lock.releaseLock();
  }
}

/**
 * Adds 1 to a named counter in the Counters tab and returns the new value.
 * MUST be called while holding the script lock (invoice numbers must never repeat).
 */
function nextCounter_(name) {
  var row = findRowById_(TABS.COUNTERS, name);
  if (row === -1) {
    appendObjects_(TABS.COUNTERS, [{ name: name, value: 1 }]);
    return 1;
  }
  var sheet = getSheet_(TABS.COUNTERS);
  var map = headerMap_(sheet);
  var current = Number(sheet.getRange(row, map.value).getValue()) || 0;
  sheet.getRange(row, map.value).setValue(current + 1);
  return current + 1;
}

/* ================================ Sheet reading and writing ================================ */

var SS_MEMO_ = null;
var SHEET_MEMO_ = {};
var HEADER_MEMO_ = {};

/** The shop spreadsheet (works from menus, triggers and the web app). */
function getSs_() {
  if (SS_MEMO_) return SS_MEMO_;
  var ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { ss = null; }
  if (!ss) {
    var id = getProp_(PROP.SPREADSHEET_ID);
    if (!id) throw appError_('INTERNAL', 'Shop setup has not been run yet.');
    ss = SpreadsheetApp.openById(id);
  }
  SS_MEMO_ = ss;
  return ss;
}

/** A tab by name. Throws a clear message if setup hasn't created it. */
function getSheet_(tab) {
  if (SHEET_MEMO_[tab]) return SHEET_MEMO_[tab];
  var sh = getSs_().getSheetByName(tab);
  if (!sh) throw appError_('INTERNAL', 'The "' + tab + '" tab is missing. Run 🛒 Shop Setup → Run first-time setup.');
  SHEET_MEMO_[tab] = sh;
  return sh;
}

/** {columnName: columnNumber} read from the tab's header row (row 1). */
function headerMap_(sheet) {
  var name = sheet.getName();
  if (HEADER_MEMO_[name]) return HEADER_MEMO_[name];
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  headers.forEach(function (h, i) { if (h !== '' && h !== null) map[String(h)] = i + 1; });
  HEADER_MEMO_[name] = map;
  return map;
}

/** Forgets remembered header positions (after Setup adds columns). */
function resetSheetMemos_() {
  SHEET_MEMO_ = {};
  HEADER_MEMO_ = {};
}

/** Converts a cell value into the column's JavaScript type. Empty numbers come back as null. */
function fromCell_(type, v) {
  var empty = v === '' || v === null || v === undefined;
  switch (type) {
    case 'int': return empty ? null : Math.round(Number(v));
    case 'dec': return empty ? null : Number(v);
    case 'bool': return v === true || v === 'TRUE' || v === 'true';
    case 'json': return empty ? null : jsonParse_(v, null);
    case 'ts': return empty ? '' : (v instanceof Date ? toIso_(v) : String(v));
    default: return empty ? '' : (v instanceof Date ? toIso_(v) : String(v));
  }
}

/** Converts a JavaScript value into what is written to the cell. Refuses non-whole money/ints. */
function toCell_(type, v, label) {
  if (v === null || v === undefined) return '';
  switch (type) {
    case 'int':
      if (v === '') return '';
      if (typeof v !== 'number' || !isFinite(v) || Math.floor(v) !== v) {
        throw appError_('INTERNAL', 'Not a whole number for ' + label + ': ' + v);
      }
      return v;
    case 'dec':
      if (v === '') return '';
      if (typeof v !== 'number' || !isFinite(v)) throw appError_('INTERNAL', 'Not a number for ' + label);
      return v;
    case 'bool': return v === true || v === 'TRUE';
    case 'json': return typeof v === 'string' ? v : JSON.stringify(v);
    case 'ts': return v instanceof Date ? toIso_(v) : String(v);
    default: return String(v);
  }
}

/** Every data row of a (small) tab as objects, each with `_row` = its row number. Skips blank rows. */
function readObjects_(tab) {
  var sheet = getSheet_(tab);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var map = headerMap_(sheet);
  var def = tabDef_(tab);
  var width = Math.max(sheet.getLastColumn(), 1);
  var values = sheet.getRange(2, 1, lastRow - 1, width).getValues();
  var out = [];
  for (var r = 0; r < values.length; r++) {
    var obj = rowToObject_(values[r], map, def);
    if (def.key && (obj[def.key] === '' || obj[def.key] === null)) continue;
    if (!def.key && values[r].join('') === '') continue;
    obj._row = r + 2;
    out.push(obj);
  }
  return out;
}

function rowToObject_(rowValues, map, def) {
  var obj = {};
  def.names.forEach(function (n) {
    var c = map[n];
    obj[n] = fromCell_(def.types[n], c ? rowValues[c - 1] : '');
  });
  return obj;
}

/** Row number holding `id` in the tab's key column, or -1. Uses TextFinder (fast, no full read). */
function findRowById_(tab, id) {
  var def = tabDef_(tab);
  if (!def.key) throw appError_('INTERNAL', tab + ' has no key column');
  var sheet = getSheet_(tab);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2 || id === '' || id === null || id === undefined) return -1;
  var col = headerMap_(sheet)[def.key];
  if (!col) return -1;
  var cell = sheet.getRange(2, col, lastRow - 1, 1)
    .createTextFinder(String(id)).matchEntireCell(true).matchCase(true).findNext();
  return cell ? cell.getRow() : -1;
}

/** One row as an object (with `_row`), or null if the row is past the data. */
function getRowObject_(tab, row) {
  var sheet = getSheet_(tab);
  if (row < 2 || row > sheet.getLastRow()) return null;
  var map = headerMap_(sheet);
  var values = sheet.getRange(row, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  var obj = rowToObject_(values, map, tabDef_(tab));
  obj._row = row;
  return obj;
}

/** Finds a record by its id and returns it as an object, or null. */
function getById_(tab, id) {
  var row = findRowById_(tab, id);
  return row === -1 ? null : getRowObject_(tab, row);
}

/** Writes the given fields of `obj` into an existing row (other cells are left exactly as they were). */
function writeRowObject_(sheet, map, row, obj, tab) {
  var def = tabDef_(tab);
  var width = Math.max(sheet.getLastColumn(), 1);
  var range = sheet.getRange(row, 1, 1, width);
  var values = range.getValues()[0];
  Object.keys(obj).forEach(function (k) {
    if (k === '_row') return;
    var c = map[k];
    if (!c || !def.types[k]) throw appError_('INTERNAL', 'Unknown column ' + tab + '.' + k);
    values[c - 1] = toCell_(def.types[k], obj[k], tab + '.' + k);
  });
  range.setValues([values]);
}

/** Updates fields of the record with this id. Throws NOT_FOUND if it doesn't exist. */
function updateById_(tab, id, patch) {
  var row = findRowById_(tab, id);
  if (row === -1) throw appError_('NOT_FOUND', 'Not found.');
  var sheet = getSheet_(tab);
  writeRowObject_(sheet, headerMap_(sheet), row, patch, tab);
  return row;
}

/** Appends records (array of objects) in ONE write. Returns the first new row number. */
function appendObjects_(tab, objects) {
  if (!objects || !objects.length) return -1;
  var sheet = getSheet_(tab);
  var map = headerMap_(sheet);
  var def = tabDef_(tab);
  var width = Math.max(sheet.getLastColumn(), 1);
  var start = sheet.getLastRow() + 1;
  ensureRoom_(sheet, tab, start + objects.length - 1);
  var rows = objects.map(function (obj) {
    var row = new Array(width);
    for (var i = 0; i < width; i++) row[i] = '';
    Object.keys(obj).forEach(function (k) {
      if (k === '_row') return;
      var c = map[k];
      if (!c || !def.types[k]) throw appError_('INTERNAL', 'Unknown column ' + tab + '.' + k);
      row[c - 1] = toCell_(def.types[k], obj[k], tab + '.' + k);
    });
    return row;
  });
  sheet.getRange(start, 1, rows.length, width).setValues(rows);
  return start;
}

/* ======================================= Grid size ======================================= */

/** Number format used for each column type ('@' = plain text, so Sheets never alters it). */
function formatForType_(type) {
  if (type === 'text' || type === 'ts' || type === 'json') return '@';
  if (type === 'int') return '0';
  return 'General';
}

/**
 * Makes sure the tab has rows up to `lastNeededRow`. New rows are added in blocks of GROW_ROWS
 * and pre-formatted (text columns as plain text, drop-downs for allowed values).
 */
function ensureRoom_(sheet, tab, lastNeededRow) {
  var maxRows = sheet.getMaxRows();
  if (lastNeededRow <= maxRows) return;
  var add = Math.max(GROW_ROWS, lastNeededRow - maxRows);
  sheet.insertRowsAfter(maxRows, add);
  applyColumnFormats_(sheet, tab, maxRows + 1, add);
}

/** Applies number formats and drop-down validation to a block of rows. Groups neighbouring columns to save calls. */
function applyColumnFormats_(sheet, tab, startRow, numRows) {
  if (numRows < 1) return;
  var def = tabDef_(tab);
  var map = headerMap_(sheet);
  var byCol = [];
  def.names.forEach(function (n) {
    if (map[n]) byCol.push({ col: map[n], fmt: formatForType_(def.types[n]) });
  });
  byCol.sort(function (a, b) { return a.col - b.col; });
  var i = 0;
  while (i < byCol.length) {
    var j = i;
    while (j + 1 < byCol.length && byCol[j + 1].col === byCol[j].col + 1 && byCol[j + 1].fmt === byCol[i].fmt) j++;
    sheet.getRange(startRow, byCol[i].col, numRows, byCol[j].col - byCol[i].col + 1).setNumberFormat(byCol[i].fmt);
    i = j + 1;
  }
  Object.keys(ENUM_COLUMNS).forEach(function (ref) {
    var parts = ref.split('.');
    if (parts[0] !== tab || !map[parts[1]]) return;
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(ENUMS[ENUM_COLUMNS[ref]], true)
      .setAllowInvalid(false)
      .setHelpText('Choose one of the allowed values.')
      .build();
    sheet.getRange(startRow, map[parts[1]], numRows, 1).setDataValidation(rule);
  });
}

/**
 * Keeps a tab's grid small (Section 15.4: EMPTY cells count toward the limit too):
 * keeps the data rows + SPARE_ROWS ready rows, and removes unused columns on the right.
 */
function trimSheet_(sheet, tab) {
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var keepRows = lastRow + SPARE_ROWS;
  var maxRows = sheet.getMaxRows();
  if (maxRows > keepRows) {
    sheet.deleteRows(keepRows + 1, maxRows - keepRows);
  } else if (maxRows < keepRows) {
    sheet.insertRowsAfter(maxRows, keepRows - maxRows);
    if (tab) applyColumnFormats_(sheet, tab, maxRows + 1, keepRows - maxRows);
  }
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var maxCols = sheet.getMaxColumns();
  if (maxCols > lastCol) sheet.deleteColumns(lastCol + 1, maxCols - lastCol);
}

/** Trims every shop tab. Used by Setup and the daily job. */
function trimAllSheets_() {
  TAB_ORDER.forEach(function (t) {
    var sh = getSs_().getSheetByName(t);
    if (sh) trimSheet_(sh, t);
  });
}

/** Allocated cells in the whole spreadsheet (what Google counts against the limit). */
function cellUsage_() {
  var total = 0;
  getSs_().getSheets().forEach(function (sh) { total += sh.getMaxRows() * sh.getMaxColumns(); });
  return { cells: total, limit: SHEET_CELL_LIMIT, percent: Math.round((total / SHEET_CELL_LIMIT) * 1000) / 10 };
}
