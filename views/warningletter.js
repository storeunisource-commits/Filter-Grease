// views/warningletter.js — Warning Letters management
window.VIEW_WARNINGLETTER = async function render(container) {
  const user = APP.getUserInfo();

  container.innerHTML = `
    <div class="page-title">📋 หนังสือเตือน</div>
    <div id="wl-content"><div class="loading"><div class="spinner"></div><p>กำลังโหลด...</p></div></div>
  `;

  try {
    const [wlRes, trucksRes] = await Promise.all([
      APP.getWarningLetters(),
      APP.getTrucksCached()
    ]);
    const letters = wlRes.records || [];
    const trucks = (trucksRes.trucks || []).filter(t => t.active !== false && t.active !== 'FALSE');
    renderWLPage(document.getElementById('wl-content'), letters, trucks, user);
  } catch (e) {
    APP.showError(document.getElementById('wl-content'), 'โหลดข้อมูลไม่สำเร็จ: ' + e.message);
  }
};

function renderWLPage(container, letters, trucks, user) {
  const isAdmin = user && user.role === 'admin';
  const pending = letters.filter(l => l.approval_status === 'pending');

  container.innerHTML = `
    ${isAdmin && pending.length > 0
      ? `<div class="alert alert-danger">🚨 หนังสือเตือนรออนุมัติ <strong>${pending.length} ฉบับ</strong></div>`
      : ''}

    <!-- Filter bar -->
    <div class="card" style="padding:12px 16px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <span style="font-size:13px;color:var(--text-light);font-weight:600">กรอง:</span>
        <select class="form-control" id="wl-filter-truck" style="width:auto">
          <option value="">-- รถทุกคัน --</option>
          ${trucks.map(t => `<option value="${t.truck_no}">${t.truck_no} (${t.driver||'-'})</option>`).join('')}
        </select>
        <select class="form-control" id="wl-filter-status" style="width:auto">
          <option value="">-- ทุกสถานะ --</option>
          <option value="pending">รออนุมัติ</option>
          <option value="approved">อนุมัติแล้ว</option>
        </select>
        <button class="btn btn-sm btn-primary" onclick="loadWLFiltered()">🔍 ค้นหา</button>
      </div>
    </div>

    <!-- List -->
    <div class="card">
      <div class="card-title">
        รายการหนังสือเตือนทั้งหมด
        <span class="badge badge-gray" style="margin-left:8px">${letters.length} ฉบับ</span>
      </div>
      <div id="wl-list">${renderWLTable(letters, isAdmin)}</div>
    </div>
  `;

  window._wlAllLetters = letters;

  window.loadWLFiltered = async () => {
    const truck_no = document.getElementById('wl-filter-truck').value;
    const status = document.getElementById('wl-filter-status').value;
    const el = document.getElementById('wl-list');
    el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      const params = {};
      if (truck_no) params.truck_no = truck_no;
      if (status) params.status = status;
      const res = await APP.getWarningLetters(params);
      const filtered = res.records || [];
      el.innerHTML = renderWLTable(filtered, isAdmin);
    } catch (e) {
      el.innerHTML = `<div class="alert alert-danger">โหลดไม่สำเร็จ: ${e.message}</div>`;
    }
  };
}

