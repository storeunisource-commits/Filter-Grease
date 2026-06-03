// gas/GetData.gs — All read/query functions

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
  const stopOrders = sheetToObjects('หยุดวิ่ง_Log');

  const blowDone = blowToday.filter(r => r.action_status === 'done').map(r => r.truck_no);
  const blowCalled = blowToday.filter(r => r.action_status === 'called').map(r => r.truck_no);

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
      },
      stop_orders: stopOrders.filter(r => r.approval_status === 'approved' && r.status !== 'completed')
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

  grease.forEach(r => {
    if (!fleet[r.truck_no]) return;
    const rnd = r.cycle === '10-15' ? '1' : r.cycle === '25-end' ? '2' : null;
    if (!rnd) return;
    const cur = fleet[r.truck_no].grease[rnd];
    if (!cur || priorityOf(r.action_status) > priorityOf(cur)) {
      fleet[r.truck_no].grease[rnd] = r.action_status;
    }
  });

  return { success: true, fleet, month_year: monthYear, trucks: trucks.map(t => ({ truck_no: t.truck_no, driver: t.driver, status: t.status })) };
}

function getNotifications(params, user) {
  const pending = [];
  const stopOrders = sheetToObjects('หยุดวิ่ง_Log');
  const warnings = sheetToObjects('เตือน_Log');

  if (user.role === 'admin') {
    const pendingApproval = stopOrders.filter(r => r.approval_status === 'pending_approval');
    if (pendingApproval.length > 0) pending.push({ type: 'stop_approval', title: 'ใบสั่งหยุดวิ่งรอ Approve ' + pendingApproval.length + ' ใบ', link: '#stoporder', count: pendingApproval.length });
    const pendingWL = warnings.filter(r => r.approval_status === 'pending');
    if (pendingWL.length > 0) pending.push({ type: 'warning_approval', title: 'หนังสือเตือนรอ Approve ' + pendingWL.length + ' ใบ', link: '#warningletter', count: pendingWL.length });
  }
  const pendingCompletion = stopOrders.filter(r => r.severity === 'stop_work' && r.approval_status === 'approved' && !r.completion_date);
  if (pendingCompletion.length > 0) pending.push({ type: 'completion', title: 'หยุดวิ่งรอบันทึกผล ' + pendingCompletion.length + ' ใบ', link: '#stoporder', count: pendingCompletion.length });

  return { success: true, items: pending, total: pending.reduce((s, i) => s + i.count, 0) };
}
