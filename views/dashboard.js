// views/dashboard.js — Dashboard redesign
window.VIEW_DASHBOARD = async function render(container) {
  const todayDate = new Date();
  const today = APP.todayISO();
  const cycle = APP.getGreaseCycle(todayDate);
  const warning = APP.isGreaseWarning(todayDate);
  const week = APP.getWeekOfMonth(todayDate);
  const lastDay = APP.getLastDayOfMonth(todayDate.getFullYear(), todayDate.getMonth() + 1);
  const monthYear = APP.currentMonthYear();
  const curYear = todayDate.getFullYear();
  const curMonth = todayDate.getMonth() + 1;

  container.innerHTML = `
    <div class="page-title">📊 แดชบอร์ด</div>
    <div class="date-display">📅 ${APP.formatThaiDate(todayDate)} — <span class="badge badge-orange">Week ${week}</span></div>

    <!-- Section 1: Alerts -->
    <div id="dash-alerts"></div>

    <!-- Section 2: Stats Cards -->
    <div class="stats-grid" id="stats-grid">
      ${[1,2,3,4].map(()=>'<div class="stat-card"><div class="spinner" style="margin:auto"></div></div>').join('')}
    </div>

    <!-- Section 3: Status Tabs -->
    <div class="card">
      <div class="card-title">📋 รายการค้างดำเนินการ</div>
      <div class="tabs" id="dash-tabs">
        <button class="tab-btn active" onclick="dashTab('called',this)">📞 โทรแล้วยังไม่ทำ</button>
        <button class="tab-btn" onclick="dashTab('not_done',this)">❌ ยังไม่ได้ทำเลย</button>
        <button class="tab-btn" onclick="dashTab('done',this)">✅ ทำแล้ว</button>
      </div>
      <div id="dash-pending"><div class="loading"><div class="spinner"></div></div></div>
    </div>

    <!-- Section 4: Violations summary -->
    <div class="card">
      <div class="card-title">⚠️ สรุปบทลงโทษเดือนนี้</div>
      <div id="dash-violations"><div class="loading"><div class="spinner"></div></div></div>
    </div>

    <!-- Section 5: Report status -->
    <div class="card">
      <div class="card-title">📤 สถานะการส่งรายงาน</div>
      <div id="dash-reports"><div class="loading"><div class="spinner"></div></div></div>
    </div>

    <!-- Section 6: Compare -->
    <div class="card">
      <div class="card-title">📈 เปรียบเทียบข้อมูลระหว่างเดือน</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px">
        <div>
          <div style="font-size:12px;color:#7f8c8d;margin-bottom:4px">เดือนที่ 1</div>
          <div style="display:flex;gap:4px">
            <select class="form-control" id="cmp-year1" style="width:auto">${APP.buildYearOptions(curYear)}</select>
            <select class="form-control" id="cmp-month1" style="width:auto">${APP.buildMonthOptions(curMonth)}</select>
          </div>
        </div>
        <div>
          <div style="font-size:12px;color:#7f8c8d;margin-bottom:4px">เดือนที่ 2</div>
          <div style="display:flex;gap:4px">
            <select class="form-control" id="cmp-year2" style="width:auto">${APP.buildYearOptions(curYear)}</select>
            <select class="form-control" id="cmp-month2" style="width:auto">${APP.buildMonthOptions(curMonth > 1 ? curMonth-1 : 12)}</select>
          </div>
        </div>
        <button class="btn btn-sm btn-primary" onclick="loadCompare()">📊 เปรียบเทียบ</button>
      </div>
      <div id="dash-compare"></div>
    </div>
  `;

  // Greasing alerts
  const alertsEl = document.getElementById('dash-alerts');
  if (warning === 'warning1') {
    alertsEl.innerHTML += `<div class="alert alert-warning">⚠️ ใกล้ถึงรอบอัดจาระบีรอบที่ 1 (10-15) — อีก ${10 - todayDate.getDate()} วัน</div>`;
  } else if (warning === 'warning2') {
    alertsEl.innerHTML += `<div class="alert alert-warning">⚠️ ใกล้ถึงรอบอัดจาระบีรอบที่ 2 (25-${lastDay}) — อีก ${25 - todayDate.getDate()} วัน</div>`;
  } else if (cycle === '10-15') {
    alertsEl.innerHTML += `<div class="alert alert-success">✅ รอบอัดจาระบีรอบที่ 1 (10-15) กำลังเปิดอยู่! <a href="#grease" class="btn btn-sm btn-outline" style="margin-left:8px">บันทึก →</a></div>`;
  } else if (cycle === '25-end') {
    alertsEl.innerHTML += `<div class="alert alert-success">✅ รอบอัดจาระบีรอบที่ 2 (25-${lastDay}) กำลังเปิดอยู่! <a href="#grease" class="btn btn-sm btn-outline" style="margin-left:8px">บันทึก →</a></div>`;
  }
  alertsEl.innerHTML += `<div class="alert alert-info">📋 เป่ากรอง/เดรนน้ำ: Week ${week} ของเดือน</div>`;

  // Load all data
  try {
    const dashRes = await APP.getDashboardFull(today);
    const data = dashRes.data || {};
    const stats = data.stats || {};
    const trucks = data.trucks || [];
    const blowToday = data.blow_today || [];
    const drainToday = data.drain_today || [];
    const greaseMonth = data.grease_month || [];
    const vioSummary = data.violations_summary || {};
    const reportStatus = data.report_status || {};

    // Stats cards
    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card green">
        <div class="stat-number">${stats.blow_done||0}/${stats.total||0}</div>
        <div class="stat-label">เป่ากรองวันนี้ ✅</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-number">${stats.blow_called||0}</div>
        <div class="stat-label">โทรแล้วรอดำเนินการ 📞</div>
      </div>
      <div class="stat-card green">
        <div class="stat-number">${stats.drain_done||0}/${stats.total||0}</div>
        <div class="stat-label">เดรนน้ำวันนี้ ✅</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-number">${stats.grease_r1_done||0}/${stats.total||0}</div>
        <div class="stat-label">อัดจาระบีรอบ 1</div>
      </div>
    `;

    // Pending tabs
    window._dashData = { trucks, blowToday, drainToday };
    window.dashTab = (status, btn) => {
      document.querySelectorAll('#dash-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderDashPending(status, trucks, blowToday, drainToday);
    };
    renderDashPending('called', trucks, blowToday, drainToday);

    // Violations
    const vioEl = document.getElementById('dash-violations');
    const vioDrivers = Object.entries(vioSummary);
    if (!vioDrivers.length) {
      vioEl.innerHTML = '<div class="alert alert-success">✅ ไม่มีบทลงโทษเดือนนี้</div>';
    } else {
      vioEl.innerHTML = vioDrivers.map(([truck, count]) => {
        const t = trucks.find(x => x.truck_no === truck) || {};
        const penalty = PENALTIES_DASH[Math.min(count, PENALTIES_DASH.length) - 1];
        return `<div class="truck-row">
          <div class="truck-info">
            <div class="truck-no">${truck}</div>
            <div class="truck-driver">${t.driver||'-'}</div>
          </div>
          <span class="badge ${count >= 3 ? 'badge-red' : 'badge-orange'}">${count} ครั้ง</span>
          ${penalty ? `<span class="badge badge-red" style="font-size:11px">${penalty.action}</span>` : ''}
        </div>`;
      }).join('');
    }

    // Report status
    const rptEl = document.getElementById('dash-reports');
    const bd = (reportStatus.blow_drain_this_month || []);
    const gr = (reportStatus.grease_this_month || []);
    rptEl.innerHTML = `
      <div class="truck-row" style="justify-content:space-between">
        <span>💨 เป่ากรอง/เดรนน้ำ เดือนนี้</span>
        <span class="badge ${bd.length > 0 ? 'badge-green' : 'badge-red'}">${bd.length > 0 ? `ส่งแล้ว ${bd.length} รายการ` : 'ยังไม่ส่ง'}</span>
      </div>
      <div class="truck-row" style="justify-content:space-between">
        <span>🔧 อัดจาระบี เดือนนี้</span>
        <span class="badge ${gr.length > 0 ? 'badge-green' : 'badge-red'}">${gr.length > 0 ? `ส่งแล้ว ${gr.length} รายการ` : 'ยังไม่ส่ง'}</span>
      </div>
      <div style="margin-top:8px;display:flex;gap:8px">
        <a href="#submit-report" class="btn btn-sm btn-outline">📤 ส่งรายงานเป่ากรอง/เดรนน้ำ</a>
        <a href="#submit-report-grease" class="btn btn-sm btn-outline">🔧 ส่งรายงานจาระบี</a>
      </div>
    `;

  } catch (e) {
    document.getElementById('stats-grid').innerHTML = `<div class="alert alert-danger" style="grid-column:1/-1">ไม่สามารถโหลดข้อมูลได้: ${e.message}</div>`;
  }

  // Compare
  window.loadCompare = async () => {
    const y1 = document.getElementById('cmp-year1').value;
    const m1 = document.getElementById('cmp-month1').value;
    const y2 = document.getElementById('cmp-year2').value;
    const m2 = document.getElementById('cmp-month2').value;
    if (!m1 || !m2) { alert('กรุณาเลือกเดือน'); return; }
    const mo1 = y1 + '-' + String(m1).padStart(2,'0');
    const mo2 = y2 + '-' + String(m2).padStart(2,'0');
    const el = document.getElementById('dash-compare');
    el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      const res = await APP.getCompare(mo1, mo2);
      const { m1: d1, m2: d2 } = res.compare || {};
      const label1 = APP.formatThaiMonth(parseInt(m1), parseInt(y1));
      const label2 = APP.formatThaiMonth(parseInt(m2), parseInt(y2));
      el.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>รายการ</th><th>${label1}</th><th>${label2}</th></tr></thead>
            <tbody>
              <tr><td>เป่ากรอง ✅</td><td>${d1.blow_done||0}/${d1.blow_total||0}</td><td>${d2.blow_done||0}/${d2.blow_total||0}</td></tr>
              <tr><td>เดรนน้ำ ✅</td><td>${d1.drain_done||0}/${d1.drain_total||0}</td><td>${d2.drain_done||0}/${d2.drain_total||0}</td></tr>
              <tr><td>อัดจาระบีรอบ 1</td><td>${d1.grease_r1_done||0}</td><td>${d2.grease_r1_done||0}</td></tr>
              <tr><td>อัดจาระบีรอบ 2</td><td>${d1.grease_r2_done||0}</td><td>${d2.grease_r2_done||0}</td></tr>
              <tr><td style="color:red">⚠️ การละเลย</td><td>${d1.violations||0}</td><td>${d2.violations||0}</td></tr>
            </tbody>
          </table>
        </div>`;
    } catch (e) {
      el.innerHTML = `<div class="alert alert-danger">เปรียบเทียบไม่สำเร็จ: ${e.message}</div>`;
    }
  };
};

