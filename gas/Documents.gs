// gas/Documents.gs — Stop orders and warning letters

function issueStopOrder(params, user) {
  if (user.role !== 'admin' && user.role !== 'operator')
    return { success: false, error: 'ไม่มีสิทธิ์' };
  const { truck_no, driver, reason_type, reason_detail, severity, vio_count } = params;
  if (!truck_no || !reason_type) return { success: false, error: 'ข้อมูลไม่ครบ' };

  const ts = new Date().toISOString();
  const issueDate = ts.substring(0, 10);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('หยุดวิ่ง_Log');
  const lastRow = sheet.getLastRow();
  const seq = String(Math.max(lastRow, 1)).padStart(3, '0');
  const ym = issueDate.substring(0, 7).replace('-', '');
  const order_no = 'SW-' + ym + '-' + seq;

  const approvalStatus = user.role === 'admin' ? 'approved' : 'pending_approval';
  const approvedBy = user.role === 'admin' ? (user.display_name || user.username) : '';
  const approvedAt = user.role === 'admin' ? ts : '';

  const headers = SHEET_HEADERS['หยุดวิ่ง_Log'];
  appendLog('หยุดวิ่ง_Log', headers, [
    ts, order_no, issueDate, truck_no, driver || '',
    reason_type, reason_detail || '', severity || 'stop_work',
    'pending', '', '', user.display_name || user.username,
    approvalStatus, approvedBy, approvedAt, '', '', vio_count || 0,
    '', '', '', ''
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

function recordCompletion(params, user) {
  const { order_no, completion_date, completion_notes, completion_images, completed_by } = params;
  if (!order_no) return { success: false, error: 'ต้องระบุ order_no' };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('หยุดวิ่ง_Log');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = (h) => headers.indexOf(h);
  for (let i = 1; i < data.length; i++) {
    if (data[i][idx('order_no')] === order_no) {
      sheet.getRange(i+1, idx('completion_date')+1).setValue(completion_date || new Date().toISOString().split('T')[0]);
      sheet.getRange(i+1, idx('completion_notes')+1).setValue(completion_notes || '');
      sheet.getRange(i+1, idx('completion_images')+1).setValue(JSON.stringify(completion_images || []));
      sheet.getRange(i+1, idx('completed_by')+1).setValue(completed_by || user.display_name);
      sheet.getRange(i+1, idx('status')+1).setValue('completed');
      return { success: true };
    }
  }
  return { success: false, error: 'ไม่พบ order' };
}

function getWarningLetters(params) {
  let records = sheetToObjects('เตือน_Log');
  if (params && params.truck_no) records = records.filter(r => r.truck_no === params.truck_no);
  if (params && params.status) records = records.filter(r => r.status === params.status);
  return { success: true, records };
}

function approveWarningLetter(params, user) {
  if (user.role !== 'admin') return { success: false, error: 'ต้องเป็น admin' };
  const { letter_no, signature_url, ack_status, ack_date, ack_by } = params;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('เตือน_Log');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = (h) => headers.indexOf(h);
  for (let i = 1; i < data.length; i++) {
    if (data[i][idx('letter_no')] === letter_no) {
      // Approve flow
      if (ack_status === undefined) {
        sheet.getRange(i+1, idx('approval_status')+1).setValue('approved');
        sheet.getRange(i+1, idx('status')+1).setValue('approved');
        // เก็บ signature_url เฉพาะเมื่อสั้นพอ (< 40000 chars) ป้องกัน cell overflow
        if (signature_url && signature_url.length < 40000) {
          sheet.getRange(i+1, idx('signature_url')+1).setValue(signature_url);
        }
      }
      // Acknowledgment flow — บันทึกการรับทราบของคนขับ
      if (ack_status === 'acknowledged') {
        const ackIdx = idx('ack_status');
        const ackDateIdx = idx('ack_date');
        const ackByIdx = idx('ack_by');
        if (ackIdx >= 0) sheet.getRange(i+1, ackIdx+1).setValue('acknowledged');
        if (ackDateIdx >= 0) sheet.getRange(i+1, ackDateIdx+1).setValue(ack_date || new Date().toISOString().split('T')[0]);
        if (ackByIdx >= 0) sheet.getRange(i+1, ackByIdx+1).setValue(ack_by || user.display_name);
      }
      return { success: true };
    }
  }
  return { success: false, error: 'ไม่พบ letter_no' };
}
