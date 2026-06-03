// gas/SaveLogs.gs — All save/log functions

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

function saveViolation(params, user) {
  const ts = new Date().toISOString();
  const headers = SHEET_HEADERS['ละเลย_Log'];
  appendLog('ละเลย_Log', headers, [
    ts, ts.split('T')[0], params.truck_no, params.driver,
    params.task_type, params.cycle, params.violation_type, params.penalty,
    params.note || '', user.display_name
  ]);

  // Count ALL previous violations for this truck (not just this month)
  const allVios = sheetToObjects('ละเลย_Log').filter(r => r.truck_no === params.truck_no);
  const vioCount = allVios.length; // AFTER save, so count includes current
  const level = vioCount >= 3 ? 3 : vioCount;

  // Auto-create warning letter
  const wlTs = new Date().toISOString();
  const wlDate = wlTs.substring(0, 10);
  const wlSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('เตือน_Log');
  const wlSeq = String(Math.max(wlSheet.getLastRow(), 1)).padStart(3, '0');
  const letterNo = 'WL-' + wlDate.substring(0, 7).replace('-', '') + '-' + wlSeq;
  appendLog('เตือน_Log', SHEET_HEADERS['เตือน_Log'], [
    wlTs, letterNo, wlDate, params.truck_no, params.driver,
    level, vioCount, params.violation_type || '', params.cycle || '',
    user.display_name || user.username, 'pending', '', 'pending'
  ]);

  // Auto-create stop order if level 3+
  let autoOrderNo = '';
  if (level >= 3) {
    const soSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('หยุดวิ่ง_Log');
    const soSeq = String(Math.max(soSheet.getLastRow(), 1)).padStart(3, '0');
    autoOrderNo = 'SW-' + wlDate.substring(0, 7).replace('-', '') + '-' + soSeq;
    appendLog('หยุดวิ่ง_Log', SHEET_HEADERS['หยุดวิ่ง_Log'], [
      wlTs, autoOrderNo, wlDate, params.truck_no, params.driver,
      'accumulated_violations', 'ละเลยสะสม ' + vioCount + ' ครั้ง', 'stop_and_call',
      'pending', '', '', user.display_name, 'pending', '', '', '', '', vioCount,
      '', '', '', ''
    ]);
  }

  return { success: true, letter_no: letterNo, level, auto_stop_order: autoOrderNo || null, vio_count: vioCount };
}
