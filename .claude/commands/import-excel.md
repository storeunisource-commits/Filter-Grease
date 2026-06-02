# /import-excel - Import ข้อมูลเก่าจาก Excel

ใช้สำหรับ import ข้อมูลประวัติจากไฟล์ Excel เก่า (รายงานเป่ากรอง-อัดจารบี 02-2026.xlsx)

ขั้นตอน:
1. อ่านไฟล์ Excel โดยใช้ Python หรือ openpyxl
2. Parse ข้อมูลแต่ละ sheet ให้เป็น JSON
3. POST ไปยัง GAS endpoint /import
4. ยืนยันข้อมูลใน Google Sheets

Excel Location: D:\KhunMeen\AI Build\เป่ากรอง อัดจารบี\รายงานเป่ากรอง-อัดจารบี 02-2026.xlsx
Sheets: เป่ากรอง ม.ค.69 ถึง อัดจาระบี มิ.ย.69 (12 sheets)
