// Filter-Grease Google Apps Script Backend
// Spreadsheet ID: 1C2mnhCwD6TpJYHRXTJGqdwv9HI7qI_MuI-6fB3D-gSM

const SPREADSHEET_ID = '1C2mnhCwD6TpJYHRXTJGqdwv9HI7qI_MuI-6fB3D-gSM';
const DRIVE_FOLDER_ID = '1UgW-5nwAU5cY-pe-R6kd_NFFMlYure5y';
const TOKEN_EXPIRY_HOURS = 24;

const THAI_MONTHS_GAS = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

// ==================== MAIN HANDLERS ====================

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  try {
    initSheets();
    let params = {};
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      params = e.parameter;
    }
    const action = params.action;

    if (action === 'login') return respond(login(params));

    const user = verifyToken(params.token);
    if (!user) return respond({ success: false, error: 'Unauthorized' });

    switch (action) {
      case 'gettrucks':        return respond(getTrucks());
      case 'saveblow':         return respond(saveBlow(params, user));
      case 'savegreasing':     return respond(saveGreasing(params, user));
      case 'savedrain':        return respond(saveDrain(params, user));
      case 'savecall':         return respond(saveCall(params, user));
      case 'saveviolation':    return respond(saveViolation(params, user));
      case 'savereport':       return respond(saveReport(params, user));
      case 'uploadimage':      return respond(uploadImage(params, user));
      case 'gethistory':       return respond(getHistory(params));
      case 'getstats':         return respond(getStats(params));
      case 'getdashboardfull': return respond(getDashboardFull(params));
      case 'getcompare':       return respond(getCompare(params));
      case 'getviolations':    return respond(getViolations(params));
      case 'getreporthistory': return respond(getReportHistory());
      case 'getfleetstatus':  return respond(getFleetStatus(params));
      case 'getusers':         return respond(getUsers(user));
      case 'adduser':          return respond(addUser(params, user));
      case 'deleteuser':       return respond(deleteUser(params, user));
      case 'resetpassword':    return respond(resetPassword(params, user));
      case 'updatetruck':      return respond(updateTruck(params, user));
      case 'issuestoporder':   return respond(issueStopOrder(params, user));
      case 'getstoporders':    return respond(getStopOrders(params));
      case 'updatestoporder':  return respond(updateStopOrder(params, user));
      case 'approvestoporder': return respond(approveStopOrder(params, user));
      default: return respond({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return respond({ success: false, error: err.toString() });
  }
}

function respond(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ==================== SHEET INIT ====================

const SHEET_HEADERS = {
  'รถ_Master':     ['truck_no','driver','status','type','active'],
  'Users':         ['username','password_hash','role','display_name','active'],
  'เป่ากรอง_Log':  ['timestamp','date','truck_no','driver','status','action_status','action_datetime','week','note','image_url','recorded_by'],
  'อัดจาระบี_Log': ['timestamp','date','truck_no','driver','status','action_status','action_datetime','cycle','month_year','note','image_url','recorded_by'],
  'เดรนน้ำ_Log':   ['timestamp','date','truck_no','driver','status','action_status','action_datetime','week','note','image_url','recorded_by'],
  'โทรตาม_Log':    ['timestamp','date','truck_no','driver','task_type','call_result','note','called_by'],
  'ละเลย_Log':     ['timestamp','date','truck_no','driver','task_type','cycle','violation_type','penalty','recorded_by'],
  'รายงาน_Log':    ['timestamp','report_type','report_cycle','week','month_year','sent_date','sent_by','on_time','note'],
  'หยุดวิ่ง_Log':  ['timestamp','order_no','issue_date','truck_no','driver','reason_type','reason_detail','severity','status','acknowledged_at','completed_at','issued_by','approval_status','approved_by','approved_at','approval_evidence_url','signature_url','vio_count']
};

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
      headers.forEach((h, i) => {
        if (!existing.includes(h)) {
          const col = sheet.getLastColumn() + 1;
          sheet.getRange(1, col).setValue(h).setFontWeight('bold')
            .setBackground('#1a3a5c').setFontColor('white');
        }
      });
    }
  }
}

