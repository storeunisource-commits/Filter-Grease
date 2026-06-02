// views/standards.js — SOP standards page
window.VIEW_STANDARDS = function render(container) {
  container.innerHTML = `
    <div class="page-title">📖 มาตรฐานการปฏิบัติงาน (SOP)</div>
    <div class="alert alert-info">📋 มาตรฐานนี้ปรับปรุงใหม่ตามคำสั่งผู้บริหาร — รอบอัดจาระบีเปลี่ยนเป็น <b>10-15 และ 25-ท้ายเดือน</b></div>

    <!-- เป่ากรองอากาศ -->
    <div class="card">
      <div class="card-title">💨 1. การเป่ากรองอากาศ (Air Filter Cleaning)</div>
      <table style="width:100%;margin-bottom:12px;font-size:14px">
        <tr><td style="width:140px;color:var(--text-light);padding:4px 0"><b>ความถี่</b></td><td>ทุกวัน (วันทำการ)</td></tr>
        <tr><td style="color:var(--text-light);padding:4px 0"><b>เป้าหมาย</b></td><td>8–9 ครั้ง/เดือน ต่อคัน</td></tr>
        <tr><td style="color:var(--text-light);padding:4px 0"><b>ผู้รับผิดชอบ</b></td><td>พนักงานขับรถ / ช่างบำรุงรักษา</td></tr>
      </table>
      <div style="font-size:14px">
        <p style="font-weight:600;margin-bottom:6px">ขั้นตอนการปฏิบัติ:</p>
        <ol style="padding-left:20px;line-height:1.8">
          <li>จอดรถในพื้นที่ที่กำหนด ดับเครื่องยนต์</li>
          <li>ตรวจสอบตำแหน่งกรองอากาศ</li>
          <li>ถอดกรองอากาศออก</li>
          <li>ใช้ลมอัดเป่าทำความสะอาดจากด้านในออกด้านนอก</li>
          <li>ตรวจสอบความเสียหายของกรอง (ถ้าเสียหายให้เปลี่ยนใหม่)</li>
          <li>ใส่กรองกลับและยึดให้แน่น</li>
          <li>บันทึกในระบบ Filter-Grease</li>
        </ol>
      </div>
      <div class="alert alert-warning" style="margin-top:12px">
        ⚠️ หากรถจอดซ่อม / จอดเคลม ให้ระบุในหมายเหตุ ไม่ต้องเป่า
      </div>
    </div>

    <!-- อัดจาระบี -->
    <div class="card">
      <div class="card-title">🔧 2. การอัดจาระบี (Greasing)</div>
      <table style="width:100%;margin-bottom:12px;font-size:14px">
        <tr><td style="width:140px;color:var(--text-light);padding:4px 0"><b>ความถี่</b></td><td><b>2 ครั้ง/เดือน</b></td></tr>
        <tr><td style="color:var(--text-light);padding:4px 0"><b>รอบที่ 1</b></td><td>วันที่ <b>10–15</b> ของเดือน</td></tr>
        <tr><td style="color:var(--text-light);padding:4px 0"><b>รอบที่ 2</b></td><td>วันที่ <b>25–ท้ายเดือน</b> (ตามจำนวนวันจริง)</td></tr>
        <tr><td style="color:var(--text-light);padding:4px 0"><b>ผู้รับผิดชอบ</b></td><td>พนักงานขับรถ / ช่างบำรุงรักษา</td></tr>
      </table>
      <div class="alert alert-success" style="margin-bottom:12px">
        ✅ <b>รอบใหม่</b>: 10-15 และ 25-ท้ายเดือน (เปลี่ยนจากเดิม 1 และ 16) เพื่อให้การ follow up ง่ายขึ้น ไม่คร่อมเดือน
      </div>
      <div style="font-size:14px">
        <p style="font-weight:600;margin-bottom:6px">ขั้นตอนการปฏิบัติ:</p>
        <ol style="padding-left:20px;line-height:1.8">
          <li>จอดรถและดับเครื่องยนต์</li>
          <li>ตรวจสอบจุดอัดจาระบีทุกจุดตามแบบแผน</li>
          <li>ทำความสะอาดหัวอัดจาระบี (Grease Nipple)</li>
          <li>อัดจาระบีจนล้นเล็กน้อยในทุกจุดที่กำหนด</li>
          <li>เช็ดจาระบีส่วนเกินออก</li>
          <li>ตรวจสอบจุดรั่วหรือความผิดปกติ</li>
          <li>บันทึกในระบบ Filter-Grease ระบุรอบ (10-15 หรือ 25-ท้ายเดือน)</li>
        </ol>
      </div>
      <div class="alert alert-warning" style="margin-top:12px">
        ⏰ <b>กำหนดส่งรายงาน:</b> รอบ 1 ส่งภายในวันที่ 20 | รอบ 2 ส่งภายในวันที่ 5 เดือนถัดไป
      </div>
    </div>

    <!-- เดรนน้ำถังลม -->
    <div class="card">
      <div class="card-title">💧 3. การเดรนน้ำถังลม (Air Tank Draining)</div>
      <table style="width:100%;margin-bottom:12px;font-size:14px">
        <tr><td style="width:140px;color:var(--text-light);padding:4px 0"><b>ความถี่</b></td><td>ทุกวัน (ก่อนออกรถ)</td></tr>
        <tr><td style="color:var(--text-light);padding:4px 0"><b>ผู้รับผิดชอบ</b></td><td>พนักงานขับรถ</td></tr>
      </table>
      <div style="font-size:14px">
        <p style="font-weight:600;margin-bottom:6px">ขั้นตอนการปฏิบัติ:</p>
        <ol style="padding-left:20px;line-height:1.8">
          <li>ก่อนออกรถ ตรวจสอบแรงดันลมในระบบ</li>
          <li>เปิดวาล์วถ่ายน้ำที่ถังลมทุกถัง</li>
          <li>รอจนน้ำและความชื้นออกหมด</li>
          <li>ปิดวาล์วให้สนิท</li>
          <li>ตรวจสอบแรงดันลมอีกครั้ง</li>
          <li>บันทึกในระบบ Filter-Grease</li>
        </ol>
      </div>
    </div>

    <!-- บทลงโทษ -->
    <div class="card">
      <div class="card-title">⚠️ บทลงโทษกรณีไม่ปฏิบัติตามข้อกำหนด</div>
      <div style="font-size:14px">
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
          <span class="badge badge-orange" style="min-width:80px;text-align:center">ครั้งที่ 1</span>
          <span>ตักเตือนด้วยวาจา — บันทึกในระบบ</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
          <span class="badge badge-red" style="min-width:80px;text-align:center">ครั้งที่ 2</span>
          <span>ตักเตือนเป็นลายลักษณ์อักษร</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0">
          <span class="badge badge-red" style="min-width:80px;text-align:center">ครั้งที่ 3+</span>
          <span>ตัดเงิน / พักงาน (ตามดุลพินิจผู้บริหาร)</span>
        </div>
      </div>
    </div>

    <div style="text-align:center;color:var(--text-light);font-size:13px;margin-top:8px">
      อัปเดตล่าสุด: มิถุนายน 2569 | ระบบ Filter-Grease
    </div>
  `;
};
