/**
 * ForkLore waitlist backend — Google Apps Script.
 *
 * What it does:
 *   1. doPost()        -> receives {name, email} from the landing page form,
 *                         appends a row to the Google Sheet, and emails the new
 *                         signup a welcome message (with the WhatsApp invite).
 *   2. weeklyDigest()  -> runs every Sunday, emails the full list to RECIPIENT.
 *   3. setupTrigger()  -> run ONCE by hand to schedule the Sunday email.
 *
 * Deploy steps are in DEPLOY.md.
 */

// ---- Config -----------------------------------------------------------------
var RECIPIENT  = 'chethanvalukuru@gmail.com';       // where the weekly list is sent
var CC         = 'kcmiruthularani2003@gmail.com';   // cofounders CC'd (comma-separate for more)
var SHEET_NAME = 'Waitlist';                         // tab name inside the spreadsheet
var HEADERS    = ['Timestamp', 'Name', 'Email'];

// Welcome email
var BRAND         = 'The ForkLore';
var SENDER        = 'theforklore.in@gmail.com';      // must be a verified "send mail as"
                                                     // alias on the account running this script
var WHATSAPP_LINK = 'https://chat.whatsapp.com/GvDj8SzE1y74BXTba77PVZ?s=sh&p=a&mlu=4&ilr=4';
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

/** Endpoint the landing page POSTs to. Appends a row + sends a welcome email. */
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

    // skip duplicate emails (case-insensitive) — no second welcome email
    var existing = sheet.getLastRow() > 1
      ? sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).getValues()
      : [];
    for (var i = 0; i < existing.length; i++) {
      if (String(existing[i][0]).trim().toLowerCase() === email) {
        return json_({ ok: true, duplicate: true });
      }
    }

    sheet.appendRow([new Date(), name, email]);

    // Welcome email — never let a mail failure break the signup.
    try { sendWelcome_(name, email); } catch (mailErr) {}

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

/** Sends the branded welcome email to a new signup. */
function sendWelcome_(name, email) {
  var first = escapeHtml_((name.split(' ')[0] || 'there'));
  var link = escapeHtml_(WHATSAPP_LINK);
  var subject = 'Welcome to ' + BRAND;

  var html =
    '<div style="background:#FAF9F7;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">' +
        '<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border:1px solid #ECE6DD;border-radius:14px;overflow:hidden;">' +
          '<tr><td style="background:#173044;padding:22px 32px;">' +
            '<span style="font-family:Georgia,\'Times New Roman\',serif;font-size:22px;color:#F8F4F0;letter-spacing:.3px;">The ForkLore</span>' +
          '</td></tr>' +
          '<tr><td style="padding:32px;">' +
            '<p style="margin:0 0 16px;font-size:16px;color:#173044;">Hi ' + first + ',</p>' +
            '<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#3A4C5E;">Thank you for joining <strong>' + BRAND + '</strong> waitlist &mdash; we&rsquo;re glad to have you.</p>' +
            '<p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#3A4C5E;">We&rsquo;re building a nutrition system that turns your goal into planned, portion-controlled meals &mdash; so you can stop deciding what to eat and just follow one clear plan.</p>' +
            '<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#3A4C5E;">As an early member, we&rsquo;d love to have you in our community. Join our WhatsApp group for launch updates, early access, and a direct line to the team:</p>' +
            '<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#25D366;">' +
              '<a href="' + link + '" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">Join our WhatsApp group &rarr;</a>' +
            '</td></tr></table>' +
            '<p style="margin:24px 0 0;font-size:15px;line-height:1.65;color:#3A4C5E;">We&rsquo;ll be in touch soon.</p>' +
            '<p style="margin:18px 0 0;font-size:15px;color:#173044;">Warm regards,<br><strong>The ForkLore team</strong></p>' +
          '</td></tr>' +
          '<tr><td style="padding:16px 32px;border-top:1px solid #ECE6DD;background:#FAF9F7;">' +
            '<p style="margin:0;font-size:12px;line-height:1.5;color:#8A94A0;">You&rsquo;re receiving this because you joined the ForkLore waitlist.</p>' +
          '</td></tr>' +
        '</table>' +
      '</td></tr></table>' +
    '</div>';

  var plain =
    'Hi ' + (name.split(' ')[0] || 'there') + ',\n\n' +
    'Thank you for joining The ForkLore waitlist — we\'re glad to have you.\n\n' +
    'We\'re building a nutrition system that turns your goal into planned, portion-controlled meals, so you can stop deciding what to eat and just follow one clear plan.\n\n' +
    'As an early member, we\'d love to have you in our community. Join our WhatsApp group for launch updates, early access, and a direct line to the team:\n\n' +
    WHATSAPP_LINK + '\n\n' +
    'We\'ll be in touch soon.\n\n' +
    'Warm regards,\nThe ForkLore team';

  var options = { htmlBody: html, name: BRAND, replyTo: SENDER };
  // Send AS the brand address only if it's a verified alias on this account;
  // otherwise fall back to the owner address so the signup never fails.
  try {
    var aliases = GmailApp.getAliases();
    if (aliases && aliases.indexOf(SENDER) !== -1) options.from = SENDER;
  } catch (aliasErr) {}

  GmailApp.sendEmail(email, subject, plain, options);
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

/** Optional: send yourself the welcome email to preview it. Run from the editor. */
function previewWelcome() {
  sendWelcome_('Preview', RECIPIENT);
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
