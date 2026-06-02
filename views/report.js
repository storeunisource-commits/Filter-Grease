// views/report.js — History & export
window.VIEW_HISTORY = async function render(container) {
  const now = new Date();
  const currentMY = APP.currentMonthYear();

  // Build month options (12 months back)
  const monthOptions = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const my = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = APP.formatThaiMonth(d.getMonth() + 1, d.getFullYear());
    monthOptions.push(`<option value="${my}" ${my === currentMY ? 'selected' : ''}>${label}</option>`);
  }

  container.innerHTML = `
    <div class="page-title">📊 รายงานและประวัติ</div>
    <div class="card">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
        <select class="form-control" id="hist-month" style="width:auto;min-width:180px">${monthOptions.join('')}</select>
        <button class="btn btn-sm btn-outline" onclick="loadHistory()">🔍 ค้นหา</button>
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
    const my = document.getElementById('hist-month').value;
    const el = document.getElementById('hist-content');
    el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      const res = await APP.getHistory(window._histType, my);
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
    const rows = records.map(r => headers.map(h => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filter-grease-${window._histType}-${document.getElementById('hist-month').value}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  loadHistory();
};

function renderHistoryTable(type, records, el) {
  if (!records.length) {
    el.innerHTML = '<div class="alert alert-info">ไม่มีข้อมูลในช่วงนี้</div>';
    return;
  }

  // Summary stats
  const done = records.filter(r => r.done === 'Y').length;
  const total = records.length;
  const pct = total ? Math.round(done / total * 100) : 0;

  const colsMap = {
    blow: ['date', 'truck_no', 'driver', 'status', 'done', 'note', 'recorded_by'],
    grease: ['date', 'truck_no', 'driver', 'status', 'done', 'cycle', 'month_year', 'note', 'recorded_by'],
    drain: ['date', 'truck_no', 'driver', 'status', 'done', 'note', 'recorded_by'],
    call: ['date', 'truck_no', 'driver', 'task_type', 'call_result', 'note', 'called_by']
  };
  const cols = colsMap[type] || Object.keys(records[0]);
  const colLabels = { date: 'วันที่', truck_no: 'เบอร์รถ', driver: 'คนขับ', status: 'สถานะ', done: 'ทำแล้ว', note: 'หมายเหตุ', recorded_by: 'บันทึกโดย', cycle: 'รอบ', month_year: 'เดือน/ปี', task_type: 'งาน', call_result: 'ผลโทร', called_by: 'โทรโดย' };

  el.innerHTML = `
    ${type !== 'call' ? `<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">
      <div class="stat-card green"><div class="stat-number">${done}</div><div class="stat-label">ทำแล้ว</div></div>
      <div class="stat-card red"><div class="stat-number">${total - done}</div><div class="stat-label">ยังไม่ทำ</div></div>
      <div class="stat-card"><div class="stat-number">${pct}%</div><div class="stat-label">คิดเป็น</div></div>
    </div>` : ''}
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr>${cols.map(c => `<th>${colLabels[c] || c}</th>`).join('')}</tr></thead>
          <tbody>
            ${records.slice(-200).map(r => `<tr>
              ${cols.map(c => {
                let val = r[c] || '';
                if (c === 'done') val = `<span class="badge ${val === 'Y' ? 'badge-green' : 'badge-red'}">${val === 'Y' ? '✅' : '❌'}</span>`;
                if (c === 'status') val = APP.createStatusBadge(val || 'ใช้งาน');
                return `<td>${val}</td>`;
              }).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
