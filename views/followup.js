// views/followup.js — Call tracking log
window.VIEW_FOLLOWUP = async function render(container) {
  container.innerHTML = `
    <div class="page-title">📞 บันทึกการโทรตาม</div>
    <div class="card">
      <div class="card-title">บันทึกการโทรตามใหม่</div>
      <div id="call-form">
        <div class="form-group">
          <label class="form-label">เบอร์รถ</label>
          <input class="form-control" type="text" id="call-truck" placeholder="เช่น U-01">
        </div>
        <div class="form-group">
          <label class="form-label">ชื่อคนขับ</label>
          <input class="form-control" type="text" id="call-driver" placeholder="ชื่อ-นามสกุล">
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
      <div class="card-title">ประวัติการโทรตาม (ล่าสุด)</div>
      <div id="call-history"><div class="loading"><div class="spinner"></div></div></div>
    </div>
  `;

  // Load call history
  try {
    const res = await APP.getHistory('call', APP.currentMonthYear());
    const records = (res.records || []).slice(-50).reverse();
    const histEl = document.getElementById('call-history');
    if (records.length === 0) {
      histEl.innerHTML = '<div class="alert alert-info">ยังไม่มีประวัติการโทรตาม</div>';
    } else {
      histEl.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>วันที่</th><th>เบอร์รถ</th><th>คนขับ</th><th>งาน</th><th>ผล</th><th>บันทึกโดย</th>
            </tr></thead>
            <tbody>
              ${records.map(r => `<tr>
                <td>${r.date || ''}</td>
                <td><b>${r.truck_no || ''}</b></td>
                <td>${r.driver || ''}</td>
                <td>${r.task_type || ''}</td>
                <td><span class="badge ${r.call_result === 'รับสาย' || r.call_result === 'รับแล้วทำแล้ว' ? 'badge-green' : r.call_result === 'รับแล้วจะทำ' ? 'badge-orange' : 'badge-red'}">${r.call_result || ''}</span></td>
                <td>${r.called_by || ''}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  } catch (e) {
    document.getElementById('call-history').innerHTML = `<div class="alert alert-danger">โหลดประวัติไม่สำเร็จ</div>`;
  }

  // Auto-fill from truck list
  const truckInput = document.getElementById('call-truck');
  truckInput.addEventListener('change', async () => {
    try {
      const res = await APP.getTrucks();
      const truck = (res.trucks || []).find(t => t.truck_no === truckInput.value.trim());
      if (truck) document.getElementById('call-driver').value = truck.driver;
    } catch (e) {}
  });

  window.submitCall = async () => {
    const btn = document.getElementById('call-btn');
    const msg = document.getElementById('call-msg');
    const data = {
      truck_no: document.getElementById('call-truck').value.trim(),
      driver: document.getElementById('call-driver').value.trim(),
      task_type: document.getElementById('call-task').value,
      call_result: document.getElementById('call-result').value,
      note: document.getElementById('call-note').value
    };
    if (!data.truck_no) { msg.innerHTML = '<div class="alert alert-danger">กรุณาระบุเบอร์รถ</div>'; return; }
    APP.setButtonLoading(btn, true);
    try {
      await APP.saveCall(data);
      msg.innerHTML = '<div class="alert alert-success">✅ บันทึกเรียบร้อยแล้ว</div>';
      document.getElementById('call-truck').value = '';
      document.getElementById('call-driver').value = '';
      document.getElementById('call-note').value = '';
      APP.setButtonLoading(btn, false);
      // Reload history
      window.VIEW_FOLLOWUP(document.getElementById('app-container'));
    } catch (e) {
      msg.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
      APP.setButtonLoading(btn, false);
    }
  };
};
