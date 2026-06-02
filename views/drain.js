// views/drain.js — Air tank drain entry (same pattern as blowing)
window.VIEW_DRAIN = async function render(container) {
  const today = APP.todayISO();
  const todayDate = new Date();
  const week = APP.getWeekOfMonth(todayDate);
  const monthLabel = APP.formatThaiMonth(todayDate.getMonth() + 1, todayDate.getFullYear());

  container.innerHTML = `
    <div class="page-title">💧 บันทึกเดรนน้ำถังลม</div>
    <div class="date-display">📅 ${APP.formatThaiDate(todayDate)} — ${monthLabel} <span class="badge badge-orange">Week ${week}</span></div>
    <div id="drain-content"><div class="loading"><div class="spinner"></div><p>กำลังโหลด...</p></div></div>
  `;

  try {
    const [trucksRes, violationsRes] = await Promise.all([APP.getTrucks(), APP.getViolations()]);
    const trucks = trucksRes.trucks || [];
    const violations = violationsRes.records || [];
    renderEntryForm(document.getElementById('drain-content'), trucks, violations, today, week, 'drain', 'เดรนน้ำถังลม');
  } catch (e) {
    APP.showError(document.getElementById('drain-content'), 'ไม่สามารถโหลดข้อมูลได้: ' + e.message);
  }
};
