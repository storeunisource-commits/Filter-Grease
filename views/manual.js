// views/manual.js — คู่มือการใช้งาน
window.VIEW_MANUAL = function render(container) {
  container.innerHTML = `
    <div class="page-title">📖 คู่มือการใช้งาน</div>

    <div class="card">
      <div class="card-title">🏠 Dashboard (หน้าหลัก)</div>
      <ul style="padding-left:18px;line-height:2">
        <li>แสดงสรุปสถิติวันนี้ — รถที่เป่าแล้ว / ยังไม่เป่า / โทรแจ้งแล้ว</li>
        <li>แจ้งเตือนรอบที่กำลังจะถึง (เป่ากรอง Week / อัดจาระบี รอบ)</li>
        <li>ตาราง Fleet Status — สถานะรถทุกคันในเดือนนั้น แยกตาม Week / รอบ</li>
        <li>เปรียบเทียบสถิติ 2 เดือน</li>
      </ul>
    </div>

    <div class="card">
      <div class="card-title">💨 เป่ากรองอากาศ</div>
      <ul style="padding-left:18px;line-height:2">
        <li>บันทึกสถานะการเป่ากรองของรถแต่ละคันในแต่ละวัน</li>
        <li>เลือกเบอร์รถ → ชื่อคนขับแสดงอัตโนมัติ</li>
        <li>เลือกสถานะ: ✅ ทำแล้ว / 📞 โทรแจ้งแล้ว / ❌ ยังไม่ได้ทำ</li>
        <li>Week คำนวณอัตโนมัติจากวันที่ปัจจุบัน (1-7=W1, 8-14=W2, 15-21=W3, 22+=W4)</li>
        <li>แนบรูปภาพได้เมื่อเลือก "ทำแล้ว"</li>
        <li>ต้องระบุหมายเหตุเมื่อเลือก "ยังไม่ได้ทำ"</li>
      </ul>
    </div>

    <div class="card">
      <div class="card-title">💧 เดรนน้ำถังลม</div>
      <ul style="padding-left:18px;line-height:2">
        <li>บันทึกสถานะการเดรนน้ำ — รูปแบบเดียวกับเป่ากรอง</li>
        <li>กรอกทุกสัปดาห์ (Week 1–4)</li>
      </ul>
    </div>

    <div class="card">
      <div class="card-title">🔧 อัดจาระบี</div>
      <ul style="padding-left:18px;line-height:2">
        <li>บันทึกสถานะการอัดจาระบี <strong>2 รอบต่อเดือน</strong></li>
        <li>รอบ 1: วันที่ 10–15 ของเดือน</li>
        <li>รอบ 2: วันที่ 25–สิ้นเดือน</li>
        <li>กรอกได้ทุกวัน ไม่ล็อคช่วงเวลา (เลือกรอบเองจาก dropdown)</li>
        <li>แนบรูปภาพและระบุหมายเหตุได้</li>
      </ul>
    </div>

    <div class="card">
      <div class="card-title">📞 โทรตาม</div>
      <ul style="padding-left:18px;line-height:2">
        <li>บันทึกเมื่อโทรหาคนขับที่ยังไม่ดำเนินการ</li>
        <li>ระบุผลการโทร และหมายเหตุ</li>
        <li>ใช้เป็นหลักฐานว่าได้แจ้งแล้ว</li>
      </ul>
    </div>

    <div class="card">
      <div class="card-title">📊 ประวัติการบันทึก</div>
      <ul style="padding-left:18px;line-height:2">
        <li>ค้นหาประวัติย้อนหลังตามประเภทงาน / เดือน / ปี</li>
        <li>ดูได้ทั้งเป่ากรอง, เดรนน้ำ, และอัดจาระบี</li>
      </ul>
    </div>

    <div class="card">
      <div class="card-title">📤 ส่งรายงาน</div>
      <ul style="padding-left:18px;line-height:2">
        <li><strong>ส่งรายงาน (เป่า/เดรน)</strong>: ส่งสรุปการเป่ากรองและเดรนน้ำ ตาม Week ที่เลือก</li>
        <li><strong>ส่งรายงาน (จาระบี)</strong>: ส่งสรุปการอัดจาระบีตามรอบ</li>
        <li>ระบบบันทึกว่าส่งตรงเวลาหรือไม่</li>
        <li>Deadline: รอบ Week 1-2 ส่งภายในวันที่ 20 / Week 3-4 ส่งต้นเดือนถัดไป</li>
      </ul>
    </div>

    <div class="card">
      <div class="card-title">⚠️ บันทึกมาตรการ (Violations)</div>
      <ul style="padding-left:18px;line-height:2">
        <li>บันทึกเมื่อรถหรือคนขับละเลยการบำรุงรักษา</li>
        <li>ระบุงานที่ละเลย, รอบ, ประเภทการละเลย</li>
        <li>บทลงโทษเพิ่มตามจำนวนครั้งสะสม</li>
        <li>ครั้งที่ 1: ตักเตือนด้วยวาจา</li>
        <li>ครั้งที่ 2: ตักเตือนเป็นลายลักษณ์อักษร</li>
        <li>ครั้งที่ 3+: ตัดเงิน / พักงาน</li>
      </ul>
    </div>

    <div class="card" style="border-left: 4px solid var(--danger)">
      <div class="card-title" style="color:var(--danger)">🚫 สั่งหยุดวิ่ง (Stop Work Order)</div>
      <ul style="padding-left:18px;line-height:2">
        <li>ออกใบสั่งหยุดวิ่งเมื่อรถเกินกำหนดบำรุงรักษา <strong>2 วัน</strong></li>
        <li>เงื่อนไข: เป่ากรอง / อัดจาระบี เกินกำหนด → <strong>หยุดวิ่งและทำทันที</strong></li>
        <li>หากละเลยสะสม ≥ 3 ครั้ง → <strong>หยุดวิ่ง + เรียกพบ Office</strong></li>
        <li>สามารถพิมพ์หนังสือสั่งหยุดวิ่งอย่างเป็นทางการได้</li>
        <li>ติดตามสถานะ: รอดำเนินการ → รับทราบ → เสร็จสิ้น</li>
      </ul>
    </div>

    <div class="card">
      <div class="card-title">📋 มาตรฐาน</div>
      <ul style="padding-left:18px;line-height:2">
        <li>ดูมาตรฐานการบำรุงรักษา ขั้นตอน และข้อกำหนด</li>
      </ul>
    </div>

    <div class="card">
      <div class="card-title">👤 จัดการผู้ใช้ (Admin เท่านั้น)</div>
      <ul style="padding-left:18px;line-height:2">
        <li>เพิ่ม / ลบ / แก้ไขผู้ใช้งาน</li>
        <li>กำหนด role: admin / operator / viewer</li>
        <li>Reset password</li>
      </ul>
    </div>

    <div class="card" style="background:#f8fafc">
      <div class="card-title">💡 Tips</div>
      <ul style="padding-left:18px;line-height:2">
        <li>ข้อมูลรถโหลดจาก Cache 5 นาที — ถ้าแก้ข้อมูลรถแล้วไม่อัปเดต ให้ logout และ login ใหม่</li>
        <li>บน Desktop: Sidebar แสดงตลอดทางซ้าย</li>
        <li>บน Mobile: กดปุ่ม ☰ เพื่อเปิด/ปิด Sidebar</li>
        <li>สถานะ Fleet Status ใน Dashboard อัปเดตตาม record ที่บันทึก (ดีที่สุดที่พบ)</li>
      </ul>
    </div>
  `;
};
