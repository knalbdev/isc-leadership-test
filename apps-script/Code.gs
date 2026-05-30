/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  ISC Leadership Test — Google Apps Script Backend           ║
 * ║  Data disimpan di Google Spreadsheet.                       ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  SETUP INSTRUCTIONS:                                        ║
 * ║                                                             ║
 * ║  1. Buka https://sheets.google.com → buat spreadsheet baru  ║
 * ║     dengan nama: "ISC Leadership Test 2026/2027"            ║
 * ║                                                             ║
 * ║  2. Klik menu Extensions → Apps Script                      ║
 * ║                                                             ║
 * ║  3. Hapus semua kode default, paste seluruh file ini        ║
 * ║                                                             ║
 * ║  4. Klik tombol 💾 (Save), beri nama project: "ISC-API"    ║
 * ║                                                             ║
 * ║  5. Klik Deploy → New Deployment                            ║
 * ║     - Type: Web app                                         ║
 * ║     - Execute as: Me                                        ║
 * ║     - Who has access: Anyone                                ║
 * ║     → Klik Deploy → Authorize → Allow                      ║
 * ║                                                             ║
 * ║  6. Copy "Deployment URL" yang diberikan                    ║
 * ║     Bentuknya: https://script.google.com/macros/s/xxx/exec  ║
 * ║                                                             ║
 * ║  7. Buka web ISC Leadership Test                            ║
 * ║     → Klik ⚙ Settings di header                           ║
 * ║     → Paste URL tersebut → Simpan                          ║
 * ║                                                             ║
 * ║  NOTE: Setiap kali mengubah kode ini, harus Deploy ulang    ║
 * ║  dengan "New Deployment" (bukan edit existing deployment).  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ── Constants ─────────────────────────────────────────────────────────────
const SHEET_NAME = 'ISC_Scores';
const HEADERS    = [
  'id', 'name', 'level', 'groupId', 'groupName',
  'status', 'inisiatif', 'keputusan', 'menggerakkan', 'komunikasi', 'integritas',
  'totalNilai', 'catatan', 'savedAt',
];

// ── Sheet helper ──────────────────────────────────────────────────────────
function getOrCreateSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);

    // Header row styling
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    sheet.appendRow(HEADERS);
    headerRange.setValues([HEADERS]);
    headerRange
      .setFontWeight('bold')
      .setBackground('#0f766e')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);

    // Column widths
    const widths = [5, 30, 7, 8, 14, 14, 10, 10, 14, 11, 45, 22];
    widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w * 7));
  }

  return sheet;
}

// ── CORS response helper ──────────────────────────────────────────────────
function respond(data, callback) {
  const json = JSON.stringify(data);

  if (callback) {
    // JSONP mode — works around browser CORS for <script> tag requests
    return ContentService
      .createTextOutput(`${callback}(${json})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Read all entries ──────────────────────────────────────────────────────
function getAllEntries(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return {};

  const headers = values[0];
  const result  = {};

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[0] && row[0] !== 0) continue; // skip truly empty rows

    const entry = {};
    headers.forEach((h, j) => {
      entry[h] = row[j] === '' ? null : row[j];
    });

    // Coerce numeric fields
    ['id', 'groupId', 'inisiatif', 'keputusan', 'menggerakkan', 'komunikasi', 'integritas', 'totalNilai'].forEach(k => {
      if (entry[k] !== null) entry[k] = Number(entry[k]);
    });

    result[entry.id] = entry;
  }

  return result;
}

// ── Save or update one entry ──────────────────────────────────────────────
function saveEntry(sheet, entry) {
  const values  = sheet.getDataRange().getValues();
  const headers = values[0];

  // Build row array in header order
  const newRow = HEADERS.map(h => {
    if (entry[h] === undefined || entry[h] === null) return '';
    return entry[h];
  });

  // Check if row with same id already exists → update in place
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(entry.id)) {
      sheet.getRange(i + 1, 1, 1, HEADERS.length).setValues([newRow]);
      return;
    }
  }

  // Otherwise append new row
  sheet.appendRow(newRow);
}

// ── doGet handler ─────────────────────────────────────────────────────────
function doGet(e) {
  const action   = (e.parameter.action || 'getAll');
  const callback = e.parameter.callback || null;

  try {
    const sheet = getOrCreateSheet();

    if (action === 'ping') {
      return respond({ status: 'ok', message: 'Connected!', timestamp: new Date().toISOString() }, callback);
    }

    if (action === 'getAll') {
      const data = getAllEntries(sheet);
      return respond({ status: 'ok', data }, callback);
    }

    if (action === 'save') {
      const rawData = e.parameter.data;
      if (!rawData) return respond({ status: 'error', message: 'Missing data param' }, callback);

      // Decode base64 → UTF-8 → JSON
      const decoded  = Utilities.newBlob(Utilities.base64Decode(rawData)).getDataAsString();
      const entry    = JSON.parse(decoded);
      saveEntry(sheet, entry);
      return respond({ status: 'ok' }, callback);
    }

    if (action === 'resetAll') {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
      return respond({ status: 'ok', message: 'All entries deleted' }, callback);
    }

    return respond({ status: 'error', message: `Unknown action: ${action}` }, callback);

  } catch (err) {
    return respond({ status: 'error', message: err.toString() }, callback);
  }
}

// ── doPost handler (optional POST fallback) ───────────────────────────────
function doPost(e) {
  try {
    const sheet = getOrCreateSheet();
    const entry = JSON.parse(e.postData.contents);
    saveEntry(sheet, entry);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