function seedTrucks(sheet) {
  const trucks = [
    ['รถน้ำ','เอ็ม','ใช้งาน','รถน้ำ',true],
    ['01','บาส','ใช้งาน','รถทั่วไป',true],['02','กร','ใช้งาน','รถทั่วไป',true],
    ['03','-','ใช้งาน','รถทั่วไป',true],['04','-','ใช้งาน','รถทั่วไป',true],
    ['05','-','ใช้งาน','รถทั่วไป',true],['06','หนุ่ย','ใช้งาน','รถทั่วไป',true],
    ['07','-','ใช้งาน','รถทั่วไป',true],['08','-','ใช้งาน','รถทั่วไป',true],
    ['09','-','ใช้งาน','รถทั่วไป',true],['010','เล็ก','ใช้งาน','รถทั่วไป',true],
    ['011','-','ใช้งาน','รถทั่วไป',true],
    ['U-01','เปลี่ยว','ใช้งาน','รถทั่วไป',true],['U-02','พงษ์','ใช้งาน','รถทั่วไป',true],
    ['U-03','วุ่ฒิ','ใช้งาน','รถทั่วไป',true],['U-04','บูม','ใช้งาน','รถทั่วไป',true],
    ['U-05','จิตร','ใช้งาน','รถทั่วไป',true],['U-06','เจน','ใช้งาน','รถทั่วไป',true],
    ['U-07','กอล์ฟ','ใช้งาน','รถทั่วไป',true],['U-08','จ่อย','ใช้งาน','รถทั่วไป',true],
    ['U-09','น้าวัฒน์','ใช้งาน','รถทั่วไป',true],['U-010','ตรี','ใช้งาน','รถทั่วไป',true],
    ['U-12','ดำ','ใช้งาน','รถทั่วไป',true],['U-13','แพร','ใช้งาน','รถทั่วไป',true],
    ['U-14','อ้วน','ใช้งาน','รถทั่วไป',true],['U-15','แต้ม','ใช้งาน','รถทั่วไป',true],
    ['U-16','ขิง','ใช้งาน','รถทั่วไป',true],['U-17','-','ใช้งาน','รถทั่วไป',true],
    ['U-18','เหว่า','ใช้งาน','รถทั่วไป',true],['U-19','-','ใช้งาน','รถทั่วไป',true],
    ['U-20','นิค','ใช้งาน','รถทั่วไป',true],['U-21','เปา','ใช้งาน','รถทั่วไป',true],
    ['M1','แมคโค','ใช้งาน','แมคโค',true]
  ];
  trucks.forEach(r => sheet.appendRow(r));
}

function seedAdmin(sheet) {
  sheet.appendRow(['admin', hashPassword('admin1234'), 'admin', 'ผู้ดูแลระบบ', true]);
}

// ==================== AUTH ====================

function hashPassword(pw) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pw, Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function createToken(user) {
  const payload = { u: user.username, r: user.role, n: user.display_name, e: Date.now() + TOKEN_EXPIRY_HOURS * 3600000 };
  return Utilities.base64Encode(JSON.stringify(payload));
}

function verifyToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString());
    if (payload.e < Date.now()) return null;
    return { username: payload.u, role: payload.r, display_name: payload.n };
  } catch (e) { return null; }
}

function login(params) {
  const { username, password } = params;
  if (!username || !password) return { success: false, error: 'กรุณากรอก username และ password' };
  const data = sheetToObjects('Users');
  const hash = hashPassword(password);
  const user = data.find(r => r.username === username && r.password_hash === hash && r.active !== false && r.active !== 'FALSE');
  if (!user) return { success: false, error: 'username หรือ password ไม่ถูกต้อง' };
  const u = { username, role: user.role, display_name: user.display_name };
  return { success: true, token: createToken(u), user: u };
}

