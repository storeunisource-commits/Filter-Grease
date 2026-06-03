// gas/Users.gs — User management

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

function updateUser(params, user) {
  if (user.role !== 'admin') return { success: false, error: 'ไม่มีสิทธิ์' };
  const { username, display_name, role, active } = params;
  if (!username) return { success: false, error: 'ต้องระบุ username' };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const uIdx = headers.indexOf('username');
  const dnIdx = headers.indexOf('display_name');
  const rIdx = headers.indexOf('role');
  const aIdx = headers.indexOf('active');
  for (let i = 1; i < data.length; i++) {
    if (data[i][uIdx] === username) {
      if (display_name !== undefined) sheet.getRange(i+1, dnIdx+1).setValue(display_name);
      if (role !== undefined) sheet.getRange(i+1, rIdx+1).setValue(role);
      if (active !== undefined) sheet.getRange(i+1, aIdx+1).setValue(active);
      return { success: true };
    }
  }
  return { success: false, error: 'ไม่พบ user' };
}
