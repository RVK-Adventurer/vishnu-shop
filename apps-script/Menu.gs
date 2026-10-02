/**
 * Menu.gs — the "🛒 Shop Setup" menu inside the Google Sheet (Section 14.2).
 *
 * Secrets (Razorpay key secret, GitHub token) are typed into a pop-up box here and saved ONLY in
 * Script Properties. They are never written to any tab, never shown again and never sent to a browser.
 */

/** Google runs this automatically every time the Sheet is opened. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🛒 Shop Setup')
    .addItem('1. Run first-time setup', 'runFirstTimeSetup')
    .addItem('2. Set Razorpay keys (only if you use Razorpay)', 'menuSetRazorpayKeys')
    .addItem('3. Set GitHub token and repository', 'menuSetGithub')
    .addItem('4. Set owner alert email and WhatsApp', 'menuSetOwnerAlerts')
    .addItem('5. Create or reset the Super Admin (one-time code)', 'menuCreateSuperAdminCode')
    .addSeparator()
    .addItem('Check setup status', 'menuShowStatus')
    .addItem('Run self-tests', 'menuRunSelfTests')
    .addItem('Reinstall automatic jobs', 'reinstallAutomaticJobs')
    .addItem('Remove Razorpay keys', 'menuRemoveRazorpayKeys')
    .addToUi();
}

/* -------------------------------------- Helpers -------------------------------------- */

