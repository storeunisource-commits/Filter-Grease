// views/manual.js — คู่มือการใช้งาน (Accordion)
window.VIEW_MANUAL = function render(container) {
  const sections = [
    {
      icon: '🏠', title: 'Dashboard (หน้าหลัก)',
      body: `<ul>
        <li>แสดงสรุปสถิติตามเดือนที่เลือก — สลับปี/เดือนได้</li>
        <li>ตาราง Fleet Status — สถานะรถทุกคันแยกตาม Week และรอบ</li>
        <li>รายการค้างดำเนินการ: โทรแล้วยังไม่ทำ / ยังไม่ทำเลย / ทำแล้ว</li>
        <li>สรุปบทลงโทษ + สถานะการส่งรายงาน</li>
        <li>เปรียบเทียบสถิติ 2 เดือน</li>
      </ul>`
    },
    {
      icon: '💨', title: 'เป่ากรองอากาศ',
      body: `<ul>
        <li>บันทึกทุกวัน — เลือกเบอร์รถ → ชื่อคนขับแสดงอัตโนมัติ</li>
        <li>เลือกสถานะ: ✅ ทำแล้ว / 📞 โทรแจ้งแล้ว / ❌ ยังไม่ทำ</li>
        <li>Week คำนวณอัตโนมัติ (1-7=W1, 8-14=W2, 15-21=W3, 22+=W4)</li>
        <li>แนบรูปภาพได้หลายรูปเมื่อเลือก "ทำแล้ว"</li>
        <li>ต้องระบุหมายเหตุเมื่อเลือก "ยังไม่ทำ"</li>
      </ul>`
    },
    {
      icon: '💧', title: 'เดรนน้ำถังลม',
      body: `<ul>
        <li>บันทึกรูปแบบเดียวกับเป่ากรอง</li>
        <li>กรอกทุกสัปดาห์ (Week 1–4)</li>
        <li>แนบรูปได้หลายรูป</li>
      </ul>`
    },
    {
      icon: '🔧', title: 'อัดจาระบี',
      body: `<ul>
        <li>บันทึก <strong>2 รอบต่อเดือน</strong>: รอบ 1 (10-15) และ รอบ 2 (25-สิ้นเดือน)</li>
        <li>กรอกได้ทุกวัน ไม่ล็อคช่วงเวลา — เลือกรอบจาก dropdown</li>
        <li>แนบรูปและระบุหมายเหตุได้</li>
      </ul>`
    },
    {
      icon: '📞', title: 'บันทึกการโทรตาม',
      body: `<ul>
        <li>บันทึกเมื่อโทรหาคนขับที่ยังไม่ดำเนินการ</li>
        <li>เลือกเบอร์รถ → ชื่อคนขับแสดงอัตโนมัติ</li>
        <li>ระบุผลการโทร: รับสาย / ไม่รับ / รับแล้วจะทำ / รับแล้วทำแล้ว</li>
        <li>ใช้เป็นหลักฐานการติดตามงาน</li>
      </ul>`
    },
    {
      icon: '📊', title: 'ประวัติการบันทึก',
      body: `<ul>
        <li>ค้นหาประวัติย้อนหลังตามประเภทงาน เดือน และปี</li>
        <li>Export CSV หรือพิมพ์</li>
        <li>Tab: เป่ากรอง / อัดจาระบี / เดรนน้ำ / โทรตาม</li>
      </ul>`
    },
    {
      icon: '📤', title: 'ส่งรายงาน',
      body: `<ul>
        <li><strong>เป่า/เดรน</strong>: ส่งสรุปตาม Week ที่เลือก</li>
        <li><strong>จาระบี</strong>: ส่งสรุปตามรอบ (1 หรือ 2)</li>
        <li>ระบบบันทึกว่าส่งตรงเวลาหรือไม่</li>
        <li>Deadline: รอบ W1-2 → ส่งภายในวันที่ 20 / W3-4 → ส่งต้นเดือนถัดไป</li>
      </ul>`
    },
    {
      icon: '⚠️', title: 'บันทึกมาตรการ (Violations)',
      body: `<ul>
        <li>เลือกรถ → ระบบนับประวัติการละเลยสะสมอัตโนมัติ</li>
        <li>บทลงโทษคำนวณอัตโนมัติ: ครั้งที่ 1=วาจา / 2=ลายลักษณ์ / 3+=ตัดเงิน/พักงาน</li>
        <li>ถ้าละเลย ≥ 3 ครั้ง ระบบจะแนะนำออกใบสั่งหยุดวิ่ง</li>
        <li>ดูประวัติการละเลยได้ทุกช่วงเวลา</li>
      </ul>`
    },
    {
      icon: '🚫', title: 'สั่งหยุดวิ่ง (Stop Work Order)',
      body: `<ul>
        <li>ระบบตรวจรถที่เกินกำหนดบำรุงรักษา 2 วันโดยอัตโนมัติ</li>
        <li>เงื่อนไข: เป่ากรอง/อัดจาระบี เกินกำหนด → <strong>หยุดวิ่งทำทันที</strong></li>
        <li>ละเลยสะสม ≥ 3 ครั้ง → <strong>หยุดวิ่ง + เรียกพบ Office</strong></li>
        <li><strong>Operator</strong>: ออกใบสั่ง → รอ Admin Approve</li>
        <li><strong>Admin</strong>: ออกใบสั่งโดยตรง + Approve ใบของ Operator ได้</li>
        <li>หลัง Approve → แนบลายเซ็นต์อัตโนมัติ → พิมพ์เป็น A4</li>
      </ul>`
    },
    {
      icon: '✍️', title: 'ลายเซ็นต์ Admin',
      body: `<ul>
        <li>ไปที่ Admin → จัดการลายเซ็นต์</li>
        <li>วาดด้วยเมาส์/นิ้ว หรืออัปโหลดรูปภาพ</li>
        <li>บันทึกในเครื่องอัตโนมัติ — ใช้เมื่อ Approve ใบสั่งหยุดวิ่ง</li>
      </ul>`
    },
    {
      icon: '📋', title: 'มาตรฐาน',
      body: `<ul>
        <li>ดูมาตรฐานการบำรุงรักษา ขั้นตอน และข้อกำหนด</li>
      </ul>`
    },
    {
      icon: '👤', title: 'จัดการผู้ใช้ (Admin เท่านั้น)',
      body: `<ul>
        <li>เพิ่ม / ลบ / แก้ไขผู้ใช้</li>
        <li>กำหนด role: admin / operator / viewer</li>
        <li>Reset password + จัดการลายเซ็นต์</li>
      </ul>`
    },
    {
      icon: '💡', title: 'Tips & เกี่ยวกับระบบ',
      body: `<ul>
        <li>ข้อมูลรถ cache 30 นาที ในเครื่อง — เปิดครั้งต่อไปเร็วขึ้น</li>
        <li>Desktop: Sidebar แสดงตลอดทางซ้าย</li>
        <li>Mobile: กดปุ่ม ☰ เพื่อเปิด/ปิด Sidebar</li>
        <li>ถ้าเพิ่ม/แก้ข้อมูลรถแล้วไม่อัปเดต ให้ Logout แล้ว Login ใหม่</li>
        <li>ระบบทั้งหมดต้องการ Internet (เชื่อมต่อ Google Sheets)</li>
      </ul>`
    }
  ];

  container.innerHTML = `
    <div class="page-title">📖 คู่มือการใช้งาน</div>
    <div style="font-size:13px;color:var(--text-light);margin-bottom:16px">กดหัวข้อเพื่อดูรายละเอียด</div>
    ${sections.map((s, i) => `
      <div class="accordion-item" style="background:white;border-radius:8px;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
        <div class="accordion-header" onclick="toggleAccordion(this)"
          style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;cursor:pointer;user-select:none;font-weight:600;font-size:14px">
          <span>${s.icon} ${s.title}</span>
          <span class="acc-arrow" style="font-size:12px;color:var(--text-light);transition:transform 0.2s">▼</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 16px 14px;font-size:14px;line-height:2;border-top:1px solid var(--border)">
          ${s.body}
        </div>
      </div>`).join('')}
  `;

  window.toggleAccordion = function(header) {
    const body  = header.nextElementSibling;
    const arrow = header.querySelector('.acc-arrow');
    const open  = body.style.display !== 'none';
    body.style.display  = open ? 'none' : 'block';
    arrow.style.transform = open ? '' : 'rotate(180deg)';
  };
};
