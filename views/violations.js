// views/violations.js — Violations and penalty tracking
const PENALTIES = [
  { count: 1, label: 'ครั้งที่ 1', action: 'ตักเตือนด้วยวาจา', color: 'badge-orange' },
  { count: 2, label: 'ครั้งที่ 2', action: 'ตักเตือนเป็นลายลักษณ์อักษร', color: 'badge-red' },
  { count: 3, label: 'ครั้งที่ 3+', action: 'ตัดเงิน / พักงาน (ตามดุลพินิจผู้บริหาร)', color: 'badge-red' }
];

window.VIEW_VIOLATIONS = async function render(container) {
  container.innerHTML = `
    <div class="page-title">⚠️ สรุปมาตรการ / บทลงโทษ</div>

    <div class="card">
      <div class="card-title">บทลงโทษตามขั้นตอน</div>
      ${PENALTIES.map(p => `
        <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span class="badge ${p.color}">${p.label}</span>
          <span>${p.action}</span>
        </div>
      `).join('')}
    </div>

    <div class="card">
      <div class="card-title">บันทึกการละเลยใหม่</div>
      <div class="form-group">
        <label class="form-label">เบอร์รถ</label>
        <input class="form-control" type="text" id="vio-truck" placeholder="เช่น U-01">
      </div>
      <div class="form-group">
        <label class="form-label">ชื่อคนขับ</label>
        <input class="form-control" type="text" id="vio-driver">
      </div>
      <div class="form-group">
        <label class="form-label">งานที่ละเลย</label>
        <select class="form-control" id="vio-task">
          <option value="เป่ากรอง">เป่ากรอง</option>
          <option value="อัดจาระบี">อัดจาระบี</option>
          <option value="เดรนน้ำถังลม">เดรนน้ำถังลม</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">รอบ</label>
        <input class="form-control" type="text" id="vio-cycle" placeholder="เช่น 10-15 หรือ เดือน มิ.ย.">
      </div>
      <div class="form-group">
        <label class="form-label">ประเภทการละเลย</label>
        <select class="form-control" id="vio-type">
          <option value="ไม่ทำตามกำหนด">ไม่ทำตามกำหนด</option>
          <option value="ทำไม่ครบ">ทำไม่ครบ</option>
          <option value="ไม่แจ้งให้ทราบ">ไม่แจ้งให้ทราบ</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">บทลงโทษ</label>
        <select class="form-control" id="vio-penalty">
          ${PENALTIES.map(p => `<option value="${p.action}">${p.label}: ${p.action}</option>`).join('')}
        </select>
      </div>
      <div id="vio-msg"></div>
      <button class="btn btn-danger btn-full" id="vio-btn" onclick="submitViolation()">⚠️ บันทึกการละเลย</button>
    </div>

    <div class="card">
      <div class="card-title">ประวัติการละเลย</div>
      <div id="vio-history"><div class="loading"><div class="spinner"></div></div></div>
    </div>
  `;

  // Load history
  try {
    const res = await APP.getViolations();
    const records = (res.records || []).reverse().slice(0, 100);
    const el = document.getElementById('vio-history');

    if (!records.length) {
      el.innerHTML = '<div class="alert alert-success">✅ ยังไม่มีการบันทึกการละเลย</div>';
    } else {
      // Group by driver
      const byDriver = {};
      records.forEach(r => {
        if (!byDriver[r.driver]) byDriver[r.driver] = [];
        byDriver[r.driver].push(r);
      });

      el.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>วันที่</th><th>เบอร์รถ</th><th>คนขับ</th><th>งาน</th><th>รอบ</th><th>ประเภท</th><th>บทลงโทษ</th>
            </tr></thead>
            <tbody>
              ${records.map(r => `<tr>
                <td>${r.date || ''}</td>
                <td><b>${r.truck_no || ''}</b></td>
                <td>${r.driver || ''}</td>
                <td>${r.task_type || ''}</td>
                <td>${r.cycle || ''}</td>
                <td>${r.violation_type || ''}</td>
                <td><span class="badge badge-red">${r.penalty || ''}</span></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:8px;text-align:right">
          <button class="btn btn-sm btn-outline" onclick="window.print()">🖨️ พิมพ์</button>
        </div>
      `;
    }
  } catch (e) {
    document.getElementById('vio-history').innerHTML = `<div class="alert alert-danger">โหลดไม่สำเร็จ</div>`;
  }

  // Auto-fill driver
  document.getElementById('vio-truck').addEventListener('change', async () => {
    try {
      const res = await APP.getTrucks();
      const truck = (res.trucks || []).find(t => t.truck_no === document.getElementById('vio-truck').value.trim());
      if (truck) document.getElementById('vio-driver').value = truck.driver;
    } catch (e) {}
  });

  window.submitViolation = async () => {
    const btn = document.getElementById('vio-btn');
    const msg = document.getElementById('vio-msg');
    const data = {
      truck_no: document.getElementById('vio-truck').value.trim(),
      driver: document.getElementById('vio-driver').value.trim(),
      task_type: document.getElementById('vio-task').value,
      cycle: document.getElementById('vio-cycle').value,
      violation_type: document.getElementById('vio-type').value,
      penalty: document.getElementById('vio-penalty').value
    };
    if (!data.truck_no || !data.driver) {
      msg.innerHTML = '<div class="alert alert-danger">กรุณาระบุเบอร์รถและชื่อคนขับ</div>';
      return;
    }
    if (!confirm(`ยืนยันการบันทึกการละเลยของ ${data.truck_no} (${data.driver})?`)) return;
    APP.setButtonLoading(btn, true);
    try {
      await APP.saveViolation(data);
      msg.innerHTML = '<div class="alert alert-success">✅ บันทึกเรียบร้อยแล้ว</div>';
      APP.setButtonLoading(btn, false);
      setTimeout(() => window.VIEW_VIOLATIONS(document.getElementById('app-container')), 1500);
    } catch (e) {
      msg.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
      APP.setButtonLoading(btn, false);
    }
  };
};
