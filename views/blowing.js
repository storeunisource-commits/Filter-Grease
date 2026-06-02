// views/blowing.js — Daily air filter blowing entry
window.VIEW_BLOW = async function render(container) {
  const today = APP.todayISO();
  const todayDate = new Date();
  const week = APP.getWeekOfMonth(todayDate);
  const monthLabel = APP.formatThaiMonth(todayDate.getMonth() + 1, todayDate.getFullYear());

  container.innerHTML = `
    <div class="page-title">💨 บันทึกเป่ากรองอากาศ</div>
    <div class="date-display">📅 ${APP.formatThaiDate(todayDate)} — ${monthLabel} <span class="badge badge-orange">Week ${week}</span></div>
    <div id="blow-content"><div class="loading"><div class="spinner"></div><p>กำลังโหลด...</p></div></div>
  `;

  try {
    const [trucksRes, violationsRes] = await Promise.all([APP.getTrucksCached(), APP.getViolations()]);
    const trucks = trucksRes.trucks || [];
    const violations = violationsRes.records || [];
    renderEntryForm(document.getElementById('blow-content'), trucks, violations, today, week, 'blow', 'เป่ากรอง');
  } catch (e) {
    APP.showError(document.getElementById('blow-content'), 'ไม่สามารถโหลดข้อมูลได้: ' + e.message);
  }
};
