// views/report-history.js — Report submission history
window['VIEW_REPORT_HISTORY'] = async function render(container) {
  container.innerHTML = `
    <div class="page-title">📋 ประวัติการส่งรายงาน</div>
    <div id="rpt-hist-content"><div class="loading"><div class="spinner"></div><p>กำลังโหลด...</p></div></div>
  `;

  try {
    const res = await APP.getReportHistory();
    const records = (res.records || []).reverse();
    const el = document.getElementById('rpt-hist-content');

    if (records.length === 0) {
      el.innerHTML = '<div class="alert alert-info">ยังไม่มีประวัติการส่งรายงาน</div>';
      return;
    }

    el.innerHTML = `
      <div class="card">
        <div class="card-title">
          📋 รายการส่งรายงานทั้งหมด
          <span class="badge badge-gray" style="margin-left:8px">${records.length} รายการ</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>เดือน/ปี</th><th>รอบที่</th><th>วันที่ส่ง</th><th>ผู้ส่ง</th><th>สถานะ</th><th>หมายเหตุ</th>
            </tr></thead>
            <tbody>
              ${records.map(r => {
                const onTime = r.on_time === 'Y' || r.on_time === true;
                const [yr, mo] = (r.month_year || '').split('-').map(Number);
                const monthLabel = mo ? APP.formatThaiMonth(mo, yr) : r.month_year;
                return `<tr>
                  <td>${monthLabel}</td>
                  <td>รอบ ${r.report_cycle}</td>
                  <td>${r.sent_date || ''}</td>
                  <td>${r.sent_by || ''}</td>
                  <td><span class="badge ${onTime ? 'badge-green' : 'badge-red'}">${onTime ? '✅ ทันเวลา' : '❌ สาย'}</span></td>
                  <td>${r.note || ''}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div style="text-align:right;margin-top:8px">
        <button class="btn btn-sm btn-outline" onclick="window.print()">🖨️ พิมพ์</button>
      </div>
    `;
  } catch (e) {
    document.getElementById('rpt-hist-content').innerHTML = `<div class="alert alert-danger">ไม่สามารถโหลดข้อมูลได้: ${e.message}</div>`;
  }
};
