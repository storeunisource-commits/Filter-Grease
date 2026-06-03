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

    <!-- Per-person history -->
    <div class="card">
      <div class="card-title">📄 ประวัติรายคน</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
        <select class="form-control" id="vio-person-truck" style="width:auto">
          <option value="">-- เลือกรถ --</option>
        </select>
        <button class="btn btn-sm btn-primary" onclick="loadPersonHistory()">🔍 โหลด</button>
      </div>
      <div id="vio-person-result"></div>
    </div>
  `;

  // Load trucks for dropdowns (cached)
  let _activeTrucks = [];
  try {
    const res = await APP.getTrucksCached();
    _activeTrucks = (res.trucks || []).filter(t => t.active !== false && t.active !== 'FALSE');
    const truckOptionHtml = '<option value="">-- เลือกเบอร์รถ --</option>' +
      _activeTrucks.map(t => `<option value="${t.truck_no}" data-driver="${t.driver||''}">${t.truck_no} (${t.driver||'-'})</option>`).join('');
    const sel = document.getElementById('vio-truck');
    if (sel) sel.innerHTML = truckOptionHtml;
    const selPerson = document.getElementById('vio-person-truck');
    if (selPerson) selPerson.innerHTML = '<option value="">-- เลือกรถ --</option>' +
      _activeTrucks.map(t => `<option value="${t.truck_no}" data-driver="${t.driver||''}">${t.truck_no} (${t.driver||'-'})</option>`).join('');
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
      const saveRes = await APP.saveViolation({ truck_no, driver, task_type, cycle, violation_type, penalty: penalty.action, note: note || '' });
      const actualCount = saveRes.vio_count || newCount;
      const letterInfo = saveRes.letter_no ? `<br>📋 ออกหนังสือเตือนเลขที่ <strong>${saveRes.letter_no}</strong> อัตโนมัติ` : '';
      const stopInfo = saveRes.auto_stop_order ? `<br>🚫 ออกใบสั่งหยุดวิ่งเลขที่ <strong>${saveRes.auto_stop_order}</strong> อัตโนมัติ` : '';
      msg.innerHTML = `<div class="alert alert-success">✅ บันทึกการละเลยครั้งที่ ${actualCount} เรียบร้อย${letterInfo}${stopInfo}</div>`;
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

  window.loadPersonHistory = async () => {
    const sel = document.getElementById('vio-person-truck');
    const truck_no = sel ? sel.value : '';
    if (!truck_no) { alert('กรุณาเลือกรถก่อน'); return; }
    const driver = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].dataset.driver || '' : '';
    const el = document.getElementById('vio-person-result');
    el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      const res = await APP.getViolations({ truck_no });
      const records = (res.records || []).slice().reverse();
      if (!records.length) {
        el.innerHTML = '<div class="alert alert-success">✅ ไม่มีประวัติการละเลยสำหรับรถคันนี้</div>';
        return;
      }
      const level = records.length >= 3 ? 3 : records.length;
      el.innerHTML = `
        <div style="margin-bottom:8px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm btn-primary" onclick="printPersonHistory('${truck_no}','${driver.replace(/'/g,"\\'")}')">🖨️ พิมพ์/PDF</button>
          <button class="btn btn-sm btn-outline" onclick="savePersonHistoryToDrive('${truck_no}','${driver.replace(/'/g,"\\'")}')">💾 Drive</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>วันที่</th><th>งาน</th><th>รอบ</th><th>ประเภท</th><th>บทลงโทษ</th><th>บันทึกโดย</th></tr></thead>
            <tbody>
              ${records.map(r => `<tr>
                <td>${r.date||''}</td>
                <td>${r.task_type||''}</td>
                <td>${r.cycle||''}</td>
                <td>${r.violation_type||''}</td>
                <td><span class="badge badge-red">${r.penalty||''}</span></td>
                <td style="font-size:12px">${r.recorded_by||''}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:8px;font-size:13px;color:var(--text-light)">
          รวม <strong>${records.length}</strong> ครั้ง &nbsp;|&nbsp; ระดับ: <strong>${level}</strong>
        </div>`;
      window._personRecords = records;
      window._personTruck = truck_no;
      window._personDriver = driver;
    } catch (e) {
      el.innerHTML = `<div class="alert alert-danger">โหลดไม่สำเร็จ: ${e.message}</div>`;
    }
  };

  window.printPersonHistory = function(truck_no, driver) {
    const records = window._personRecords || [];
    openVioPersonA4(truck_no, driver, records);
  };

  window.savePersonHistoryToDrive = async function(truck_no, driver) {
    const records = window._personRecords || [];
    const content = buildPersonHistoryPlainText(truck_no, driver, records);
    const title = 'ประวัติละเลย — รถ ' + truck_no + ' — ' + driver;
    try {
      const r = await APP.savePDFToDrive({ title, content, folder_type: 'ประวัติละเลย', issue_date: APP.todayISO() });
      if (r.success) alert('✅ บันทึก PDF ไป Drive สำเร็จ\n' + r.url);
      else alert('❌ บันทึกไม่สำเร็จ: ' + r.error);
    } catch (e) { alert('เกิดข้อผิดพลาด: ' + e.message); }
  };

  loadVioHistory();
};

