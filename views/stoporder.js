// views/stoporder.js — ระบบออกหนังสือสั่งหยุดวิ่ง
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

    const fleet = fleetRes.fleet || {};
    const trucks = (trucksRes.trucks || []).filter(t => t.active !== false && t.active !== 'FALSE');
    const violations = violationsRes.records || [];
    const orders = ordersRes.records || [];

    // นับ violations ต่อ truck
    const vioCount = {};
    violations.forEach(v => { vioCount[v.truck_no] = (vioCount[v.truck_no] || 0) + 1; });

    // คำนวณรถที่เข้าเงื่อนไข
    const eligible = calcEligibleTrucks(fleet, trucks, vioCount, today);

    renderStopOrderPage(
      document.getElementById('stoporder-content'),
      eligible, trucks, vioCount, orders, today
    );
  } catch (e) {
    APP.showError(document.getElementById('stoporder-content'), 'โหลดข้อมูลไม่สำเร็จ: ' + e.message);
  }
};

// ============================================================
// คำนวณรถที่เข้าเงื่อนไขออกใบสั่งหยุด
// ============================================================
function calcEligibleTrucks(fleet, trucks, vioCount, today) {
  const day  = today.getDate();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const lastDay = APP.getLastDayOfMonth(year, month);

  // deadline วันสุดท้ายของ Week 4 = วันสุดท้ายของเดือน
  const weekDeadlines = { 1: 7, 2: 14, 3: 21, 4: lastDay };

  const eligible = [];

  trucks.forEach(t => {
    const f = fleet[t.truck_no] || {};
    const vios = vioCount[t.truck_no] || 0;

    // ---- เป่ากรอง (blow) weeks ----
    for (let w = 1; w <= 4; w++) {
      const deadline = weekDeadlines[w];
      const overdueDays = day - (deadline + 2); // บวก 2 วัน grace
      if (overdueDays < 0) continue; // ยังไม่ถึงเวลา
      const blowStatus = f.blow && f.blow[String(w)];
      if (blowStatus === 'done') continue; // ทำแล้ว
      eligible.push({
        truck_no:    t.truck_no,
        driver:      t.driver,
        task_type:   'เป่ากรอง',
        reason_type: 'blow_overdue',
        cycle:       `Week ${w}`,
        deadline_day: deadline,
        overdue_days: overdueDays + 2, // วันที่เกินจริง
        current_status: blowStatus || 'ไม่มีข้อมูล',
        vios
      });
    }

    // ---- อัดจาระบี รอบ 1 (deadline วันที่ 15) ----
    if (day >= 17) {
      const greaseR1 = f.grease && f.grease['1'];
      if (greaseR1 !== 'done') {
        eligible.push({
          truck_no: t.truck_no, driver: t.driver,
          task_type: 'อัดจาระบี', reason_type: 'grease_overdue',
          cycle: 'รอบ 1 (10-15)', deadline_day: 15,
          overdue_days: day - 15, current_status: greaseR1 || 'ไม่มีข้อมูล', vios
        });
      }
    }

    // ---- อัดจาระบี รอบ 2 (deadline วันสุดท้าย) ----
    if (day >= lastDay + 2 || (month !== today.getMonth() + 1)) {
      const greaseR2 = f.grease && f.grease['2'];
      if (greaseR2 !== 'done') {
        eligible.push({
          truck_no: t.truck_no, driver: t.driver,
          task_type: 'อัดจาระบี', reason_type: 'grease_overdue',
          cycle: 'รอบ 2 (25-สิ้นเดือน)', deadline_day: lastDay,
          overdue_days: Math.max(day - lastDay, 2), current_status: greaseR2 || 'ไม่มีข้อมูล', vios
        });
      }
    }
  });

  // กำหนด severity
  eligible.forEach(e => {
    e.severity = e.vios >= 3 ? 'stop_and_call' : 'stop_work';
  });

  return eligible;
}

