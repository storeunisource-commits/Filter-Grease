// views/followup.js — Call tracking log (truck dropdown)
window.VIEW_FOLLOWUP = async function render(container) {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  container.innerHTML = `
    <div class="page-title">📞 บันทึกการโทรตาม</div>
    <div class="card">
      <div class="card-title">บันทึกการโทรตามใหม่</div>
      <div id="call-form">
        <div class="form-group">
          <label class="form-label">เบอร์รถ</label>
          <select class="form-control" id="call-truck" onchange="onCallTruckChange()">
            <option value="">-- เลือกเบอร์รถ --</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">คนขับ</label>
          <input class="form-control" type="text" id="call-driver" placeholder="ชื่อคนขับ" readonly>
        </div>
        <div class="form-group">
          <label class="form-label">งานที่โทรตาม</label>
          <select class="form-control" id="call-task">
            <option value="เป่ากรอง">เป่ากรอง</option>
            <option value="อัดจาระบี">อัดจาระบี</option>
            <option value="เดรนน้ำถังลม">เดรนน้ำถังลม</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">ผลการโทร</label>
          <select class="form-control" id="call-result">
            <option value="รับสาย">รับสาย</option>
            <option value="ไม่รับ">ไม่รับ</option>
            <option value="รับแล้วจะทำ">รับแล้วจะทำ</option>
            <option value="รับแล้วทำแล้ว">รับแล้วทำแล้ว</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">หมายเหตุ</label>
          <input class="form-control" type="text" id="call-note" placeholder="รายละเอียดเพิ่มเติม">
        </div>
        <div id="call-msg"></div>
        <button class="btn btn-primary btn-full" id="call-btn" onclick="submitCall()">📞 บันทึกการโทร</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title">ประวัติการโทรตาม</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        <select class="form-control" id="call-hist-year" style="width:auto">${APP.buildYearOptions(curYear)}</select>
        <select class="form-control" id="call-hist-month" style="width:auto">${APP.buildMonthOptions(curMonth)}</select>
        <button class="btn btn-sm btn-primary" onclick="loadCallHistory()">🔍 ค้นหา</button>
      </div>
      <div id="call-history"><div class="loading"><div class="spinner"></div></div></div>
    </div>
  `;

  // Load trucks for dropdown
  try {
    const res = await APP.getTrucksCached();
    const sel = document.getElementById('call-truck');
    const trucks = (res.trucks || []).filter(t => t.active !== false && t.active !== 'FALSE');
    sel.innerHTML = '<option value="">-- เลือกเบอร์รถ --</option>' +
      trucks.map(t => `<option value="${t.truck_no}" data-driver="${t.driver||''}">${t.truck_no} (${t.driver||'-'})</option>`).join('');
  } catch (e) {}

  window.onCallTruckChange = () => {
    const sel = document.getElementById('call-truck');
    const opt = sel.options[sel.selectedIndex];
    document.getElementById('call-driver').value = opt ? (opt.dataset.driver || '') : '';
  };

  window.loadCallHistory = async () => {
    const yr = document.getElementById('call-hist-year').value;
    const mo = document.getElementById('call-hist-month').value;
    const histEl = document.getElementById('call-history');
    histEl.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      const res = await APP.getHistory('call', yr, mo || null);
      const records = (res.records || []).slice().reverse().slice(0, 100);
      if (!records.length) {
        histEl.innerHTML = '<div class="alert alert-info">ยังไม่มีประวัติการโทรตาม</div>';
      } else {
        histEl.innerHTML = `
          <div class="table-wrap">
            <table>
              <thead><tr><th>วันที่</th><th>เบอร์รถ</th><th>คนขับ</th><th>งาน</th><th>ผล</th><th>หมายเหตุ</th><th>บันทึกโดย</th></tr></thead>
              <tbody>
                ${records.map(r => `<tr>
                  <td>${r.date||''}</td>
                  <td><strong>${r.truck_no||''}</strong></td>
                  <td>${r.driver||''}</td>
                  <td>${r.task_type||''}</td>
                  <td><span class="badge ${r.call_result==='รับแล้วทำแล้ว'||r.call_result==='รับสาย'?'badge-green':r.call_result==='รับแล้วจะทำ'?'badge-orange':'badge-red'}">${r.call_result||''}</span></td>
                  <td style="font-size:12px">${r.note||''}</td>
                  <td style="font-size:12px">${r.called_by||''}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`;
      }
    } catch (e) {
      histEl.innerHTML = `<div class="alert alert-danger">โหลดประวัติไม่สำเร็จ: ${e.message}</div>`;
    }
  };

  window.submitCall = async () => {
    const btn = document.getElementById('call-btn');
    const msg = document.getElementById('call-msg');
    const data = {
      truck_no: document.getElementById('call-truck').value,
      driver: document.getElementById('call-driver').value.trim(),
      task_type: document.getElementById('call-task').value,
      call_result: document.getElementById('call-result').value,
      note: document.getElementById('call-note').value
    };
    if (!data.truck_no) { msg.innerHTML = '<div class="alert alert-danger">กรุณาเลือกเบอร์รถ</div>'; return; }
    APP.setButtonLoading(btn, true);
    try {
      await APP.saveCall(data);
      msg.innerHTML = '<div class="alert alert-success">✅ บันทึกเรียบร้อยแล้ว</div>';
      document.getElementById('call-truck').value = '';
      document.getElementById('call-driver').value = '';
      document.getElementById('call-note').value = '';
      APP.setButtonLoading(btn, false);
      loadCallHistory();
    } catch (e) {
      msg.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
      APP.setButtonLoading(btn, false);
    }
  };

  // Load initial history
  loadCallHistory();
};
