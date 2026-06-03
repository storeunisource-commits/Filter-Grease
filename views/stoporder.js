// views/stoporder.js — ระบบออกหนังสือสั่งหยุดวิ่ง (พร้อม Approval Workflow)
window.VIEW_STOPORDER = async function render(container) {
  container.innerHTML = `
    <div class="page-title">🚫 ระบบสั่งหยุดวิ่ง</div>
    <div id="stoporder-content">
      <div class="loading"><div class="spinner"></div><p>กำลังโหลด...</p></div>
    </div>
  `;

  try {
    const today = new Date();
    const monthYear = APP.currentMonthYear(today);
    const [fleetRes, trucksRes, violationsRes, ordersRes] = await Promise.all([
      APP.getFleetStatus(monthYear),
      APP.getTrucksCached(),
      APP.getViolations(),
      APP.getStopOrders()
    ]);

    const fleet     = fleetRes.fleet || {};
    const trucks    = (trucksRes.trucks || []).filter(t => t.active !== false && t.active !== 'FALSE');
    const violations = violationsRes.records || [];
    const orders    = ordersRes.records || [];
    const user      = APP.getUserInfo();

    const vioCount = {};
    violations.forEach(v => { vioCount[v.truck_no] = (vioCount[v.truck_no] || 0) + 1; });

    const eligible = calcEligibleTrucks(fleet, trucks, vioCount, today);

    renderStopOrderPage(
      document.getElementById('stoporder-content'),
      eligible, trucks, vioCount, orders, today, user
    );
  } catch (e) {
    APP.showError(document.getElementById('stoporder-content'), 'โหลดข้อมูลไม่สำเร็จ: ' + e.message);
  }
};

// ============================================================
function calcEligibleTrucks(fleet, trucks, vioCount, today) {
  const day     = today.getDate();
  const year    = today.getFullYear();
  const month   = today.getMonth() + 1;
  const lastDay = APP.getLastDayOfMonth(year, month);
  const weekDeadlines = { 1:7, 2:14, 3:21, 4:lastDay };
  const eligible = [];

  trucks.forEach(t => {
    const f    = fleet[t.truck_no] || {};
    const vios = vioCount[t.truck_no] || 0;

    for (let w = 1; w <= 4; w++) {
      const deadline    = weekDeadlines[w];
      const overdueDays = day - (deadline + 2);
      if (overdueDays < 0) continue;
      const status = f.blow && f.blow[String(w)];
      if (status === 'done') continue;
      eligible.push({
        truck_no: t.truck_no, driver: t.driver,
        task_type: 'เป่ากรองอากาศ', reason_type: 'blow_overdue',
        cycle: `Week ${w}`, deadline_day: deadline,
        overdue_days: overdueDays + 2, current_status: status || 'ไม่มีข้อมูล', vios,
        severity: vios >= 3 ? 'stop_and_call' : 'stop_work'
      });
    }

    if (day >= 17) {
      const r1 = f.grease && f.grease['1'];
      if (r1 !== 'done') eligible.push({
        truck_no: t.truck_no, driver: t.driver,
        task_type: 'อัดจาระบี', reason_type: 'grease_overdue',
        cycle: 'รอบ 1 (10-15)', deadline_day: 15,
        overdue_days: day - 15, current_status: r1 || 'ไม่มีข้อมูล', vios,
        severity: vios >= 3 ? 'stop_and_call' : 'stop_work'
      });
    }

    if (day >= lastDay + 2) {
      const r2 = f.grease && f.grease['2'];
      if (r2 !== 'done') eligible.push({
        truck_no: t.truck_no, driver: t.driver,
        task_type: 'อัดจาระบี', reason_type: 'grease_overdue',
        cycle: 'รอบ 2 (25-สิ้นเดือน)', deadline_day: lastDay,
        overdue_days: day - lastDay, current_status: r2 || 'ไม่มีข้อมูล', vios,
        severity: vios >= 3 ? 'stop_and_call' : 'stop_work'
      });
    }
  });
  return eligible;
}

