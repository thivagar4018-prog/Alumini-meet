/**
 * ============================================================================
 * ALUMNI MEET 2026 — REGISTRATION & FOOD TOKEN SYSTEM (v2)
 * Google Apps Script (Web App)
 * ============================================================================
 *
 * DEPLOYMENT STEPS:
 * ─────────────────
 * 1. Open your Google Sheet.
 * 2. Go to  Extensions → Apps Script.
 * 3. Delete ALL existing code and paste this entire file into Code.gs.
 * 4. Click  💾 Save  (Ctrl + S).
 * 5. Click  Deploy → New deployment.
 * 6. Select type  "Web app".
 * 7. Set:
 *      • Description  — "Alumni Meet Registration v2"
 *      • Execute as   — "Me"
 *      • Who has access — "Anyone"
 * 8. Click  Deploy  and authorize when prompted.
 * 9. Copy the  Web App URL  and share it.
 *
 * RE-DEPLOYING AFTER EDITS:
 *   Deploy → Manage deployments → ✏️ Edit → Version: "New version" → Deploy
 * ============================================================================
 */

/* ───────────────────────────── CONFIGURATION ────────────────────────────── */

var CONFIG = {
  SHEET_NAME: 'registration data',
  HEADERS: [
    'Timestamp',
    'Full Name',
    'Email',
    'Gender',
    'Phone Number',
    'WhatsApp Number',
    'Period of Study',
    'Degree',
    'Course / Branch',
    'Participation Type',
    'Spouse Name',
    'Number of Children',
    'Guests Bringing',
    'Total Person Count',
    'Food Preference',
    'Food Token',
    'Email Sent'
  ],
  COL_FOOD_TOKEN: 16,
  COL_EMAIL_SENT: 17,
  EVENT_NAME: 'Alumni Meet 2026',
  EVENT_DATE: 'Saturday, 15 August 2026',
  EVENT_TIME: '10:00 AM onwards',
  EVENT_VENUE: 'Main Auditorium & Campus Grounds, University of Excellence',
  CONTACT_EMAIL: 'alumni2026@university.edu',
  CONTACT_PHONE: '+91 98765 43210'
};

/* ═══════════════════════════════════════════════════════════════════════════
   doPost — Handles form submissions (POST requests)
   ═══════════════════════════════════════════════════════════════════════════ */

