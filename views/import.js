// views/import.js — Import historical Excel data (admin only)
window.VIEW_IMPORT = function render(container) {
  const user = APP.getUserInfo();
  if (!user || user.role !== 'admin') {
    container.innerHTML = '<div class="page-title">📥 Import Excel</div><div class="alert alert-danger">ต้องการสิทธิ์ admin เท่านั้น</div>';
    return;
  }

  container.innerHTML = `
    <div class="page-title">📥 Import ข้อมูลย้อนหลังจาก Excel</div>

    <div class="card">
      <div class="card-title">เลือกไฟล์ Excel (.xlsx)</div>
      <div class="alert alert-warning" style="margin-bottom:12px">
        ⚠️ <strong>คำเตือน:</strong> กด Import ได้ครั้งเดียวเท่านั้น — ถ้ากดซ้ำจะเกิดข้อมูลซ้ำใน Sheets
      </div>
      <div class="form-group">
        <input class="form-control" type="file" id="import-file-input" accept=".xlsx" onchange="onImportFileChange(event)">
      </div>
      <div id="import-parse-status" style="display:none;color:#7f8c8d;font-size:13px;margin-top:8px"></div>
    </div>

    <div id="import-preview-wrap" style="display:none">
      <div class="card">
        <div class="card-title">Preview ข้อมูลที่พบ</div>
        <div id="import-preview-table"></div>
        <div style="margin-top:12px">
          <button class="btn btn-primary" id="import-start-btn" onclick="startImport()">
            📥 Import ทั้งหมด
          </button>
        </div>
      </div>
    </div>

    <div id="import-progress-wrap" style="display:none">
      <div class="card">
        <div class="card-title">กำลัง Import...</div>
        <div id="import-progress-text" style="color:#7f8c8d;font-size:13px;margin-bottom:8px"></div>
        <div style="background:#ecf0f1;border-radius:6px;overflow:hidden;height:12px">
          <div id="import-progress-bar" style="height:12px;background:#27ae60;transition:width 0.3s;width:0%"></div>
        </div>
      </div>
    </div>

    <div id="import-result-wrap" style="display:none">
      <div class="card" id="import-result-card"></div>
    </div>
  `;
};

// ====== Parse Helpers ======

function _detectSheetType(name) {
  if (name.includes('เป่ากรอง') || name.includes('เปากรอง')) return 'blow';
  if (name.includes('อัดจาระบี') || name.includes('อัดจารบี')) return 'grease';
  return null;
}

function _parseMonthYear(name) {
  const map = {
    'ม.ค': 1, 'ก.พ': 2, 'มี.ค': 3, 'เม.ย': 4, 'พ.ค': 5, 'มิ.ย': 6,
    'ก.ค': 7, 'ส.ค': 8, 'ก.ย': 9, 'ต.ค': 10, 'พ.ย': 11, 'ธ.ค': 12
  };
  for (const [abbr, m] of Object.entries(map)) {
    if (name.includes(abbr)) {
      const yr = name.match(/\.(\d{2})/);
      if (yr) {
        const ceYear = parseInt(yr[1]) + 1957; // BE short 69 → 2026
        return ceYear + '-' + String(m).padStart(2, '0');
      }
    }
  }
  return null;
}

function _findHeaderRowIdx(rows) {
  // หา row แรกที่ col index 3 (col D) เป็น integer 1–31
  for (let r = 0; r < rows.length; r++) {
    const d = rows[r][3];
    if (typeof d === 'number' && Number.isInteger(d) && d >= 1 && d <= 31) return r;
  }
  return -1;
}

function _buildDayMap(headerRow) {
  // เก็บ {col, day} เฉพาะ day=1 เป็นต้นไป (skip overflow prev month)
  // หยุดเมื่อ sequence break (day ใหม่ < day ก่อน = second table)
  const dayMap = [];
  let foundOne = false;
  let prevDay = 0;
  for (let c = 3; c < headerRow.length; c++) {
    const d = headerRow[c];
    if (typeof d !== 'number' || !Number.isInteger(d) || d < 1 || d > 31) break;
    if (d === 1) foundOne = true;
    if (!foundOne) continue; // skip overflow pre-month days
    if (d < prevDay) break;  // sequence break → second table starts
    dayMap.push({ col: c, day: d });
    prevDay = d;
  }
  return dayMap;
}

function _parseSheetRecords(ws, type, monthYear) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
  const headerRowIdx = _findHeaderRowIdx(rows);
  if (headerRowIdx < 0) return [];

  const dayMap = _buildDayMap(rows[headerRowIdx]);
  if (dayMap.length === 0) return [];

  const dataStartRow = headerRowIdx + 2; // skip day-number row + day-name row
  const [year, month] = monthYear.split('-').map(Number);
  const records = [];

  for (let r = dataStartRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every(v => v === null)) continue;

    const truck_no = row[0] != null ? String(row[0]).trim() : null;
    const driver = row[1] != null ? String(row[1]).trim() : '';
    const status = row[2] != null ? String(row[2]).trim() : '';

    // เฉพาะรถสถานะ "ใช้งาน" เท่านั้น
    if (!truck_no || status !== 'ใช้งาน') continue;

    for (const { col, day } of dayMap) {
      const val = row[col];
      if (val === null || val === false || val === undefined) continue;

      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      let action_status, note = '';

      if (val === true) {
        action_status = 'done';
      } else if (typeof val === 'string' && val.trim()) {
        action_status = 'not_done';
        note = val.trim();
      } else {
        continue;
      }

      if (type === 'blow') {
        const week = APP.getWeekOfMonth(new Date(dateStr));
        records.push({ truck_no, driver, date: dateStr, week, action_status, note });
      } else {
        // อัดจาระบี: กำหนด cycle ตามวันที่
        const cycle = day <= 15 ? '10-15' : '25-end';
        records.push({ truck_no, driver, date: dateStr, cycle, month_year: monthYear, action_status, note });
      }
    }
  }
  return records;
}