// ============================================================
function renderStopOrderPage(container, eligible, trucks, vioCount, orders, today, user) {
  const isAdmin    = user && user.role === 'admin';
  const pendingApproval = orders.filter(o => o.approval_status === 'pending_approval');

  container.innerHTML = `
    ${isAdmin && pendingApproval.length > 0
      ? `<div class="alert alert-danger">🚨 มีใบสั่งหยุดวิ่งรอการ Approve <strong>${pendingApproval.length} ใบ</strong> — เลื่อนลงเพื่อดูและ Approve</div>`
      : ''}

    <!-- Section 1: รถที่เข้าเงื่อนไข -->
    <div class="card">
      <div class="card-title">
        🔍 รถที่เข้าเงื่อนไขออกใบสั่งหยุดวิ่ง
        ${eligible.length > 0 ? `<span class="badge badge-red" style="margin-left:8px">${eligible.length} คัน</span>` : ''}
      </div>
      ${eligible.length === 0
        ? '<div class="alert alert-success">✅ ไม่มีรถที่เข้าเงื่อนไขในขณะนี้</div>'
        : renderEligibleTable(eligible)}
    </div>

    <!-- Section 2: ออกใบสั่งหยุดวิ่ง -->
    <div class="card">
      <div class="card-title">📝 ออกใบสั่งหยุดวิ่ง</div>
      <div class="form-group">
        <label class="form-label">เบอร์รถ</label>
        <select class="form-control" id="so-truck" onchange="onSoTruckChange()">
          <option value="">-- เลือกรถ --</option>
          ${trucks.map(t => `<option value="${t.truck_no}" data-driver="${t.driver||''}" data-vios="${vioCount[t.truck_no]||0}">${t.truck_no} — ${t.driver||'-'}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">คนขับ</label>
        <input class="form-control" type="text" id="so-driver" placeholder="ชื่อคนขับ" readonly>
      </div>
      <div class="form-group">
        <label class="form-label">สาเหตุ</label>
        <select class="form-control" id="so-reason-type">
          <option value="blow_overdue">เป่ากรองอากาศเกินกำหนด</option>
          <option value="grease_overdue">อัดจาระบีเกินกำหนด</option>
          <option value="drain_overdue">เดรนน้ำถังลมเกินกำหนด</option>
          <option value="accumulated_violations">มีการละเลยสะสม ≥ 3 ครั้ง</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">รอบ / Week ที่เกินกำหนด</label>
        <input class="form-control" type="text" id="so-cycle" placeholder="เช่น Week 2 / รอบ 1 (10-15)">
      </div>
      <div class="form-group">
        <label class="form-label">เกินกำหนดมา (วัน)</label>
        <input class="form-control" type="number" id="so-overdue-days" min="1" placeholder="จำนวนวันที่เกิน">
      </div>
      <div class="form-group">
        <label class="form-label">รายละเอียดเพิ่มเติม</label>
        <input class="form-control" type="text" id="so-detail" placeholder="หมายเหตุ">
      </div>
      <div class="form-group">
        <label class="form-label">ระดับความรุนแรง</label>
        <select class="form-control" id="so-severity">
          <option value="stop_work">🛑 หยุดวิ่ง — ทำทันทีก่อนออกวิ่ง</option>
          <option value="stop_and_call">🚨 หยุดวิ่ง + เรียกพบ Office</option>
        </select>
      </div>
      <div id="so-msg"></div>
      <button class="btn btn-primary" onclick="submitStopOrder()">📄 ออกใบสั่งหยุดวิ่ง</button>
    </div>

    <!-- Section 3: ประวัติใบสั่งหยุดวิ่ง -->
    <div class="card">
      <div class="card-title">
        📋 ประวัติใบสั่งหยุดวิ่งทั้งหมด
        ${pendingApproval.length > 0 ? `<span class="badge badge-red" style="margin-left:8px">${pendingApproval.length} รอ Approve</span>` : ''}
      </div>
      ${orders.length === 0
        ? '<div style="color:var(--text-light);font-size:14px">ยังไม่มีประวัติ</div>'
        : renderOrderHistory(orders, isAdmin)}
    </div>
  `;

  window._soTrucks   = trucks;
  window._soVioCount = vioCount;

  window.onSoTruckChange = () => {
    const sel = document.getElementById('so-truck');
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) return;
    document.getElementById('so-driver').value = opt.dataset.driver || '';
    const vios = parseInt(opt.dataset.vios || '0');
    if (vios >= 3) document.getElementById('so-severity').value = 'stop_and_call';
  };
}

function renderEligibleTable(eligible) {
  const sevBadge = (s) => s === 'stop_and_call'
    ? '<span class="badge badge-red">🚨 หยุด+เรียกพบ</span>'
    : '<span class="badge badge-orange">🛑 ทำทันที</span>';

  return `
    <div style="overflow-x:auto">
      <table class="fleet-table" style="width:100%;min-width:600px">
        <thead><tr>
          <th>รถ</th><th>คนขับ</th><th>งาน / รอบ</th>
          <th>เกินกำหนด</th><th>ละเลยสะสม</th><th>ระดับ</th><th>ออกใบ</th>
        </tr></thead>
        <tbody>
          ${eligible.map(e => `<tr>
            <td><strong>${e.truck_no}</strong></td>
            <td>${e.driver||'-'}</td>
            <td>${e.task_type} ${e.cycle}</td>
            <td style="color:var(--danger);font-weight:600">+${e.overdue_days} วัน</td>
            <td>${e.vios > 0 ? `<span class="badge badge-red">${e.vios} ครั้ง</span>` : '-'}</td>
            <td>${sevBadge(e.severity)}</td>
            <td>
              <button class="btn btn-sm btn-primary"
                onclick="quickIssueOrder('${e.truck_no}','${(e.driver||'').replace(/'/g,"\\'")}','${e.reason_type}','${e.cycle}',${e.overdue_days},'${e.severity}')">
                📄 ออกใบ
              </button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderOrderHistory(orders, isAdmin) {
  const approvalLabel = {
    'pending_approval': '⏳ รอ Admin Approve',
    'approved':         '✅ Approved',
    'rejected':         '❌ ปฏิเสธ'
  };
  const approvalClass = {
    'pending_approval': 'badge-orange',
    'approved':         'badge-green',
    'rejected':         'badge-red'
  };

  return `
    <div style="overflow-x:auto">
      <table class="fleet-table" style="width:100%;min-width:600px">
        <thead><tr>
          <th>เลขที่</th><th>วันที่</th><th>รถ</th><th>คนขับ</th>
          <th>สาเหตุ</th><th>Approve</th><th>ผล</th><th>จัดการ</th>
        </tr></thead>
        <tbody>
          ${orders.slice().reverse().map(o => {
            const hasCompletion = o.completion_date && o.completion_date !== '';
            const needsCompletion = o.severity === 'stop_work' && o.approval_status === 'approved' && !hasCompletion;
            return `<tr>
              <td><small>${o.order_no||''}</small></td>
              <td><small>${o.issue_date||''}</small></td>
              <td><strong>${o.truck_no||''}</strong></td>
              <td>${o.driver||'-'}</td>
              <td style="font-size:12px">${o.reason_detail||o.reason_type||''}</td>
              <td><span class="badge ${approvalClass[o.approval_status]||'badge-gray'}">${approvalLabel[o.approval_status]||o.approval_status||'-'}</span></td>
              <td>
                ${hasCompletion
                  ? `<span class="badge badge-green" title="${o.completion_date}">✅ เสร็จแล้ว</span>`
                  : needsCompletion
                    ? `<span class="badge badge-orange">รอบันทึกผล</span>`
                    : '<span style="font-size:11px;color:#bbb">-</span>'}
              </td>
              <td style="white-space:nowrap">
                ${o.approval_status === 'approved'
                  ? `<button class="btn btn-sm btn-primary" onclick="printOrderDoc('${o.order_no}')">🖨️ พิมพ์</button>
                     <button class="btn btn-sm btn-outline" onclick="saveSoToDrive('${o.order_no}')">💾</button>`
                  : ''}
                ${needsCompletion
                  ? `<button class="btn btn-sm btn-outline" onclick="showCompletionModal('${o.order_no}')">📝 บันทึกผล</button>`
                  : ''}
                ${isAdmin && o.approval_status === 'pending_approval'
                  ? `<button class="btn btn-sm btn-outline" onclick="showApproveModal('${o.order_no}')">✅ Approve</button>`
                  : ''}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ============================================================
// Quick-fill form from eligible table
window.quickIssueOrder = function(truck_no, driver, reason_type, cycle, overdueDays, severity) {
  document.getElementById('so-truck').value = truck_no;
  document.getElementById('so-driver').value = driver;
  document.getElementById('so-reason-type').value = reason_type;
  document.getElementById('so-cycle').value = cycle;
  document.getElementById('so-overdue-days').value = overdueDays;
  document.getElementById('so-severity').value = severity;
  document.getElementById('so-truck').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.submitStopOrder = async function() {
  const truck_no    = document.getElementById('so-truck').value;
  const driver      = document.getElementById('so-driver').value;
  const reason_type = document.getElementById('so-reason-type').value;
  const cycle       = document.getElementById('so-cycle').value;
  const overdue     = document.getElementById('so-overdue-days').value;
  const detail      = document.getElementById('so-detail').value;
  const severity    = document.getElementById('so-severity').value;
  const msgEl       = document.getElementById('so-msg');

  if (!truck_no) { msgEl.innerHTML = '<div class="alert alert-danger">กรุณาเลือกเบอร์รถ</div>'; return; }

  const vioCount = window._soVioCount && window._soVioCount[truck_no] || 0;
  const reasonLabels = {
    'blow_overdue':              'เป่ากรองอากาศ',
    'grease_overdue':            'อัดจาระบี',
    'drain_overdue':             'เดรนน้ำถังลม',
    'accumulated_violations':    'ละเลยสะสม'
  };
  const taskText = reasonLabels[reason_type] || reason_type;
  const detailFull = `ไม่ดำเนินการ${taskText}${cycle ? ' ' + cycle : ''}${overdue ? ' เกินกำหนด ' + overdue + ' วัน' : ''}${detail ? ' — ' + detail : ''}`;

  const btn = document.querySelector('[onclick="submitStopOrder()"]');
  APP.setButtonLoading(btn, true);
  msgEl.innerHTML = '';

  try {
    const res = await APP.issueStopOrder({ truck_no, driver, reason_type, reason_detail: detailFull, severity, vio_count: vioCount });
    APP.setButtonLoading(btn, false);
    if (res.success) {
      const approvedImmediately = res.approval_status === 'approved';
      msgEl.innerHTML = `<div class="alert alert-success">
        ✅ ออกใบสั่งหยุดวิ่งสำเร็จ — เลขที่ <strong>${res.order_no}</strong><br>
        ${approvedImmediately ? 'สามารถพิมพ์ได้ทันที' : '⏳ รอ Admin อนุมัติก่อนพิมพ์'}
      </div>`;
      // Reload
      setTimeout(() => window.VIEW_STOPORDER(document.getElementById('app-container')), 1200);
    } else {
      msgEl.innerHTML = `<div class="alert alert-danger">${res.error}</div>`;
    }
  } catch (e) {
    APP.setButtonLoading(btn, false);
    msgEl.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
};

// ============================================================
// Approve modal (Admin only)
window.showApproveModal = async function(order_no) {
  const user = APP.getUserInfo();
  if (!user || user.role !== 'admin') return;

  // โหลด order detail
  const res = await APP.getStopOrders();
  const order = (res.records || []).find(o => o.order_no === order_no);
  if (!order) return;

  // อ่านลายเซ็นต์จาก localStorage
  const sigKey = 'sig_' + user.username;
  const sigB64 = localStorage.getItem(sigKey);

  document.body.insertAdjacentHTML('beforeend', `
    <div id="approve-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:400;display:flex;align-items:center;justify-content:center;padding:16px">
      <div style="background:white;border-radius:10px;padding:24px;max-width:480px;width:100%;max-height:90vh;overflow-y:auto">
        <div style="font-size:16px;font-weight:700;margin-bottom:16px">✅ Approve ใบสั่งหยุดวิ่ง</div>
        <div class="alert alert-info" style="margin-bottom:12px">
          เลขที่: <strong>${order.order_no}</strong><br>
          รถ: <strong>${order.truck_no}</strong> คุณ${order.driver||''}<br>
          สาเหตุ: ${order.reason_detail||''}
        </div>
        ${sigB64
          ? `<div style="margin-bottom:12px"><div style="font-size:13px;color:#7f8c8d;margin-bottom:4px">ลายเซ็นต์ของคุณ:</div><img src="${sigB64}" style="max-height:60px;border:1px solid #ddd;border-radius:4px"></div>`
          : `<div class="alert alert-warning">⚠️ ยังไม่มีลายเซ็นต์ — ไปตั้งค่าใน Admin → จัดการลายเซ็นต์</div>`}
        <div class="form-group">
          <label class="form-label">แนบรูปหลักฐาน (ไม่บังคับ)</label>
          <input type="file" class="form-control" id="approve-evidence" accept="image/*">
        </div>
        <div id="approve-msg"></div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-primary" onclick="confirmApprove('${order_no}')">✅ Approve</button>
          <button class="btn btn-outline" style="background:#fdedec;color:#c0392b" onclick="confirmReject('${order_no}')">❌ ปฏิเสธ</button>
          <button class="btn btn-outline" onclick="document.getElementById('approve-modal').remove()">ยกเลิก</button>
        </div>
      </div>
    </div>`);
};

window.confirmApprove = async function(order_no) {
  const user = APP.getUserInfo();
  const msgEl = document.getElementById('approve-msg');
  const sigB64 = localStorage.getItem('sig_' + user.username) || '';

  // Upload evidence if file selected
  let evidenceUrl = '';
  const fileEl = document.getElementById('approve-evidence');
  if (fileEl && fileEl.files[0]) {
    try {
      const res = await uploadFileAsImage(fileEl.files[0], 'approve', APP.todayISO());
      evidenceUrl = res.url || '';
    } catch (e) {}
  }

  try {
    await APP.approveStopOrder({ order_no, approval_status: 'approved', approval_evidence_url: evidenceUrl, signature_url: sigB64 });
    document.getElementById('approve-modal').remove();
    window.VIEW_STOPORDER(document.getElementById('app-container'));
  } catch (e) {
    if (msgEl) msgEl.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
};

window.confirmReject = async function(order_no) {
  if (!confirm('ยืนยันการปฏิเสธใบสั่งหยุดวิ่งนี้?')) return;
  try {
    await APP.approveStopOrder({ order_no, approval_status: 'rejected' });
    document.getElementById('approve-modal').remove();
    window.VIEW_STOPORDER(document.getElementById('app-container'));
  } catch (e) { alert(e.message); }
};

// ============================================================
// Print — A4 standalone window
window.printOrderDoc = async function(order_no) {
  const res = await APP.getStopOrders();
  const order = (res.records || []).find(o => o.order_no === order_no);
  if (!order) return;
  openA4PrintWindow(buildDocHTML(order));
};

function openA4PrintWindow(docHtml, extraButtons) {
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
    ${extraButtons || ''}
    <button onclick="window.close()" style="margin-left:8px;padding:8px 20px;background:#7f8c8d;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">✕ ปิด</button>
  </div>
  <div class="doc">${docHtml}</div>
  </body></html>`);
  win.document.close();
}

function buildDocHTML(order) {
  const thaiMonths = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const dateObj   = order.issue_date ? new Date(order.issue_date) : new Date();
  const thaiDate  = `${dateObj.getDate()} ${thaiMonths[dateObj.getMonth()+1]} ${dateObj.getFullYear()+543}`;
  const isSevere  = order.severity === 'stop_and_call';
  const vios      = parseInt(order.vio_count || 0);

  const reasonLabels = {
    'blow_overdue':           'เป่ากรองอากาศ',
    'grease_overdue':         'อัดจาระบี',
    'drain_overdue':          'เดรนน้ำถังลม',
    'accumulated_violations': 'บำรุงรักษายานพาหนะ'
  };
  const taskText = reasonLabels[order.reason_type] || order.reason_type || '';

  // Signature section — fallback อ่านจาก localStorage ถ้า sheet ไม่มี
  const currentUser = APP.getUserInfo();
  const localSig = currentUser ? localStorage.getItem('sig_' + currentUser.username) : null;
  const sigSrc = order.signature_url || localSig || '';
  const sigHtml = sigSrc
    ? `<div class="sig-line"><img src="${sigSrc}" alt="ลายเซ็นต์"></div>`
    : `<div class="sig-line"></div>`;

  return `
    <div class="header-row">
      <div class="logo-wrap"><img src="Logo.png" onerror="this.style.display='none'"></div>
      <div class="company-info">
        <div class="company-name">บริษัท ส.ศิวโรจน์ ขนส่ง จำกัด</div>
        <div class="company-sub">ฝ่ายซ่อมบำรุงและยานพาหนะ</div>
      </div>
      <div class="doc-date">วันที่ ${thaiDate}</div>
    </div>

    <div class="doc-title">หนังสือสั่งหยุดวิ่งงาน</div>
    <div class="doc-no">เลขที่ ${order.order_no}</div>

    <div class="doc-body">
      <p><span class="highlight">เรื่อง</span>&nbsp; คำสั่งให้หยุดวิ่งงานและดำเนินการบำรุงรักษายานพาหนะ</p>
      <p><span class="highlight">เรียน</span>&nbsp; คุณ${order.driver||'___________'}&nbsp; คนขับรถหมายเลข <span class="highlight">${order.truck_no}</span></p>

      <p>ด้วยปรากฏว่า คุณ${order.driver||'___________'} คนขับรถหมายเลข <span class="highlight">${order.truck_no}</span>
      ได้ละเลยการดำเนินการ<span class="highlight">${order.reason_detail||taskText}</span>
      ซึ่งขัดต่อระเบียบการบำรุงรักษายานพาหนะของบริษัท ส.ศิวโรจน์ ขนส่ง จำกัด อย่างชัดเจน</p>

      ${!isSevere ? `
      <p>จึงมีคำสั่งให้ท่านหยุดวิ่งงานโดยทันที และดำเนินการ<span class="highlight">${taskText}</span>
      ให้แล้วเสร็จก่อนออกวิ่งงาน ทั้งนี้ให้มีผลตั้งแต่วันที่ที่ออกคำสั่งนี้เป็นต้นไป
      จนกว่าจะดำเนินการบำรุงรักษาตามที่กำหนดเสร็จสิ้น</p>
      ` : `
      <div class="severe-box">🚨 กรณีละเลยสะสม — ท่านมีประวัติการละเลยการบำรุงรักษาสะสมจำนวน <strong>${vios > 0 ? vios : 'หลาย'} ครั้ง</strong>
      ซึ่งถือเป็นการกระทำผิดซ้ำ จึงมีคำสั่งให้ท่านหยุดวิ่งงานโดยทันที
      และให้รายงานตัวที่สำนักงานก่อนเริ่มทำงานทุกครั้ง พร้อมดำเนินการบำรุงรักษาให้เสร็จสิ้นก่อนออกวิ่งงาน</div>
      <p>ทั้งนี้ หากท่านยังคงละเลยอีก บริษัทฯ จะดำเนินการตามมาตรการทางวินัยขั้นสูงสุด
      ตามระเบียบของบริษัทต่อไป</p>
      `}

      <p>จึงเรียนมาเพื่อทราบและดำเนินการโดยเร่งด่วน</p>
    </div>

    <div class="signature-section">
      <div>ลงชื่อ</div>
      ${sigHtml}
      <div class="sig-label">(${order.approved_by||order.issued_by||'____________________'})</div>
      <div class="sig-label">ผู้ออกคำสั่ง / ผู้จัดการฝ่ายซ่อมบำรุง</div>
      ${order.approved_at ? `<div class="sig-label" style="font-size:10pt;color:#777">วันที่ Approve: ${order.approved_at.substring(0,10)}</div>` : ''}
    </div>

    <div class="ack-section">
      รับทราบคำสั่ง:&nbsp;&nbsp;&nbsp; ลงชื่อ ____________________________
      &nbsp;&nbsp;&nbsp;&nbsp; วันที่ ________________
    </div>`;
}

// ============================================================
// Save to Drive
window.saveSoToDrive = async function(order_no) {
  const res = await APP.getStopOrders();
  const order = (res.records || []).find(o => o.order_no === order_no);
  if (!order) return;
  const content = buildSoPlainText(order);
  const title = order.order_no + ' — รถ ' + (order.truck_no || '') + ' — ' + (order.driver || '');
  try {
    const r = await APP.savePDFToDrive({ title, content, folder_type: 'หนังสือหยุดวิ่ง', issue_date: order.issue_date });
    if (r.success) alert('✅ บันทึก PDF ไป Drive สำเร็จ\n' + r.url);
    else alert('❌ บันทึกไม่สำเร็จ: ' + r.error);
  } catch (e) { alert('เกิดข้อผิดพลาด: ' + e.message); }
};

function buildSoPlainText(order) {
  return [
    'บริษัท ส.ศิวโรจน์ ขนส่ง จำกัด',
    'หนังสือสั่งหยุดวิ่งงาน',
    'เลขที่: ' + (order.order_no || ''),
    'วันที่: ' + (order.issue_date || ''),
    '',
    'เรียน: คุณ' + (order.driver || '') + '  รถหมายเลข ' + (order.truck_no || ''),
    '',
    'สาเหตุ: ' + (order.reason_detail || order.reason_type || ''),
    '',
    'จึงมีคำสั่งให้หยุดวิ่งงานโดยทันที',
    '',
    'ลงชื่อ: ' + (order.approved_by || order.issued_by || ''),
  ].join('\n');
}

// ============================================================
// Completion modal
window.showCompletionModal = function(order_no) {
  const today = APP.todayISO();
  document.body.insertAdjacentHTML('beforeend', `
    <div id="completion-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:400;display:flex;align-items:center;justify-content:center;padding:16px">
      <div style="background:white;border-radius:10px;padding:24px;max-width:480px;width:100%;max-height:90vh;overflow-y:auto">
        <div style="font-size:16px;font-weight:700;margin-bottom:16px">📝 บันทึกผลการดำเนินการ</div>
        <div class="alert alert-info" style="margin-bottom:12px">ใบสั่งหยุดวิ่งเลขที่: <strong>${order_no}</strong></div>
        <div class="form-group">
          <label class="form-label">วันที่ดำเนินการ</label>
          <input class="form-control" type="date" id="comp-date" value="${today}">
        </div>
        <div class="form-group">
          <label class="form-label">รายละเอียด</label>
          <textarea class="form-control" id="comp-notes" rows="3" placeholder="รายละเอียดการดำเนินการ" style="resize:vertical"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">แนบรูปหลักฐาน (หลายรูปได้)</label>
          <input type="file" class="form-control" id="comp-images" accept="image/*" multiple>
        </div>
        <div id="comp-progress" style="display:none" class="alert alert-info">กำลังอัปโหลด...</div>
        <div id="comp-msg"></div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-primary" id="comp-btn" onclick="submitCompletion('${order_no}')">💾 บันทึกผล</button>
          <button class="btn btn-outline" onclick="document.getElementById('completion-modal').remove()">ยกเลิก</button>
        </div>
      </div>
    </div>`);
};

window.submitCompletion = async function(order_no) {
  const btn = document.getElementById('comp-btn');
  const msgEl = document.getElementById('comp-msg');
  const progressEl = document.getElementById('comp-progress');
  const completion_date = document.getElementById('comp-date').value;
  const completion_notes = document.getElementById('comp-notes').value;
  const filesInput = document.getElementById('comp-images');
  const files = filesInput ? Array.from(filesInput.files) : [];

  APP.setButtonLoading(btn, true);
  msgEl.innerHTML = '';

  // Upload images
  const imageUrls = [];
  if (files.length > 0) {
    progressEl.style.display = '';
    for (let i = 0; i < files.length; i++) {
      progressEl.textContent = `อัปโหลดรูปที่ ${i+1}/${files.length}...`;
      try {
        const res = await uploadFileAsImage(files[i], 'completion', completion_date);
        if (res.url) imageUrls.push(res.url);
      } catch (e) { /* skip failed images */ }
    }
    progressEl.style.display = 'none';
  }

  const user = APP.getUserInfo();
  try {
    const res = await APP.recordCompletion({
      order_no,
      completion_date,
      completion_notes,
      completion_images: imageUrls,
      completed_by: user ? user.display_name : ''
    });
    if (res.success) {
      document.getElementById('completion-modal').remove();
      // Get order data and show completion doc
      const ordersRes = await APP.getStopOrders();
      const order = (ordersRes.records || []).find(o => o.order_no === order_no);
      if (order) {
        order.completion_date = completion_date;
        order.completion_notes = completion_notes;
        order.completion_images = imageUrls;
        order.completed_by = user ? user.display_name : '';
        openA4PrintWindow(buildCompletionDocHTML(order));
      }
      setTimeout(() => window.VIEW_STOPORDER(document.getElementById('app-container')), 800);
    } else {
      msgEl.innerHTML = `<div class="alert alert-danger">${res.error}</div>`;
      APP.setButtonLoading(btn, false);
    }
  } catch (e) {
    msgEl.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    APP.setButtonLoading(btn, false);
  }
};

function buildCompletionDocHTML(order) {
  const thaiMonths = APP.THAI_MONTHS;
  const compDateObj = order.completion_date ? new Date(order.completion_date) : new Date();
  const thaiCompDate = `${compDateObj.getDate()} ${thaiMonths[compDateObj.getMonth()+1]} ${compDateObj.getFullYear()+543}`;
  const issueDateObj = order.issue_date ? new Date(order.issue_date) : new Date();
  const thaiIssueDate = `${issueDateObj.getDate()} ${thaiMonths[issueDateObj.getMonth()+1]} ${issueDateObj.getFullYear()+543}`;

  const imagesHtml = (order.completion_images && order.completion_images.length > 0)
    ? `<div style="page-break-before:always;padding-top:20mm">
        <div style="font-size:14pt;font-weight:700;color:#1a3a5c;margin-bottom:16px;border-bottom:2px solid #1a3a5c;padding-bottom:8px">รูปหลักฐานการดำเนินการ</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${order.completion_images.map(url => `<img src="${url}" style="width:100%;border-radius:4px;border:1px solid #ddd">`).join('')}
        </div>
      </div>`
    : '';

  return `
    <div class="header-row">
      <div class="logo-wrap"><img src="Logo.png" onerror="this.style.display='none'"></div>
      <div class="company-info">
        <div class="company-name">บริษัท ส.ศิวโรจน์ ขนส่ง จำกัด</div>
        <div class="company-sub">ฝ่ายซ่อมบำรุงและยานพาหนะ</div>
      </div>
      <div class="doc-date">วันที่ ${thaiCompDate}</div>
    </div>

    <div class="doc-title">เอกสารบันทึกการดำเนินการตามคำสั่งหยุดวิ่ง</div>
    <div class="doc-no">อ้างอิงใบสั่งหยุดวิ่งเลขที่ ${order.order_no || '-'}</div>

    <div class="doc-body">
      <p><span class="highlight">รถหมายเลข:</span> ${order.truck_no || ''}&nbsp;&nbsp;&nbsp;
         <span class="highlight">คนขับ:</span> ${order.driver || '-'}</p>
      <p><span class="highlight">วันที่ออกคำสั่ง:</span> ${thaiIssueDate}&nbsp;&nbsp;&nbsp;
         <span class="highlight">วันที่ดำเนินการ:</span> ${thaiCompDate}</p>
      <p><span class="highlight">สาเหตุ:</span> ${order.reason_detail || order.reason_type || ''}</p>
      <p><span class="highlight">รายละเอียดการดำเนินการ:</span><br>
      ${order.completion_notes || '(ไม่มีรายละเอียดเพิ่มเติม)'}</p>
    </div>

    <div class="signature-section">
      <div>ผู้ดำเนินการ / ผู้บันทึก</div>
      <div class="sig-line"></div>
      <div class="sig-label">(${order.completed_by || '____________________'})</div>
      <div class="sig-label">วันที่: ${thaiCompDate}</div>
    </div>

    <div class="ack-section">
      ผู้รับทราบ:&nbsp;&nbsp;&nbsp; ลงชื่อ ____________________________
      &nbsp;&nbsp;&nbsp;&nbsp; วันที่ ________________
    </div>

    ${imagesHtml}`;
}

// Helper: upload file for approval evidence
async function uploadFileAsImage(file, prefix, date) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1];
      try {
        const res = await APP.uploadImage(base64, file.type, 'approve', prefix, date);
        if (res.success) resolve(res);
        else reject(new Error(res.error));
      } catch (err) { reject(err); }
    };
    reader.readAsDataURL(file);
  });
}
