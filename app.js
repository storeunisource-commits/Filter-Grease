// app.js — Filter-Grease SPA Router + Utilities

// ==================== THAI DATE UTILITIES ====================

const THAI_MONTHS = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const THAI_MONTHS_SHORT = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function getLastDayOfMonth(year, month) {
  // month is 1-12
  return new Date(year, month, 0).getDate();
}

function getGreaseCycle(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = d.getDate();
  const lastDay = getLastDayOfMonth(d.getFullYear(), d.getMonth() + 1);
  if (day >= 10 && day <= 15) return '10-15';
  if (day >= 25 && day <= lastDay) return '25-end';
  return null;
}

function isGreaseWarning(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = d.getDate();
  if (day === 8 || day === 9) return 'warning1';
  if (day === 23 || day === 24) return 'warning2';
  return false;
}

function formatThaiDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth() + 1];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}

function formatThaiMonth(month, year) {
  // month 1-12, year CE
  return `${THAI_MONTHS[month]} ${year + 543}`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentMonthYear() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getNextGreaseCycle() {
  const d = new Date();
  const day = d.getDate();
  const lastDay = getLastDayOfMonth(d.getFullYear(), d.getMonth() + 1);
  const monthStr = formatThaiMonth(d.getMonth() + 1, d.getFullYear());
  if (day < 10) return `วันที่ 10-15 ${monthStr}`;
  if (day > 15 && day < 25) return `วันที่ 25-${lastDay} ${monthStr}`;
  // past end of month cycle
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `วันที่ 10-15 ${formatThaiMonth(next.getMonth() + 1, next.getFullYear())}`;
}

function getReportDeadline(cycle, month, year) {
  // cycle: 1 or 2, returns {deadline, label}
  if (cycle === 1) {
    return { deadline: new Date(year, month - 1, 20), label: `ภายในวันที่ 20 ${THAI_MONTHS_SHORT[month]} ${year + 543}` };
  } else {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return { deadline: new Date(nextYear, nextMonth - 1, 5), label: `ภายในวันที่ 5 ${THAI_MONTHS_SHORT[nextMonth]} ${nextYear + 543}` };
  }
}

// ==================== UI HELPERS ====================

function showLoading(container) {
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>กำลังโหลด...</p></div>';
}

function showError(container, msg) {
  container.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
}

function setButtonLoading(btn, loading) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.textContent = 'กำลังบันทึก...';
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || 'บันทึก';
  }
}

function createStatusBadge(status) {
  const cls = status === 'ใช้งาน' ? 'badge-green' : status === 'จอดซ่อม' ? 'badge-red' : 'badge-orange';
  return `<span class="badge ${cls}">${status}</span>`;
}

// Routing is handled in index.html inline script
// Expose globals for use in view scripts (no module system needed in legacy views)
window.APP = {
  getTrucks, saveBlow, saveGreasing, saveDrain, saveCall, saveViolation,
  saveReport, getHistory, getStats, getViolations, getReportHistory,
  getUsers, addUser, deleteUser, resetPassword,
  login, logout, isLoggedIn, getUserInfo,
  getGreaseCycle, isGreaseWarning, formatThaiDate, formatThaiMonth,
  todayISO, currentMonthYear, getLastDayOfMonth, getNextGreaseCycle,
  getReportDeadline, THAI_MONTHS, THAI_MONTHS_SHORT,
  showLoading, showError, setButtonLoading, createStatusBadge
};
