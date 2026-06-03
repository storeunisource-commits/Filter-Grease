// views/entry-form.js — Shared entry form for blow/drain
// Called by: blowing.js, drain.js
// renderEntryForm(container, trucks, violations, today, week, type, taskName)

window.renderEntryForm = function(container, trucks, violations, today, week, type, taskName) {
  const activeTrucks = trucks.filter(t => t.active !== false && t.active !== 'FALSE');

  // Violation count per truck
  const vioCount = {};
  violations.forEach(v => { vioCount[v.truck_no] = (vioCount[v.truck_no] || 0) + 1; });

  container.innerHTML = `
    <div class="card">
      <div class="card-title">เลือกรถที่จะบันทึก</div>
      <div class="form-group">
        <label class="form-label">เบอร์รถ</label>
        <select class="form-control" id="${type}-truck-select" onchange="onTruckSelect_${type}()">
          ${APP.buildTruckOptions(activeTrucks)}
        </select>
      </div>
      <div id="${type}-truck-info" style="display:none">
        <div class="form-group">
          <label class="form-label">คนขับ</label>
          <input class="form-control" type="text" id="${type}-driver" placeholder="ชื่อคนขับ">
        </div>
        <div id="${type}-violation-alert"></div>
        <div class="form-group">
          <label class="form-label">สถานะงาน</label>
          <div class="status-options">
            <label class="status-option" onclick="selectStatus_${type}('called')">
              <input type="radio" name="${type}-action" value="called"> 📞 โทรแจ้งแล้ว
              <span class="status-hint">บันทึกเวลาโทรอัตโนมัติ + หมายเหตุ</span>
            </label>
            <label class="status-option" onclick="selectStatus_${type}('done')">
              <input type="radio" name="${type}-action" value="done"> ✅ ทำแล้ว
              <span class="status-hint">บันทึกวันที่ + แนบรูปได้</span>
            </label>
            <label class="status-option" onclick="selectStatus_${type}('not_done')">
              <input type="radio" name="${type}-action" value="not_done"> ❌ ยังไม่ได้ทำ
              <span class="status-hint">ระบุหมายเหตุบังคับ</span>
            </label>
          </div>
        </div>
        <div id="${type}-extra-fields"></div>
        <div id="${type}-msg"></div>
        <button class="btn btn-primary btn-full" id="${type}-save-btn" onclick="saveEntryRecord_${type}()" style="display:none">💾 บันทึก</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">รายการที่บันทึกวันนี้ <span id="${type}-today-count" class="badge badge-green" style="margin-left:8px"></span></div>
      <div id="${type}-today-list"><div class="loading"><div class="spinner"></div></div></div>
    </div>
  `;

  // Store state on window (scoped by type to avoid conflicts)
  window[`_${type}Trucks`] = activeTrucks;
  window[`_${type}VioCount`] = vioCount;
  window[`_${type}Today`] = today;
  window[`_${type}Week`] = week;
  window[`_${type}TaskName`] = taskName;

  // Load today records
  loadTodayList(type, today);

  // Pre-select รถถ้ามี (มาจาก fleet table กด "จัดการ")
  if (window._pendingTruck) {
    const sel = document.getElementById(`${type}-truck-select`);
    if (sel) {
      sel.value = window._pendingTruck;
      window._pendingTruck = null;
      // Trigger onchange
      const fn = window[`onTruckSelect_${type}`];
      if (fn) setTimeout(fn, 50);
    }
  }

  window[`onTruckSelect_${type}`] = () => {
    const sel = document.getElementById(`${type}-truck-select`);
    const truck = activeTrucks.find(t => t.truck_no === sel.value);
    const infoDiv = document.getElementById(`${type}-truck-info`);
    if (!truck) { infoDiv.style.display = 'none'; return; }
    infoDiv.style.display = '';
    document.getElementById(`${type}-driver`).value = truck.driver || '';

    const vc = vioCount[truck.truck_no] || 0;
    const alertEl = document.getElementById(`${type}-violation-alert`);
    alertEl.innerHTML = vc > 0 ? `<div class="alert alert-warning">⚠️ มีประวัติการละเลย ${vc} ครั้ง</div>` : '';

    // Reset
    document.querySelectorAll(`input[name="${type}-action"]`).forEach(r => r.checked = false);
    document.getElementById(`${type}-extra-fields`).innerHTML = '';
    document.getElementById(`${type}-save-btn`).style.display = 'none';
  };

  window[`selectStatus_${type}`] = (status) => {
    const extraEl = document.getElementById(`${type}-extra-fields`);
    const btn = document.getElementById(`${type}-save-btn`);
    btn.style.display = '';
    const nowStr = new Date().toLocaleString('th-TH');

    if (status === 'called') {
      extraEl.innerHTML = `
        <div class="alert alert-info" style="margin-bottom:8px">📞 เวลาโทร: ${nowStr}</div>
        <div class="form-group">
          <label class="form-label">หมายเหตุ</label>
          <input class="form-control" type="text" id="${type}-note" placeholder="ผลการโทร / หมายเหตุ">
        </div>`;
    } else if (status === 'done') {
      extraEl.innerHTML = `
        <div class="form-group">
          <label class="form-label">วันที่ทำ</label>
          <input class="form-control" type="date" id="${type}-done-date" value="${APP.todayISO()}">
        </div>
        <div class="form-group">
          <label class="form-label">แนบรูปภาพ (ไม่บังคับ, เลือกได้หลายรูป)</label>
          <input class="form-control" type="file" id="${type}-image" accept="image/*" multiple>
        </div>
        <div class="form-group">
          <label class="form-label">หมายเหตุ</label>
          <input class="form-control" type="text" id="${type}-note" placeholder="หมายเหตุเพิ่มเติม">
        </div>`;
    } else {
      extraEl.innerHTML = `
        <div class="alert alert-warning" style="margin-bottom:8px">⏰ เวลาที่บันทึก: ${nowStr}</div>
        <div class="form-group">
          <label class="form-label">หมายเหตุ <span style="color:red">*</span></label>
          <input class="form-control" type="text" id="${type}-note" placeholder="เหตุผลที่ยังไม่ได้ทำ (บังคับ)">
        </div>`;
    }
  };

  window[`saveEntryRecord_${type}`] = async () => {
    const btn = document.getElementById(`${type}-save-btn`);
    const msg = document.getElementById(`${type}-msg`);
    const sel = document.getElementById(`${type}-truck-select`);
    const trucks2 = window[`_${type}Trucks`];
    const truck = trucks2.find(t => t.truck_no === sel.value);
    if (!truck) return;

    const actionEl = document.querySelector(`input[name="${type}-action"]:checked`);
    if (!actionEl) { msg.innerHTML = '<div class="alert alert-danger">กรุณาเลือกสถานะงาน</div>'; return; }
    const action = actionEl.value;
    const note = (document.getElementById(`${type}-note`) || {}).value || '';
    if (action === 'not_done' && !note.trim()) {
      msg.innerHTML = '<div class="alert alert-danger">กรุณาระบุหมายเหตุ</div>'; return;
    }

    APP.setButtonLoading(btn, true);
    msg.innerHTML = '';

    try {
      let image_url = '';
      if (action === 'done') {
        const fileEl = document.getElementById(`${type}-image`);
        if (fileEl && fileEl.files.length > 0 && window._uploadImageFile) {
          const urls = [];
          for (let i = 0; i < fileEl.files.length; i++) {
            try {
              const url = await window._uploadImageFile(fileEl.files[i], truck.truck_no,
                window[`_${type}TaskName`], APP.todayISO());
              if (url) urls.push(url);
            } catch (e) { /* skip failed images */ }
          }
          image_url = urls.join(',');
        }
      }

      const driver = document.getElementById(`${type}-driver`).value;
      const record = {
        truck_no: truck.truck_no, driver, status: truck.status,
        action_status: action, action_datetime: new Date().toISOString(),
        note, image_url
      };

      if (type === 'blow') {
        await APP.saveBlow(record, window[`_${type}Today`]);
      } else {
        await APP.saveDrain(record, window[`_${type}Today`]);
      }

      msg.innerHTML = '<div class="alert alert-success">✅ บันทึกเรียบร้อยแล้ว!</div>';
      APP.setButtonLoading(btn, false);
      sel.value = '';
      document.getElementById(`${type}-truck-info`).style.display = 'none';
      loadTodayList(type, window[`_${type}Today`]);
    } catch (e) {
      msg.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
      APP.setButtonLoading(btn, false);
    }
  };
};

