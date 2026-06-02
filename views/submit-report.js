// views/submit-report.js — Report submission to management
window['VIEW_SUBMIT_REPORT'] = async function render(container) {
  const todayDate = new Date();
  const today = APP.todayISO();
  const day = todayDate.getDate();
  const month = todayDate.getMonth() + 1;
  const year = todayDate.getFullYear();
  const monthYear = APP.currentMonthYear();
  const monthLabel = APP.formatThaiMonth(month, year);

  // Determine which report cycle is relevant
  let suggestedCycle = 1;
  let deadlineInfo = APP.getReportDeadline(1, month, year);

  if (day > 20) {
    // Past cycle 1 deadline — suggest cycle 2 (which is due on 5th next month)
    suggestedCycle = 2;
    deadlineInfo = APP.getReportDeadline(2, month, year);
  }

  const daysLeft = Math.ceil((deadlineInfo.deadline - todayDate) / (1000 * 60 * 60 * 24));
  const onTime = daysLeft >= 0;

  container.innerHTML = `
    <div class="page-title">📤 ส่งรายงานให้ผู้บริหาร</div>
    <div class="date-display">📅 ${APP.formatThaiDate(todayDate)}</div>

    <div class="deadline-card ${onTime ? 'on-time' : 'late'}">
      <div>
        <div class="deadline-label">กำหนดส่ง ${deadlineInfo.label}</div>
        <div style="font-size:12px;color:#7f8c8d">รอบที่ ${suggestedCycle} — ${monthLabel}</div>
      </div>
      <div>
        <div class="deadline-days">${onTime ? `+${daysLeft}` : daysLeft} วัน</div>
        <div style="font-size:11px;text-align:center">${onTime ? 'ยังทัน' : 'เกินกำหนด'}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">บันทึกการส่งรายงาน</div>
      <div class="form-group">
        <label class="form-label">รอบที่</label>
        <select class="form-control" id="rpt-cycle">
          <option value="1" ${suggestedCycle === 1 ? 'selected' : ''}>รอบที่ 1 (ส่งภายในวันที่ 20)</option>
          <option value="2" ${suggestedCycle === 2 ? 'selected' : ''}>รอบที่ 2 (ส่งภายในวันที่ 5 เดือนถัดไป)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">เดือน/ปี ของรายงาน</label>
        <input class="form-control" type="text" id="rpt-monthyear" value="${monthYear}" readonly>
        <div style="font-size:12px;color:#7f8c8d;margin-top:4px">${monthLabel}</div>
      </div>
      <div class="form-group">
        <label class="form-label">วันที่ส่ง</label>
        <input class="form-control" type="text" id="rpt-sentdate" value="${today}" readonly>
      </div>
      <div class="form-group">
        <label class="form-label">หมายเหตุ</label>
        <input class="form-control" type="text" id="rpt-note" placeholder="เช่น ส่งทาง Email / ส่งตรง">
      </div>
      <div id="rpt-msg"></div>
      <button class="btn btn-primary btn-full" id="rpt-btn" onclick="submitReport()">📤 บันทึกการส่งรายงาน</button>
    </div>

    <div style="text-align:center;margin-top:8px">
      <a href="#report-history" style="color:var(--primary);font-size:14px">📋 ดูประวัติการส่งรายงาน →</a>
    </div>
  `;

  window.submitReport = async () => {
    const btn = document.getElementById('rpt-btn');
    const msg = document.getElementById('rpt-msg');
    const cycle = parseInt(document.getElementById('rpt-cycle').value);
    const mYear = document.getElementById('rpt-monthyear').value;
    const sentDate = document.getElementById('rpt-sentdate').value;
    const note = document.getElementById('rpt-note').value;

    const deadline = APP.getReportDeadline(cycle, parseInt(mYear.split('-')[1]), parseInt(mYear.split('-')[0]));
    const isOnTime = new Date(sentDate) <= deadline.deadline;

    APP.setButtonLoading(btn, true);
    msg.innerHTML = '';

    try {
      await APP.saveReport({
        report_cycle: cycle,
        month_year: mYear,
        sent_date: sentDate,
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

  // Update deadline when cycle changes
  document.getElementById('rpt-cycle').addEventListener('change', () => {
    const c = parseInt(document.getElementById('rpt-cycle').value);
    const mYear = document.getElementById('rpt-monthyear').value;
    const [yr, mo] = mYear.split('-').map(Number);
    const dl = APP.getReportDeadline(c, mo, yr);
    const dLeft = Math.ceil((dl.deadline - new Date()) / (1000 * 60 * 60 * 24));
    const ot = dLeft >= 0;
    const card = container.querySelector('.deadline-card');
    if (card) {
      card.className = `deadline-card ${ot ? 'on-time' : 'late'}`;
      card.querySelector('.deadline-label').textContent = `กำหนดส่ง ${dl.label}`;
      card.querySelector('.deadline-days').textContent = `${ot ? '+' : ''}${dLeft} วัน`;
    }
  });
};