/** Shows a text box. Returns the trimmed text, or null if the person pressed Cancel or closed it. */
function askText_(title, message) {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt(title, message, ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return null;
  return String(res.getResponseText() || '').trim();
}

function say_(title, message) {
  var ui = SpreadsheetApp.getUi();
  ui.alert(title, message, ui.ButtonSet.OK);
}

/** Writes one Activity log row for a menu action (never includes the secret itself). */
function auditMenu_(action, details) {
  try {
    appendObjects_(TABS.AUDIT_LOGS, [{
      ts: nowIso_(), user_name: 'Owner (Sheet menu)', user_id: 'SYSTEM', role: 'SYSTEM', action: action,
      entity: 'settings', entity_id: '', details: details, session_id: '', user_agent: 'Sheet menu', result: 'OK'
    }]);
  } catch (e) { /* the Audit tab may not exist before setup; not critical */ }
}

function requireSetupDone_() {
  if (getProp_(PROP.SETUP_DONE_AT)) return true;
  say_('Run setup first', 'Please run "1. Run first-time setup" from this menu first.');
  return false;
}

/* --------------------------------------- Razorpay --------------------------------------- */

function menuSetRazorpayKeys() {
  if (!requireSetupDone_()) return;
  var keyId = askText_('Razorpay. Step 1 of 2: Key Id',
    'Paste your Razorpay Key Id.\nIt starts with rzp_test_ (test mode) or rzp_live_ (real money).\n\n' +
    'Find it in the Razorpay Dashboard → Account & Settings → API Keys.');
  if (keyId === null) return;
  if (!REGEX.RAZORPAY_KEY_ID.test(keyId)) {
    say_('That doesn\'t look right', 'A Razorpay Key Id starts with rzp_test_ or rzp_live_ followed by letters and numbers, with no spaces.\nNothing was saved. Please try again.');
    return;
  }
  var secret = askText_('Razorpay. Step 2 of 2: Key Secret',
    'Paste your Razorpay Key Secret.\n\nMake sure nobody is looking at your screen. This box shows what you paste.\n' +
    'It is saved privately and never shown again.');
  if (secret === null) return;
  if (secret.length < 10 || /\s/.test(secret)) {
    say_('That doesn\'t look right', 'The Key Secret is a long code with no spaces. Nothing was saved. Please try again.');
    return;
  }
  setProp_(PROP.RAZORPAY_KEY_ID, keyId);
  setProp_(PROP.RAZORPAY_KEY_SECRET, secret);
  var mode = keyId.indexOf('rzp_live_') === 0 ? 'LIVE (real money)' : 'TEST (no real money)';
  auditMenu_('razorpay.keys_set', 'Razorpay keys saved, mode ' + mode + ', key id ' + maskTail_(keyId, 6));
  say_('✅ Razorpay keys saved', 'Mode: ' + mode + '\nKey Id: ' + keyId +
    '\n\nAlso paste the same Key Id into client/store.config.json (Setup Guide step 7).');
}

function menuRemoveRazorpayKeys() {
  var ui = SpreadsheetApp.getUi();
  var ok = ui.alert('Remove Razorpay keys?',
    'Online payments through Razorpay will stop being offered to customers straight away.\n' +
    'Other payment options are not affected.', ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  deleteProp_(PROP.RAZORPAY_KEY_ID);
  deleteProp_(PROP.RAZORPAY_KEY_SECRET);
  auditMenu_('razorpay.keys_removed', 'Razorpay keys removed');
  say_('Razorpay keys removed', 'Customers will no longer see Razorpay at checkout.');
}

/* ---------------------------------------- GitHub ---------------------------------------- */

function menuSetGithub() {
  if (!requireSetupDone_()) return;
  var repo = askText_('GitHub. Step 1 of 2: repository',
    'Type your shop\'s repository as owner/name, for example:  priya-sweets/shop\n\n' +
    '(You create it in Setup Guide step 6.)');
  if (repo === null) return;
  repo = repo.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '');
  if (!REGEX.GITHUB_REPO.test(repo)) {
    say_('That doesn\'t look right', 'Use the form owner/name, like priya-sweets/shop. Nothing was saved.');
    return;
  }
  var token = askText_('GitHub. Step 2 of 2: token',
    'Paste the fine-grained token you created (it starts with github_pat_).\n\n' +
    'Make sure nobody is looking at your screen. It is saved privately and never shown again.');
  if (token === null) return;
  if (token.length < 20 || /\s/.test(token)) {
    say_('That doesn\'t look right', 'The token is a long code with no spaces. Nothing was saved.');
    return;
  }

  var res;
  try {
    res = UrlFetchApp.fetch('https://api.github.com/repos/' + repo, {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
  } catch (e) {
    say_('Could not reach GitHub', 'Please check your internet connection and try again. Nothing was saved.\n\n(' + e.message + ')');
    return;
  }
  var code = res.getResponseCode();
  if (code === 401) {
    say_('GitHub said the token is wrong', 'The token was not accepted. It may be mistyped, expired or deleted.\nCreate a new one (Setup Guide step 6) and try again. Nothing was saved.');
    return;
  }
  if (code === 403 || code === 404) {
    say_('GitHub can\'t find that repository with this token',
      'Either the name "' + repo + '" is mistyped, or the token was not given access to this repository.\n\n' +
      'Check: token → Repository access → Only select repositories → your shop repository.\nNothing was saved.');
    return;
  }
  if (code !== 200) {
    say_('GitHub returned an unexpected answer (' + code + ')', 'Please wait a minute and try again. Nothing was saved.');
    return;
  }
  var info = jsonParse_(res.getContentText(), {});
  var headers = res.getAllHeaders();
  var expiryHeader = '';
  Object.keys(headers).forEach(function (h) {
    if (h.toLowerCase() === 'github-authentication-token-expiration') expiryHeader = String(headers[h]);
  });

  setProp_(PROP.GITHUB_TOKEN, token);
  setProp_(PROP.GITHUB_REPO, repo);
  setProp_(PROP.GITHUB_BRANCH, info.default_branch || 'main');

  var expiryText = '';
  var expiry = parseIso_(expiryHeader.replace(' UTC', 'Z').replace(/ ([+-]\d{2})(\d{2})$/, '$1:$2').replace(' ', 'T'));
  if (expiry && expiry.getTime() > Date.now() + 3600000) {
    setProp_(PROP.GITHUB_TOKEN_EXPIRES, toIso_(expiry));
    expiryText = Utilities.formatDate(expiry, IST_TZ, 'd MMM yyyy');
  } else {
    var typed = askText_('When does the token expire?',
      'Type the expiry date you chose when creating the token, like 2027-09-30.\nLeave it empty if you chose "No expiration".');
    var d = typed ? parseIso_(typed + 'T23:59:00+05:30') : null;
    if (d) { setProp_(PROP.GITHUB_TOKEN_EXPIRES, toIso_(d)); expiryText = typed; } else { deleteProp_(PROP.GITHUB_TOKEN_EXPIRES); expiryText = 'not set'; }
  }

  auditMenu_('github.token_set', 'GitHub connected to ' + repo + ', token expiry ' + expiryText);
  var warn = info['private'] === false
    ? '\n\n⚠️ This repository is PUBLIC. Please make it Private: on GitHub open the repository → Settings → scroll to "Danger Zone" → Change visibility → Private.'
    : '';
  say_('✅ Connected to GitHub', 'Repository: ' + repo + '\nBranch: ' + (info.default_branch || 'main') +
    '\nToken expires: ' + expiryText + '\n\nThe shop will remind you 14 days before the token expires.' + warn);
}

/* ------------------------------------- Owner alerts ------------------------------------- */

function menuSetOwnerAlerts() {
  if (!requireSetupDone_()) return;
  var email = askText_('Owner alerts. Step 1 of 2: email',
    'Which email should receive the shop\'s rare warning emails?\n(For example: daily order limit reached, a payment problem.)\n\n' +
    'Customers NEVER get emails from this shop. Their bill downloads on screen.');
  if (email === null) return;
  if (!REGEX.EMAIL.test(email)) { say_('That doesn\'t look right', 'Please type a full email address. Nothing was saved.'); return; }

  var wa = askText_('Owner alerts. Step 2 of 2: WhatsApp number',
    'Which mobile number should the "Message myself on WhatsApp" buttons use?\nType a 10-digit Indian mobile number, like 98765 43210.');
  if (wa === null) return;
  var p = normalizePhone10_(wa);
  if (!p) { say_('That doesn\'t look right', 'Please type a 10-digit Indian mobile number. Nothing was saved.'); return; }

  setProp_(PROP.OWNER_ALERT_EMAIL, email);
  setProp_(PROP.OWNER_WHATSAPP, p);
  auditMenu_('alerts.contacts_set', 'Owner alert contacts saved');

  var ui = SpreadsheetApp.getUi();
  var test = ui.alert('✅ Saved', 'Send a test email to ' + email + ' now?', ui.ButtonSet.YES_NO);
  if (test === ui.Button.YES) {
    try {
      MailApp.sendEmail(email, 'Test: your shop alerts work',
        'This is a test from your shop\'s Google Sheet.\n\nThe shop will only email you about rare, important ' +
        'things such as reaching the daily order limit or a payment problem.\nYou don\'t need to reply.');
      say_('Test email sent', 'Check the inbox of ' + email + ' (and the Spam folder, the first time).');
    } catch (e) {
      say_('The test email could not be sent', e.message);
    }
  }
}

/* -------------------------------------- Super Admin -------------------------------------- */

function menuCreateSuperAdminCode() {
  if (!requireSetupDone_()) return;
  var ui = SpreadsheetApp.getUi();
  var hasOwner = readObjects_(TABS.USERS).some(function (u) { return u.role === 'SUPER_ADMIN' && u.active; });
  if (hasOwner) {
    var ok = ui.alert('Reset the Super Admin?',
      'A Super Admin already exists. This makes a one-time code that lets you set a NEW password for the ' +
      'shop owner\'s account (for example if the password was forgotten).\n\nContinue?', ui.ButtonSet.YES_NO);
    if (ok !== ui.Button.YES) return;
  }
  var raw = randomBase32_(8);
  var code = raw.slice(0, 4) + '-' + raw.slice(4);
  var expires = addMinutes_(new Date(), SETUP_CODE_HOURS * 60);
  setProp_(PROP.SETUP_CODE, JSON.stringify({
    hash: sha256Hex_(raw),
    expires_at: toIso_(expires),
    mode: hasOwner ? 'RESET' : 'CREATE'
  }));
  auditMenu_('superadmin.code_created', (hasOwner ? 'Reset' : 'Create') + ' code made, valid until ' + toIso_(expires));
  ui.alert('Your one-time code',
    'Write this code down now. It is shown only once:\n\n        ' + code + '\n\n' +
    'Valid until ' + Utilities.formatDate(expires, IST_TZ, 'd MMM, h:mm a') + '.\n\n' +
    'Open your shop\'s /admin/ page and type it in to ' + (hasOwner ? 'set a new owner password.' : 'create the owner account.') +
    '\n(The admin page is set up in Setup Guide step 9.)\n\nMaking a new code cancels this one.', ui.ButtonSet.OK);
}

/* ---------------------------------------- Status ---------------------------------------- */

/** Plain-language checklist of what has been set up. Used by the menu (and the admin later). */
function setupStatus_() {
  var s = {};
  s.setup_done_at = getProp_(PROP.SETUP_DONE_AT) || '';
  var missing = [];
  try {
    var ss = getSs_();
    TAB_ORDER.forEach(function (t) { if (!ss.getSheetByName(t)) missing.push(t); });
  } catch (e) { missing = TAB_ORDER.slice(); }
  s.tabs_missing = missing;
  try { s.triggers = triggerStatus_(); } catch (e) { s.triggers = null; }
  var keyId = getProp_(PROP.RAZORPAY_KEY_ID) || '';
  s.razorpay = !keyId || !getProp_(PROP.RAZORPAY_KEY_SECRET) ? 'NOT_SET' : (keyId.indexOf('rzp_live_') === 0 ? 'LIVE' : 'TEST');
  s.github_repo = getProp_(PROP.GITHUB_TOKEN) ? (getProp_(PROP.GITHUB_REPO) || '') : '';
  s.github_expires = getProp_(PROP.GITHUB_TOKEN_EXPIRES) || '';
  s.alert_email_set = !!getProp_(PROP.OWNER_ALERT_EMAIL);
  s.alert_whatsapp_set = !!getProp_(PROP.OWNER_WHATSAPP);
  try {
    s.super_admins = readObjects_(TABS.USERS).filter(function (u) { return u.role === 'SUPER_ADMIN' && u.active; }).length;
  } catch (e) { s.super_admins = 0; }
  var codeInfo = jsonParse_(getProp_(PROP.SETUP_CODE), null);
  s.setup_code_pending = !!(codeInfo && isoMs_(codeInfo.expires_at) > Date.now());
  try { s.web_app_url = ScriptApp.getService().getUrl() || ''; } catch (e) { s.web_app_url = ''; }
  try { s.db = cellUsage_(); } catch (e) { s.db = null; }
  return s;
}

function menuShowStatus() {
  var s = setupStatus_();
  var ok = '✅ ', no = '❌ ', later = '⏳ ';
  var lines = [];
  lines.push((s.setup_done_at ? ok + 'Setup run on ' + s.setup_done_at.slice(0, 10) : no + 'Setup not run yet (menu item 1)'));
  lines.push(s.tabs_missing.length ? no + 'Missing tabs: ' + s.tabs_missing.join(', ') + '. Run setup again' : ok + 'All ' + TAB_ORDER.length + ' tabs present');
  if (s.triggers) {
    lines.push((s.triggers.tick_installed && s.triggers.daily_installed ? ok : no) + 'Automatic jobs ' +
      (s.triggers.tick_installed && s.triggers.daily_installed ? 'installed' : 'missing. Use "Reinstall automatic jobs"') +
      (s.triggers.last_tick ? ' (last 5-minute run: ' + s.triggers.last_tick.slice(11, 16) + ')' : ''));
  }
  lines.push(s.razorpay === 'NOT_SET' ? later + 'Razorpay keys not set (skip if you won\'t use Razorpay)' : ok + 'Razorpay keys set. ' + s.razorpay + ' mode');
  lines.push(s.github_repo ? ok + 'GitHub connected: ' + s.github_repo + (s.github_expires ? ' (token expires ' + s.github_expires.slice(0, 10) + ')' : '') : later + 'GitHub not connected yet (after Setup Guide step 6)');
  lines.push(s.alert_email_set && s.alert_whatsapp_set ? ok + 'Owner alert email and WhatsApp set' : later + 'Owner alert contacts not set (menu item 4)');
  lines.push(s.super_admins ? ok + 'Super Admin account exists' : (s.setup_code_pending ? later + 'Super Admin code made. Use it on the /admin/ page' : later + 'No Super Admin yet (menu item 5)'));
  lines.push(s.web_app_url ? ok + 'Web app deployed:\n     ' + s.web_app_url : later + 'Web app not deployed yet (Setup Guide step 5)');
  if (s.db) lines.push(ok + 'Database: ' + s.db.percent + '% of the cell limit used');
  say_('Shop setup status', lines.join('\n'));
}

/* -------------------------------------- Self-tests -------------------------------------- */

function menuRunSelfTests() {
  var full = resolveGlobalFunction_('runSelfTests_');
  if (full) { full(); return; }
  var r = quickChecks_();
  say_('Quick checks: ' + r.passed + ' passed, ' + r.failed + ' failed',
    r.lines.join('\n') + '\n\n(The full self-test suite is added in a later phase.)');
}

/** Small checks that prove the Phase 0 files were pasted correctly. */
function quickChecks_() {
  var lines = [];
  var passed = 0;
  var failed = 0;
  function check(name, fn) {
    try {
      var ok = fn();
      if (ok === true) { passed++; lines.push('PASS  ' + name); } else { failed++; lines.push('FAIL  ' + name + (ok ? '. ' + ok : '')); }
    } catch (e) { failed++; lines.push('FAIL  ' + name + '. ' + e.message); }
  }
  check('Schema is consistent', function () { var p = validateSchema_(); return p.length ? p.join('; ') : true; });
  check('Money format ₹1,24,500', function () { return formatRupees_(12450000) === '₹1,24,500' || formatRupees_(12450000); });
  check('Money format ₹1,240.50', function () { return formatRupees_(124050) === '₹1,240.50' || formatRupees_(124050); });
  check('Phone +91 98765-43210', function () { return toE164_('+91 98765-43210') === '+919876543210'; });
  check('Phone 5876543210 rejected', function () { return normalizePhone10_('5876543210') === ''; });
  check('Financial year Mar 2027', function () { return fyLabel_(new Date('2027-03-15T10:00:00+05:30')) === '2026-27'; });
  check('Financial year Apr 2027', function () { return fyLabel_(new Date('2027-04-01T00:10:00+05:30')) === '2027-28'; });
  check('Day key at 00:30 IST', function () { return dayKey_(new Date('2026-10-02T00:30:00+05:30'), 0) === '2026-10-02'; });
  check('Day key with 2 AM day start', function () { return dayKey_(new Date('2026-10-02T01:30:00+05:30'), 2) === '2026-10-01'; });
  check('HMAC-SHA256 (RFC 4231 case 2)', function () {
    return hmacSha256Hex_('what do ya want for nothing?', 'Jefe') ===
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843';
  });
  check('Constant-time compare', function () { return constantTimeEqual_('abc', 'abc') && !constantTimeEqual_('abc', 'abd') && !constantTimeEqual_('abc', 'ab'); });
  check('Random codes', function () { var a = randomBase32_(5); return /^[0-9A-HJKMNP-TV-Z]{5}$/.test(a) && a !== randomBase32_(5); });
  check('IFSC rule', function () { return REGEX.IFSC.test('HDFC0001234') && !REGEX.IFSC.test('HDFC1001234'); });
  check('UPI ID rule', function () { return REGEX.UPI_ID.test('shop.name@okhdfcbank') && !REGEX.UPI_ID.test('shop@1bank'); });
  check('Daily cap ceiling is 500', function () { return TIER_CEILING === 500 && DEFAULT_CONFIG.daily_order_cap.max === 500; });
  check('Setting validation refuses 501', function () {
    try { validateConfigValue_('daily_order_cap', 501); return 'was accepted'; } catch (e) { return true; }
  });
  if (getProp_(PROP.SETUP_DONE_AT)) {
    check('Config tab readable', function () { return getConfig_('daily_order_cap') >= 1; });
    check('Four payment options present', function () { return readObjects_(TABS.PAYMENT_METHODS).length === 4; });
    check('One current bill design', function () {
      return readObjects_(TABS.INVOICE_LAYOUTS).filter(function (r) { return r.is_current; }).length === 1;
    });
  }
  return { passed: passed, failed: failed, lines: lines };
}