async function loadTodayList(type, today) {
  const el = document.getElementById(`${type}-today-list`);
  const countEl = document.getElementById(`${type}-today-count`);
  if (!el) return;
  try {
    const now = new Date(today);
    const res = await APP.getHistory(type, now.getFullYear(), now.getMonth() + 1);
    const todayRecs = (res.records || []).filter(r => r.date === today);
    if (countEl) countEl.textContent = todayRecs.length + ' รายการ';
    if (!todayRecs.length) {
      el.innerHTML = '<div style="color:#7f8c8d;font-size:14px;padding:8px">ยังไม่มีการบันทึกวันนี้</div>';
      return;
    }
    el.innerHTML = todayRecs.map(r => `
      <div class="truck-row">
        <div class="truck-info">
          <div class="truck-no">${r.truck_no}</div>
          <div class="truck-driver">${r.driver} ${APP.createStatusBadge(r.status)}</div>
          ${r.note ? `<div style="font-size:12px;color:#7f8c8d">${r.note}</div>` : ''}
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge ${r.action_status==='done'?'badge-green':r.action_status==='called'?'badge-orange':'badge-red'}">
            ${r.action_status==='done'?'✅ ทำแล้ว':r.action_status==='called'?'📞 โทรแล้ว':'❌ ยังไม่ทำ'}
          </span>
          ${r.week ? `<span class="badge">W${r.week}</span>` : ''}
          ${r.image_url ? `<a href="${r.image_url}" target="_blank" class="btn btn-sm btn-outline">🖼️</a>` : ''}
        </div>
      </div>`).join('');
  } catch (e) {
    el.innerHTML = '<div class="alert alert-danger">โหลดไม่สำเร็จ</div>';
  }
}
