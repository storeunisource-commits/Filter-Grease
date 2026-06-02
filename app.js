// app.js — Filter-Grease SPA Utilities + Global State

const THAI_MONTHS = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const THAI_MONTHS_SHORT = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

// ==================== DATE UTILITIES ====================

function getLastDayOfMonth(year, month) { return new Date(year, month, 0).getDate(); }

function getWeekOfMonth(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = d.getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
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
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()+1]} ${d.getFullYear()+543}`;
}

function formatThaiMonth(month, year) {
  return `${THAI_MONTHS[month]} ${year+543}`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function currentMonthYear() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function getNextGreaseCycle() {
  const d = new Date();
  const day = d.getDate();
  const lastDay = getLastDayOfMonth(d.getFullYear(), d.getMonth()+1);
  const monthStr = formatThaiMonth(d.getMonth()+1, d.getFullYear());
  if (day < 10) return `วันที่ 10-15 ${monthStr}`;
  if (day > 15 && day < 25) return `วันที่ 25-${lastDay} ${monthStr}`;
  const next = new Date(d.getFullYear(), d.getMonth()+1, 1);
  return `วันที่ 10-15 ${formatThaiMonth(next.getMonth()+1, next.getFullYear())}`;
}

function getReportDeadline(cycle, month, year) {
  if (cycle === 1) {
    return { deadline: new Date(year, month-1, 20), label: `ภายในวันที่ 20 ${THAI_MONTHS_SHORT[month]} ${year+543}` };
  } else {
    const nm = month === 12 ? 1 : month+1;
    const ny = month === 12 ? year+1 : year;
    return { deadline: new Date(ny, nm-1, 5), label: `ภายในวันที่ 5 ${THAI_MONTHS_SHORT[nm]} ${ny+543}` };
  }
}

// ==================== API CACHE ====================

const _apiCache = {};

// Cache any async fn with TTL (milliseconds)
function cachedCall(key, ttlMs, fn) {
  const now = Date.now();
  if (_apiCache[key] && now - _apiCache[key].t < ttlMs) {
    return Promise.resolve(_apiCache[key].v);
  }
  return fn().then(v => { _apiCache[key] = { v, t: now }; return v; });
}

// Truck list — cache 5 นาที (เปลี่ยนแทบไม่เคย)
function getTrucksCached() {
  return cachedCall('trucks', 5 * 60000, getTrucks);
}

// Pre-warm GAS: ping หลัง login เพื่อให้ cold start ผ่านไปก่อน
function preWarm() {
  setTimeout(() => getTrucks().then(v => { _apiCache['trucks'] = { v, t: Date.now() }; }).catch(() => {}), 400);
}

// ==================== ROLE UTILITIES ====================

function isViewerOnly() {
  const u = getUserInfo();
  return u && u.role === 'viewer';
}

function canEdit() {
  const u = getUserInfo();
  return u && (u.role === 'admin' || u.role === 'operator');
}

// ==================== UI HELPERS ====================

function showLoading(container) {
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>กำลังโหลด...</p></div>';
}

function showError(container, msg) {
  container.innerHTML = `<div class="alert alert-danger">❌ ${msg}</div>`;
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
  const cls = status === 'ใช้งาน' ? 'badge-green'
    : status === 'จอดซ่อม' || status === 'จอดเคลม' ? 'badge-red' : 'badge-orange';
  return `<span class="badge ${cls}">${status || '-'}</span>`;
}

// Build truck dropdown options HTML
function buildTruckOptions(trucks, selectedNo) {
  return '<option value="">-- เลือกเบอร์รถ --</option>' +
    trucks.map(t => `<option value="${t.truck_no}" ${t.truck_no === selectedNo ? 'selected' : ''}>${t.truck_no} (${t.driver})</option>`).join('');
}

// Build year/month dropdowns
function buildYearOptions(selectedYear) {
  const thisYear = new Date().getFullYear();
  let html = '';
  for (let y = thisYear; y >= thisYear - 3; y--) {
    html += `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y + 543}</option>`;
  }
  return html;
}

function buildMonthOptions(selectedMonth) {
  let html = '<option value="">-- ทุกเดือน --</option>';
  for (let m = 1; m <= 12; m++) {
    html += `<option value="${m}" ${m === selectedMonth ? 'selected' : ''}>${THAI_MONTHS[m]}</option>`;
  }
  return html;
}

// Routing is handled in index.html inline script
// Expose globals for use in view scripts (no module system)
window.APP = {
  // API
  getTrucks, updateTruck, saveBlow, saveGreasing, saveDrain, saveCall,
  saveViolation, saveReport, uploadImage,
  getHistory, getStats, getDashboardFull, getCompare, getViolations, getReportHistory, getFleetStatus,
  getTrucksCached, preWarm, bulkImport,
  getUsers, addUser, deleteUser, resetPassword,
  login, logout, isLoggedIn, getUserInfo,
  // Date
  getGreaseCycle, isGreaseWarning, formatThaiDate, formatThaiMonth,
  todayISO, currentMonthYear, getLastDayOfMonth, getNextGreaseCycle,
  getReportDeadline, getWeekOfMonth, THAI_MONTHS, THAI_MONTHS_SHORT,
  // Role
  isViewerOnly, canEdit,
  // UI
  showLoading, showError, setButtonLoading, createStatusBadge,
  buildTruckOptions, buildYearOptions, buildMonthOptions
};
