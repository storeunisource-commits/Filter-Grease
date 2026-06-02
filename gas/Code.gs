// Filter-Grease Google Apps Script Backend
// Spreadsheet ID: 1C2mnhCwD6TpJYHRXTJGqdwv9HI7qI_MuI-6fB3D-gSM

const SPREADSHEET_ID = '1C2mnhCwD6TpJYHRXTJGqdwv9HI7qI_MuI-6fB3D-gSM';
const TOKEN_EXPIRY_HOURS = 24;
const SECRET = 'fg_secret_2569'; // change in production

// ==================== MAIN HANDLERS ====================

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    initSheets();

    let params = {};
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      params = e.parameter;
    }

    const action = params.action;

    // Public endpoints
    if (action === 'login') {
      return respond(login(params), headers);
    }

    // Protected endpoints - verify token
    const token = params.token;
    const user = verifyToken(token);
    if (!user) {
      return respond({ success: false, error: 'Unauthorized' }, headers);
    }

    switch (action) {
      case 'gettrucks': return respond(getTrucks(), headers);
      case 'saveblow': return respond(saveBlow(params, user), headers);
      case 'savegreasing': return respond(saveGreasing(params, user), headers);
      case 'savedrain': return respond(saveDrain(params, user), headers);
      case 'savecall': return respond(saveCall(params, user), headers);
      case 'saveviolation': return respond(saveViolation(params, user), headers);
      case 'savereport': return respond(saveReport(params, user), headers);
      case 'gethistory': return respond(getHistory(params), headers);
      case 'getstats': return respond(getStats(params), headers);
      case 'getviolations': return respond(getViolations(params), headers);
      case 'getreporthistory': return respond(getReportHistory(), headers);
      case 'getusers': return respond(getUsers(user), headers);
      case 'adduser': return respond(addUser(params, user), headers);
      case 'deleteuser': return respond(deleteUser(params, user), headers);
      case 'resetpassword': return respond(resetPassword(params, user), headers);
      default: return respond({ success: false, error: 'Unknown action' }, headers);
    }
  } catch (err) {
    return respond({ success: false, error: err.toString() }, headers);
  }
}

function respond(data, headers) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ==================== SHEET INIT ====================

function initSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const sheets = {
    'รถ_Master': ['truck_no', 'driver', 'status', 'type', 'active'],
    'Users': ['username', 'password_hash', 'role', 'display_name', 'active'],
    'เป่ากรอง_Log': ['timestamp', 'date', 'truck_no', 'driver', 'status', 'done', 'note', 'recorded_by'],
    'อัดจาระบี_Log': ['timestamp', 'date', 'truck_no', 'driver', 'status', 'done', 'cycle', 'month_year', 'note', 'recorded_by'],
    'เดรนน้ำ_Log': ['timestamp', 'date', 'truck_no', 'driver', 'status', 'done', 'note', 'recorded_by'],
    'โทรตาม_Log': ['timestamp', 'date', 'truck_no', 'driver', 'task_type', 'call_result', 'note', 'called_by'],
    'ละเลย_Log': ['timestamp', 'date', 'truck_no', 'driver', 'task_type', 'cycle', 'violation_type', 'penalty', 'recorded_by'],
    'รายงาน_Log': ['timestamp', 'report_cycle', 'month_year', 'sent_date', 'sent_by', 'on_time', 'note']
  };

  for (const [name, headers] of Object.entries(sheets)) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a3a5c').setFontColor('white');

      // Seed initial data
      if (name === 'รถ_Master') seedTrucks(sheet);
      if (name === 'Users') seedAdmin(sheet);
    }
  }
}