// ==================== TRUCKS ====================

function getTrucks() {
  const trucks = sheetToObjects('รถ_Master').filter(r => r.active !== false && r.active !== 'FALSE');
  return { success: true, trucks };
}

function updateTruck(params, user) {
  if (user.role !== 'admin') return { success: false, error: 'ไม่มีสิทธิ์' };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('รถ_Master');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const truckIdx = headers.indexOf('truck_no');
  for (let i = 1; i < data.length; i++) {
    if (data[i][truckIdx] === params.truck_no) {
      if (params.driver !== undefined) sheet.getRange(i+1, headers.indexOf('driver')+1).setValue(params.driver);
      if (params.status !== undefined) sheet.getRange(i+1, headers.indexOf('status')+1).setValue(params.status);
      return { success: true };
    }
  }
  return { success: false, error: 'ไม่พบรถ' };
}

// ==================== IMAGE UPLOAD ====================

function uploadImage(params, user) {
  const { base64, mimeType, truck_no, task_type, date } = params;
  if (!base64) return { success: false, error: 'ไม่มีข้อมูลรูปภาพ' };
  try {
    const root = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const dateObj = new Date(date || new Date());
    const thaiYear = String(dateObj.getFullYear() + 543);
    const monthNum = String(dateObj.getMonth() + 1).padStart(2, '0');
    const monthLabel = monthNum + '-' + THAI_MONTHS_GAS[dateObj.getMonth() + 1];
    const yearFolder = getOrCreateFolder(root, thaiYear);
    const monthFolder = getOrCreateFolder(yearFolder, monthLabel);
    const taskFolder = getOrCreateFolder(monthFolder, task_type || 'ทั่วไป');
    const files = taskFolder.getFiles();
    let count = 0;
    while (files.hasNext()) { files.next(); count++; }
    const seq = String(count + 1).padStart(3, '0');
    const ext = (mimeType || 'image/jpeg').split('/')[1] || 'jpg';
    const safeTruck = (truck_no || 'unknown').replace(/[^a-zA-Z0-9\-]/g, '');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const newFilename = seq + '_' + safeTruck + '_' + thaiYear + '-' + monthNum + '-' + day + '.' + ext;
    const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType || 'image/jpeg', newFilename);
    const file = taskFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { success: true, url: 'https://drive.google.com/uc?id=' + file.getId(), filename: newFilename };
  } catch (err) {
    return { success: false, error: 'อัปโหลดรูปไม่สำเร็จ: ' + err.toString() };
  }
}

function getOrCreateFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

// ==================== SAVE LOGS ====================

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

function saveBlow(params, user) {
  const { record, date } = params;
  if (!record) return { success: false, error: 'Invalid data' };
  const ts = new Date().toISOString();
  const week = getWeekOfMonthGAS(new Date(date || ts));
  const headers = SHEET_HEADERS['เป่ากรอง_Log'];
  appendLog('เป่ากรอง_Log', headers, [
    ts, date, record.truck_no, record.driver, record.status,
    record.action_status, record.action_datetime || ts,
    week, record.note || '', record.image_url || '', user.display_name
  ]);
  return { success: true };
}

function saveGreasing(params, user) {
  const { record, date, cycle, month_year } = params;
  if (!record) return { success: false, error: 'Invalid data' };
  const ts = new Date().toISOString();
  const headers = SHEET_HEADERS['อัดจาระบี_Log'];
  appendLog('อัดจาระบี_Log', headers, [
    ts, date, record.truck_no, record.driver, record.status,
    record.action_status, record.action_datetime || ts,
    cycle, month_year, record.note || '', record.image_url || '', user.display_name
  ]);
  return { success: true };
}

function saveDrain(params, user) {
  const { record, date } = params;
  if (!record) return { success: false, error: 'Invalid data' };
  const ts = new Date().toISOString();
  const week = getWeekOfMonthGAS(new Date(date || ts));
  const headers = SHEET_HEADERS['เดรนน้ำ_Log'];
  appendLog('เดรนน้ำ_Log', headers, [
    ts, date, record.truck_no, record.driver, record.status,
    record.action_status, record.action_datetime || ts,
    week, record.note || '', record.image_url || '', user.display_name
  ]);
  return { success: true };
}

