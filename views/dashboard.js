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
    <div class="date-display" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      📅 ${APP.formatThaiDate(todayDate)} — <span class="badge badge-orange">Week ${week}</span>
    </div>

    <!-- Month/Year Selector -->
    <div class="card" style="padding:12px 16px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <span style="font-size:13px;color:var(--text-light);font-weight:600">ดูข้อมูลเดือน:</span>
        <select class="form-control" id="dash-year" style="width:auto">${APP.buildYearOptions(curYear)}</select>
        <select class="form-control" id="dash-month" style="width:auto">${APP.buildMonthOptions(curMonth)}</select>
        <button class="btn btn-sm btn-primary" onclick="reloadDashboard()">🔍 ดู</button>
        <button class="btn btn-sm btn-outline" onclick="resetDashboardToNow()">📅 ปัจจุบัน</button>
      </div>
    </div>

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

    <!-- Section 6: Fleet Status -->
    <div class="card">
      <div class="card-title">🚛 สถานะรถทุกคันประจำเดือน</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px">
        <div>
          <div style="font-size:12px;color:#7f8c8d;margin-bottom:4px">เดือน</div>
          <div style="display:flex;gap:4px">
            <select class="form-control" id="fleet-year" style="width:auto">${APP.buildYearOptions(curYear)}</select>
            <select class="form-control" id="fleet-month" style="width:auto">${APP.buildMonthOptions(curMonth)}</select>
          </div>
        </div>
        <button class="btn btn-sm btn-primary" onclick="loadFleetStatus()">🔍 ดูสถานะ</button>
      </div>
      <div id="dash-fleet"><div class="loading"><div class="spinner"></div></div></div>
    </div>

    <!-- Section 7: Compare -->
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

  // statsDate ใช้ today เสมอ (ไม่เปลี่ยนตาม selector) เพื่อให้ blow/drain stats ถูกต้อง
  const statsDate = APP.todayISO();

  const user = APP.getUserInfo();

  // Load all data
  try {
    const dashRes = await APP.getDashboardFull(statsDate);
    const data = dashRes.data || {};
    const stats = data.stats || {};
    const trucks = data.trucks || [];
    const blowToday = data.blow_today || [];
    const drainToday = data.drain_today || [];
    const greaseMonth = data.grease_month || [];
    const vioSummary = data.violations_summary || {};
    const reportStatus = data.report_status || {};
    const activeStopOrders = data.stop_orders || [];

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

    // Truck status grid
    const truckStatusEl = document.getElementById('dash-truck-status-card') || (() => {
      const el = document.createElement('div');
      el.id = 'dash-truck-status-card';
      el.className = 'card';
      document.getElementById('stats-grid').insertAdjacentElement('afterend', el);
      return el;
    })();
    truckStatusEl.innerHTML = `
      <div class="card-title">🚛 สถานะรถทุกคัน</div>
      <div id="dash-truck-status">${renderTruckStatusGrid(trucks, user)}</div>
    `;

    // Active stop orders summary
    if (activeStopOrders.length > 0) {
      const existingSoCard = document.getElementById('dash-so-card');
      const soEl = existingSoCard || (() => {
        const el = document.createElement('div');
        el.id = 'dash-so-card';
        el.className = 'card';
        truckStatusEl.insertAdjacentElement('afterend', el);
        return el;
      })();
      soEl.innerHTML = `
        <div class="card-title">🚫 ใบสั่งหยุดวิ่งที่ Active <span class="badge badge-red" style="margin-left:4px">${activeStopOrders.length}</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>เลขที่</th><th>รถ</th><th>คนขับ</th><th>วันที่</th><th>สาเหตุ</th></tr></thead>
            <tbody>
              ${activeStopOrders.map(o => `<tr>
                <td><small>${o.order_no||''}</small></td>
                <td><strong>${o.truck_no||''}</strong></td>
                <td>${o.driver||'-'}</td>
                <td><small>${o.issue_date||''}</small></td>
                <td style="font-size:12px">${o.reason_detail||o.reason_type||''}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

  } catch (e) {
    document.getElementById('stats-grid').innerHTML = `<div class="alert alert-danger" style="grid-column:1/-1">ไม่สามารถโหลดข้อมูลได้: ${e.message}</div>`;
  }

  // Fleet Status — โหลดอัตโนมัติเดือนปัจจุบัน (แยก async ไม่บล็อก dashboard หลัก)
  window.loadFleetStatus = async () => {
    const y = document.getElementById('fleet-year') ? document.getElementById('fleet-year').value : curYear;
    const m = document.getElementById('fleet-month') ? document.getElementById('fleet-month').value : curMonth;
    const monthYearStr = y + '-' + String(m).padStart(2, '0');
    const el = document.getElementById('dash-fleet');
    if (!el) return;
    el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      const res = await APP.getFleetStatus(monthYearStr);
      const fleet = res.fleet || {};
      const truckList = res.trucks || [];
      if (!truckList.length) { el.innerHTML = '<div class="alert alert-info">ไม่มีข้อมูลรถ</div>'; return; }
      const SI = { done:'✅', called:'📞', not_done:'❌' };
      const SC = { done:'s-done', called:'s-called', not_done:'s-not_done' };
      const today = new Date();
      const curWeek = APP.getWeekOfMonth(today);
      const curDay  = today.getDate();
      const lastDay = APP.getLastDayOfMonth(today.getFullYear(), today.getMonth()+1);
      const isR1Open  = curDay >= 10 && curDay <= 15;
      const isR2Open  = curDay >= 25 && curDay <= lastDay;
      const isR1Late  = curDay > 15;     // รอบ 1 หมดแล้ว
      const isR2Late  = curDay > lastDay; // รอบ 2 หมดแล้ว (วันถัดไปเดือนใหม่)

      // highlight cell: สัปดาห์/รอบปัจจุบันที่ยังไม่ทำ = ส้ม, เกินกำหนดแล้วไม่ทำ = แดง
      const cellClass = (v, wk, type) => {
        if (v === 'done') return 's-done';
        if (v === 'called') return 's-called';
        if (type === 'blow' || type === 'drain') {
          if (parseInt(wk) < curWeek && v !== 'done') return 's-overdue'; // สัปดาห์ผ่านไปแล้ว
          if (parseInt(wk) === curWeek && !v)         return 's-due-now'; // สัปดาห์นี้ยังไม่ทำ
        }
        if (type === 'grease') {
          if (wk === '1' && isR1Late && v !== 'done') return 's-overdue';
          if (wk === '1' && isR1Open && !v)           return 's-due-now';
          if (wk === '2' && isR2Late && v !== 'done') return 's-overdue';
          if (wk === '2' && isR2Open && !v)           return 's-due-now';
        }
        return SC[v] || '';
      };

      el.innerHTML = `
        <div class="table-wrap">
          <table class="fleet-table">
            <thead>
              <tr>
                <th class="col-truck" rowspan="2">รถ</th>
                <th class="col-truck" rowspan="2">คนขับ</th>
                <th class="grp-blow" colspan="4">💨 เป่ากรอง</th>
                <th class="grp-drain" colspan="4">💧 เดรนน้ำ</th>
                <th class="grp-grease" colspan="2">🔧 อัดจาระบี</th>
                <th rowspan="2">จัดการ</th>
              </tr>
              <tr>
                <th class="grp-blow">W1</th><th class="grp-blow">W2</th>
                <th class="grp-blow">W3</th><th class="grp-blow">W4</th>
                <th class="grp-drain">W1</th><th class="grp-drain">W2</th>
                <th class="grp-drain">W3</th><th class="grp-drain">W4</th>
                <th class="grp-grease">R1</th><th class="grp-grease">R2</th>
              </tr>
            </thead>
            <tbody>
              ${truckList.map(t => {
                const f = fleet[t.truck_no] || {};
                const b = f.blow || {}; const d = f.drain || {}; const g = f.grease || {};
                const cell = (v, wk, type) => `<td class="${cellClass(v,wk,type)}">${SI[v]||'-'}</td>`;
                return `<tr>
                  <td class="td-truck">${t.truck_no}</td>
                  <td class="td-driver">${t.driver||'-'}</td>
                  ${cell(b['1'],'1','blow')}${cell(b['2'],'2','blow')}${cell(b['3'],'3','blow')}${cell(b['4'],'4','blow')}
                  ${cell(d['1'],'1','drain')}${cell(d['2'],'2','drain')}${cell(d['3'],'3','drain')}${cell(d['4'],'4','drain')}
                  ${cell(g['1'],'1','grease')}${cell(g['2'],'2','grease')}
                  <td style="white-space:nowrap">
                    <button class="btn btn-sm btn-outline" title="เป่ากรอง"
                      onclick="goRecord('#blow','${t.truck_no}')">💨</button>
                    <button class="btn btn-sm btn-outline" title="เดรนน้ำ"
                      onclick="goRecord('#drain','${t.truck_no}')">💧</button>
                    <button class="btn btn-sm btn-outline" title="อัดจาระบี"
                      onclick="goRecord('#grease','${t.truck_no}')">🔧</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="font-size:11px;color:#7f8c8d;margin-top:6px">
          ✅ ทำแล้ว &nbsp; 📞 โทรแจ้งแล้ว &nbsp; ❌ ยังไม่ได้ทำ &nbsp;
          <span style="background:#fff3cd;padding:1px 4px;border-radius:3px">สัปดาห์นี้ยังไม่ทำ</span> &nbsp;
          <span style="background:#f8d7da;padding:1px 4px;border-radius:3px">เกินกำหนดแล้ว</span>
        </div>`;
    } catch (e) {
      el.innerHTML = `<div class="alert alert-danger">โหลดไม่สำเร็จ: ${e.message}</div>`;
    }
  };

  // โหลด fleet status อัตโนมัติเดือนปัจจุบัน
  loadFleetStatus();

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

// ============================================================
// Dashboard reload by selected month/year
function renderTruckStatusGrid(trucks, user) {
  if (!trucks || !trucks.length) return '<div class="alert alert-info">ไม่มีข้อมูลรถ</div>';
  const isEditor = user && (user.role === 'admin' || user.role === 'operator');
  const statusOptions = ['ใช้งาน','จอดซ่อม','จอดเคลม','ไม่ใช้งาน'];
  const statusColors = { 'ใช้งาน':'badge-green', 'จอดซ่อม':'badge-red', 'จอดเคลม':'badge-red', 'ไม่ใช้งาน':'badge-gray' };

  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">
    ${trucks.map(t => `
      <div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:8px 10px">
        <div style="font-weight:700;font-size:14px;color:var(--primary)">${t.truck_no}</div>
        <div style="font-size:12px;color:var(--text-light);margin-bottom:6px">${t.driver||'-'}</div>
        ${isEditor
          ? `<select class="form-control" style="font-size:12px;padding:4px 6px;height:auto"
               onchange="changeTruckStatus('${t.truck_no}', this.value)">
               ${statusOptions.map(s => `<option value="${s}" ${s===t.status?'selected':''}>${s}</option>`).join('')}
             </select>`
          : `<span class="badge ${statusColors[t.status]||'badge-gray'}">${t.status||'-'}</span>`}
      </div>`).join('')}
  </div>`;
}

window.changeTruckStatus = async function(truck_no, status) {
  try {
    await APP.updateTruck({ truck_no, status });
    APP.clearTruckCache();
  } catch (e) {
    alert('เปลี่ยนสถานะไม่สำเร็จ: ' + e.message);
  }
};

// Navigate ไปหน้าบันทึก พร้อม pre-select รถ
window.goRecord = function(hash, truck_no) {
  window._pendingTruck = truck_no;
  window.location.hash = hash;
};

window.reloadDashboard = function() {
  window.VIEW_DASHBOARD(document.getElementById('app-container'));
};

window.resetDashboardToNow = function() {
  const now = new Date();
  const yearSel  = document.getElementById('dash-year');
  const monthSel = document.getElementById('dash-month');
  if (yearSel)  yearSel.value  = now.getFullYear();
  if (monthSel) monthSel.value = now.getMonth() + 1;
  window.VIEW_DASHBOARD(document.getElementById('app-container'));
};
