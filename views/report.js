// views/report.js — History & export (แยก Dropdown เดือน/ปี)
window.VIEW_HISTORY = async function render(container) {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  container.innerHTML = `
    <div class="page-title">📊 รายงานและประวัติ</div>
    <div class="card">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
        <select class="form-control" id="hist-year" style="width:auto">${APP.buildYearOptions(curYear)}</select>
        <select class="form-control" id="hist-month" style="width:auto">${APP.buildMonthOptions(curMonth)}</select>
        <button class="btn btn-sm btn-primary" onclick="loadHistory()">🔍 ค้นหา</button>
        <button class="btn btn-sm btn-outline" onclick="exportCSV()">⬇️ CSV</button>
        <button class="btn btn-sm btn-outline" onclick="window.print()">🖨️ พิมพ์</button>
      </div>
      <div class="tabs" id="hist-tabs">
        <button class="tab-btn active" onclick="switchTab('blow',this)">💨 เป่ากรอง</button>
        <button class="tab-btn" onclick="switchTab('grease',this)">🔧 อัดจาระบี</button>
        <button class="tab-btn" onclick="switchTab('drain',this)">💧 เดรนน้ำ</button>
        <button class="tab-btn" onclick="switchTab('call',this)">📞 โทรตาม</button>
      </div>
    </div>
    <div id="hist-content"><div class="loading"><div class="spinner"></div></div></div>
  `;

  window._histType = 'blow';
  window._histRecords = [];

  window.switchTab = (type, btn) => {
    window._histType = type;
    document.querySelectorAll('#hist-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadHistory();
  };

  window.loadHistory = async () => {
    const year = document.getElementById('hist-year').value;
    const month = document.getElementById('hist-month').value;
    const el = document.getElementById('hist-content');
    el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      const res = await APP.getHistory(window._histType, year, month || null);
      window._histRecords = res.records || [];
      renderHistoryTable(window._histType, window._histRecords, el);
    } catch (e) {
      APP.showError(el, 'โหลดข้อมูลไม่สำเร็จ: ' + e.message);
    }
  };

  window.exportCSV = () => {
    const records = window._histRecords;
    if (!records.length) return alert('ไม่มีข้อมูลให้ export');
    const headers = Object.keys(records[0]);
    const rows = records.map(r => headers.map(h => `"${(r[h]||'').toString().replace(/"/g,'""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const yr = document.getElementById('hist-year').value;
    const mo = document.getElementById('hist-month').value;
    a.href = url; a.download = `fg-${window._histType}-${yr}-${mo||'all'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  loadHistory();
};

function renderHistoryTable(type, records, el) {
  if (!records.length) {
    el.innerHTML = '<div class="alert alert-info">ไม่มีข้อมูลในช่วงนี้</div>';
    return;
  }

  const colsMap = {
    blow:   ['date','truck_no','driver','status','action_status','week','note','image_url','recorded_by'],
    grease: ['date','truck_no','driver','status','action_status','cycle','month_year','note','image_url','recorded_by'],
    drain:  ['date','truck_no','driver','status','action_status','week','note','image_url','recorded_by'],
    call:   ['date','truck_no','driver','task_type','call_result','note','called_by']
  };
  const colLabels = {
    date:'วันที่', truck_no:'เบอร์รถ', driver:'คนขับ', status:'สถานะรถ',
    action_status:'สถานะงาน', week:'Week', note:'หมายเหตุ', image_url:'รูปภาพ',
    recorded_by:'บันทึกโดย', cycle:'รอบ', month_year:'เดือน/ปี',
    task_type:'งาน', call_result:'ผลโทร', called_by:'โทรโดย'
  };
  const cols = colsMap[type] || Object.keys(records[0]);

  const done = records.filter(r => r.action_status === 'done').length;
  const total = records.length;

  const actionBadge = (v) => {
    if (v === 'done')     return '<span class="badge badge-green">✅ ทำแล้ว</span>';
    if (v === 'called')   return '<span class="badge badge-orange">📞 โทรแล้ว</span>';
    if (v === 'not_done') return '<span class="badge badge-red">❌ ยังไม่ทำ</span>';
    return v || '';
  };

  el.innerHTML = `
    ${type !== 'call' ? `
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">
      <div class="stat-card green"><div class="stat-number">${done}</div><div class="stat-label">ทำแล้ว</div></div>
      <div class="stat-card red"><div class="stat-number">${total-done}</div><div class="stat-label">ยังไม่ทำ</div></div>
      <div class="stat-card"><div class="stat-number">${total ? Math.round(done/total*100) : 0}%</div><div class="stat-label">สำเร็จ</div></div>
    </div>` : ''}
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr>${cols.map(c => `<th>${colLabels[c]||c}</th>`).join('')}</tr></thead>
          <tbody>
            ${records.slice(-300).map(r => `<tr>
              ${cols.map(c => {
                let val = r[c] || '';
                if (c === 'action_status') val = actionBadge(val);
                else if (c === 'status') val = APP.createStatusBadge(val || 'ใช้งาน');
                else if (c === 'image_url' && val) val = `<a href="${val}" target="_blank" class="btn btn-sm btn-outline">🖼️ ดูรูป</a>`;
                else if (c === 'week' && val) val = `Week ${val}`;
                return `<td>${val}</td>`;
              }).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
