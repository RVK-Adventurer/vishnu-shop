/**
 * Setup.gs — "🛒 Shop Setup → Run first-time setup".
 *
 * Safe to run any number of times: it only ADDS what is missing (tabs, columns, default rows,
 * folders, the two automatic jobs). It never deletes or changes your data. The same function is
 * used after installing a new version of the code (docs/UPDATING_A_CLIENT.md).
 */

/** Menu entry point. */
function runFirstTimeSetup() {
  var ui = SpreadsheetApp.getUi();
  var problems = validateSchema_();
  if (problems.length) {
    ui.alert('Setup stopped',
      'The code files don\'t match each other. Please re-paste Schema.gs and Config.gs exactly as delivered.\n\n' +
      problems.slice(0, 10).join('\n'), ui.ButtonSet.OK);
    return;
  }
  var report;
  try {
    report = setupShop_();
  } catch (e) {
    ui.alert('Setup could not finish',
      'Something went wrong: ' + e.message + '\n\nNothing was deleted. Fix the problem and run setup again.', ui.ButtonSet.OK);
    return;
  }
  ui.alert('✅ Setup finished', report.lines.join('\n') +
    '\n\nNext: follow the Setup Guide, step 4 (the other items in this menu).', ui.ButtonSet.OK);
}

/** Does the actual work. Returns {lines: [...]} describing what happened. */
function setupShop_() {
  var started = Date.now();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Open this from the shop Google Sheet (Extensions → Apps Script).');
  SS_MEMO_ = ss;
  setProp_(PROP.SPREADSHEET_ID, ss.getId());
  ss.setSpreadsheetTimeZone(IST_TZ);
  try { ss.setSpreadsheetLocale('en_IN'); } catch (e) { /* not critical */ }

  var lines = [];
  var created = [];
  var columnsAdded = 0;

  TAB_ORDER.forEach(function (tab) {
    var r = ensureTab_(ss, tab);
    if (r.created) created.push(tab);
    columnsAdded += r.columnsAdded;
  });
  resetSheetMemos_();
  orderTabs_(ss);
  lines.push(created.length ? '• Created ' + created.length + ' tabs.' : '• All ' + TAB_ORDER.length + ' tabs were already there.');
  if (columnsAdded) lines.push('• Added ' + columnsAdded + ' new columns to existing tabs (your data is untouched).');

  var seeded = seedConfig_() + seedPaymentMethods_() + seedPayeeFields_() + seedInvoiceLayout_();
  lines.push(seeded ? '• Filled in ' + seeded + ' default settings.' : '• Default settings were already there.');

  if (removeDefaultSheet_(ss)) lines.push('• Removed the empty "Sheet1" tab.');

  trimAllSheets_();
  var usage = cellUsage_();
  lines.push('• Database size: ' + usage.cells + ' cells (' + usage.percent + '% of the limit).');

  var folders = Object.keys(DRIVE_FOLDERS).map(function (k) { return getShopFolder_(k); });
  lines.push('• Google Drive folders ready (' + folders.length + ').');

  var t = installTriggers_();
  lines.push('• Automatic jobs installed: every 5 minutes, and daily at about 2 AM (' + t.count + ' total).');

  if (!getProp_(PROP.PAYEE_HASH)) setProp_(PROP.PAYEE_HASH, payeeHash_());

  setProp_(PROP.SCHEMA_VERSION, SCHEMA_VERSION);
  setProp_(PROP.SETUP_DONE_AT, nowIso_());
  clearConfigCache_();

  appendObjects_(TABS.AUDIT_LOGS, [{
    ts: nowIso_(), user_name: 'Owner (Sheet menu)', user_id: 'SYSTEM', role: 'SYSTEM', action: 'setup.run',
    entity: 'shop', entity_id: '', details: lines.join(' '), session_id: '', user_agent: 'Sheet menu', result: 'OK'
  }]);

  lines.push('• Took ' + Math.round((Date.now() - started) / 1000) + ' seconds.');
  return { lines: lines };
}

/**
 * Creates the tab if needed, writes/extends its header row, keeps its grid small, formats the
 * ready rows and adds the "are you sure?" warning when someone edits it by hand.
 */
function ensureTab_(ss, tab) {
  var sheet = ss.getSheetByName(tab);
  var created = false;
  if (!sheet) {
    sheet = ss.insertSheet(tab);
    created = true;
  }
  var wanted = columnsOf_(tab);
  var lastCol = sheet.getLastColumn();
  var existing = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  var headerEmpty = existing.join('') === '';
  var toAdd = headerEmpty ? wanted : wanted.filter(function (c) { return existing.indexOf(c) === -1; });
  var startCol = headerEmpty ? 1 : lastCol + 1;

  if (toAdd.length) {
    var needCols = startCol + toAdd.length - 1;
    if (sheet.getMaxColumns() < needCols) sheet.insertColumnsAfter(sheet.getMaxColumns(), needCols - sheet.getMaxColumns());
    sheet.getRange(1, startCol, 1, toAdd.length).setValues([toAdd]);
  }

  var totalCols = Math.max(sheet.getLastColumn(), 1);
  sheet.getRange(1, 1, 1, totalCols)
    .setFontWeight('bold').setBackground('#E2E8F0').setFontColor('#0F172A').setNumberFormat('@');
  if (sheet.getFrozenRows() !== 1) sheet.setFrozenRows(1);

  delete SHEET_MEMO_[tab];
  delete HEADER_MEMO_[tab];
  trimSheet_(sheet, null);
  applyColumnFormats_(sheet, tab, 2, sheet.getMaxRows() - 1);

  if (sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).length === 0) {
    sheet.protect()
      .setDescription('Managed by the shop admin. Edit through the admin website instead.')
      .setWarningOnly(true);
  }
  if (SENSITIVE_TABS.indexOf(tab) !== -1) sheet.setTabColor('#DC2626');

  return { created: created, columnsAdded: headerEmpty ? 0 : toAdd.length };
}

