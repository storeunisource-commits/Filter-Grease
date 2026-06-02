// views/violations.js — Violations and penalty tracking
const PENALTIES = [
  { count: 1, action: 'ตักเตือนด้วยวาจา',                          color: 'badge-orange' },
  { count: 2, action: 'ตักเตือนเป็นลายลักษณ์อักษร',               color: 'badge-red'    },
  { count: 3, action: 'ตัดเงิน / พักงาน (ตามดุลพินิจผู้บริหาร)', color: 'badge-red'    }
];

const CYCLE_OPTIONS = {
  'เป่ากรอง':     ['Week 1','Week 2','Week 3','Week 4'],
  'อัดจาระบี':    ['รอบ 10-15','รอบ 25-ท้ายเดือน'],
  'เดรนน้ำถังลม': ['Week 1','Week 2','Week 3','Week 4']
};

function getPenaltyByCount(n) {
  if (n <= 0) return PENALTIES[0];
  if (n === 1) return PENALTIES[0];
  if (n === 2) return PENALTIES[1];
  return PENALTIES[2];
}

window.VIEW_VIOLATIONS = async function render(container) {
  const now = new Date();

  container.innerHTML = `
    <div class="page-title">⚠️ สรุปมาตรการ / บทลงโทษ</div>

    <div class="card">
      <div class="card-title">บทลงโทษตามขั้นตอน</div>
      ${PENALTIES.map((p, i) => `
        <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span class="badge ${p.color}">ครั้งที่ ${i+1}${i===2?'+':''}</span>
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
      <div id="vio-truck-info" style="display:none">
        <div class="form-group">
          <label class="form-label">คนขับ</label>
          <input class="form-control" type="text" id="vio-driver" placeholder="ชื่อคนขับ" readonly>
        </div>
        <div id="vio-penalty-preview" style="margin-bottom:12px"></div>
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
          <label class="form-label">หมายเหตุ</label>
          <input class="form-control" type="text" id="vio-note" placeholder="รายละเอียดเพิ่มเติม">
        </div>
        <div id="vio-msg"></div>
        <button class="btn btn-danger btn-full" id="vio-btn" onclick="submitViolation()">⚠️ บันทึกการละเลย</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">ประวัติการละเลยทั้งหมด</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        <select class="form-control" id="vio-filter-year" style="width:auto">${APP.buildYearOptions(now.getFullYear())}</select>
        <select class="form-control" id="vio-filter-month" style="width:auto">${APP.buildMonthOptions(now.getMonth()+1)}</select>
        <button class="btn btn-sm btn-primary" onclick="loadVioHistory()">🔍 ค้นหา</button>
        <button class="btn btn-sm btn-outline" onclick="window.print()">🖨️ พิมพ์</button>
      </div>
      <div id="vio-history"><div class="loading"><div class="spinner"></div></div></div>
    </div>
  `;

  // Load trucks for dropdown (cached)
  try {
    const res = await APP.getTrucksCached();
    const sel = document.getElementById('vio-truck');
    const activeTrucks = (res.trucks || []).filter(t => t.active !== false && t.active !== 'FALSE');
    sel.innerHTML = '<option value="">-- เลือกเบอร์รถ --</option>' +
      activeTrucks.map(t => `<option value="${t.truck_no}" data-driver="${t.driver||''}">${t.truck_no} (${t.driver||'-'})</option>`).join('');
  } catch (e) {}

  // Init cycle dropdown
  updateVioCycleOptions('เป่ากรอง');

  // State
  window._vioTruckVioCount = {};

  window.onVioTruckChange = async () => {
    const sel = document.getElementById('vio-truck');
    const opt = sel.options[sel.selectedIndex];
    const infoDiv = document.getElementById('vio-truck-info');
    if (!opt || !opt.value) { infoDiv.style.display = 'none'; return; }

    document.getElementById('vio-driver').value = opt.dataset.driver || '';
    infoDiv.style.display = '';

    // นับ violations ของ truck นี้
    const previewEl = document.getElementById('vio-penalty-preview');
    previewEl.innerHTML = '<div style="color:#7f8c8d;font-size:13px">กำลังตรวจประวัติ...</div>';
    try {
      const res = await APP.getViolations({ truck_no: opt.value });
      const vioCount = (res.records || []).length;
      const nextCount = vioCount + 1;
      const penalty = getPenaltyByCount(nextCount);
      window._vioTruckVioCount[opt.value] = vioCount;
      const warningHtml = nextCount >= 3
        ? `<div class="alert alert-danger">🚨 ครั้งที่ ${nextCount} — บทลงโทษ: <strong>${penalty.action}</strong><br>⚠️ พิจารณาออกใบสั่งหยุดวิ่งด้วย</div>`
        : `<div class="alert alert-warning">📋 ประวัติการละเลยก่อนหน้า: <strong>${vioCount} ครั้ง</strong><br>บันทึกนี้จะเป็นครั้งที่ <strong>${nextCount}</strong> — บทลงโทษ: ${penalty.action}</div>`;
      previewEl.innerHTML = warningHtml;
    } catch (e) {
      previewEl.innerHTML = '';
    }
  };

  window.onVioTaskChange = () => {
    const task = document.getElementById('vio-task').value;
    updateVioCycleOptions(task);
  };

  window.submitViolation = async () => {
    const btn = document.getElementById('vio-btn');
    const msg = document.getElementById('vio-msg');
    const truckSel = document.getElementById('vio-truck');
    const truck_no = truckSel.value;
    const driver = document.getElementById('vio-driver').value.trim();
    const task_type = document.getElementById('vio-task').value;
    const cycle = document.getElementById('vio-cycle').value;
    const violation_type = document.getElementById('vio-type').value;
    const note = document.getElementById('vio-note').value;

    if (!truck_no || !driver) {
      msg.innerHTML = '<div class="alert alert-danger">กรุณาเลือกเบอร์รถ</div>'; return;
    }

    // คำนวณ penalty อัตโนมัติ
    const prevCount = window._vioTruckVioCount[truck_no] || 0;
    const newCount = prevCount + 1;
    const penalty = getPenaltyByCount(newCount);

    if (!confirm(`ยืนยันบันทึกการละเลยของ ${truck_no} (${driver})\nครั้งที่ ${newCount} — ${penalty.action}?`)) return;

    APP.setButtonLoading(btn, true);
    msg.innerHTML = '';
    try {
      await APP.saveViolation({ truck_no, driver, task_type, cycle, violation_type, penalty: penalty.action, note: note || '' });
      msg.innerHTML = `<div class="alert alert-success">✅ บันทึกการละเลยครั้งที่ ${newCount} เรียบร้อย</div>`;
      APP.setButtonLoading(btn, false);
      loadVioHistory();

      // ถ้า >= 3 ครั้ง แนะนำออกใบหยุดวิ่ง
      if (newCount >= 3) {
        setTimeout(() => {
          if (confirm(`🚨 ${truck_no} มีการละเลยสะสม ${newCount} ครั้งแล้ว\nต้องการออกใบสั่งหยุดวิ่งด้วยหรือไม่?`)) {
            window.location.hash = '#stoporder';
          }
        }, 500);
      }
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
      const records = (res.records || []).slice().reverse().slice(0, 200);
      if (!records.length) {
        el.innerHTML = '<div class="alert alert-success">✅ ไม่มีการบันทึกการละเลยในช่วงนี้</div>'; return;
      }
      el.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>วันที่</th><th>เบอร์รถ</th><th>คนขับ</th><th>งาน</th><th>รอบ</th><th>ประเภท</th><th>บทลงโทษ</th><th>บันทึกโดย</th></tr>
            </thead>
            <tbody>
              ${records.map(r => `<tr>
                <td>${r.date||''}</td>
                <td><strong>${r.truck_no||''}</strong></td>
                <td>${r.driver||''}</td>
                <td>${r.task_type||''}</td>
                <td>${r.cycle||''}</td>
                <td>${r.violation_type||''}</td>
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
