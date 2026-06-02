// views/drain.js — Daily air tank draining entry (same logic as blowing)
window.VIEW_DRAIN = async function render(container) {
  const today = APP.todayISO();
  const todayDate = new Date();
  const monthLabel = APP.formatThaiMonth(todayDate.getMonth() + 1, todayDate.getFullYear());

  container.innerHTML = `
    <div class="page-title">💧 บันทึกเดรนน้ำถังลม</div>
    <div class="date-display">📅 ${APP.formatThaiDate(todayDate)} — เดือน${monthLabel}</div>
    <div id="drain-content"><div class="loading"><div class="spinner"></div><p>กำลังโหลด...</p></div></div>
  `;

  try {
    const [trucksRes, historyRes] = await Promise.all([
      APP.getTrucks(),
      APP.getHistory('drain', today.substring(0, 7))
    ]);
    const trucks = trucksRes.trucks || [];
    const todayRecords = (historyRes.records || []).filter(r => r.date === today);
    const alreadyDone = todayRecords.filter(r => r.done === 'Y').map(r => r.truck_no);
    const alreadySubmitted = todayRecords.length > 0;

    const drainContent = document.getElementById('drain-content');

    if (alreadySubmitted && alreadyDone.length > 0) {
      drainContent.innerHTML = `
        <div class="alert alert-success">✅ บันทึกวันนี้แล้ว (${alreadyDone.length}/${trucks.length} คัน)</div>
        <div class="card">
          <div class="card-title">รายการที่บันทึกแล้ว</div>
          ${trucks.map(t => {
            const done = alreadyDone.includes(t.truck_no);
            const rec = todayRecords.find(r => r.truck_no === t.truck_no);
            return `<div class="truck-row ${done ? 'done' : ''}">
              <span style="font-size:18px">${done ? '✅' : '⬜'}</span>
              <div class="truck-info">
                <div class="truck-no">${t.truck_no}</div>
                <div class="truck-driver">${t.driver} ${APP.createStatusBadge(t.status)}</div>
                ${rec && rec.note ? `<div style="font-size:12px;color:#7f8c8d">${rec.note}</div>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
        <button class="btn btn-outline btn-full" onclick="window.VIEW_DRAIN_EDIT()">✏️ บันทึกเพิ่มเติม</button>
      `;
    } else {
      renderDrainForm(drainContent, trucks, today, alreadyDone);
    }

    window.VIEW_DRAIN_EDIT = () => renderDrainForm(drainContent, trucks, today, alreadyDone);
  } catch (e) {
    APP.showError(document.getElementById('drain-content'), 'ไม่สามารถโหลดข้อมูลได้: ' + e.message);
  }
};

function renderDrainForm(container, trucks, today, alreadyDone) {
  const activeTrucks = trucks.filter(t => t.active !== false && t.active !== 'FALSE');

  container.innerHTML = `
    <div class="card">
      <div class="card-title">รายการรถทั้งหมด (${activeTrucks.length} คัน)</div>
      <div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-outline" onclick="selectAllDrain(true)">เลือกทั้งหมด</button>
        <button class="btn btn-sm btn-outline" onclick="selectAllDrain(false)">ยกเลิกทั้งหมด</button>
      </div>
      <div class="truck-list" id="drain-list">
        ${activeTrucks.map((t, i) => {
          const checked = alreadyDone.includes(t.truck_no) || t.status === 'จอดซ่อม' || t.status === 'จอดเคลม';
          const note = t.status !== 'ใช้งาน' && t.status !== 'ว่าง' ? t.status : '';
          return `
            <div class="truck-row ${checked ? 'done' : ''}" id="drain-row-${i}">
              <input type="checkbox" class="truck-check drain-check" data-idx="${i}" ${checked ? 'checked' : ''}
                onchange="document.getElementById('drain-row-${i}').className='truck-row'+(this.checked?' done':'')">
              <div class="truck-info">
                <div class="truck-no">${t.truck_no}</div>
                <div class="truck-driver">${t.driver} ${APP.createStatusBadge(t.status)}</div>
              </div>
              <input type="text" class="truck-note" placeholder="หมายเหตุ" value="${note}">
            </div>`;
        }).join('')}
      </div>
    </div>
    <div id="drain-msg"></div>
    <button class="btn btn-primary btn-full" id="drain-submit-btn" onclick="submitDrain()">💾 บันทึกทั้งหมด</button>
  `;

  window._drainTrucks = activeTrucks;
  window._drainToday = today;

  window.selectAllDrain = (val) => {
    document.querySelectorAll('.drain-check').forEach((cb, i) => {
      cb.checked = val;
      const row = document.getElementById('drain-row-' + i);
      if (row) row.className = 'truck-row' + (val ? ' done' : '');
    });
  };

  window.submitDrain = async () => {
    const btn = document.getElementById('drain-submit-btn');
    const msg = document.getElementById('drain-msg');
    APP.setButtonLoading(btn, true);
    msg.innerHTML = '';

    const checkboxes = document.querySelectorAll('.drain-check');
    const notes = document.querySelectorAll('#drain-list .truck-note');
    const records = window._drainTrucks.map((t, i) => ({
      truck_no: t.truck_no,
      driver: t.driver,
      status: t.status,
      done: checkboxes[i] ? checkboxes[i].checked : false,
      note: notes[i] ? notes[i].value : ''
    }));

    try {
      await APP.saveDrain(records, window._drainToday);
      msg.innerHTML = '<div class="alert alert-success">✅ บันทึกเรียบร้อยแล้ว!</div>';
      setTimeout(() => { window.location.hash = '#dashboard'; }, 1500);
    } catch (e) {
      msg.innerHTML = `<div class="alert alert-danger">เกิดข้อผิดพลาด: ${e.message}</div>`;
      APP.setButtonLoading(btn, false);
    }
  };
}
