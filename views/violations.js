// views/violations.js — Violations and penalty tracking
const PENALTIES = [
  { count: 1, label: 'ครั้งที่ 1', action: 'ตักเตือนด้วยวาจา', color: 'badge-orange' },
  { count: 2, label: 'ครั้งที่ 2', action: 'ตักเตือนเป็นลายลักษณ์อักษร', color: 'badge-red' },
  { count: 3, label: 'ครั้งที่ 3+', action: 'ตัดเงิน / พักงาน (ตามดุลพินิจผู้บริหาร)', color: 'badge-red' }
];

const CYCLE_OPTIONS = {
  'เป่ากรอง':    ['Week 1','Week 2','Week 3','Week 4'],
  'อัดจาระบี':   ['รอบ 10-15','รอบ 25-ท้ายเดือน'],
  'เดรนน้ำถังลม':['Week 1','Week 2','Week 3','Week 4']
};

window.VIEW_VIOLATIONS = async function render(container) {
  const now = new Date();

  container.innerHTML = `
    <div class="page-title">⚠️ สรุปมาตรการ / บทลงโทษ</div>

    <div class="card">
      <div class="card-title">บทลงโทษตามขั้นตอน</div>
      ${PENALTIES.map(p => `
        <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span class="badge ${p.color}">${p.label}</span>
          <span>${p.action}</span>
        </div>`).join('')}
    </div>

    <div class="card">
      <div class="card-title">บันทึกการละเลยใหม่</div>
      <div class="form-group">
        <label class="form-label">เบอร์รถ</label>
        <select class="form-control" id="vio-truck" onchange="onVioTruckChange()">
          <option value="">-- เลือกเบอร์รถ --</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">คนขับ</label>
        <input class="form-control" type="text" id="vio-driver" placeholder="ชื่อคนขับ">
      </div>
      <div class="form-group">
        <label class="form-label">งานที่ละเลย</label>
        <select class="form-control" id="vio-task" onchange="onVioTaskChange()">
          <option value="เป่ากรอง">เป่ากรอง</option>
          <option value="อัดจาระบี">อัดจาระบี</option>
          <option value="เดรนน้ำถังลม">เดรนน้ำถังลม</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">รอบ</label>
        <select class="form-control" id="vio-cycle"></select>
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
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        <select class="form-control" id="vio-filter-year" style="width:auto">${APP.buildYearOptions(now.getFullYear())}</select>
        <select class="form-control" id="vio-filter-month" style="width:auto">${APP.buildMonthOptions(now.getMonth()+1)}</select>
        <button class="btn btn-sm btn-primary" onclick="loadVioHistory()">🔍 ค้นหา</button>
        <button class="btn btn-sm btn-outline" onclick="window.print()">🖨️ พิมพ์</button>
      </div>
      <div id="vio-history"><div class="loading"><div class="spinner"></div></div></div>
    </div>
  `;

  // Load trucks for dropdown
  try {
    const res = await APP.getTrucks();
    const sel = document.getElementById('vio-truck');
    sel.innerHTML = '<option value="">-- เลือกเบอร์รถ --</option>' +
      (res.trucks || []).map(t => `<option value="${t.truck_no}" data-driver="${t.driver}">${t.truck_no} (${t.driver})</option>`).join('');
  } catch (e) {}

  // Init cycle dropdown
  updateVioCycleOptions('เป่ากรอง');

  window.onVioTruckChange = () => {
    const sel = document.getElementById('vio-truck');
    const opt = sel.options[sel.selectedIndex];
    document.getElementById('vio-driver').value = opt ? (opt.dataset.driver || '') : '';
  };

  window.onVioTaskChange = () => {
    const task = document.getElementById('vio-task').value;
    updateVioCycleOptions(task);
  };

  window.submitViolation = async () => {
    const btn = document.getElementById('vio-btn');
    const msg = document.getElementById('vio-msg');
    const data = {
      truck_no: document.getElementById('vio-truck').value,
      driver: document.getElementById('vio-driver').value.trim(),
      task_type: document.getElementById('vio-task').value,
      cycle: document.getElementById('vio-cycle').value,
      violation_type: document.getElementById('vio-type').value,
      penalty: document.getElementById('vio-penalty').value
    };
    if (!data.truck_no || !data.driver) {
      msg.innerHTML = '<div class="alert alert-danger">กรุณาเลือกเบอร์รถ</div>'; return;
    }
    if (!confirm(`ยืนยันการบันทึกการละเลยของ ${data.truck_no} (${data.driver})?`)) return;
    APP.setButtonLoading(btn, true);
    try {
      await APP.saveViolation(data);
      msg.innerHTML = '<div class="alert alert-success">✅ บันทึกเรียบร้อยแล้ว</div>';
      APP.setButtonLoading(btn, false);
      loadVioHistory();
    } catch (e) {
      msg.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
      APP.setButtonLoading(btn, false);
    }
  };

  window.loadVioHistory = async () => {
    const yr = document.getElementById('vio-filter-year').value;
    const mo = document.getElementById('vio-filter-month').value;
    const el = document.getElementById('vio-history');
    el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      const res = await APP.getViolations({ year: yr, month: mo || null });
      const records = (res.records || []).reverse().slice(0, 100);
      if (!records.length) {
        el.innerHTML = '<div class="alert alert-success">✅ ไม่มีการบันทึกการละเลยในช่วงนี้</div>'; return;
      }
      el.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>วันที่</th><th>เบอร์รถ</th><th>คนขับ</th><th>งาน</th><th>รอบ</th><th>ประเภท</th><th>บทลงโทษ</th><th>บันทึกโดย</th></tr></thead>
            <tbody>
              ${records.map(r => `<tr>
                <td>${r.date||''}</td><td><b>${r.truck_no||''}</b></td><td>${r.driver||''}</td>
                <td>${r.task_type||''}</td><td>${r.cycle||''}</td><td>${r.violation_type||''}</td>
                <td><span class="badge badge-red">${r.penalty||''}</span></td>
                <td style="font-size:12px">${r.recorded_by||''}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (e) {
      el.innerHTML = `<div class="alert alert-danger">โหลดไม่สำเร็จ: ${e.message}</div>`;
    }
  };

  loadVioHistory();
};

function updateVioCycleOptions(task) {
  const sel = document.getElementById('vio-cycle');
  if (!sel) return;
  const options = CYCLE_OPTIONS[task] || ['Week 1','Week 2','Week 3','Week 4'];
  sel.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('');
}
