// views/dashboard.js
window.VIEW_DASHBOARD = async function render(container) {
  const today = APP.todayISO();
  const todayDate = new Date();
  const cycle = APP.getGreaseCycle(todayDate);
  const warning = APP.isGreaseWarning(todayDate);
  const lastDay = APP.getLastDayOfMonth(todayDate.getFullYear(), todayDate.getMonth() + 1);

  container.innerHTML = `
    <div class="page-title">📊 แดชบอร์ด</div>
    <div class="date-display">📅 ${APP.formatThaiDate(todayDate)}</div>
    <div id="dash-alerts"></div>
    <div class="stats-grid" id="stats-grid">
      <div class="stat-card"><div class="spinner" style="margin:auto"></div></div>
      <div class="stat-card"><div class="spinner" style="margin:auto"></div></div>
      <div class="stat-card"><div class="spinner" style="margin:auto"></div></div>
      <div class="stat-card"><div class="spinner" style="margin:auto"></div></div>
    </div>
    <div class="card">
      <div class="card-title">🔔 การแจ้งเตือน</div>
      <div id="dash-notifications"><div class="loading"><div class="spinner"></div></div></div>
    </div>
    <div class="card">
      <div class="card-title">🚛 ยังไม่ได้เป่ากรองวันนี้</div>
      <div id="dash-pending-blow"></div>
    </div>
  `;

  // Greasing alerts
  const alertsEl = document.getElementById('dash-alerts');
  if (warning === 'warning1') {
    alertsEl.innerHTML += `<div class="alert alert-warning">⚠️ ใกล้ถึงรอบอัดจาระบีรอบที่ 1 (10-15) — อีก ${10 - todayDate.getDate()} วัน</div>`;
  } else if (warning === 'warning2') {
    alertsEl.innerHTML += `<div class="alert alert-warning">⚠️ ใกล้ถึงรอบอัดจาระบีรอบที่ 2 (25-${lastDay}) — อีก ${25 - todayDate.getDate()} วัน</div>`;
  } else if (cycle === '10-15') {
    alertsEl.innerHTML += `<div class="alert alert-success">✅ รอบอัดจาระบีรอบที่ 1 (10-15) กำลังเปิดอยู่!</div>`;
  } else if (cycle === '25-end') {
    alertsEl.innerHTML += `<div class="alert alert-success">✅ รอบอัดจาระบีรอบที่ 2 (25-${lastDay}) กำลังเปิดอยู่!</div>`;
  }

  // Load stats
  try {
    const [statsRes, trucksRes] = await Promise.all([APP.getStats(today), APP.getTrucks()]);
    const stats = statsRes.stats || {};
    const trucks = trucksRes.trucks || [];
    const total = trucks.filter(t => t.status === 'ใช้งาน').length;

    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card green">
        <div class="stat-number">${stats.blow_done || 0}/${total}</div>
        <div class="stat-label">เป่ากรองวันนี้</div>
      </div>
      <div class="stat-card green">
        <div class="stat-number">${stats.drain_done || 0}/${total}</div>
        <div class="stat-label">เดรนน้ำวันนี้</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-number">${stats.grease_r1_done || 0}/${total}</div>
        <div class="stat-label">อัดจาระบีรอบ 1</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-number">${stats.grease_r2_done || 0}/${total}</div>
        <div class="stat-label">อัดจาระบีรอบ 2</div>
      </div>
    `;

    // Notifications
    const notifEl = document.getElementById('dash-notifications');
    const notifs = [];
    if (cycle) {
      const cycleLabel = cycle === '10-15' ? 'รอบ 10-15' : `รอบ 25-${lastDay}`;
      const r1done = stats.grease_r1_done || 0;
      const r2done = stats.grease_r2_done || 0;
      const done = cycle === '10-15' ? r1done : r2done;
      if (done < total) {
        notifs.push(`<div class="alert alert-warning">🔴 อัดจาระบี${cycleLabel}: ยังเหลือ ${total - done} คันที่ยังไม่ได้อัด</div>`);
      }
    }
    if (stats.blow_done < total) {
      notifs.push(`<div class="alert alert-info">📋 เป่ากรองวันนี้: ยังเหลือ ${total - (stats.blow_done || 0)} คันที่ยังไม่ได้บันทึก</div>`);
    }
    notifEl.innerHTML = notifs.length ? notifs.join('') : '<div class="alert alert-success">✅ ทุกอย่างเรียบร้อยแล้ววันนี้!</div>';

    // Pending blow list
    const pendingEl = document.getElementById('dash-pending-blow');
    const historyRes = await APP.getHistory('blow', today.substring(0, 7));
    const todayBlowDone = (historyRes.records || []).filter(r => r.date === today && r.done === 'Y').map(r => r.truck_no);
    const pendingTrucks = trucks.filter(t => t.status === 'ใช้งาน' && !todayBlowDone.includes(t.truck_no));

    if (pendingTrucks.length === 0) {
      pendingEl.innerHTML = '<div class="alert alert-success">✅ เป่ากรองครบทุกคันแล้ววันนี้</div>';
    } else {
      pendingEl.innerHTML = pendingTrucks.map(t => `
        <div class="truck-row" style="justify-content:space-between;align-items:center">
          <div>
            <span class="truck-no">${t.truck_no}</span>
            <span class="truck-driver"> — ${t.driver}</span>
            ${APP.createStatusBadge(t.status)}
          </div>
          <button class="btn btn-sm btn-outline" onclick="recordCall('${t.truck_no}','${t.driver}','เป่ากรอง')">📞 บันทึกโทร</button>
        </div>
      `).join('');
    }
  } catch (e) {
    document.getElementById('stats-grid').innerHTML = `<div class="alert alert-danger" style="grid-column:1/-1">ไม่สามารถโหลดข้อมูลได้: ${e.message}</div>`;
  }

  window.recordCall = async (truck_no, driver, task_type) => {
    const result = prompt(`บันทึกการโทรหา ${truck_no} (${driver})\nผลการโทร:\n1 = รับสาย\n2 = ไม่รับ\n3 = รับแล้วจะทำ`);
    const resultMap = { '1': 'รับสาย', '2': 'ไม่รับ', '3': 'รับแล้วจะทำ' };
    if (result && resultMap[result]) {
      try {
        await APP.saveCall({ truck_no, driver, task_type, call_result: resultMap[result], note: '' });
        alert('บันทึกการโทรเรียบร้อยแล้ว');
      } catch (e) {
        alert('เกิดข้อผิดพลาด: ' + e.message);
      }
    }
  };
};
