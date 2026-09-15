/**
 * ForkLore waitlist backend — Google Apps Script.
 *
 * What it does:
 *   1. doPost()        -> receives {name, email} from the landing page form and
 *                         appends a row to the bound Google Sheet.
 *   2. weeklyDigest()  -> runs every Sunday, emails the full list to RECIPIENT.
 *   3. setupTrigger()  -> run ONCE by hand to schedule the Sunday email.
 *
 * Deploy steps are in DEPLOY.md.
 */

// ---- Config -----------------------------------------------------------------
var RECIPIENT  = 'chethanvalukuru@gmail.com'; // where the weekly list is sent
var CC         = 'kcmiruthularani2003@gmail.com'; // cofounders CC'd (comma-separate for more)
var SHEET_NAME = 'Waitlist';                  // tab name inside the spreadsheet
var HEADERS    = ['Timestamp', 'Name', 'Email'];
// -----------------------------------------------------------------------------

/** Returns the Waitlist sheet, creating it (with headers) if missing. */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Endpoint the landing page POSTs to. Appends one row per submission. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // avoid two submissions writing the same row

    var data = {};
    if (e && e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch (err) { data = {}; }
    }
    // also accept classic form-encoded params as a fallback
    if ((!data.name || !data.email) && e && e.parameter) {
      data.name  = data.name  || e.parameter.name;
      data.email = data.email || e.parameter.email;
    }

    var name  = String(data.name  || '').trim();
    var email = String(data.email || '').trim().toLowerCase();

    var validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    if (name.length < 2 || !validEmail) {
      return json_({ ok: false, error: 'invalid name or email' });
    }

    var sheet = getSheet_();

    // skip duplicate emails (case-insensitive)
    var existing = sheet.getLastRow() > 1
      ? sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).getValues()
      : [];
    for (var i = 0; i < existing.length; i++) {
      if (String(existing[i][0]).trim().toLowerCase() === email) {
        return json_({ ok: true, duplicate: true });
      }
    }

    sheet.appendRow([new Date(), name, email]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

/** Simple GET so you can confirm the web app is live in a browser. */
function doGet() {
  return json_({ ok: true, service: 'forklore-waitlist' });
}

/** Emails the full waitlist to RECIPIENT. Wired to a weekly Sunday trigger. */
function weeklyDigest() {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  var count = Math.max(0, lastRow - 1);

  var subject = 'ForkLore waitlist — ' + count + ' signups (' +
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM d, yyyy') + ')';

  var rowsHtml = '';
  var textLines = [];
  if (count > 0) {
    var values = sheet.getRange(2, 1, count, 3).getValues();
    for (var i = 0; i < values.length; i++) {
      var ts = values[i][0] instanceof Date
        ? Utilities.formatDate(values[i][0], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')
        : String(values[i][0]);
      var nm = String(values[i][1]);
      var em = String(values[i][2]);
      rowsHtml +=
        '<tr>' +
        '<td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;">' + (i + 1) + '</td>' +
        '<td style="padding:8px 12px;border-bottom:1px solid #eee;">' + escapeHtml_(nm) + '</td>' +
        '<td style="padding:8px 12px;border-bottom:1px solid #eee;">' + escapeHtml_(em) + '</td>' +
        '<td style="padding:8px 12px;border-bottom:1px solid #eee;color:#888;">' + ts + '</td>' +
        '</tr>';
      textLines.push((i + 1) + '. ' + nm + ' <' + em + '>  ' + ts);
    }
  }

  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#173044;">' +
    '<h2 style="margin:0 0 4px;">ForkLore waitlist</h2>' +
    '<p style="margin:0 0 16px;color:#55636F;">' + count + ' total signup' + (count === 1 ? '' : 's') + '.</p>' +
    (count > 0
      ? '<table style="border-collapse:collapse;font-size:14px;min-width:480px;">' +
        '<tr style="background:#FAF9F7;text-align:left;">' +
        '<th style="padding:8px 12px;border-bottom:2px solid #ddd;">#</th>' +
        '<th style="padding:8px 12px;border-bottom:2px solid #ddd;">Name</th>' +
        '<th style="padding:8px 12px;border-bottom:2px solid #ddd;">Email</th>' +
        '<th style="padding:8px 12px;border-bottom:2px solid #ddd;">Joined</th>' +
        '</tr>' + rowsHtml + '</table>'
      : '<p>No signups yet.</p>') +
    '</div>';

  var body = count > 0
    ? ('ForkLore waitlist — ' + count + ' signups\n\n' + textLines.join('\n'))
    : 'ForkLore waitlist — no signups yet.';

  var options = { subject: subject, body: body, htmlBody: html };
  if (CC && CC.trim()) options.cc = CC.trim();
  options.to = RECIPIENT;
  MailApp.sendEmail(options);
}

/** Run ONCE from the editor to schedule weeklyDigest() every Sunday ~8am. */
function setupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'weeklyDigest') {
      ScriptApp.deleteTrigger(triggers[i]); // avoid duplicates on re-run
    }
  }
  ScriptApp.newTrigger('weeklyDigest')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(8)
    .create();
}

// ---- helpers ----------------------------------------------------------------
function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml_(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
