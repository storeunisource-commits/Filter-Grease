// views/submit-report-grease.js — Report submission for อัดจาระบี
window['VIEW_SUBMIT_REPORT_GREASE'] = async function render(container) {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curDay = now.getDate();
  const lastDay = APP.getLastDayOfMonth(curYear, curMonth);
  const today = APP.todayISO();

  // Suggest cycle
  let suggestedCycle = 1;
  if (curDay > 15) suggestedCycle = 2;

  const dl1 = APP.getReportDeadline(1, curMonth, curYear);
  const dl2 = APP.getReportDeadline(2, curMonth, curYear);

  container.innerHTML = `
    <div class="page-title">🔧 ส่งรายงานอัดจาระบี</div>
    <div class="date-display">📅 ${APP.formatThaiDate(now)}</div>

    <div class="card deadline-card on-time" id="grease-rpt-deadline">
      <div>
        <div class="deadline-label">กำหนดส่ง</div>
        <div style="font-size:12px;margin-top:4px" id="grease-rpt-deadline-label"></div>
      </div>
      <div>
        <div class="deadline-days" id="grease-rpt-days"></div>
        <div style="font-size:11px;text-align:center" id="grease-rpt-status"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">บันทึกการส่งรายงาน</div>

      <div class="form-group">
        <label class="form-label">รอบ</label>
        <select class="form-control" id="grpt-cycle" onchange="updateGreaseDeadline()">
          <option value="1" ${suggestedCycle===1?'selected':''}>รอบ 1 (10-15) — ส่งภายใน ${dl1.label}</option>
          <option value="2" ${suggestedCycle===2?'selected':''}>รอบ 2 (25-${lastDay}) — ส่งภายใน ${dl2.label}</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">เดือน</label>
        <select class="form-control" id="grpt-month">${APP.buildMonthOptions(curMonth)}</select>
      </div>
      <div class="form-group">
        <label class="form-label">ปี</label>
        <select class="form-control" id="grpt-year">${APP.buildYearOptions(curYear)}</select>
      </div>

      <div class="form-group">
        <label class="form-label">วันที่ส่ง</label>
        <input class="form-control" type="text" value="${today}" readonly>
      </div>

      <div class="form-group">
        <label class="form-label">หมายเหตุ</label>
        <input class="form-control" type="text" id="grpt-note" placeholder="เช่น ส่งทาง Email / ส่งตรง">
      </div>
      <div id="grpt-msg"></div>
      <button class="btn btn-primary btn-full" id="grpt-btn" onclick="submitGreaseReport()">📤 บันทึกการส่งรายงาน</button>
    </div>

    <div style="text-align:center;margin-top:8px">
      <a href="#submit-report" style="color:var(--primary);font-size:14px">← ส่งรายงานเป่ากรอง/เดรนน้ำ</a>
      &nbsp;|&nbsp;
      <a href="#report-history" style="color:var(--primary);font-size:14px">📋 ดูประวัติการส่งรายงาน →</a>
    </div>
  `;

  updateGreaseDeadline();

  window.updateGreaseDeadline = () => {
    const cycle = parseInt(document.getElementById('grpt-cycle').value);
    const month = parseInt(document.getElementById('grpt-month').value);
    const year = parseInt(document.getElementById('grpt-year').value);
    const dl = APP.getReportDeadline(cycle, month, year);
    const daysLeft = Math.ceil((dl.deadline - new Date()) / 86400000);
    const onTime = daysLeft >= 0;
    const card = document.getElementById('grease-rpt-deadline');
    if (card) {
      card.className = 'card deadline-card ' + (onTime ? 'on-time' : 'late');
      document.getElementById('grease-rpt-deadline-label').textContent = dl.label;
      document.getElementById('grease-rpt-days').textContent = (onTime ? '+' : '') + daysLeft + ' วัน';
      document.getElementById('grease-rpt-status').textContent = onTime ? 'ยังทัน' : 'เกินกำหนด';
    }
  };

  window.submitGreaseReport = async () => {
    const btn = document.getElementById('grpt-btn');
    const msg = document.getElementById('grpt-msg');
    const cycle = parseInt(document.getElementById('grpt-cycle').value);
    const month = parseInt(document.getElementById('grpt-month').value);
    const year = parseInt(document.getElementById('grpt-year').value);
    const note = document.getElementById('grpt-note').value;
    const monthYear = year + '-' + String(month).padStart(2,'0');
    const dl = APP.getReportDeadline(cycle, month, year);
    const isOnTime = new Date(today) <= dl.deadline;
    APP.setButtonLoading(btn, true);
    msg.innerHTML = '';
    try {
      await APP.saveReport({
        report_type: 'grease',
        report_cycle: cycle,
        week: null,
        month_year: monthYear,
        sent_date: today,
        on_time: isOnTime,
        note
      });
      msg.innerHTML = `<div class="alert alert-success">✅ บันทึกการส่งรายงาน${isOnTime ? '' : ' (เกินกำหนด)'} เรียบร้อยแล้ว</div>`;
      APP.setButtonLoading(btn, false);
    } catch (e) {
      msg.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
      APP.setButtonLoading(btn, false);
    }
  };
};