function renderWLTable(letters, isAdmin) {
  if (!letters.length) return '<div class="alert alert-success">✅ ไม่มีรายการ</div>';

  const levelLabel = (l) => {
    const n = parseInt(l) || 0;
    if (n >= 3) return '<span class="badge badge-red">ระดับ 3 — หนักสุด</span>';
    if (n === 2) return '<span class="badge badge-orange">ระดับ 2 — ลายลักษณ์</span>';
    return '<span class="badge badge-gray">ระดับ 1 — วาจา</span>';
  };

  const statusBadge = (s) => {
    if (s === 'approved') return '<span class="badge badge-green">✅ อนุมัติแล้ว</span>';
    if (s === 'pending') return '<span class="badge badge-orange">⏳ รออนุมัติ</span>';
    return `<span class="badge badge-gray">${s||'-'}</span>`;
  };

  return `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>เลขที่</th><th>วันที่</th><th>รถ</th><th>คนขับ</th>
          <th>ระดับ</th><th>เหตุผล</th><th>สถานะ</th><th>จัดการ</th>
        </tr></thead>
        <tbody>
          ${letters.slice().reverse().map(l => `<tr>
            <td><small>${l.letter_no||''}</small></td>
            <td><small>${l.issue_date||''}</small></td>
            <td><strong>${l.truck_no||''}</strong></td>
            <td>${l.driver||'-'}</td>
            <td>${levelLabel(l.level)}</td>
            <td style="font-size:12px">${l.reason||''}</td>
            <td>${statusBadge(l.approval_status)}</td>
            <td style="white-space:nowrap">
              <button class="btn btn-sm btn-outline" onclick="printWLDoc('${l.letter_no}')">🖨️ พิมพ์</button>
              <button class="btn btn-sm btn-outline" onclick="saveWLToDrive('${l.letter_no}')">💾 Drive</button>
              ${isAdmin && l.approval_status === 'pending'
                ? `<button class="btn btn-sm btn-primary" onclick="showApproveWL('${l.letter_no}')">✅ Approve</button>`
                : ''}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ============================================================
// Approve warning letter
window.showApproveWL = async function(letter_no) {
  const user = APP.getUserInfo();
  if (!user || user.role !== 'admin') return;
  const sigB64 = localStorage.getItem('sig_' + user.username) || '';

  document.body.insertAdjacentHTML('beforeend', `
    <div id="wl-approve-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:400;display:flex;align-items:center;justify-content:center;padding:16px">
      <div style="background:white;border-radius:10px;padding:24px;max-width:440px;width:100%">
        <div style="font-size:16px;font-weight:700;margin-bottom:12px">✅ Approve หนังสือเตือน</div>
        <div class="alert alert-info">เลขที่: <strong>${letter_no}</strong></div>
        ${sigB64
          ? `<div style="margin-bottom:12px"><div style="font-size:13px;color:#7f8c8d;margin-bottom:4px">ลายเซ็นต์ของคุณ:</div><img src="${sigB64}" style="max-height:60px;border:1px solid #ddd;border-radius:4px"></div>`
          : `<div class="alert alert-warning">⚠️ ยังไม่มีลายเซ็นต์ — ตั้งค่าได้ใน Admin</div>`}
        <div id="wl-approve-msg"></div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-primary" onclick="confirmApproveWL('${letter_no}')">✅ Approve</button>
          <button class="btn btn-outline" onclick="document.getElementById('wl-approve-modal').remove()">ยกเลิก</button>
        </div>
      </div>
    </div>`);
};

window.confirmApproveWL = async function(letter_no) {
  const user = APP.getUserInfo();
  const sigB64 = localStorage.getItem('sig_' + user.username) || '';
  const msgEl = document.getElementById('wl-approve-msg');
  try {
    const res = await APP.approveWarningLetter({ letter_no, signature_url: sigB64 });
    if (res.success) {
      document.getElementById('wl-approve-modal').remove();
      window.VIEW_WARNINGLETTER(document.getElementById('app-container'));
    } else {
      msgEl.innerHTML = `<div class="alert alert-danger">${res.error}</div>`;
    }
  } catch (e) {
    msgEl.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
};

// ============================================================
// Print warning letter — A4 standalone window
window.printWLDoc = async function(letter_no) {
  const res = await APP.getWarningLetters();
  const letter = (res.records || []).find(l => l.letter_no === letter_no);
  if (!letter) return;
  openWLA4Window(buildWLDocHTML(letter));
};

window.saveWLToDrive = async function(letter_no) {
  const res = await APP.getWarningLetters();
  const letter = (res.records || []).find(l => l.letter_no === letter_no);
  if (!letter) return;
  const content = buildWLPlainText(letter);
  const title = letter.letter_no + ' — ' + (letter.truck_no || '') + ' — ' + (letter.driver || '');
  try {
    const r = await APP.savePDFToDrive({ title, content, folder_type: 'หนังสือเตือน', issue_date: letter.issue_date });
    if (r.success) alert('✅ บันทึก PDF ไป Drive สำเร็จ\n' + r.url);
    else alert('❌ บันทึกไม่สำเร็จ: ' + r.error);
  } catch (e) { alert('เกิดข้อผิดพลาด: ' + e.message); }
};

function buildWLPlainText(letter) {
  const levelN = parseInt(letter.level) || 1;
  const levelTitles = { 1: 'บันทึกการตักเตือนด้วยวาจา', 2: 'หนังสือเตือน', 3: 'หนังสือเตือนขั้นสุดท้าย' };
  const title = levelTitles[levelN] || levelTitles[1];
  return [
    'บริษัท ส.ศิวโรจน์ ขนส่ง จำกัด',
    title,
    'เลขที่: ' + (letter.letter_no || ''),
    'วันที่: ' + (letter.issue_date || ''),
    '',
    'เรียน: คุณ' + (letter.driver || '') + '  รถหมายเลข ' + (letter.truck_no || ''),
    '',
    'ด้วยปรากฏว่า ท่านได้ละเลยการบำรุงรักษา: ' + (letter.reason || ''),
    'รอบ: ' + (letter.cycle || '') + '  ครั้งที่: ' + (letter.violation_count || ''),
    '',
    'จึงออกหนังสือเตือนฉบับนี้เพื่อให้ท่านรับทราบและปฏิบัติตามระเบียบบริษัทต่อไป',
    '',
    'ลงชื่อ: ' + (letter.issued_by || ''),
  ].join('\n');
}

function buildWLDocHTML(letter) {
  const thaiMonths = APP.THAI_MONTHS;
  const dateObj = letter.issue_date ? new Date(letter.issue_date) : new Date();
  const thaiDate = `${dateObj.getDate()} ${thaiMonths[dateObj.getMonth()+1]} ${dateObj.getFullYear()+543}`;
  const levelN = parseInt(letter.level) || 1;
  const levelTitles = { 1: 'บันทึกการตักเตือนด้วยวาจา', 2: 'หนังสือเตือน', 3: 'หนังสือเตือนขั้นสุดท้าย' };
  const docTitle = levelTitles[Math.min(levelN, 3)] || levelTitles[1];
  const vioCount = parseInt(letter.violation_count || 0);
  const sigHtml = letter.signature_url
    ? `<div class="sig-line"><img src="${letter.signature_url}" alt="ลายเซ็นต์"></div>`
    : `<div class="sig-line"></div>`;

  const levelDescriptions = {
    1: 'ถือว่าเป็นการตักเตือนด้วยวาจาครั้งที่ 1 ขอให้ท่านรับทราบและดำเนินการบำรุงรักษาให้ถูกต้องตามกำหนดต่อไป',
    2: 'ถือว่าเป็นการกระทำผิดซ้ำ จึงออกหนังสือเตือนเป็นลายลักษณ์อักษร ขอให้ท่านรับทราบและปรับปรุงพฤติกรรมโดยทันที',
    3: 'ถือว่าเป็นการกระทำผิดสะสมถึงขั้นร้ายแรง หากยังละเลยอีก บริษัทฯ จะดำเนินการตามมาตรการทางวินัยขั้นสูงสุด รวมถึงการพักงานหรือเลิกจ้าง'
  };

  return `
    <div class="header-row">
      <div class="logo-wrap"><img src="Logo.png" onerror="this.style.display='none'"></div>
      <div class="company-info">
        <div class="company-name">บริษัท ส.ศิวโรจน์ ขนส่ง จำกัด</div>
        <div class="company-sub">ฝ่ายซ่อมบำรุงและยานพาหนะ</div>
      </div>
      <div class="doc-date">วันที่ ${thaiDate}</div>
    </div>

    <div class="doc-title">${docTitle}</div>
    <div class="doc-no">เลขที่ ${letter.letter_no || '-'}</div>

    <div class="doc-body">
      <p><span class="highlight">เรียน</span>&nbsp; คุณ${letter.driver||'___________'}&nbsp; คนขับรถหมายเลข <span class="highlight">${letter.truck_no||''}</span></p>

      <p>ด้วยปรากฏว่า คุณ${letter.driver||'___________'} ได้ละเลยการ<span class="highlight">${letter.reason||'บำรุงรักษายานพาหนะ'}</span>
      ${letter.cycle ? `รอบ <span class="highlight">${letter.cycle}</span>` : ''}
      ซึ่งถือเป็นการละเลยครั้งที่ <span class="highlight">${vioCount}</span>
      ขัดต่อระเบียบการบำรุงรักษายานพาหนะของบริษัทฯ</p>

      <p>${levelDescriptions[Math.min(levelN, 3)]}</p>

      ${levelN >= 3 ? `<div class="severe-box">🚨 กรณีละเลยสะสม ${vioCount} ครั้ง — ได้มีการออกใบสั่งหยุดวิ่งควบคู่กับหนังสือเตือนฉบับนี้ด้วย</div>` : ''}

      <p>จึงเรียนมาเพื่อทราบและดำเนินการแก้ไขโดยเร่งด่วน</p>
    </div>

    <div class="signature-section">
      <div>ลงชื่อผู้ออกหนังสือ</div>
      ${sigHtml}
      <div class="sig-label">(${letter.issued_by||'____________________'})</div>
      <div class="sig-label">ผู้จัดการฝ่ายซ่อมบำรุง</div>
    </div>

    <div class="ack-section">
      รับทราบ:&nbsp;&nbsp;&nbsp; ลงชื่อ ____________________________
      &nbsp;&nbsp;&nbsp;&nbsp; วันที่ ________________
    </div>`;
}

function openWLA4Window(docHtml) {
  const win = window.open('', '_blank', 'width=820,height=1160');
  if (!win) { alert('กรุณาอนุญาต Popup เพื่อพิมพ์'); return; }
  win.document.write(`<!DOCTYPE html><html lang="th"><head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 20mm 18mm; }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Sarabun','Arial',sans-serif; font-size:14pt; color:#000; background:white; }
    .doc { max-width:170mm; margin:0 auto; }
    .header-row { display:flex; align-items:center; gap:16px; margin-bottom:16px; border-bottom:2px solid #1a3a5c; padding-bottom:12px; }
    .logo-wrap img { height:64px; width:auto; }
    .company-info { flex:1; }
    .company-name { font-size:16pt; font-weight:700; color:#1a3a5c; line-height:1.3; }
    .company-sub { font-size:10pt; color:#555; }
    .doc-date { text-align:right; font-size:11pt; color:#555; white-space:nowrap; }
    .doc-title { text-align:center; font-size:18pt; font-weight:700; color:#1a3a5c; margin:20px 0 4px; }
    .doc-no { text-align:center; font-size:11pt; color:#777; margin-bottom:20px; }
    .doc-body { line-height:2; font-size:13pt; text-align:justify; }
    .doc-body p { margin-bottom:12px; text-indent:2em; }
    .doc-body p:first-child { text-indent:0; }
    .highlight { font-weight:700; color:#1a3a5c; }
    .severe-box { border:2px solid #e74c3c; border-radius:6px; padding:10px 14px; margin:16px 0; background:#fdedec; font-size:12pt; }
    .signature-section { margin-top:40px; display:flex; flex-direction:column; align-items:flex-end; gap:4px; }
    .sig-line { border-bottom:1px dotted #555; width:200px; margin-bottom:4px; min-height:50px; display:flex; align-items:center; justify-content:center; }
    .sig-line img { max-height:50px; max-width:180px; }
    .sig-label { text-align:center; width:200px; font-size:11pt; }
    .ack-section { margin-top:30px; border-top:1px solid #ccc; padding-top:14px; font-size:11pt; color:#555; }
    .no-print { display:none; }
    @media screen { body { padding:20px; background:#f0f0f0; } .doc { background:white; padding:20mm 18mm; box-shadow:0 2px 12px rgba(0,0,0,0.15); } .no-print { display:block; margin-bottom:16px; } }
  </style>
  </head><body>
  <div class="no-print" style="text-align:center">
    <button onclick="window.print()" style="padding:8px 20px;background:#1a3a5c;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">🖨️ พิมพ์เอกสาร</button>
    <button onclick="window.close()" style="margin-left:8px;padding:8px 20px;background:#7f8c8d;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">✕ ปิด</button>
  </div>
  <div class="doc">${docHtml}</div>
  </body></html>`);
  win.document.close();
}