function saveCall(params, user) {
  const ts = new Date().toISOString();
  const headers = SHEET_HEADERS['โทรตาม_Log'];
  appendLog('โทรตาม_Log', headers, [
    ts, ts.split('T')[0], params.truck_no, params.driver,
    params.task_type, params.call_result, params.note || '', user.display_name
  ]);
  return { success: true };
}

function saveViolation(params, user) {
  const ts = new Date().toISOString();
  const headers = SHEET_HEADERS['ละเลย_Log'];
  appendLog('ละเลย_Log', headers, [
    ts, ts.split('T')[0], params.truck_no, params.driver,
    params.task_type, params.cycle, params.violation_type, params.penalty, user.display_name
  ]);
  return { success: true };
}

function saveReport(params, user) {
  const ts = new Date().toISOString();
  const headers = SHEET_HEADERS['รายงาน_Log'];
  appendLog('รายงาน_Log', headers, [
    ts, params.report_type || 'blow_drain', params.report_cycle,
    params.week || '', params.month_year, params.sent_date,
    user.display_name, params.on_time ? 'Y' : 'N', params.note || ''
  ]);
  return { success: true };
}

// ==================== GET DATA ====================

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

function getHistory(params) {
  const { type, year, month } = params;
  const sheetMap = { blow:'เป่ากรอง_Log', grease:'อัดจาระบี_Log', drain:'เดรนน้ำ_Log', call:'โทรตาม_Log' };
  const sheetName = sheetMap[type] || 'เป่ากรอง_Log';
  let records = sheetToObjects(sheetName);
  if (year && month) {
    const prefix = year + '-' + String(month).padStart(2, '0');
    records = records.filter(r => r.date && r.date.toString().startsWith(prefix));
  } else if (year) {
    records = records.filter(r => r.date && r.date.toString().startsWith(year + '-'));
  }
  return { success: true, records: records.slice(-300) };
}

function getStats(params) {
  const today = params.date || new Date().toISOString().split('T')[0];
  const trucks = sheetToObjects('รถ_Master').filter(r => r.active !== false && r.active !== 'FALSE');
  const total = trucks.length;
  const activeTrucks = trucks.filter(t => t.status === 'ใช้งาน').length;

  const blowToday = sheetToObjects('เป่ากรอง_Log').filter(r => r.date === today);
  const drainToday = sheetToObjects('เดรนน้ำ_Log').filter(r => r.date === today);
  const now = new Date();
  const monthYear = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  const greaseAll = sheetToObjects('อัดจาระบี_Log').filter(r => r.month_year === monthYear);

  return {
    success: true,
    stats: {
      total_trucks: total,
      active_trucks: activeTrucks,
      blow_done: blowToday.filter(r => r.action_status === 'done').length,
      blow_called: blowToday.filter(r => r.action_status === 'called').length,
      blow_not_done: blowToday.filter(r => r.action_status === 'not_done').length,
      drain_done: drainToday.filter(r => r.action_status === 'done').length,
      grease_r1_done: greaseAll.filter(r => r.cycle === '10-15' && r.action_status === 'done').length,
      grease_r2_done: greaseAll.filter(r => r.cycle === '25-end' && r.action_status === 'done').length,
      today: today,
      month_year: monthYear
    }
  };
}

