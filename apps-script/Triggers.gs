/**
 * Triggers.gs — the ONLY two automatic jobs (Section 3.6), to stay far below Google's 20-trigger limit:
 *   tick   — every 5 minutes: payments check, expiring windows, holds clean-up, publishing, alerts.
 *   daily  — once a day at about 2 AM India time: backups, clean-up, safety checks.
 *
 * Each job runs a list of named tasks. A task that hasn't been built yet (it arrives in a later
 * phase) is skipped automatically, so this file does not change as the shop grows.
 * Every task receives `dl` (a time budget, see deadline_ in Util.gs) and must stop when dl.left()
 * gets small, saving its progress to continue next time.
 */

/** Tasks run by `tick`, in this order. Built in: P2 = Phase 2, P3 = Phase 3, P5 = Phase 5. */
var TICK_JOBS = [
  'reconcileRazorpay_',      // P5 · Section 7.5 — returns at once when Razorpay is switched off
  'expirePaymentWindows_',   // P3 · Sections 7.7.b, 7.13.3, 7.14.4 — never touches an order with a submitted reference
  'purgeExpiredHolds_',      // P3 · Section 8.2
  'publishIfDue_',           // P2 · Section 9.2
  'evaluateAlerts_',         // P5 · Sections 4.6, 15.1 — the only place MailApp is ever used
  'hourlyChecks_',           // P5 · counter self-heal + storage/quota checks (runs its body once an hour)
  'warmCaches_'              // P3 · Section 15.7 c
];

/** Tasks run by `daily`, in this order. */
var DAILY_JOBS = [
  'mirrorUsageToLog_',       // P3 · Section 4.8
  'trimOldLogs_',            // P5 · Section 15.2
  'runDailyBackup_',         // P5 · Section 15.3
  'deleteOldPaymentProofs_', // P5 · Section 14.11
  'verifyPayeeHash_',        // P5 · Section 14.10
  'autoArchiveIfDue_',       // P5 · Section 15.4
  'checkGithubTokenExpiry_', // P5 · Section 9.4
  'dailySummaryAlert_',      // P5 · Section 15.2
  'cleanupOldUsageKeys_',    // P3 · Section 4.8
  'trimAllSheets_'           // P0 · Section 15.4 (built — in Util.gs)
];

var TRIGGER_HANDLERS = ['tick', 'daily'];

/* ------------------------------------ The two jobs ------------------------------------ */

/** Runs every 5 minutes. Exits quickly when there is nothing to do. */
function tick() {
  var cache = CacheService.getScriptCache();
  if (cache.get('tick_running')) return;          // the previous tick is still working
  cache.put('tick_running', '1', 330);
  try {
    setProp_(PROP.HEARTBEAT_TICK, nowIso_());
    var dl = deadline_(JOB_SAFE_MS);
    runJobs_(TICK_JOBS, dl, 'tick');
    if (!cache.get('trigger_check')) {            // once an hour, make sure both jobs still exist
      cache.put('trigger_check', '1', 3600);
      ensureTriggers_();
    }
  } finally {
    cache.remove('tick_running');
  }
}

/** Runs once a day at about 2 AM India time. */
function daily() {
  setProp_(PROP.HEARTBEAT_DAILY, nowIso_());
  var dl = deadline_(JOB_SAFE_MS);
  runJobs_(DAILY_JOBS, dl, 'daily');
  ensureTriggers_();
}

/**
 * Runs the named tasks in order, each protected so one failure never stops the others.
 * Returns {ran: [...], skipped: [...], failed: [...], stoppedEarly: bool}.
 */
function runJobs_(names, dl, label) {
  var result = { ran: [], skipped: [], failed: [], stoppedEarly: false };
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var fn = resolveGlobalFunction_(name);
    if (!fn) { result.skipped.push(name); continue; }
    if (dl.left() < JOB_MIN_SLICE_MS) { result.stoppedEarly = true; break; }
    var t0 = Date.now();
    try {
      fn(dl);
      result.ran.push(name);
    } catch (e) {
      result.failed.push(name);
      logError_(label + ':' + name, e.code || 'INTERNAL', e.message, { stack: String(e.stack || '').slice(0, 500) });
    }
    var took = Date.now() - t0;
    if (took > 60000) logError_(label + ':' + name, 'SLOW_JOB', 'Task took ' + Math.round(took / 1000) + ' s', {});
  }
  return result;
}

/** Finds a top-level function by name, or null if it hasn't been added yet. */
function resolveGlobalFunction_(name) {
  var g = (typeof globalThis !== 'undefined') ? globalThis : this;
  var fn = g[name];
  return typeof fn === 'function' ? fn : null;
}

/* ------------------------------------ Installing ------------------------------------ */

/** Removes any old copies of the two jobs and creates them fresh. Returns {count}. */
function installTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (TRIGGER_HANDLERS.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('tick').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('daily').timeBased().atHour(2).everyDays(1).inTimezone(IST_TZ).create();
  return { count: ScriptApp.getProjectTriggers().length };
}

/** Re-creates the jobs only if one has gone missing. Returns true if it had to repair them. */
function ensureTriggers_() {
  var have = {};
  ScriptApp.getProjectTriggers().forEach(function (t) { have[t.getHandlerFunction()] = (have[t.getHandlerFunction()] || 0) + 1; });
  var ok = TRIGGER_HANDLERS.every(function (h) { return have[h] === 1; });
  if (ok) return false;
  installTriggers_();
  logError_('ensureTriggers_', 'TRIGGERS_REPAIRED', 'Automatic jobs were missing or duplicated and have been reinstalled.', { found: have });
  return true;
}

/** Status for the menu and the System check page: which jobs exist and when they last ran. */
function triggerStatus_() {
  var have = {};
  ScriptApp.getProjectTriggers().forEach(function (t) { have[t.getHandlerFunction()] = (have[t.getHandlerFunction()] || 0) + 1; });
  return {
    tick_installed: have.tick === 1,
    daily_installed: have.daily === 1,
    last_tick: getProp_(PROP.HEARTBEAT_TICK) || '',
    last_daily: getProp_(PROP.HEARTBEAT_DAILY) || ''
  };
}

/** Menu entry point: "Reinstall automatic jobs". */
function reinstallAutomaticJobs() {
  var r = installTriggers_();
  SpreadsheetApp.getUi().alert('✅ Automatic jobs reinstalled', 'The shop now has its two automatic jobs (' + r.count + ' total).', SpreadsheetApp.getUi().ButtonSet.OK);
}
