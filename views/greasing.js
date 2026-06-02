// views/greasing.js — Greasing entry (ไม่ lock, กรอกได้ทุกวัน)
window.VIEW_GREASE = async function render(container) {
  const todayDate = new Date();
  const today = APP.todayISO();
  const lastDay = APP.getLastDayOfMonth(todayDate.getFullYear(), todayDate.getMonth() + 1);
  const monthLabel = APP.formatThaiMonth(todayDate.getMonth() + 1, todayDate.getFullYear());
  const monthYear = today.substring(0, 7);
  const autoCycle = APP.getGreaseCycle(todayDate);

  container.innerHTML = `
    <div class="page-title">🔧 บันทึกอัดจาระบี</div>
    <div class="date-display">📅 ${APP.formatThaiDate(todayDate)}</div>
    <div id="grease-content"><div class="loading"><div class="spinner"></div><p>กำลังโหลด...</p></div></div>
  `;

  try {
    const [trucksRes, violationsRes] = await Promise.all([APP.getTrucks(), APP.getViolations()]);
    const trucks = trucksRes.trucks || [];
    const violations = violationsRes.records || [];
    renderGreaseForm(document.getElementById('grease-content'), trucks, today, monthYear, monthLabel, lastDay, autoCycle, violations);
  } catch (e) {
    APP.showError(document.getElementById('grease-content'), 'ไม่สามารถโหลดข้อมูลได้: ' + e.message);
  }
};

function renderGreaseForm(container, trucks, today, monthYear, monthLabel, lastDay, autoCycle, violations) {
  const activeTrucks = trucks.filter(t => t.active !== false && t.active !== 'FALSE');

  // Violation count per truck
  const vioCount = {};
  violations.forEach(v => { vioCount[v.truck_no] = (vioCount[v.truck_no] || 0) + 1; });

  container.innerHTML = `
    <div class="card">
      <div class="card-title">⚙️ ตั้งค่ารอบการบันทึก</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="margin:0;flex:1;min-width:150px">
          <label class="form-label">รอบ</label>
          <select class="form-control" id="grease-cycle">
            <option value="10-15" ${autoCycle === '10-15' ? 'selected' : ''}>รอบ 1: วันที่ 10-15</option>
            <option value="25-end" ${autoCycle === '25-end' ? 'selected' : ''}>รอบ 2: วันที่ 25-${lastDay}</option>
          </select>
        </div>
        <div class="form-group" style="margin:0;flex:1;min-width:150px">
          <label class="form-label">เดือน/ปี</label>
          <input class="form-control" type="text" id="grease-monthyear" value="${monthYear}" readonly>
          <div style="font-size:12px;color:#7f8c8d;margin-top:2px">${monthLabel}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">เลือกรถที่จะบันทึก</div>
      <div class="form-group">
        <label class="form-label">เบอร์รถ</label>
        <select class="form-control" id="grease-truck-select" onchange="onGreaseTruckSelect()">
          ${APP.buildTruckOptions(activeTrucks)}
        </select>
      </div>
      <div id="grease-truck-info" style="display:none">
        <div class="form-group">
          <label class="form-label">คนขับ</label>
          <input class="form-control" type="text" id="grease-driver" placeholder="ชื่อคนขับ">
        </div>
        <div id="grease-violation-alert"></div>
        <div class="form-group">
          <label class="form-label">สถานะงาน</label>
          <div class="status-options" id="grease-status-opts">
            <label class="status-option" onclick="selectGreaseStatus('called')">
              <input type="radio" name="grease-action" value="called"> 📞 โทรแจ้งแล้ว
              <span class="status-hint">บันทึกเวลาโทรอัตโนมัติ + หมายเหตุ</span>
            </label>
            <label class="status-option" onclick="selectGreaseStatus('done')">
              <input type="radio" name="grease-action" value="done"> ✅ อัดแล้ว
              <span class="status-hint">บันทึกวันที่ + แนบรูปได้</span>
            </label>
            <label class="status-option" onclick="selectGreaseStatus('not_done')">
              <input type="radio" name="grease-action" value="not_done"> ❌ ยังไม่ได้อัด
              <span class="status-hint">ระบุหมายเหตุบังคับ</span>
            </label>
          </div>
        </div>
        <div id="grease-extra-fields"></div>
        <div id="grease-msg"></div>
        <button class="btn btn-primary btn-full" id="grease-save-btn" onclick="saveGreasingRecord()" style="display:none">💾 บันทึก</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">รายการที่บันทึกวันนี้ <span id="grease-today-count" class="badge badge-green" style="margin-left:8px"></span></div>
      <div id="grease-today-list"><div class="loading"><div class="spinner"></div></div></div>
    </div>
  `;

  window._greaseTrucks = activeTrucks;
  window._greasingVioCount = vioCount;

  // Load today records
  loadGreaseTodayList(monthYear);

  window.onGreaseTruckSelect = () => {
    const sel = document.getElementById('grease-truck-select');
    const truck = activeTrucks.find(t => t.truck_no === sel.value);
    const infoDiv = document.getElementById('grease-truck-info');
    if (!truck) { infoDiv.style.display = 'none'; return; }
    infoDiv.style.display = '';
    document.getElementById('grease-driver').value = truck.driver || '';

    // Violation alert
    const vc = vioCount[truck.truck_no] || 0;
    const alertEl = document.getElementById('grease-violation-alert');
    alertEl.innerHTML = vc > 0 ? `<div class="alert alert-warning">⚠️ มีประวัติการละเลย ${vc} ครั้ง</div>` : '';

    // Reset status
    document.querySelectorAll('input[name="grease-action"]').forEach(r => r.checked = false);
    document.getElementById('grease-extra-fields').innerHTML = '';
    document.getElementById('grease-save-btn').style.display = 'none';
  };

  window.selectGreaseStatus = (status) => {
    const extraEl = document.getElementById('grease-extra-fields');
    const btn = document.getElementById('grease-save-btn');
    btn.style.display = '';
    const nowStr = new Date().toLocaleString('th-TH');

    if (status === 'called') {
      extraEl.innerHTML = `
        <div class="alert alert-info" style="margin-bottom:8px">📞 เวลาโทร: ${nowStr}</div>
        <div class="form-group">
          <label class="form-label">หมายเหตุ</label>
          <input class="form-control" type="text" id="grease-note" placeholder="ผลการโทร / หมายเหตุ">
        </div>`;
    } else if (status === 'done') {
      extraEl.innerHTML = `
        <div class="form-group">
          <label class="form-label">วันที่อัด</label>
          <input class="form-control" type="date" id="grease-done-date" value="${APP.todayISO()}">
        </div>
        <div class="form-group">
          <label class="form-label">แนบรูปภาพ (ไม่บังคับ)</label>
          <input class="form-control" type="file" id="grease-image" accept="image/*">
        </div>
        <div class="form-group">
          <label class="form-label">หมายเหตุ</label>
          <input class="form-control" type="text" id="grease-note" placeholder="หมายเหตุเพิ่มเติม">
        </div>`;
    } else if (status === 'not_done') {
      extraEl.innerHTML = `
        <div class="alert alert-warning" style="margin-bottom:8px">⏰ เวลาที่บันทึก: ${nowStr}</div>
        <div class="form-group">
          <label class="form-label">หมายเหตุ <span style="color:red">*</span></label>
          <input class="form-control" type="text" id="grease-note" placeholder="เหตุผลที่ยังไม่ได้อัด (บังคับ)">
        </div>`;
    }
  };

  window.saveGreasingRecord = async () => {
    const btn = document.getElementById('grease-save-btn');
    const msg = document.getElementById('grease-msg');
    const sel = document.getElementById('grease-truck-select');
    const truck = activeTrucks.find(t => t.truck_no === sel.value);
    if (!truck) return;

    const actionEl = document.querySelector('input[name="grease-action"]:checked');
    if (!actionEl) { msg.innerHTML = '<div class="alert alert-danger">กรุณาเลือกสถานะงาน</div>'; return; }
    const action = actionEl.value;
    const note = (document.getElementById('grease-note') || {}).value || '';
    if (action === 'not_done' && !note.trim()) {
      msg.innerHTML = '<div class="alert alert-danger">กรุณาระบุหมายเหตุ</div>'; return;
    }

    APP.setButtonLoading(btn, true);
    msg.innerHTML = '';

    try {
      let image_url = '';
      if (action === 'done') {
        const fileEl = document.getElementById('grease-image');
        if (fileEl && fileEl.files[0]) {
          image_url = await uploadImageFile(fileEl.files[0], truck.truck_no, 'อัดจาระบี', APP.todayISO());
        }
      }

      const cycle = document.getElementById('grease-cycle').value;
      const monthYear = document.getElementById('grease-monthyear').value;
      const driver = document.getElementById('grease-driver').value;
      const record = {
        truck_no: truck.truck_no, driver,
        status: truck.status, action_status: action,
        action_datetime: new Date().toISOString(),
        note, image_url
      };
      await APP.saveGreasing(record, APP.todayISO(), cycle, monthYear);
      msg.innerHTML = '<div class="alert alert-success">✅ บันทึกเรียบร้อยแล้ว!</div>';
      APP.setButtonLoading(btn, false);
      document.getElementById('grease-truck-select').value = '';
      document.getElementById('grease-truck-info').style.display = 'none';
      loadGreaseTodayList(monthYear);
    } catch (e) {
      msg.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
      APP.setButtonLoading(btn, false);
    }
  };
}