function buildPersonHistoryPlainText(truck_no, driver, records) {
  const lines = [
    'บริษัท ส.ศิวโรจน์ ขนส่ง จำกัด',
    'ประวัติการละเลยการบำรุงรักษา',
    'คนขับ: ' + driver + '  รถ: ' + truck_no,
    '',
    'วันที่ | งาน | รอบ | ประเภท | บทลงโทษ | บันทึกโดย',
    ...records.map(r => [r.date||'', r.task_type||'', r.cycle||'', r.violation_type||'', r.penalty||'', r.recorded_by||''].join(' | ')),
    '',
    'รวม ' + records.length + ' ครั้ง, ระดับ: ' + (records.length >= 3 ? 3 : records.length)
  ];
  return lines.join('\n');
}

function openVioPersonA4(truck_no, driver, records) {
  const win = window.open('', '_blank', 'width=820,height=1160');
  if (!win) { alert('กรุณาอนุญาต Popup เพื่อพิมพ์'); return; }
  const level = records.length >= 3 ? 3 : records.length;
  const today = APP.formatThaiDate(new Date());
  const rows = records.map(r => `<tr>
    <td>${r.date||''}</td><td>${r.task_type||''}</td><td>${r.cycle||''}</td>
    <td>${r.violation_type||''}</td><td>${r.penalty||''}</td><td>${r.recorded_by||''}</td>
  </tr>`).join('');

  win.document.write(`<!DOCTYPE html><html lang="th"><head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 18mm; }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Sarabun','Arial',sans-serif; font-size:13pt; color:#000; background:white; }
    .doc { max-width:170mm; margin:0 auto; }
    .company-name { font-size:16pt; font-weight:700; color:#1a3a5c; }
    h2 { font-size:15pt; font-weight:700; margin:16px 0 4px; color:#1a3a5c; }
    .sub { font-size:12pt; color:#555; margin-bottom:16px; }
    table { width:100%; border-collapse:collapse; font-size:11pt; margin-top:12px; }
    th { background:#1a3a5c; color:white; padding:7px 8px; text-align:left; }
    td { padding:6px 8px; border-bottom:1px solid #ddd; }
    .footer { margin-top:16px; font-size:11pt; }
    .no-print { display:none; }
    @media screen { body { padding:20px; background:#f0f0f0; } .doc { background:white; padding:18mm; box-shadow:0 2px 12px rgba(0,0,0,0.15); } .no-print { display:block; margin-bottom:16px; } }
  </style>
  </head><body>
  <div class="no-print" style="text-align:center">
    <button onclick="window.print()" style="padding:8px 20px;background:#1a3a5c;color:white;border:none;border-radius:6px;cursor:pointer">🖨️ พิมพ์</button>
    <button onclick="window.close()" style="margin-left:8px;padding:8px 20px;background:#7f8c8d;color:white;border:none;border-radius:6px;cursor:pointer">✕ ปิด</button>
  </div>
  <div class="doc">
    <div class="company-name">บริษัท ส.ศิวโรจน์ ขนส่ง จำกัด</div>
    <h2>ประวัติการละเลยการบำรุงรักษา</h2>
    <div class="sub">คนขับ: <strong>${driver}</strong> &nbsp; รถ: <strong>${truck_no}</strong> &nbsp; วันที่พิมพ์: ${today}</div>
    <table>
      <thead><tr><th>วันที่</th><th>งาน</th><th>รอบ</th><th>ประเภท</th><th>บทลงโทษ</th><th>บันทึกโดย</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">รวม <strong>${records.length}</strong> ครั้ง &nbsp;|&nbsp; ระดับ: <strong>${level}</strong></div>
  </div>
  </body></html>`);
  win.document.close();
}

function updateVioCycleOptions(task) {
  const sel = document.getElementById('vio-cycle');
  if (!sel) return;
  const options = CYCLE_OPTIONS[task] || ['Week 1','Week 2','Week 3','Week 4'];
  sel.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('');
}