/** Puts the tabs in TAB_ORDER (purely cosmetic; skipped quietly if anything fails). */
function orderTabs_(ss) {
  try {
    TAB_ORDER.forEach(function (tab, i) {
      var sh = ss.getSheetByName(tab);
      if (sh && sh.getIndex() !== i + 1) {
        ss.setActiveSheet(sh);
        ss.moveActiveSheet(i + 1);
      }
    });
    ss.setActiveSheet(ss.getSheetByName(TABS.CONFIG));
  } catch (e) { /* cosmetic only */ }
}

/** Removes Google's empty starter tab, if it's still empty. */
function removeDefaultSheet_(ss) {
  var removed = false;
  ['Sheet1', 'Sheet 1'].forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (sh && sh.getLastRow() === 0 && sh.getLastColumn() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(sh);
      removed = true;
    }
  });
  return removed;
}

/** Adds any setting missing from the Config tab with its default value. Returns how many were added. */
function seedConfig_() {
  var have = {};
  readObjects_(TABS.CONFIG).forEach(function (r) { have[r.key] = true; });
  var now = nowIso_();
  var rows = [];
  Object.keys(DEFAULT_CONFIG).forEach(function (k) {
    if (have[k]) return;
    rows.push({ key: k, value: serializeConfigValue_(k, DEFAULT_CONFIG[k].v), updated_at: now, updated_by: 'SETUP' });
  });
  appendObjects_(TABS.CONFIG, rows);
  return rows.length;
}

/** Creates the four payment-option rows if missing (Section 7.0). */
function seedPaymentMethods_() {
  var have = {};
  readObjects_(TABS.PAYMENT_METHODS).forEach(function (r) { have[r.method_id] = true; });
  var now = nowIso_();
  var rows = DEFAULT_PAYMENT_METHODS.filter(function (m) { return !have[m.method_id]; }).map(function (m) {
    var row = cloneJson_(m);
    row.updated_at = now;
    row.updated_by = 'SETUP';
    return row;
  });
  appendObjects_(TABS.PAYMENT_METHODS, rows);
  return rows.length;
}

/** Creates one empty row per payee field (Section 5.2 Payee_Details). Values are set by the Super Admin later. */
function seedPayeeFields_() {
  var have = {};
  readObjects_(TABS.PAYEE_DETAILS).forEach(function (r) { have[r.field] = true; });
  var now = nowIso_();
  var rows = ENUMS.PAYEE_FIELD.filter(function (f) { return !have[f]; }).map(function (f) {
    return { field: f, value: '', updated_at: now, updated_by: 'SETUP' };
  });
  appendObjects_(TABS.PAYEE_DETAILS, rows);
  return rows.length;
}

/** Creates version 1 of the bill design if there is none yet. */
function seedInvoiceLayout_() {
  if (readObjects_(TABS.INVOICE_LAYOUTS).length) return 0;
  var row = cloneJson_(DEFAULT_INVOICE_LAYOUT);
  row.created_at = nowIso_();
  row.created_by = 'SETUP';
  appendObjects_(TABS.INVOICE_LAYOUTS, [row]);
  return 1;
}

/**
 * Fingerprint of where Direct UPI / bank money goes (Section 14.10). The daily job compares it
 * with the stored value to spot edits made directly in the Sheet, bypassing the admin.
 */
function payeeHash_() {
  var rows = readObjects_(TABS.PAYEE_DETAILS)
    .map(function (r) { return r.field + '=' + r.value; })
    .sort();
  return sha256Hex_(rows.join('\n'));
}

/**
 * A shop folder in the owner's Google Drive, created on first use. key = a DRIVE_FOLDERS key.
 * The folder id is remembered so renaming the folder in Drive doesn't break anything.
 */
function getShopFolder_(key) {
  var name = DRIVE_FOLDERS[key];
  if (!name) throw new Error('Unknown folder: ' + key);
  var propName = 'FOLDER_' + key;
  var id = getProp_(propName);
  if (id) {
    try {
      var f = DriveApp.getFolderById(id);
      if (!f.isTrashed()) return f;
    } catch (e) { /* deleted — make a new one */ }
  }
  var folder = DriveApp.createFolder(name);
  setProp_(propName, folder.getId());
  return folder;
}