// ============================================================
// Render หน้า
// ============================================================
function renderStopOrderPage(container, eligible, trucks, vioCount, orders, today) {
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const thaiDate = APP.formatThaiDate(today);

  container.innerHTML = `
    <!-- Section 1: รถที่เข้าเงื่อนไข -->
    <div class="card">
      <div class="card-title">
        🔍 รถที่เข้าเงื่อนไขออกใบสั่งหยุดวิ่ง
        ${eligible.length > 0 ? `<span class="badge badge-red" style="margin-left:8px">${eligible.length} คัน</span>` : ''}
      </div>
      ${eligible.length === 0
        ? '<div class="alert alert-success">✅ ไม่มีรถที่เข้าเงื่อนไขในขณะนี้</div>'
        : renderEligibleTable(eligible)
      }
    </div>

    <!-- Section 2: ออกใบสั่งหยุดวิ่ง (manual) -->
    <div class="card">
      <div class="card-title">📝 ออกใบสั่งหยุดวิ่ง (กรอกเอง)</div>
      <div class="form-group">
        <label class="form-label">เบอร์รถ</label>
        <select class="form-control" id="so-truck" onchange="onSoTruckChange()">
          <option value="">-- เลือกรถ --</option>
          ${trucks.map(t => `<option value="${t.truck_no}" data-driver="${t.driver||''}">${t.truck_no} — ${t.driver||'-'}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">คนขับ</label>
        <input class="form-control" type="text" id="so-driver" placeholder="ชื่อคนขับ">
      </div>
      <div class="form-group">
        <label class="form-label">สาเหตุ</label>
        <select class="form-control" id="so-reason-type">
          <option value="blow_overdue">เป่ากรองเกินกำหนด</option>
          <option value="grease_overdue">อัดจาระบีเกินกำหนด</option>
          <option value="drain_overdue">เดรนน้ำเกินกำหนด</option>
          <option value="accumulated_violations">ละเลยสะสม ≥ 3 ครั้ง</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">รายละเอียดเพิ่มเติม</label>
        <input class="form-control" type="text" id="so-detail" placeholder="เช่น เป่ากรอง Week 2 เกินกำหนด 3 วัน">
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
        ${pendingOrders.length > 0 ? `<span class="badge badge-red" style="margin-left:8px">${pendingOrders.length} รอดำเนินการ</span>` : ''}
      </div>
      ${orders.length === 0
        ? '<div style="color:var(--text-light);font-size:14px">ยังไม่มีประวัติ</div>'
        : renderOrderHistory(orders)
      }
    </div>
  `;

  // Store trucks for use in handlers
  window._soTrucks = trucks;
  window._soVioCount = vioCount;

  window.onSoTruckChange = () => {
    const sel = document.getElementById('so-truck');
    const opt = sel.options[sel.selectedIndex];
    document.getElementById('so-driver').value = opt.dataset.driver || '';
  };
}

function renderEligibleTable(eligible) {
  const rows = eligible.map(e => {
    const sevBadge = e.severity === 'stop_and_call'
      ? '<span class="badge badge-red">🚨 หยุด+เรียกพบ</span>'
      : '<span class="badge badge-orange">🛑 หยุดทำทันที</span>';
    return `
      <tr>
        <td><strong>${e.truck_no}</strong></td>
        <td>${e.driver || '-'}</td>
        <td>${e.task_type} ${e.cycle}</td>
        <td style="color:var(--danger);font-weight:600">+${e.overdue_days} วัน</td>
        <td>${e.vios > 0 ? `<span class="badge badge-red">${e.vios} ครั้ง</span>` : '-'}</td>
        <td>${sevBadge}</td>
        <td>
          <button class="btn btn-sm btn-primary"
            onclick="quickIssueOrder('${e.truck_no}','${(e.driver||'').replace(/'/g,"\\'")}','${e.reason_type}','${e.task_type} ${e.cycle} เกินกำหนด ${e.overdue_days} วัน','${e.severity}')">
            📄 ออกใบ
          </button>
        </td>
      </tr>`;
  }).join('');

  return `
    <div style="overflow-x:auto">
      <table class="fleet-table" style="width:100%;min-width:600px">
        <thead>
          <tr>
            <th>รถ</th><th>คนขับ</th><th>งาน/รอบ</th>
            <th>เกินกำหนด</th><th>ประวัติ</th>
            <th>ความรุนแรง</th><th>ออกใบ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderOrderHistory(orders) {
  const statusLabel = { pending: '⏳ รอดำเนินการ', acknowledged: '✅ รับทราบแล้ว', completed: '🏁 เสร็จสิ้น', cancelled: '❌ ยกเลิก' };
  const statusClass = { pending: 'badge-red', acknowledged: 'badge-orange', completed: 'badge-green', cancelled: 'badge-gray' };

  return `
    <div style="overflow-x:auto">
      <table class="fleet-table" style="width:100%;min-width:560px">
        <thead>
          <tr><th>เลขที่</th><th>วันที่</th><th>รถ</th><th>คนขับ</th><th>สาเหตุ</th><th>สถานะ</th><th>จัดการ</th></tr>
        </thead>
        <tbody>
          ${orders.slice().reverse().map(o => `
            <tr>
              <td><small>${o.order_no}</small></td>
              <td><small>${o.issue_date||'-'}</small></td>
              <td><strong>${o.truck_no}</strong></td>
              <td>${o.driver||'-'}</td>
              <td style="font-size:12px">${o.reason_detail||o.reason_type||'-'}</td>
              <td><span class="badge ${statusClass[o.status]||'badge-gray'}">${statusLabel[o.status]||o.status}</span></td>
              <td style="white-space:nowrap">
                <button class="btn btn-sm btn-outline" onclick="showOrderDoc('${o.order_no}')">🖨️</button>
                ${o.status === 'pending' ? `<button class="btn btn-sm btn-outline" onclick="changeOrderStatus('${o.order_no}','acknowledged')">รับทราบ</button>` : ''}
                ${o.status === 'acknowledged' ? `<button class="btn btn-sm btn-outline" onclick="changeOrderStatus('${o.order_no}','completed')">เสร็จ</button>` : ''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ============================================================
// Action Handlers
// ============================================================

window.quickIssueOrder = async function(truck_no, driver, reason_type, detail, severity) {
  document.getElementById('so-truck').value = truck_no;
  document.getElementById('so-driver').value = driver;
  document.getElementById('so-reason-type').value = reason_type;
  document.getElementById('so-detail').value = detail;
  document.getElementById('so-severity').value = severity;
  // Scroll to form
  document.getElementById('so-truck').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.submitStopOrder = async function() {
  const truck_no = document.getElementById('so-truck').value;
  const driver   = document.getElementById('so-driver').value;
  const reason_type = document.getElementById('so-reason-type').value;
  const reason_detail = document.getElementById('so-detail').value;
  const severity = document.getElementById('so-severity').value;
  const msgEl = document.getElementById('so-msg');

  if (!truck_no) { msgEl.innerHTML = '<div class="alert alert-danger">กรุณาเลือกเบอร์รถ</div>'; return; }

  const btn = document.querySelector('[onclick="submitStopOrder()"]');
  APP.setButtonLoading(btn, true);
  msgEl.innerHTML = '';

  try {
    const res = await APP.issueStopOrder({ truck_no, driver, reason_type, reason_detail, severity });
    APP.setButtonLoading(btn, false);
    if (res.success) {
      msgEl.innerHTML = `<div class="alert alert-success">✅ ออกใบสั่งหยุดวิ่งสำเร็จ — เลขที่ <strong>${res.order_no}</strong></div>`;
      // Show print modal
      showNewOrderDoc(res.order_no, truck_no, driver, reason_type, reason_detail, severity);
    } else {
      msgEl.innerHTML = `<div class="alert alert-danger">${res.error}</div>`;
    }
  } catch (e) {
    APP.setButtonLoading(btn, false);
    msgEl.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
};

window.changeOrderStatus = async function(order_no, status) {
  try {
    await APP.updateStopOrder(order_no, status);
    // Reload page
    window.VIEW_STOPORDER(document.getElementById('app-container'));
  } catch (e) {
    alert('เกิดข้อผิดพลาด: ' + e.message);
  }
};

window.showOrderDoc = async function(order_no) {
  const res = await APP.getStopOrders();
  const order = (res.records || []).find(o => o.order_no === order_no);
  if (!order) return;
  const sevLabel = order.severity === 'stop_and_call' ? 'stop_and_call' : 'stop_work';
  renderOrderModal(order.order_no, order.truck_no, order.driver, order.reason_type, order.reason_detail, sevLabel, order.issue_date, order.issued_by, order.vio_count);
};

function showNewOrderDoc(order_no, truck_no, driver, reason_type, detail, severity) {
  const today = APP.todayISO();
  const user = APP.getUserInfo();
  renderOrderModal(order_no, truck_no, driver, reason_type, detail, severity, today, user ? user.display_name : '');
}

function renderOrderModal(order_no, truck_no, driver, reason_type, detail, severity, issue_date, issued_by) {
  const reasonLabels = {
    'blow_overdue': 'ไม่เป่ากรองอากาศตามกำหนด',
    'grease_overdue': 'ไม่อัดจาระบีตามกำหนด',
    'drain_overdue': 'ไม่เดรนน้ำถังลมตามกำหนด',
    'accumulated_violations': 'มีการละเลยการบำรุงรักษาสะสม'
  };
  const reasonText = reasonLabels[reason_type] || reason_type;
  const detailText = detail || reasonText;

  // Format Thai date
  const dateObj = new Date(issue_date || APP.todayISO());
  const thaiDate = APP.formatThaiDate(dateObj);

  const stopText = severity === 'stop_and_call'
    ? `จึงมีคำสั่งให้หยุดวิ่งงานโดยทันที และรายงานตัวที่สำนักงานก่อนเข้าทำงาน\n\nเนื่องจากมีประวัติการละเลยการบำรุงรักษาสะสมเกินกว่า 3 ครั้ง\nจึงให้หยุดวิ่งงาน และรายงานตัวที่สำนักงานก่อนเริ่มงาน\nทั้งนี้ก่อนออกวิ่งงาน ให้ดำเนินการบำรุงรักษาให้เสร็จสิ้นก่อน`
    : `จึงมีคำสั่งให้หยุดวิ่งงานโดยทันที และดำเนินการ${reasonText}\nให้เสร็จสิ้นก่อนออกวิ่งงาน`;

  const html = `
    <div class="stop-order-modal-backdrop" id="stop-order-modal">
      <div class="stop-order-doc-wrap">
        <div class="stop-order-doc">
          <div class="doc-header-row">
            <div>
              <div class="doc-company">บริษัท __________________ จำกัด</div>
              <div style="font-size:13px;color:#555">ฝ่ายซ่อมบำรุงและยานพาหนะ</div>
            </div>
            <div style="text-align:right;font-size:13px">
              <div>วันที่ ${thaiDate}</div>
            </div>
          </div>

          <div class="doc-title">หนังสือสั่งหยุดวิ่งงาน</div>
          <div class="doc-no">เลขที่: ${order_no}</div>

          <div class="doc-body">เรื่อง: สั่งหยุดวิ่งงานเพื่อดำเนินการบำรุงรักษา

เรียน นาย/นาง <strong>${driver || '___________'}</strong>
คนขับรถหมายเลข <strong>${truck_no}</strong>

          ด้วยปรากฏว่าท่านละเลย${detailText}

${stopText}

          จึงเรียนมาเพื่อทราบและดำเนินการโดยเร่งด่วน</div>

          <div class="doc-signature">
            <div>ลงชื่อ ___________________________</div>
            <div style="font-size:13px;color:#555">( ${issued_by || '________________'} )</div>
            <div style="font-size:13px;color:#555">ผู้ออกคำสั่ง / ผู้จัดการ</div>
          </div>

          <hr style="margin:20px 0;border-color:#ddd">
          <div style="font-size:12px;color:#888;text-align:center">
            รับทราบคำสั่ง: __________________ วันที่ __________
          </div>
        </div>

        <div class="doc-actions">
          <button class="btn btn-primary" onclick="window.print()">🖨️ พิมพ์</button>
          <button class="btn btn-outline" onclick="document.getElementById('stop-order-modal').remove()">✕ ปิด</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
}