function seedTrucks(sheet) {
  const trucks = [
    ['รถน้ำ', 'เอ็ม', 'ใช้งาน', 'รถน้ำ', true],
    ['01', 'บาส', 'ใช้งาน', 'รถทั่วไป', true],
    ['02', 'กร', 'ใช้งาน', 'รถทั่วไป', true],
    ['03', '-', 'ใช้งาน', 'รถทั่วไป', true],
    ['04', '-', 'ใช้งาน', 'รถทั่วไป', true],
    ['05', '-', 'ใช้งาน', 'รถทั่วไป', true],
    ['06', 'หนุ่ย', 'ใช้งาน', 'รถทั่วไป', true],
    ['07', '-', 'ใช้งาน', 'รถทั่วไป', true],
    ['08', '-', 'ใช้งาน', 'รถทั่วไป', true],
    ['09', '-', 'ใช้งาน', 'รถทั่วไป', true],
    ['010', 'เล็ก', 'ใช้งาน', 'รถทั่วไป', true],
    ['011', '-', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-01', 'เปลี่ยว', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-02', 'พงษ์', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-03', 'วุ่ฒิ', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-04', 'บูม', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-05', 'จิตร', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-06', 'เจน', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-07', 'กอล์ฟ', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-08', 'จ่อย', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-09', 'น้าวัฒน์', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-010', 'ตรี', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-12', 'ดำ', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-13', 'แพร', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-14', 'อ้วน', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-15', 'แต้ม', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-16', 'ขิง', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-17', '-', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-18', 'เหว่า', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-19', '-', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-20', 'นิค', 'ใช้งาน', 'รถทั่วไป', true],
    ['U-21', 'เปา', 'ใช้งาน', 'รถทั่วไป', true],
    ['M1', 'แมคโค', 'ใช้งาน', 'แมคโค', true]
  ];
  trucks.forEach(row => sheet.appendRow(row));
}

function seedAdmin(sheet) {
  const pwHash = hashPassword('admin1234');
  sheet.appendRow(['admin', pwHash, 'admin', 'ผู้ดูแลระบบ', true]);
}

// ==================== AUTH ====================

function hashPassword(pw) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pw, Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function createToken(user) {
  const payload = {
    u: user.username,
    r: user.role,
    n: user.display_name,
    e: Date.now() + TOKEN_EXPIRY_HOURS * 3600 * 1000
  };
  return Utilities.base64Encode(JSON.stringify(payload));
}

function verifyToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString());
    if (payload.e < Date.now()) return null;
    return { username: payload.u, role: payload.r, display_name: payload.n };
  } catch (e) {
    return null;
  }
}

function login(params) {
  const { username, password } = params;
  if (!username || !password) return { success: false, error: 'กรุณากรอก username และ password' };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const idx = { username: 0, password_hash: 1, role: 2, display_name: 3, active: 4 };
  const hash = hashPassword(password);

  for (const row of rows) {
    if (row[idx.username] === username && row[idx.password_hash] === hash && row[idx.active] !== false) {
      const user = { username, role: row[idx.role], display_name: row[idx.display_name] };
      return { success: true, token: createToken(user), user };
    }
  }
  return { success: false, error: 'username หรือ password ไม่ถูกต้อง' };
}

// ==================== TRUCKS ====================

function getTrucks() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('รถ_Master');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const trucks = rows
    .filter(r => r[4] !== false && r[4] !== 'FALSE' && r[4] !== false)
    .map(r => ({
      truck_no: r[0], driver: r[1], status: r[2], type: r[3], active: r[4]
    }));
  return { success: true, trucks };
}

// ==================== SAVE LOGS ====================

function appendLog(sheetName, row) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  sheet.appendRow(row);
}

function saveBlow(params, user) {
  const { records, date } = params;
  if (!records || !Array.isArray(records)) return { success: false, error: 'Invalid data' };
  const ts = new Date().toISOString();
  records.forEach(r => {
    appendLog('เป่ากรอง_Log', [ts, date, r.truck_no, r.driver, r.status, r.done ? 'Y' : 'N', r.note || '', user.display_name]);
  });
  return { success: true, count: records.length };
}

function saveGreasing(params, user) {
  const { records, date, cycle, month_year } = params;
  if (!records || !Array.isArray(records)) return { success: false, error: 'Invalid data' };
  const ts = new Date().toISOString();
  records.forEach(r => {
    appendLog('อัดจาระบี_Log', [ts, date, r.truck_no, r.driver, r.status, r.done ? 'Y' : 'N', cycle, month_year, r.note || '', user.display_name]);
  });
  return { success: true, count: records.length };
}