function doPost(e) {
  try {
    Logger.log('doPost called');

    // Guard: if called manually without event, return helpful message
    if (!e || !e.postData) {
      Logger.log('doPost called without event — use testRegistration() to test manually.');
      return buildResponse_({ status: 'info', message: 'Use testRegistration() to test. doPost requires a real HTTP POST request.' });
    }

    Logger.log('postData type: ' + e.postData.type);

    var payload;

    // Try parsing from postData.contents (works for JSON and text/plain)
    if (e.postData && e.postData.contents) {
      Logger.log('Raw contents: ' + e.postData.contents.substring(0, 200));
      payload = JSON.parse(e.postData.contents);
    }
    // Fallback: try e.parameter.data (for GET-style fallback)
    else if (e.parameter && e.parameter.data) {
      payload = JSON.parse(e.parameter.data);
    }
    else {
      Logger.log('No data received in doPost');
      return buildResponse_({ status: 'error', message: 'No data received.' });
    }

    return processRegistration_(payload);

  } catch (err) {
    Logger.log('doPost error: ' + err.message + '\n' + err.stack);
    return buildResponse_({ status: 'error', message: err.message });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   doGet — Fallback handler (GET requests) + health check
   ═══════════════════════════════════════════════════════════════════════════ */

function doGet(e) {
  try {
    Logger.log('doGet called');
    Logger.log('Parameters: ' + JSON.stringify(e.parameter));

    // If data parameter exists, process as registration
    if (e.parameter && e.parameter.data) {
      var payload = JSON.parse(decodeURIComponent(e.parameter.data));
      return processRegistration_(payload);
    }

    // Otherwise, health check
    return buildResponse_({
      status: 'success',
      message: 'Alumni Meet 2026 Registration API is live.',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    Logger.log('doGet error: ' + err.message);
    return buildResponse_({ status: 'error', message: err.message });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   processRegistration_ — Core registration logic
   ═══════════════════════════════════════════════════════════════════════════ */

function processRegistration_(payload) {
  Logger.log('Processing registration for: ' + (payload.fullName || 'unknown'));

  var data = {
    fullName:          payload.fullName          || '',
    email:             payload.email             || '',
    gender:            payload.gender            || '',
    phone:             payload.phone             || '',
    whatsapp:          payload.whatsapp          || payload.phone || '',
    periodOfStudy:     payload.periodOfStudy     || '',
    degreeStudy:       payload.degreeStudy       || '',
    courseStudy:       payload.courseStudy        || '',
    participationType: payload.participationType || '',
    spouseName:        payload.spouseName        || '',
    numChildren:       payload.numChildren       || 0,
    numGuests:         payload.numGuests          || 0,
    totalPersons:      payload.totalPersons      || 1,
    foodPreference:    payload.foodPreference    || 'vegetarian'
  };

  // Basic validation
  if (!data.fullName || !data.email) {
    return buildResponse_({ status: 'error', message: 'Name and Email are required.' });
  }

  // Get or create the sheet
  var sheet = getOrCreateSheet_();

  // Generate unique food token
  var foodToken = generateFoodToken_(data.foodPreference, data.totalPersons, sheet);
  Logger.log('Generated token: ' + foodToken);

  // Build and append the row
  var timestamp = new Date();
  var row = [
    timestamp,
    data.fullName,
    data.email,
    data.gender,
    data.phone,
    data.whatsapp,
    data.periodOfStudy,
    data.degreeStudy,
    data.courseStudy,
    data.participationType,
    data.spouseName,
    data.numChildren,
    data.numGuests,
    data.totalPersons,
    data.foodPreference,
    foodToken,
    ''
  ];
  sheet.appendRow(row);

  // Fix: set phone columns as plain text so +91... doesn't become #ERROR!
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 5).setNumberFormat('@STRING@').setValue(data.phone);
  sheet.getRange(lastRow, 6).setNumberFormat('@STRING@').setValue(data.whatsapp);
  Logger.log('Row appended, phone columns set to plain text');

  // Send confirmation email
  try {
    sendConfirmationEmail_(data, foodToken);
    sheet.getRange(lastRow, CONFIG.COL_EMAIL_SENT).setValue('Yes');
    Logger.log('Email sent successfully to ' + data.email);
  } catch (emailErr) {
    Logger.log('Email failed: ' + emailErr.message);
    sheet.getRange(lastRow, CONFIG.COL_EMAIL_SENT).setValue('Failed: ' + emailErr.message);
  }

  return buildResponse_({
    status: 'success',
    message: 'Registration successful!',
    foodToken: foodToken,
    totalPersons: data.totalPersons
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   generateFoodToken_ — Unique token generator
   Format: ALMN-{TYPE}-{YYYYMMDD}-{RANDOM5}-P{count}
   ═══════════════════════════════════════════════════════════════════════════ */

function generateFoodToken_(foodPreference, totalPersons, sheet) {
  var typeMap = {
    'vegetarian':    'VEG',
    'nonvegetarian': 'NVEG',
    'both':          'MIX'
  };
  var typeCode = typeMap[String(foodPreference).toLowerCase()] || 'VEG';
  var now = new Date();
  var dateStamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd');
  var personTag = 'P' + (totalPersons || 1);

  // Check existing tokens
  var existingTokens = {};
  try {
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var tokens = sheet.getRange(2, CONFIG.COL_FOOD_TOKEN, lastRow - 1, 1).getValues();
      for (var i = 0; i < tokens.length; i++) {
        if (tokens[i][0]) existingTokens[tokens[i][0]] = true;
      }
    }
  } catch (e) { /* ignore */ }

  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var token;
  var attempts = 0;

  do {
    var random = '';
    for (var i = 0; i < 5; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    token = 'ALMN-' + typeCode + '-' + dateStamp + '-' + random + '-' + personTag;
    attempts++;
  } while (existingTokens[token] && attempts < 50);

  return token;
}

/* ═══════════════════════════════════════════════════════════════════════════
   getOrCreateSheet_ — Ensures the registration sheet exists
   ═══════════════════════════════════════════════════════════════════════════ */

function getOrCreateSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    var headerRange = sheet.getRange(1, 1, 1, CONFIG.HEADERS.length);
    headerRange.setValues([CONFIG.HEADERS]);
    headerRange.setFontWeight('bold')
               .setBackground('#1a1a2e')
               .setFontColor('#f4c430')
               .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    for (var i = 1; i <= CONFIG.HEADERS.length; i++) {
      sheet.autoResizeColumn(i);
    }
    Logger.log('Created sheet: ' + CONFIG.SHEET_NAME);
  }

  return sheet;
}

/* ═══════════════════════════════════════════════════════════════════════════
   sendConfirmationEmail_ — HTML email with food token + QR code
   ═══════════════════════════════════════════════════════════════════════════ */

function sendConfirmationEmail_(data, foodToken) {
  var foodIcon, foodLabel, foodColor;
  switch (String(data.foodPreference).toLowerCase()) {
    case 'nonvegetarian':
      foodIcon = '🍖'; foodLabel = 'Non-Vegetarian'; foodColor = '#e05c5c'; break;
    case 'both':
      foodIcon = '🍽️'; foodLabel = 'Veg + Non-Veg';  foodColor = '#e0a050'; break;
    default:
      foodIcon = '🥬'; foodLabel = 'Vegetarian';      foodColor = '#4caf50'; break;
  }

  // Encode ONLY the food token in QR — short text = tiny QR = tiny HTML
  // Full details are shown in the email body below
  Logger.log('Generating QR code for token: ' + foodToken);
  var qrTableHtml = generateQRHtmlTable_(foodToken, 3, '#000000', '#ffffff');
  if (qrTableHtml) {
    Logger.log('QR HTML generated OK');
  } else {
    Logger.log('QR generation failed');
    qrTableHtml = '<div style="padding:8px;color:#333;font-size:11px;word-break:break-all;">' + foodToken + '</div>';
  }

  var htmlBody = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>'
    + '<body style="margin:0;padding:0;background:#0f0f1a;font-family:Segoe UI,Tahoma,sans-serif;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;"><tr><td align="center" style="padding:30px 15px;">'
    + '<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1a1a2e;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.4);">'

    // Header
    + '<tr><td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:40px 30px;text-align:center;border-bottom:3px solid #f4c430;">'
    + '<div style="font-size:40px;margin-bottom:8px;">🎓</div>'
    + '<h1 style="margin:0;color:#f4c430;font-size:26px;font-weight:700;letter-spacing:1px;">' + CONFIG.EVENT_NAME + '</h1>'
    + '<p style="margin:8px 0 0;color:#a0a0b8;font-size:14px;letter-spacing:2px;text-transform:uppercase;">Registration Confirmed</p>'
    + '</td></tr>'

    // Greeting
    + '<tr><td style="padding:30px 30px 10px;">'
    + '<p style="color:#e0e0e0;font-size:17px;margin:0;">Dear <strong style="color:#f4c430;">' + escapeHtml_(data.fullName) + '</strong>,</p>'
    + '<p style="color:#c0c0d0;font-size:15px;margin:12px 0 0;line-height:1.7;">Your registration for the <strong style="color:#fff;">' + CONFIG.EVENT_NAME + '</strong> has been confirmed! We\'re thrilled to welcome you back. 🎉</p>'
    + '</td></tr>'

    // Event Details
    + '<tr><td style="padding:20px 30px;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#16213e;border-radius:12px;border:1px solid #2a2a4a;"><tr><td style="padding:24px;">'
    + '<h2 style="margin:0 0 16px;color:#f4c430;font-size:16px;text-transform:uppercase;letter-spacing:2px;">📅 Event Details</h2>'
    + '<table width="100%" cellpadding="0" cellspacing="0">'
    + '<tr><td style="padding:8px 0;color:#a0a0b8;font-size:14px;width:90px;">Date</td><td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600;">' + CONFIG.EVENT_DATE + '</td></tr>'
    + '<tr><td style="padding:8px 0;color:#a0a0b8;font-size:14px;">Time</td><td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600;">' + CONFIG.EVENT_TIME + '</td></tr>'
    + '<tr><td style="padding:8px 0;color:#a0a0b8;font-size:14px;">Venue</td><td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600;">' + CONFIG.EVENT_VENUE + '</td></tr>'
    + '</table></td></tr></table>'
    + '</td></tr>'

    // ── FOOD TOKEN CARD WITH QR CODE
    + '<tr><td style="padding:10px 30px 20px;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1205,#1a1a2e);border-radius:16px;border:2px solid #f4c430;overflow:hidden;">'

    // Token card header
    + '<tr><td colspan="2" style="background:linear-gradient(90deg,#2a1f00,#1a1a2e);padding:14px 24px;border-bottom:1px solid rgba(244,196,48,0.3);text-align:center;">'
    + '<p style="margin:0;color:#a0a0b8;font-size:11px;text-transform:uppercase;letter-spacing:3px;">&#127915; Food Token</p>'
    + '<p style="margin:6px 0 0;font-size:20px;font-weight:800;color:#f4c430;letter-spacing:4px;font-family:Courier New,monospace;word-break:break-all;">' + foodToken + '</p>'
    + '</td></tr>'

    // QR code left | food details right
    + '<tr>'
    + '<td style="padding:20px 12px 20px 22px;vertical-align:middle;width:190px;text-align:center;">'
    + '<div style="background:#ffffff;padding:6px;border-radius:10px;display:inline-block;line-height:0;">'
    + qrTableHtml
    + '</div>'
    + '<p style="margin:8px 0 0;color:#808090;font-size:10px;">Scan at food counter</p>'
    + '</td>'
    + '<td style="padding:20px 22px 20px 12px;vertical-align:middle;">'
    + '<div style="font-size:42px;line-height:1;margin-bottom:10px;">' + foodIcon + '</div>'
    + '<p style="margin:0 0 4px;color:#a0a0b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Food Type</p>'
    + '<p style="margin:0 0 14px;color:' + foodColor + ';font-size:18px;font-weight:700;">' + foodLabel + '</p>'
    + '<p style="margin:0 0 4px;color:#a0a0b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Persons Covered</p>'
    + '<p style="margin:0 0 14px;color:#f4c430;font-size:30px;font-weight:800;">' + data.totalPersons + '</p>'
    + '<div style="background:rgba(244,196,48,0.08);border:1px solid rgba(244,196,48,0.2);border-radius:8px;padding:10px 12px;">'
    + '<p style="margin:0;color:#c0c0d0;font-size:12px;line-height:1.8;">'
    + '&#128100; ' + escapeHtml_(data.fullName) + '<br>'
    + '&#128241; ' + data.phone + '<br>'
    + '&#127891; ' + data.degreeStudy + ' | ' + data.courseStudy + '</p>'
    + '</div>'
    + '</td></tr>'

    // Token footer note
    + '<tr><td colspan="2" style="background:rgba(244,196,48,0.05);padding:10px 24px;border-top:1px solid rgba(244,196,48,0.15);text-align:center;">'
    + '<p style="margin:0;color:#808090;font-size:12px;">&#9888;&#65039; Show QR code OR token number at the food counter</p>'
    + '</td></tr>'
    + '</table></td></tr>'


    // Registration Summary
    + '<tr><td style="padding:10px 30px 20px;">'
    + '<h2 style="margin:0 0 16px;color:#f4c430;font-size:16px;text-transform:uppercase;letter-spacing:2px;">📋 Registration Summary</h2>'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#16213e;border-radius:12px;overflow:hidden;border:1px solid #2a2a4a;">'
    + summaryRow_('Full Name', data.fullName, false)
    + summaryRow_('Email', data.email, true)
    + summaryRow_('Phone', data.phone, false)
    + summaryRow_('Year / Batch', data.periodOfStudy, true)
    + summaryRow_('Degree', data.degreeStudy, false)
    + summaryRow_('Course / Branch', data.courseStudy, true)
    + summaryRow_('Participation', data.participationType, false)
    + summaryRow_('Total Persons', data.totalPersons, true)
    + summaryRow_('Food Preference', foodLabel, false)
    + '</table></td></tr>'

    // Important Notes
    + '<tr><td style="padding:10px 30px 20px;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1225;border-radius:12px;border:1px solid #3a2a4a;"><tr><td style="padding:24px;">'
    + '<h2 style="margin:0 0 14px;color:#f4c430;font-size:16px;text-transform:uppercase;letter-spacing:2px;">⚠️ Important Notes</h2>'
    + '<ul style="margin:0;padding:0 0 0 18px;color:#c0c0d0;font-size:14px;line-height:2;">'
    + '<li>Please <strong style="color:#fff;">show this food token</strong> at the food counter.</li>'
    + '<li>This token is valid for <strong style="color:#f4c430;">' + data.totalPersons + ' person(s)</strong>.</li>'
    + '<li>Please arrive at least <strong style="color:#fff;">15 minutes before</strong> the event.</li>'
    + '<li>Screenshot this email — you\'ll need the token at the venue.</li>'
    + '</ul></td></tr></table></td></tr>'

    // Footer
    + '<tr><td style="background:#0f0f1a;padding:28px 30px;text-align:center;border-top:1px solid #2a2a4a;">'
    + '<p style="margin:0 0 6px;color:#f4c430;font-size:14px;font-weight:600;">' + CONFIG.EVENT_NAME + ' — Organizing Committee</p>'
    + '<p style="margin:0 0 4px;color:#808090;font-size:13px;">📧 ' + CONFIG.CONTACT_EMAIL + '</p>'
    + '<p style="margin:0 0 12px;color:#808090;font-size:13px;">📞 ' + CONFIG.CONTACT_PHONE + '</p>'
    + '<p style="margin:0;color:#505060;font-size:11px;">This is an automated confirmation email.</p>'
    + '</td></tr>'

    + '</table></td></tr></table></body></html>';

  var subject = '🎓 ' + CONFIG.EVENT_NAME + ' — Registration Confirmed! | Token: ' + foodToken;

  MailApp.sendEmail({
    to: data.email,
    subject: subject,
    htmlBody: htmlBody,
    name: CONFIG.EVENT_NAME + ' Committee',
    replyTo: CONFIG.CONTACT_EMAIL
  });

  Logger.log('Email sent to ' + data.email);
}

/* ═══════════════════════════════════════════════════════════════════════════
   sendTokenToExistingRegistrations — Batch utility (run manually)
   ═══════════════════════════════════════════════════════════════════════════ */

function sendTokenToExistingRegistrations() {
  var sheet = getOrCreateSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) { Logger.log('No data rows.'); return; }

  var allRows = sheet.getRange(2, 1, lastRow - 1, CONFIG.HEADERS.length).getValues();
  var processed = 0, skipped = 0;

  for (var i = 0; i < allRows.length; i++) {
    var row = allRows[i];
    var rowNum = i + 2;
    var data = {
      fullName: row[1] || '', email: row[2] || '', gender: row[3] || '',
      phone: row[4] || '', whatsapp: row[5] || '',
      periodOfStudy: row[6] || '', degreeStudy: row[7] || '', courseStudy: row[8] || '',
      participationType: row[9] || '', spouseName: row[10] || '',
      numChildren: row[11] || 0, numGuests: row[12] || 0,
      totalPersons: row[13] || 1, foodPreference: row[14] || 'vegetarian'
    };

    var foodToken = row[15] || '';
    var emailSent = String(row[16]).trim().toLowerCase();

    if (!data.email) { skipped++; continue; }

    if (!foodToken) {
      foodToken = generateFoodToken_(data.foodPreference, data.totalPersons, sheet);
      sheet.getRange(rowNum, CONFIG.COL_FOOD_TOKEN).setValue(foodToken);
    }

    if (emailSent !== 'yes') {
      try {
        sendConfirmationEmail_(data, foodToken);
        sheet.getRange(rowNum, CONFIG.COL_EMAIL_SENT).setValue('Yes');
        processed++;
      } catch (err) {
        sheet.getRange(rowNum, CONFIG.COL_EMAIL_SENT).setValue('Failed');
        Logger.log('Row ' + rowNum + ' failed: ' + err.message);
      }
    } else { skipped++; }

    Utilities.sleep(500);
  }

  Logger.log('Done. Processed: ' + processed + ', Skipped: ' + skipped);
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEST FUNCTION — Run this to verify the script works
   ═══════════════════════════════════════════════════════════════════════════ */

function testRegistration() {
  var testData = {
    fullName: 'Test User',
    email: Session.getActiveUser().getEmail(),
    gender: 'Male',
    phone: '+91 98765 43210',
    whatsapp: '+91 98765 43210',
    periodOfStudy: '2015 - 2019',
    degreeStudy: 'B.Tech',
    courseStudy: 'Computer Science & Engineering',
    participationType: 'individual',
    spouseName: '',
    numChildren: 0,
    numGuests: 0,
    totalPersons: 1,
    foodPreference: 'vegetarian'
  };

  var result = processRegistration_(testData);
  Logger.log('Test result: ' + result.getContent());
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

function buildResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function summaryRow_(label, value, alt) {
  var bg = alt ? '#1b2540' : '#16213e';
  return '<tr><td style="padding:12px 16px;color:#a0a0b8;font-size:13px;border-bottom:1px solid #2a2a4a;background:' + bg + ';width:40%;">'
    + escapeHtml_(String(label)) + '</td><td style="padding:12px 16px;color:#fff;font-size:13px;font-weight:500;border-bottom:1px solid #2a2a4a;background:' + bg + ';">'
    + escapeHtml_(String(value)) + '</td></tr>';
}

function escapeHtml_(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