function getDashboardFull(params) {
  const today = params.date || new Date().toISOString().split('T')[0];
  const monthYear = today.substring(0, 7);

  const trucks = sheetToObjects('รถ_Master').filter(r => r.active !== false && r.active !== 'FALSE');
  const blowToday = sheetToObjects('เป่ากรอง_Log').filter(r => r.date === today);
  const drainToday = sheetToObjects('เดรนน้ำ_Log').filter(r => r.date === today);
  const greaseMonth = sheetToObjects('อัดจาระบี_Log').filter(r => r.month_year === monthYear);
  const violations = sheetToObjects('ละเลย_Log');
  const reports = sheetToObjects('รายงาน_Log');

  // Pending trucks (called but not done today)
  const blowCalled = blowToday.filter(r => r.action_status === 'called').map(r => r.truck_no);
  const blowDone = blowToday.filter(r => r.action_status === 'done').map(r => r.truck_no);
  const blowNotDone = blowToday.filter(r => r.action_status === 'not_done').map(r => r.truck_no);

  return {
    success: true,
    data: {
      stats: {
        total: trucks.length,
        blow_done: blowDone.length,
        blow_called: blowCalled.length,
        drain_done: drainToday.filter(r => r.action_status === 'done').length,
        grease_r1_done: greaseMonth.filter(r => r.cycle === '10-15' && r.action_status === 'done').length,
        grease_r2_done: greaseMonth.filter(r => r.cycle === '25-end' && r.action_status === 'done').length
      },
      trucks: trucks,
      blow_today: blowToday,
      drain_today: drainToday,
      grease_month: greaseMonth,
      violations_summary: violations.reduce((acc, r) => {
        acc[r.truck_no] = (acc[r.truck_no] || 0) + 1;
        return acc;
      }, {}),
      report_status: {
        blow_drain_this_month: reports.filter(r => r.report_type === 'blow_drain' && r.month_year === monthYear),
        grease_this_month: reports.filter(r => r.report_type === 'grease' && r.month_year === monthYear)
      }
    }
  };
}

function getCompare(params) {
  const { month1, month2 } = params;
  if (!month1 || !month2) return { success: false, error: 'ต้องระบุ 2 เดือนที่จะเปรียบเทียบ' };

  function getMonthStats(monthYear) {
    const blow = sheetToObjects('เป่ากรอง_Log').filter(r => r.date && r.date.toString().startsWith(monthYear));
    const drain = sheetToObjects('เดรนน้ำ_Log').filter(r => r.date && r.date.toString().startsWith(monthYear));
    const grease = sheetToObjects('อัดจาระบี_Log').filter(r => r.month_year === monthYear);
    const vio = sheetToObjects('ละเลย_Log').filter(r => r.date && r.date.toString().startsWith(monthYear));
    return {
      month_year: monthYear,
      blow_done: blow.filter(r => r.action_status === 'done').length,
      blow_total: blow.length,
      drain_done: drain.filter(r => r.action_status === 'done').length,
      drain_total: drain.length,
      grease_r1_done: grease.filter(r => r.cycle === '10-15' && r.action_status === 'done').length,
      grease_r2_done: grease.filter(r => r.cycle === '25-end' && r.action_status === 'done').length,
      violations: vio.length
    };
  }
  return { success: true, compare: { m1: getMonthStats(month1), m2: getMonthStats(month2) } };
}

function getViolations(params) {
  let records = sheetToObjects('ละเลย_Log');
  if (params && params.truck_no) records = records.filter(r => r.truck_no === params.truck_no);
  if (params && params.year && params.month) {
    const prefix = params.year + '-' + String(params.month).padStart(2,'0');
    records = records.filter(r => r.date && r.date.toString().startsWith(prefix));
  }
  return { success: true, records };
}

function getReportHistory() {
  return { success: true, records: sheetToObjects('รายงาน_Log') };
}