async function loadGreaseTodayList(monthYear) {
  const el = document.getElementById('grease-today-list');
  const countEl = document.getElementById('grease-today-count');
  if (!el) return;
  try {
    const [year, month] = monthYear.split('-');
    const res = await APP.getHistory('grease', year, month);
    const today = APP.todayISO();
    const todayRecs = (res.records || []).filter(r => r.date === today);
    if (countEl) countEl.textContent = todayRecs.length + ' รายการ';
    if (!todayRecs.length) { el.innerHTML = '<div style="color:#7f8c8d;font-size:14px;padding:8px">ยังไม่มีการบันทึกวันนี้</div>'; return; }
    el.innerHTML = todayRecs.map(r => `
      <div class="truck-row">
        <div class="truck-info">
          <div class="truck-no">${r.truck_no}</div>
          <div class="truck-driver">${r.driver}</div>
        </div>
        <span class="badge ${r.action_status==='done'?'badge-green':r.action_status==='called'?'badge-orange':'badge-red'}">
          ${r.action_status==='done'?'✅ อัดแล้ว':r.action_status==='called'?'📞 โทรแล้ว':'❌ ยังไม่อัด'}
        </span>
        ${r.image_url ? `<a href="${r.image_url}" target="_blank" class="btn btn-sm btn-outline">🖼️</a>` : ''}
      </div>`).join('');
  } catch (e) { el.innerHTML = '<div class="alert alert-danger">โหลดไม่สำเร็จ</div>'; }
}

async function uploadImageFile(file, truck_no, task_type, date) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1];
      const mimeType = file.type;
      try {
        const res = await APP.uploadImage(base64, mimeType, truck_no, task_type, date);
        if (res.success) resolve(res.url);
        else reject(new Error(res.error || 'อัปโหลดรูปไม่สำเร็จ'));
      } catch (err) { reject(err); }
    };
    reader.readAsDataURL(file);
  });
}
window._uploadImageFile = uploadImageFile;
