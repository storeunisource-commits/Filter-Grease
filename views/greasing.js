// views/greasing.js — Bi-monthly greasing entry
window.VIEW_GREASE = async function render(container) {
  const todayDate = new Date();
  const today = APP.todayISO();
  const cycle = APP.getGreaseCycle(todayDate);
  const lastDay = APP.getLastDayOfMonth(todayDate.getFullYear(), todayDate.getMonth() + 1);
  const monthLabel = APP.formatThaiMonth(todayDate.getMonth() + 1, todayDate.getFullYear());
  const cycleLabel = cycle === '10-15' ? 'รอบ 1: วันที่ 10-15' : cycle === '25-end' ? `รอบ 2: วันที่ 25-${lastDay}` : null;
  const cycleKey = cycle === '10-15' ? '10-15' : cycle === '25-end' ? '25-end' : null;
  const monthYear = today.substring(0, 7);

  container.innerHTML = `
    <div class="page-title">🔧 บันทึกอัดจาระบี</div>
    <div class="date-display">📅 ${APP.formatThaiDate(todayDate)}</div>
    <div id="grease-content"></div>
  `;

  const content = document.getElementById('grease-content');

  if (!cycle) {
    const nextCycle = APP.getNextGreaseCycle();
    content.innerHTML = `
      <div class="lock-screen">
        <div class="lock-icon">🔒</div>
        <div class="lock-title">ยังไม่ถึงรอบอัดจาระบี</div>
        <p style="margin-bottom:12px;color:#7f8c8d">รอบอัดจาระบี: วันที่ 10-15 และ 25-ท้ายเดือน</p>
        <div class="lock-next">📅 รอบถัดไป: ${nextCycle}</div>
      </div>
    `;
    return;
  }

  try {
    const [trucksRes, historyRes] = await Promise.all([
      APP.getTrucks(),
      APP.getHistory('grease', monthYear)
    ]);
    const trucks = trucksRes.trucks || [];
    const cycleRecords = (historyRes.records || []).filter(r => r.cycle === cycleKey);
    const alreadyDone = cycleRecords.filter(r => r.done === 'Y').map(r => r.truck_no);
    const submitted = cycleRecords.length > 0;

    if (submitted && alreadyDone.length > 0) {
      content.innerHTML = `
        <div class="cycle-badge">🔧 ${cycleLabel} — ${monthLabel}</div>
        <div class="alert alert-success">✅ บันทึกรอบนี้แล้ว (${alreadyDone.length}/${trucks.length} คัน)</div>
        <div class="card">
          <div class="card-title">รายการที่อัดแล้ว</div>
          ${trucks.map(t => {
            const done = alreadyDone.includes(t.truck_no);
            return `<div class="truck-row ${done ? 'done' : ''}">
              <span style="font-size:18px">${done ? '✅' : '⬜'}</span>
              <div class="truck-info">
                <div class="truck-no">${t.truck_no}</div>
                <div class="truck-driver">${t.driver} ${APP.createStatusBadge(t.status)}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
        <button class="btn btn-outline btn-full" onclick="window.VIEW_GREASE_EDIT()">✏️ บันทึกเพิ่มเติม</button>
      `;
    } else {
      renderGreaseForm(content, trucks, today, cycleKey, cycleLabel, monthYear, monthLabel);
    }

    window.VIEW_GREASE_EDIT = () => renderGreaseForm(content, trucks, today, cycleKey, cycleLabel, monthYear, monthLabel);
  } catch (e) {
    APP.showError(content, 'ไม่สามารถโหลดข้อมูลได้: ' + e.message);
  }
};

function renderGreaseForm(container, trucks, today, cycleKey, cycleLabel, monthYear, monthLabel) {
  const activeTrucks = trucks.filter(t => t.active !== false && t.active !== 'FALSE');

  container.innerHTML = `
    <div class="cycle-badge">🔧 ${cycleLabel} — ${monthLabel}</div>
    <div class="card">
      <div class="card-title">รายการรถทั้งหมด (${activeTrucks.length} คัน)</div>
      <div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-outline" onclick="selectAllGrease(true)">เลือกทั้งหมด</button>
        <button class="btn btn-sm btn-outline" onclick="selectAllGrease(false)">ยกเลิกทั้งหมด</button>
      </div>
      <div class="truck-list" id="grease-list">
        ${activeTrucks.map((t, i) => {
          const auto = t.status === 'จอดซ่อม' || t.status === 'จอดเคลม';
          return `
            <div class="truck-row ${auto ? 'done' : ''}" id="grease-row-${i}">
              <input type="checkbox" class="truck-check grease-check" data-idx="${i}" ${auto ? 'checked' : ''}
                onchange="document.getElementById('grease-row-${i}').className='truck-row'+(this.checked?' done':'')">
              <div class="truck-info">
                <div class="truck-no">${t.truck_no}</div>
                <div class="truck-driver">${t.driver} ${APP.createStatusBadge(t.status)}</div>
              </div>
              <input type="text" class="truck-note" placeholder="หมายเหตุ" value="${auto ? t.status : ''}">
            </div>`;
        }).join('')}
      </div>
    </div>
    <div id="grease-msg"></div>
    <button class="btn btn-primary btn-full" id="grease-submit-btn" onclick="submitGrease()">💾 บันทึกอัดจาระบีรอบนี้</button>
  `;

  window._greaseTrucks = activeTrucks;
  window._greaseToday = today;
  window._greaseCycleKey = cycleKey;
  window._greaseMonthYear = monthYear;

  window.selectAllGrease = (val) => {
    document.querySelectorAll('.grease-check').forEach((cb, i) => {
      cb.checked = val;
      const row = document.getElementById('grease-row-' + i);
      if (row) row.className = 'truck-row' + (val ? ' done' : '');
    });
  };

  window.submitGrease = async () => {
    const btn = document.getElementById('grease-submit-btn');
    const msg = document.getElementById('grease-msg');
    APP.setButtonLoading(btn, true);
    msg.innerHTML = '';

    const checkboxes = document.querySelectorAll('.grease-check');
    const notes = document.querySelectorAll('#grease-list .truck-note');
    const records = window._greaseTrucks.map((t, i) => ({
      truck_no: t.truck_no,
      driver: t.driver,
      status: t.status,
      done: checkboxes[i] ? checkboxes[i].checked : false,
      note: notes[i] ? notes[i].value : ''
    }));

    try {
      await APP.saveGreasing(records, window._greaseToday, window._greaseCycleKey, window._greaseMonthYear);
      msg.innerHTML = '<div class="alert alert-success">✅ บันทึกเรียบร้อยแล้ว!</div>';
      setTimeout(() => { window.location.hash = '#dashboard'; }, 1500);
    } catch (e) {
      msg.innerHTML = `<div class="alert alert-danger">เกิดข้อผิดพลาด: ${e.message}</div>`;
      APP.setButtonLoading(btn, false);
    }
  };
}
