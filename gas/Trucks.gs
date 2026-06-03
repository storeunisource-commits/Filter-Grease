// gas/Trucks.gs — Truck CRUD

function getTrucks() {
  const trucks = sheetToObjects('รถ_Master').filter(r => r.active !== false && r.active !== 'FALSE');
  return { success: true, trucks };
}

function updateTruck(params, user) {
  if (user.role !== 'admin') return { success: false, error: 'ไม่มีสิทธิ์' };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('รถ_Master');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const truckIdx = headers.indexOf('truck_no');
  for (let i = 1; i < data.length; i++) {
    if (data[i][truckIdx] === params.truck_no) {
      if (params.driver !== undefined) sheet.getRange(i+1, headers.indexOf('driver')+1).setValue(params.driver);
      if (params.status !== undefined) sheet.getRange(i+1, headers.indexOf('status')+1).setValue(params.status);
      return { success: true };
    }
  }
  return { success: false, error: 'ไม่พบรถ' };
}

function seedTrucks(sheet) {
  const trucks = [
    ['รถน้ำ','เอ็ม','ใช้งาน','รถน้ำ',true],
    ['01','บาส','ใช้งาน','รถทั่วไป',true],['02','กร','ใช้งาน','รถทั่วไป',true],
    ['03','-','ใช้งาน','รถทั่วไป',true],['04','-','ใช้งาน','รถทั่วไป',true],
    ['05','-','ใช้งาน','รถทั่วไป',true],['06','หนุ่ย','ใช้งาน','รถทั่วไป',true],
    ['07','-','ใช้งาน','รถทั่วไป',true],['08','-','ใช้งาน','รถทั่วไป',true],
    ['09','-','ใช้งาน','รถทั่วไป',true],['010','เล็ก','ใช้งาน','รถทั่วไป',true],
    ['011','-','ใช้งาน','รถทั่วไป',true],
    ['U-01','เปลี่ยว','ใช้งาน','รถทั่วไป',true],['U-02','พงษ์','ใช้งาน','รถทั่วไป',true],
    ['U-03','วุ่ฒิ','ใช้งาน','รถทั่วไป',true],['U-04','บูม','ใช้งาน','รถทั่วไป',true],
    ['U-05','จิตร','ใช้งาน','รถทั่วไป',true],['U-06','เจน','ใช้งาน','รถทั่วไป',true],
    ['U-07','กอล์ฟ','ใช้งาน','รถทั่วไป',true],['U-08','จ่อย','ใช้งาน','รถทั่วไป',true],
    ['U-09','น้าวัฒน์','ใช้งาน','รถทั่วไป',true],['U-010','ตรี','ใช้งาน','รถทั่วไป',true],
    ['U-12','ดำ','ใช้งาน','รถทั่วไป',true],['U-13','แพร','ใช้งาน','รถทั่วไป',true],
    ['U-14','อ้วน','ใช้งาน','รถทั่วไป',true],['U-15','แต้ม','ใช้งาน','รถทั่วไป',true],
    ['U-16','ขิง','ใช้งาน','รถทั่วไป',true],['U-17','-','ใช้งาน','รถทั่วไป',true],
    ['U-18','เหว่า','ใช้งาน','รถทั่วไป',true],['U-19','-','ใช้งาน','รถทั่วไป',true],
    ['U-20','นิค','ใช้งาน','รถทั่วไป',true],['U-21','เปา','ใช้งาน','รถทั่วไป',true],
    ['M1','แมคโค','ใช้งาน','แมคโค',true]
  ];
  trucks.forEach(r => sheet.appendRow(r));
}