const PENALTIES_DASH = [
  { action: 'ตักเตือนด้วยวาจา' },
  { action: 'ตักเตือนเป็นลายลักษณ์อักษร' },
  { action: 'ตัดเงิน / พักงาน' }
];

function renderDashPending(status, trucks, blowToday, drainToday) {
  const el = document.getElementById('dash-pending');
  const blowFiltered = blowToday.filter(r => r.action_status === status);
  const drainFiltered = drainToday.filter(r => r.action_status === status);

  if (!blowFiltered.length && !drainFiltered.length) {
    el.innerHTML = `<div class="alert alert-${status==='done'?'success':'info'}">
      ${status==='done'?'✅ ทุกอย่างเรียบร้อย':'ไม่มีรายการในหมวดนี้'}
    </div>`;
    return;
  }

  const makeRows = (records, taskName) => records.map(r => {
    const truck = trucks.find(t => t.truck_no === r.truck_no) || {};
    return `<div class="truck-row">
      <div class="truck-info">
        <div class="truck-no">${r.truck_no}</div>
        <div class="truck-driver">${r.driver} — <span style="font-size:12px;color:#7f8c8d">${taskName}</span></div>
        ${r.note ? `<div style="font-size:11px;color:#e74c3c">${r.note}</div>` : ''}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${status !== 'done' ? `<button class="btn btn-sm btn-outline" onclick="quickCall('${r.truck_no}','${r.driver}','${taskName}')">📞 โทรตาม</button>` : ''}
      </div>
    </div>`;
  }).join('');

  el.innerHTML = makeRows(blowFiltered, 'เป่ากรอง') + makeRows(drainFiltered, 'เดรนน้ำ');

  window.quickCall = async (truck_no, driver, task_type) => {
    const results = ['รับสาย','ไม่รับ','รับแล้วจะทำ'];
    const html = `<div class="card" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999;min-width:300px;box-shadow:0 8px 32px rgba(0,0,0,.3)">
      <div class="card-title">📞 บันทึกการโทร ${truck_no}</div>
      ${results.map((r,i) => `<button class="btn btn-outline btn-full" style="margin-bottom:6px" onclick="doCall('${truck_no}','${driver}','${task_type}','${r}')">${r}</button>`).join('')}
      <button class="btn btn-sm btn-outline" onclick="document.getElementById('call-modal').remove()">ยกเลิก</button>
    </div><div style="position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:998" onclick="document.getElementById('call-modal').remove()"></div>`;
    const modal = document.createElement('div');
    modal.id = 'call-modal';
    modal.innerHTML = html;
    document.body.appendChild(modal);
  };

  window.doCall = async (truck_no, driver, task_type, result) => {
    document.getElementById('call-modal') && document.getElementById('call-modal').remove();
    try {
      await APP.saveCall({ truck_no, driver, task_type, call_result: result, note: '' });
    } catch (e) { alert('บันทึกไม่สำเร็จ: ' + e.message); }
  };
}
