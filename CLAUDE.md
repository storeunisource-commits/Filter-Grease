# Filter-Grease Webapp

## เกี่ยวกับ Project
ระบบบันทึกการบำรุงรักษารถบรรทุก 3 งาน:
1. **เป่ากรองอากาศ** — รายวัน
2. **อัดจาระบี** — รอบ 10–15 และ 25–ท้ายเดือน
3. **เดรนน้ำถังลม** — รายวัน

## Stack
- Frontend: Vanilla HTML + CSS + JS (SPA), deploy → GitHub Pages
- Backend: Google Apps Script (Web App URL) ใน `gas/Code.gs`
- Database: Google Sheets ID: `1C2mnhCwD6TpJYHRXTJGqdwv9HI7qI_MuI-6fB3D-gSM`
- GitHub: https://github.com/storeunisource-commits/Filter-Grease.git
- Google Account: storeunisource@gmail.com

## โครงสร้างไฟล์
```
index.html       — SPA shell, nav
app.js           — router, auth state, utility functions
api.js           — ฟังก์ชัน call GAS API ทั้งหมด
style.css        — mobile-first CSS
views/           — แต่ละ view export renderXxx(container)
gas/Code.gs      — Google Apps Script backend
```

## กฎ Coding
- ไม่ใช้ framework หรือ build tool
- ทุก API call ผ่าน `api.js` เท่านั้น
- Month/Year ดึงจาก `new Date()` เสมอ ห้ามพิมพ์เอง
- ทุก record ต้องมี `timestamp` (ISO) + `recorded_by`
- รอบอัดจาระบี: 10–15 (รอบ 1), 25–lastDayOfMonth (รอบ 2)
- นอกช่วง → ล็อค form

## กฎ Business
- รถทั้งหมด: รถน้ำ, 01–011, U-01–U-21, M1 (แมคโค)
- สถานะรถ: ใช้งาน / ว่าง / จอดซ่อม / จอดเคลม / ลางาน
- กำหนดส่งรายงานผู้บริหาร: รอบ 1 = วันที่ 20, รอบ 2 = วันที่ 5 เดือนถัดไป
- แจ้งเตือนล่วงหน้า 2 วัน: วันที่ 8–9 (รอบ 1), วันที่ 23–24 (รอบ 2)

## Google Sheets Tabs
- เป่ากรอง_Log
- อัดจาระบี_Log
- เดรนน้ำ_Log
- โทรตาม_Log
- ละเลย_Log
- รายงาน_Log
- รถ_Master
- Users

## Deploy
- GAS: deploy เป็น Web App ใน Google Apps Script console
- GitHub Pages: push ไป `main` branch → Pages deploy อัตโนมัติ
- GAS URL ใส่ใน `api.js` ที่ constant `GAS_URL`

## Communication
- ตอบเป็นภาษาไทยเสมอ
- ใช้ภาษาอังกฤษสำหรับ technical terms เท่านั้น
