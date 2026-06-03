// gas/Drive.gs — Google Drive operations

const DRIVE_FOLDER_ID_ROOT = '1m_ERAf4x-RPTAzt-XDMWW0sx_2RmuX_b';

function uploadImage(params, user) {
  const { base64, mimeType, truck_no, task_type, date } = params;
  if (!base64) return { success: false, error: 'ไม่มีข้อมูลรูปภาพ' };
  try {
    const root = DriveApp.getFolderById(DRIVE_FOLDER_ID_ROOT);
    const dateObj = new Date(date || new Date());
    const thaiYear = String(dateObj.getFullYear() + 543);
    const monthNum = String(dateObj.getMonth() + 1).padStart(2, '0');
    const monthLabel = monthNum + '-' + THAI_MONTHS_GAS[dateObj.getMonth() + 1];
    const yearFolder = getOrCreateFolder(root, thaiYear);
    const monthFolder = getOrCreateFolder(yearFolder, monthLabel);
    const imgFolder = getOrCreateFolder(monthFolder, 'รูปภาพ');
    const taskFolder = getOrCreateFolder(imgFolder, task_type || 'ทั่วไป');
    const files = taskFolder.getFiles();
    let count = 0;
    while (files.hasNext()) { files.next(); count++; }
    const seq = String(count + 1).padStart(3, '0');
    const ext = (mimeType || 'image/jpeg').split('/')[1] || 'jpg';
    const safeTruck = (truck_no || 'unknown').replace(/[^a-zA-Z0-9\-]/g, '');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const newFilename = seq + '_' + safeTruck + '_' + thaiYear + '-' + monthNum + '-' + day + '.' + ext;
    const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType || 'image/jpeg', newFilename);
    const file = taskFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { success: true, url: 'https://drive.google.com/uc?id=' + file.getId(), filename: newFilename };
  } catch (err) {
    return { success: false, error: 'อัปโหลดรูปไม่สำเร็จ: ' + err.toString() };
  }
}

function savePDFToDrive(params, user) {
  const { title, content, folder_type, issue_date } = params;
  if (!content || !title) return { success: false, error: 'ต้องระบุ title และ content' };
  try {
    const dateObj = new Date(issue_date || new Date());
    const thaiYear = String(dateObj.getFullYear() + 543);
    const monthNum = String(dateObj.getMonth()+1).padStart(2,'0');
    const monthLabel = monthNum + '-' + THAI_MONTHS_GAS[dateObj.getMonth()+1];
    const root = DriveApp.getFolderById(DRIVE_FOLDER_ID_ROOT);
    const yearF = getOrCreateFolder(root, thaiYear);
    const monthF = getOrCreateFolder(yearF, monthLabel);
    const docF = getOrCreateFolder(monthF, 'เอกสาร');
    const typeF = getOrCreateFolder(docF, folder_type || 'ทั่วไป');
    // Create temp Google Doc
    const doc = DocumentApp.create(title);
    const body = doc.getBody();
    body.setText(content);
    body.setLineSpacing(1.5);
    doc.saveAndClose();
    const pdfBlob = DriveApp.getFileById(doc.getId()).getAs('application/pdf');
    pdfBlob.setName(title + '.pdf');
    const pdfFile = typeF.createFile(pdfBlob);
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    DriveApp.getFileById(doc.getId()).setTrashed(true);
    return { success: true, url: pdfFile.getUrl(), name: title + '.pdf' };
  } catch(err) {
    return { success: false, error: err.toString() };
  }
}
