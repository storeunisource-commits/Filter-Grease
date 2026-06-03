// gas/Sheets.gs — Sheet definitions, init, and core helpers

const SHEET_HEADERS = {
  'รถ_Master':     ['truck_no','driver','status','type','active'],
  'Users':         ['username','password_hash','role','display_name','active'],
  'เป่ากรอง_Log':  ['timestamp','date','truck_no','driver','status','action_status','action_datetime','week','note','image_url','recorded_by'],
  'อัดจาระบี_Log': ['timestamp','date','truck_no','driver','status','action_status','action_datetime','cycle','month_year','note','image_url','recorded_by'],
  'เดรนน้ำ_Log':   ['timestamp','date','truck_no','driver','status','action_status','action_datetime','week','note','image_url','recorded_by'],
  'โทรตาม_Log':    ['timestamp','date','truck_no','driver','task_type','call_result','note','called_by'],
  'ละเลย_Log':     ['timestamp','date','truck_no','driver','task_type','cycle','violation_type','penalty','note','recorded_by'],
  'รายงาน_Log':    ['timestamp','report_type','report_cycle','week','month_year','sent_date','sent_by','on_time','note'],
  'หยุดวิ่ง_Log':  ['timestamp','order_no','issue_date','truck_no','driver','reason_type','reason_detail','severity','status','acknowledged_at','completed_at','issued_by','approval_status','approved_by','approved_at','approval_evidence_url','signature_url','vio_count','completion_date','completion_notes','completion_images','completed_by'],
  'เตือน_Log':     ['timestamp','letter_no','issue_date','truck_no','driver','level','violation_count','reason','cycle','issued_by','approval_status','signature_url','status']
};

function sheetToObjects(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const tz = Session.getScriptTimeZone();
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let v = row[i];
      // Google Sheets returns date cells as Date objects — convert to YYYY-MM-DD string
      if (v instanceof Date && !isNaN(v.getTime())) {
        v = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
      }
      obj[h] = v;
    });
    return obj;
  });
}

function appendLog(sheetName, headers, values) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  const sheetHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheetHeaders.map(h => {
    const idx = headers.indexOf(h);
    return idx >= 0 ? (values[idx] !== undefined ? values[idx] : '') : '';
  });
  sheet.appendRow(row);
}

function initSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  for (const [name, headers] of Object.entries(SHEET_HEADERS)) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(headers);
      sheet.getRange(1,1,1,headers.length).setFontWeight('bold')
        .setBackground('#1a3a5c').setFontColor('white');
      if (name === 'รถ_Master') seedTrucks(sheet);
      if (name === 'Users') seedAdmin(sheet);
    } else {
      // Migrate: add missing columns to existing sheets
      const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      headers.forEach((h) => {
        if (!existing.includes(h)) {
          const col = sheet.getLastColumn() + 1;
          sheet.getRange(1, col).setValue(h).setFontWeight('bold')
            .setBackground('#1a3a5c').setFontColor('white');
        }
      });
    }
  }
}

function getOrCreateFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function seedAdmin(sheet) {
  sheet.appendRow(['admin', hashPassword('admin1234'), 'admin', 'ผู้ดูแลระบบ', true]);
}

function getWeekOfMonthGAS(date) {
  const day = date.getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

function currentMonthYearGAS() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function priorityOf(s) {
  if (s === 'done') return 3;
  if (s === 'called') return 2;
  if (s === 'not_done') return 1;
  return 0;
}