// ====== State ======
let _importData = null; // array of { sheetName, type, monthYear, records }

// ====== Event Handlers ======

window.onImportFileChange = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('import-parse-status');
  statusEl.style.display = '';
  statusEl.textContent = '⏳ กำลังอ่านไฟล์...';

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });

      _importData = [];
      for (const sheetName of wb.SheetNames) {
        const type = _detectSheetType(sheetName);
        if (!type) continue;

        const monthYear = _parseMonthYear(sheetName);
        if (!monthYear) continue;

        const ws = wb.Sheets[sheetName];
        const records = _parseSheetRecords(ws, type, monthYear);
        _importData.push({ sheetName, type, monthYear, records });
      }

      statusEl.textContent = `✅ อ่านสำเร็จ — พบ ${_importData.length} sheets`;
      renderPreview();
    } catch (err) {
      statusEl.textContent = '❌ อ่านไฟล์ไม่ได้: ' + err.message;
    }
  };
  reader.readAsArrayBuffer(file);
};

function renderPreview() {
  const wrap = document.getElementById('import-preview-wrap');
  const tableEl = document.getElementById('import-preview-table');

  if (!_importData || _importData.length === 0) {
    wrap.style.display = 'none';
    return;
  }

  const totalRecords = _importData.reduce((s, d) => s + d.records.length, 0);
  const typeLabel = { blow: '💨 เป่ากรอง', grease: '🔧 อัดจาระบี' };

  let html = `
    <div style="margin-bottom:10px;font-weight:600">
      พบทั้งหมด <span style="color:#27ae60">${totalRecords} รายการ</span> จาก ${_importData.length} sheets
    </div>
    <div style="overflow-x:auto">
    <table class="fleet-table" style="width:100%;min-width:300px">
      <thead>
        <tr>
          <th>Sheet</th>
          <th>ประเภท</th>
          <th>เดือน</th>
          <th>จำนวน</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const d of _importData) {
    const [yr, mo] = d.monthYear.split('-');
    const thaiMonths = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    const monthLabel = thaiMonths[parseInt(mo)] + ' ' + (parseInt(yr) + 543);
    const badgeClass = d.type === 'blow' ? 'badge-blue' : 'badge-orange';
    html += `
      <tr>
        <td style="font-size:12px;color:#7f8c8d">${d.sheetName}</td>
        <td><span class="badge ${badgeClass}">${typeLabel[d.type]}</span></td>
        <td>${monthLabel}</td>
        <td><strong>${d.records.length}</strong></td>
      </tr>
    `;
  }

  html += '</tbody></table></div>';
  tableEl.innerHTML = html;
  wrap.style.display = '';
}

window.startImport = async function() {
  if (!_importData || _importData.length === 0) return;

  const btn = document.getElementById('import-start-btn');
  btn.disabled = true;
  btn.textContent = '⏳ กำลัง Import...';

  document.getElementById('import-progress-wrap').style.display = '';
  const progText = document.getElementById('import-progress-text');
  const progBar = document.getElementById('import-progress-bar');

  const totalRecords = _importData.reduce((s, d) => s + d.records.length, 0);
  let totalImported = 0;
  let totalFailed = 0;
  const BATCH_SIZE = 50;

  try {
    for (const sheet of _importData) {
      const { type, records, sheetName } = sheet;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const res = await APP.bulkImport(batch, type);
        totalImported += res.imported || 0;
        totalFailed += res.failed || 0;

        const done = Math.min(totalImported + totalFailed, totalRecords);
        const pct = Math.round((done / totalRecords) * 100);
        progText.textContent = `${sheetName} — ${totalImported} / ${totalRecords} รายการ`;
        progBar.style.width = pct + '%';
      }
    }

    // แสดงผลลัพธ์
    document.getElementById('import-progress-wrap').style.display = 'none';
    const resultWrap = document.getElementById('import-result-wrap');
    const resultCard = document.getElementById('import-result-card');
    resultCard.innerHTML = `
      <div class="card-title">✅ Import เสร็จสิ้น</div>
      <div class="alert alert-success">นำเข้าสำเร็จ <strong>${totalImported}</strong> รายการ</div>
      ${totalFailed > 0 ? `<div class="alert alert-danger">ล้มเหลว ${totalFailed} รายการ</div>` : ''}
      <div class="alert alert-info" style="font-size:13px">
        💡 ไปที่ Dashboard → Fleet Status หรือ History เพื่อตรวจสอบข้อมูล
      </div>
    `;
    resultWrap.style.display = '';
    _importData = null; // reset เพื่อป้องกัน import ซ้ำ
    document.getElementById('import-preview-wrap').style.display = 'none';
    document.getElementById('import-file-input').disabled = true;
  } catch (err) {
    progText.textContent = '❌ เกิดข้อผิดพลาด: ' + err.message;
    btn.disabled = false;
    btn.textContent = '📥 ลองใหม่';
  }
};