function getFleetStatus(params) {
  const monthYear = params.month_year || currentMonthYearGAS();
  const trucks = sheetToObjects('รถ_Master').filter(r => r.active !== false && r.active !== 'FALSE');
  const blow  = sheetToObjects('เป่ากรอง_Log').filter(r => r.date && r.date.toString().startsWith(monthYear));
  const drain = sheetToObjects('เดรนน้ำ_Log').filter(r => r.date && r.date.toString().startsWith(monthYear));
  const grease = sheetToObjects('อัดจาระบี_Log').filter(r => r.month_year === monthYear);

  const fleet = {};
  trucks.forEach(t => {
    fleet[t.truck_no] = { driver: t.driver, blow: {}, drain: {}, grease: {} };
  });

  // blow & drain — จัดกลุ่มตาม week (1-4) ใช้สถานะที่ดีที่สุด
  [blow, drain].forEach((logs, li) => {
    const key = li === 0 ? 'blow' : 'drain';
    logs.forEach(r => {
      if (!fleet[r.truck_no]) return;
      const w = String(r.week || '?');
      const cur = fleet[r.truck_no][key][w];
      if (!cur || priorityOf(r.action_status) > priorityOf(cur)) {
        fleet[r.truck_no][key][w] = r.action_status;
      }
    });
  });

  // grease — จัดกลุ่มตาม cycle: '10-15'=R1, '25-end'=R2
  grease.forEach(r => {
    if (!fleet[r.truck_no]) return;
    const rnd = r.cycle === '10-15' ? '1' : r.cycle === '25-end' ? '2' : null;
    if (!rnd) return;
    const cur = fleet[r.truck_no].grease[rnd];
    if (!cur || priorityOf(r.action_status) > priorityOf(cur)) {
      fleet[r.truck_no].grease[rnd] = r.action_status;
    }
  });

  return { success: true, fleet, month_year: monthYear, trucks: trucks.map(t => ({ truck_no: t.truck_no, driver: t.driver })) };
}

function priorityOf(s) {
  if (s === 'done') return 3;
  if (s === 'called') return 2;
  if (s === 'not_done') return 1;
  return 0;
}

function currentMonthYearGAS() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

// ==================== STOP WORK ORDER ====================

function issueStopOrder(params, user) {
  if (user.role !== 'admin' && user.role !== 'operator')
    return { success: false, error: 'ไม่มีสิทธิ์' };
  const { truck_no, driver, reason_type, reason_detail, severity, vio_count } = params;
  if (!truck_no || !reason_type) return { success: false, error: 'ข้อมูลไม่ครบ' };

  const ts = new Date().toISOString();
  const issueDate = ts.substring(0, 10);

  // สร้าง order_no แบบ SW-YYYYMM-NNN
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('หยุดวิ่ง_Log');
  const lastRow = sheet.getLastRow();
  const seq = String(Math.max(lastRow, 1)).padStart(3, '0');
  const ym = issueDate.substring(0, 7).replace('-', '');
  const order_no = 'SW-' + ym + '-' + seq;

  // Operator ต้องรอ Admin approve, Admin ออกเองได้เลย
  const approvalStatus = user.role === 'admin' ? 'approved' : 'pending_approval';
  const approvedBy = user.role === 'admin' ? (user.display_name || user.username) : '';
  const approvedAt = user.role === 'admin' ? ts : '';

  const headers = SHEET_HEADERS['หยุดวิ่ง_Log'];
  appendLog('หยุดวิ่ง_Log', headers, [
    ts, order_no, issueDate, truck_no, driver || '',
    reason_type, reason_detail || '', severity || 'stop_work',
    'pending', '', '', user.display_name || user.username,
    approvalStatus, approvedBy, approvedAt, '', '', vio_count || 0
  ]);
  return { success: true, order_no, approval_status: approvalStatus };
}

function getStopOrders(params) {
  let records = sheetToObjects('หยุดวิ่ง_Log');
  if (params && params.truck_no) records = records.filter(r => r.truck_no === params.truck_no);
  if (params && params.status) records = records.filter(r => r.status === params.status);
  return { success: true, records };
}