function saveDrain(params, user) {
  const { records, date } = params;
  if (!records || !Array.isArray(records)) return { success: false, error: 'Invalid data' };
  const ts = new Date().toISOString();
  records.forEach(r => {
    appendLog('เดรนน้ำ_Log', [ts, date, r.truck_no, r.driver, r.status, r.done ? 'Y' : 'N', r.note || '', user.display_name]);
  });
  return { success: true, count: records.length };
}

function saveCall(params, user) {
  const { truck_no, driver, task_type, call_result, note } = params;
  const ts = new Date().toISOString();
  const date = ts.split('T')[0];
  appendLog('โทรตาม_Log', [ts, date, truck_no, driver, task_type, call_result, note || '', user.display_name]);
  return { success: true };
}

function saveViolation(params, user) {
  const { truck_no, driver, task_type, cycle, violation_type, penalty } = params;
  const ts = new Date().toISOString();
  const date = ts.split('T')[0];
  appendLog('ละเลย_Log', [ts, date, truck_no, driver, task_type, cycle, violation_type, penalty, user.display_name]);
  return { success: true };
}

function saveReport(params, user) {
  const { report_cycle, month_year, sent_date, on_time, note } = params;
  const ts = new Date().toISOString();
  appendLog('รายงาน_Log', [ts, report_cycle, month_year, sent_date, user.display_name, on_time ? 'Y' : 'N', note || '']);
  return { success: true };
}

// ==================== GET DATA ====================

function sheetToObjects(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function getHistory(params) {
  const { type, month_year } = params;
  const sheetMap = {
    blow: 'เป่ากรอง_Log',
    grease: 'อัดจาระบี_Log',
    drain: 'เดรนน้ำ_Log',
    call: 'โทรตาม_Log'
  };
  const sheetName = sheetMap[type] || 'เป่ากรอง_Log';
  let records = sheetToObjects(sheetName);
  if (month_year) {
    records = records.filter(r => r.month_year === month_year || (r.date && r.date.toString().startsWith(month_year)));
  }
  return { success: true, records: records.slice(-200) };
}

function getStats(params) {
  const today = params.date || new Date().toISOString().split('T')[0];
  const blowRecords = sheetToObjects('เป่ากรอง_Log').filter(r => r.date === today);
  const drainRecords = sheetToObjects('เดรนน้ำ_Log').filter(r => r.date === today);
  const trucks = sheetToObjects('รถ_Master').filter(r => r.active !== false && r.active !== 'FALSE');

  const blowDone = blowRecords.filter(r => r.done === 'Y').length;
  const drainDone = drainRecords.filter(r => r.done === 'Y').length;

  // Greasing this month
  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const greaseRecords = sheetToObjects('อัดจาระบี_Log').filter(r => r.month_year === monthYear);
  const grease1Done = greaseRecords.filter(r => r.cycle === '10-15' && r.done === 'Y').length;
  const grease2Done = greaseRecords.filter(r => r.cycle === '25-end' && r.done === 'Y').length;

  return {
    success: true,
    stats: {
      total_trucks: trucks.length,
      blow_done: blowDone,
      drain_done: drainDone,
      grease_r1_done: grease1Done,
      grease_r2_done: grease2Done,
      today: today
    }
  };
}

function getViolations(params) {
  const records = sheetToObjects('ละเลย_Log');
  return { success: true, records };
}

function getReportHistory() {
  const records = sheetToObjects('รายงาน_Log');
  return { success: true, records };
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

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  const existing = data.slice(1).find(r => r[0] === username);
  if (existing) return { success: false, error: 'username นี้มีอยู่แล้ว' };

  sheet.appendRow([username, hashPassword(password), role || 'operator', display_name || username, true]);
  return { success: true };
}

function deleteUser(params, user) {
  if (user.role !== 'admin') return { success: false, error: 'ไม่มีสิทธิ์' };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === params.username) {
      sheet.getRange(i + 1, 5).setValue(false); // deactivate
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

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === params.username) {
      sheet.getRange(i + 1, 2).setValue(hashPassword(params.new_password));
      return { success: true };
    }
  }
  return { success: false, error: 'ไม่พบ user' };
}
