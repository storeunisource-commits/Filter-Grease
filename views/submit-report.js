// views/submit-report.js — Report submission (เป่ากรอง + เดรนน้ำ) by Week
window['VIEW_SUBMIT_REPORT'] = async function render(container) {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curWeek = APP.getWeekOfMonth(now);
  const today = APP.todayISO();

  container.innerHTML = `
    <div class="page-title">📤 ส่งรายงานให้ผู้บริหาร</div>
    <div class="date-display">📅 ${APP.formatThaiDate(now)}</div>
    <div class="alert alert-info">รายงานนี้สำหรับ: <b>เป่ากรองอากาศ / เดรนน้ำถังลม</b> (นับ Week 1-4)</div>

    <div class="card">
      <div class="card-title">บันทึกการส่งรายงาน</div>

      <div class="form-group">
        <label class="form-label">ประเภทรายงาน</label>
        <select class="form-control" id="rpt-type">
          <option value="blow_drain_blow">💨 เป่ากรองอากาศ</option>
          <option value="blow_drain_drain">💧 เดรนน้ำถังลม</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">เดือน</label>
        <select class="form-control" id="rpt-month">${APP.buildMonthOptions(curMonth)}</select>
      </div>
      <div class="form-group">
        <label class="form-label">ปี</label>
        <select class="form-control" id="rpt-year">${APP.buildYearOptions(curYear)}</select>
      </div>

      <div class="form-group">
        <label class="form-label">Week</label>
        <select class="form-control" id="rpt-week">
          <option value="1" ${curWeek===1?'selected':''}>Week 1 (วันที่ 1-7)</option>
          <option value="2" ${curWeek===2?'selected':''}>Week 2 (วันที่ 8-14)</option>
          <option value="3" ${curWeek===3?'selected':''}>Week 3 (วันที่ 15-21)</option>
          <option value="4" ${curWeek===4?'selected':''}>Week 4 (วันที่ 22-ท้ายเดือน)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">วันที่ส่ง</label>
        <input class="form-control" type="text" value="${today}" readonly>
      </div>

      <div class="form-group">
        <label class="form-label">หมายเหตุ</label>
        <input class="form-control" type="text" id="rpt-note" placeholder="เช่น ส่งทาง Email / ส่งตรง">
      </div>

      <div id="rpt-msg"></div>
      <button class="btn btn-primary btn-full" id="rpt-btn" onclick="submitBlowDrainReport()">📤 บันทึกการส่งรายงาน</button>
    </div>

    <div style="text-align:center;margin-top:8px">
      <a href="#submit-report-grease" style="color:var(--primary);font-size:14px">🔧 ส่งรายงานอัดจาระบี →</a>
      &nbsp;|&nbsp;
      <a href="#report-history" style="color:var(--primary);font-size:14px">📋 ดูประวัติการส่งรายงาน →</a>
    </div>
  `;

  window.submitBlowDrainReport = async () => {
    const btn = document.getElementById('rpt-btn');
    const msg = document.getElementById('rpt-msg');
    const type = document.getElementById('rpt-type').value;
    const month = document.getElementById('rpt-month').value;
    const year = document.getElementById('rpt-year').value;
    const week = document.getElementById('rpt-week').value;
    const note = document.getElementById('rpt-note').value;
    const monthYear = year + '-' + String(month).padStart(2,'0');
    APP.setButtonLoading(btn, true);
    msg.innerHTML = '';
    try {
      await APP.saveReport({
        report_type: type,
        report_cycle: null,
        week: parseInt(week),
        month_year: monthYear,
        sent_date: today,
        on_time: true,
        note
      });
      msg.innerHTML = '<div class="alert alert-success">✅ บันทึกการส่งรายงานเรียบร้อยแล้ว</div>';
      APP.setButtonLoading(btn, false);
    } catch (e) {
      msg.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
      APP.setButtonLoading(btn, false);
    }
  };
};