function updateStopOrder(params, user) {
  if (user.role !== 'admin' && user.role !== 'operator')
    return { success: false, error: 'ไม่มีสิทธิ์' };
  const { order_no, status } = params;
  if (!order_no || !status) return { success: false, error: 'ข้อมูลไม่ครบ' };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('หยุดวิ่ง_Log');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const orderNoIdx = headers.indexOf('order_no');
  const statusIdx = headers.indexOf('status');
  const ackIdx = headers.indexOf('acknowledged_at');
  const compIdx = headers.indexOf('completed_at');

  for (let i = 1; i < data.length; i++) {
    if (data[i][orderNoIdx] === order_no) {
      sheet.getRange(i + 1, statusIdx + 1).setValue(status);
      const now = new Date().toISOString();
      if (status === 'acknowledged') sheet.getRange(i + 1, ackIdx + 1).setValue(now);
      if (status === 'completed') sheet.getRange(i + 1, compIdx + 1).setValue(now);
      return { success: true };
    }
  }
  return { success: false, error: 'ไม่พบ order_no' };
}

function approveStopOrder(params, user) {
  if (user.role !== 'admin') return { success: false, error: 'ต้องเป็น admin เท่านั้น' };
  const { order_no, approval_status, approval_evidence_url, signature_url } = params;
  if (!order_no || !approval_status) return { success: false, error: 'ข้อมูลไม่ครบ' };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('หยุดวิ่ง_Log');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = (h) => headers.indexOf(h);

  for (let i = 1; i < data.length; i++) {
    if (data[i][idx('order_no')] === order_no) {
      const now = new Date().toISOString();
      sheet.getRange(i+1, idx('approval_status')+1).setValue(approval_status);
      sheet.getRange(i+1, idx('approved_by')+1).setValue(user.display_name || user.username);
      sheet.getRange(i+1, idx('approved_at')+1).setValue(now);
      if (approval_evidence_url) sheet.getRange(i+1, idx('approval_evidence_url')+1).setValue(approval_evidence_url);
      if (signature_url) sheet.getRange(i+1, idx('signature_url')+1).setValue(signature_url);
      return { success: true };
    }
  }
  return { success: false, error: 'ไม่พบ order_no' };
}

// ==================== USER MANAGEMENT ====================

function getUsers(user) {
  if (user.role !== 'admin') return { success: false, error: 'ไม่มีสิทธิ์' };
  const users = sheetToObjects('Users').map(u => ({
    username: u.username, role: u.role, display_name: u.display_name, active: u.active
  }));
  return { success: true, users };
}

function addUser(params, user) {
  if (user.role !== 'admin') return { success: false, error: 'ไม่มีสิทธิ์' };
  const { username, password, role, display_name } = params;
  if (!username || !password) return { success: false, error: 'ข้อมูลไม่ครบ' };
  const existing = sheetToObjects('Users').find(r => r.username === username);
  if (existing) return { success: false, error: 'username นี้มีอยู่แล้ว' };
  const validRoles = ['admin','operator','viewer'];
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  ss.getSheetByName('Users').appendRow([
    username, hashPassword(password), validRoles.includes(role) ? role : 'operator',
    display_name || username, true
  ]);
  return { success: true };
}

function deleteUser(params, user) {
  if (user.role !== 'admin') return { success: false, error: 'ไม่มีสิทธิ์' };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const usernameIdx = headers.indexOf('username');
  const activeIdx = headers.indexOf('active');
  for (let i = 1; i < data.length; i++) {
    if (data[i][usernameIdx] === params.username) {
      sheet.getRange(i+1, activeIdx+1).setValue(false);
      return { success: true };
    }
  }
  return { success: false, error: 'ไม่พบ user' };
}

function resetPassword(params, user) {
  if (user.role !== 'admin') return { success: false, error: 'ไม่มีสิทธิ์' };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const usernameIdx = headers.indexOf('username');
  const pwIdx = headers.indexOf('password_hash');
  for (let i = 1; i < data.length; i++) {
    if (data[i][usernameIdx] === params.username) {
      sheet.getRange(i+1, pwIdx+1).setValue(hashPassword(params.new_password));
      return { success: true };
    }
  }
  return { success: false, error: 'ไม่พบ user' };
}

// ==================== UTILITIES ====================

function getWeekOfMonthGAS(date) {
  const day = date.getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}
