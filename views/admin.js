// views/admin.js — User management (admin only)
window.VIEW_ADMIN = async function render(container) {
  const user = APP.getUserInfo();
  if (!user || user.role !== 'admin') {
    container.innerHTML = '<div class="alert alert-danger">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>';
    return;
  }

  container.innerHTML = `
    <div class="page-title">⚙️ Admin: จัดการผู้ใช้งาน</div>

    <div class="card">
      <div class="card-title">เพิ่มผู้ใช้งานใหม่</div>
      <div class="form-group">
        <label class="form-label">Username</label>
        <input class="form-control" type="text" id="add-username" placeholder="username">
      </div>
      <div class="form-group">
        <label class="form-label">ชื่อที่แสดง</label>
        <input class="form-control" type="text" id="add-display" placeholder="ชื่อ-นามสกุล">
      </div>
      <div class="form-group">
        <label class="form-label">รหัสผ่าน</label>
        <input class="form-control" type="password" id="add-password" placeholder="password">
      </div>
      <div class="form-group">
        <label class="form-label">สิทธิ์</label>
        <select class="form-control" id="add-role">
          <option value="operator">Operator (กรอกข้อมูล)</option>
          <option value="viewer">Viewer (ดูได้อย่างเดียว)</option>
          <option value="admin">Admin (จัดการระบบ)</option>
        </select>
      </div>
      <div id="add-msg"></div>
      <button class="btn btn-primary" id="add-btn" onclick="addNewUser()">➕ เพิ่มผู้ใช้</button>
    </div>

    <div class="card">
      <div class="card-title">รายชื่อผู้ใช้งานทั้งหมด</div>
      <div id="user-list"><div class="loading"><div class="spinner"></div></div></div>
    </div>

    <!-- Signature Management -->
    <div class="card" style="border-top:3px solid var(--accent)">
      <div class="card-title">✍️ จัดการลายเซ็นต์ (สำหรับ Admin)</div>
      <p style="font-size:13px;color:var(--text-light);margin-bottom:12px">
        ลายเซ็นต์นี้จะถูกแนบอัตโนมัติเมื่อ Approve ใบสั่งหยุดวิ่ง
      </p>
      <div id="sig-preview" style="margin-bottom:12px"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <div>
          <div style="font-size:12px;color:#7f8c8d;margin-bottom:4px">วาดลายเซ็นต์</div>
          <canvas id="sig-canvas" width="300" height="100"
            style="border:2px solid var(--border);border-radius:6px;background:white;cursor:crosshair;touch-action:none"></canvas>
          <div style="margin-top:4px;display:flex;gap:4px">
            <button class="btn btn-sm btn-outline" onclick="clearSigCanvas()">🗑️ ลบ</button>
            <button class="btn btn-sm btn-primary" onclick="saveSigFromCanvas()">💾 บันทึกลายเซ็นต์</button>
          </div>
        </div>
        <div>
          <div style="font-size:12px;color:#7f8c8d;margin-bottom:4px">หรืออัปโหลดรูปลายเซ็นต์</div>
          <input type="file" id="sig-file" accept="image/*" class="form-control" onchange="uploadSigFile(event)" style="width:auto">
        </div>
      </div>
      <button class="btn btn-sm btn-outline" style="color:var(--danger);border-color:var(--danger)" onclick="deleteSig()">❌ ลบลายเซ็นต์</button>
      <div id="sig-msg" style="margin-top:8px"></div>
    </div>
  `;

  await loadUsers();
  initSignatureCanvas(user);

  // ============================================================
  // Signature canvas
  function initSignatureCanvas(currentUser) {
    const canvas = document.getElementById('sig-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let drawing = false;

    // Show existing signature
    const sigKey = 'sig_' + currentUser.username;
    const existing = localStorage.getItem(sigKey);
    const previewEl = document.getElementById('sig-preview');
    if (existing) {
      previewEl.innerHTML = `<div style="font-size:13px;color:#27ae60;margin-bottom:4px">✅ ลายเซ็นต์ปัจจุบัน:</div>
        <img src="${existing}" style="max-height:80px;border:1px solid #ddd;border-radius:4px;background:white">`;
    } else {
      previewEl.innerHTML = '<div style="font-size:13px;color:#7f8c8d">ยังไม่มีลายเซ็นต์</div>';
    }

    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return { x: src.clientX - r.left, y: src.clientY - r.top };
    };

    canvas.addEventListener('mousedown',  (e) => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
    canvas.addEventListener('mousemove',  (e) => { if (!drawing) return; const p = getPos(e); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#000'; ctx.lineTo(p.x, p.y); ctx.stroke(); });
    canvas.addEventListener('mouseup',    () => { drawing = false; });
    canvas.addEventListener('mouseleave', () => { drawing = false; });
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }, { passive: false });
    canvas.addEventListener('touchmove',  (e) => { e.preventDefault(); if (!drawing) return; const p = getPos(e); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#000'; ctx.lineTo(p.x, p.y); ctx.stroke(); }, { passive: false });
    canvas.addEventListener('touchend',   () => { drawing = false; });

    window.clearSigCanvas = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); };

    window.saveSigFromCanvas = async () => {
      const dataUrl = canvas.toDataURL('image/png');
      // Compress before storing
      const compressed = await compressSigImage(dataUrl, 400);
      try {
        localStorage.setItem(sigKey, compressed);
        document.getElementById('sig-msg').innerHTML = '<div class="alert alert-success">✅ บันทึกลายเซ็นต์เรียบร้อย</div>';
        previewEl.innerHTML = `<div style="font-size:13px;color:#27ae60;margin-bottom:4px">✅ ลายเซ็นต์ที่บันทึก:</div>
          <img src="${compressed}" style="max-height:80px;border:1px solid #ddd;border-radius:4px;background:white">`;
      } catch(storageErr) {
        document.getElementById('sig-msg').innerHTML = '<div class="alert alert-danger">❌ รูปใหญ่เกินไป กรุณาวาดใหม่หรือใช้รูปขนาดเล็กลง</div>';
      }
    };

    window.uploadSigFile = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        const compressed = await compressSigImage(e.target.result, 400);
        try {
          localStorage.setItem(sigKey, compressed);
          document.getElementById('sig-msg').innerHTML = '<div class="alert alert-success">✅ อัปโหลดลายเซ็นต์เรียบร้อย</div>';
          previewEl.innerHTML = `<div style="font-size:13px;color:#27ae60;margin-bottom:4px">✅ ลายเซ็นต์ที่อัปโหลด:</div>
            <img src="${compressed}" style="max-height:80px;border:1px solid #ddd;border-radius:4px;background:white">`;
          // วาดรูปที่อัปโหลดลง canvas ด้วย เพื่อป้องกัน "บันทึกลายเซ็นต์" overwrite ด้วย canvas ว่าง
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
            const w = img.width * ratio, h = img.height * ratio;
            ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
          };
          img.src = compressed;
        } catch(storageErr) {
          document.getElementById('sig-msg').innerHTML = '<div class="alert alert-danger">❌ รูปใหญ่เกินไป กรุณาใช้รูปขนาดเล็กลง</div>';
        }
      };
      reader.readAsDataURL(file);
    };

    function compressSigImage(dataUrl, maxW) {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          const limit = Math.min(maxW, 300);
          const ratio = Math.min(1, limit / img.width);
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * ratio);
          c.height = Math.round(img.height * ratio);
          const ctx = c.getContext('2d');
          // fill white ก่อน เพื่อแก้ PNG transparent → JPEG ดำ
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.6));
        };
        img.src = dataUrl;
      });
    }

    window.deleteSig = () => {
      if (!confirm('ลบลายเซ็นต์หรือไม่?')) return;
      localStorage.removeItem(sigKey);
      previewEl.innerHTML = '<div style="font-size:13px;color:#7f8c8d">ลบลายเซ็นต์แล้ว</div>';
      document.getElementById('sig-msg').innerHTML = '';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }

  async function loadUsers() {
    try {
      const res = await APP.getUsers();
      const users = res.users || [];
      const el = document.getElementById('user-list');
      el.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Username</th><th>ชื่อ</th><th>สิทธิ์</th><th>สถานะ</th><th>การจัดการ</th></tr></thead>
            <tbody>
              ${users.map(u => `<tr>
                <td><b>${u.username}</b></td>
                <td>${u.display_name}</td>
                <td><span class="badge ${u.role === 'admin' ? 'badge-blue' : 'badge-gray'}">${u.role}</span></td>
                <td><span class="badge ${u.active !== false && u.active !== 'FALSE' ? 'badge-green' : 'badge-red'}">${u.active !== false && u.active !== 'FALSE' ? 'ใช้งาน' : 'ปิดใช้'}</span></td>
                <td>
                  ${u.username !== user.username ? `
                    <button class="btn btn-sm btn-outline" onclick="doEdit('${u.username}','${(u.display_name||'').replace(/'/g,"\\'")}','${u.role}',${u.active !== false && u.active !== 'FALSE'})">✏️</button>
                    <button class="btn btn-sm btn-outline" onclick="doReset('${u.username}')">🔑 Reset</button>
                    <button class="btn btn-sm btn-danger" onclick="doDelete('${u.username}')">🗑️</button>
                  ` : '<span style="color:var(--text-light);font-size:12px">ตัวเอง</span>'}
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      document.getElementById('user-list').innerHTML = `<div class="alert alert-danger">โหลดไม่สำเร็จ: ${e.message}</div>`;
    }
  }

  window.addNewUser = async () => {
    const btn = document.getElementById('add-btn');
    const msg = document.getElementById('add-msg');
    const data = {
      username: document.getElementById('add-username').value.trim(),
      display_name: document.getElementById('add-display').value.trim(),
      password: document.getElementById('add-password').value,
      role: document.getElementById('add-role').value
    };
    if (!data.username || !data.password || !data.display_name) {
      msg.innerHTML = '<div class="alert alert-danger">กรุณากรอกข้อมูลให้ครบ</div>';
      return;
    }
    APP.setButtonLoading(btn, true);
    try {
      const res = await APP.addUser(data);
      if (res.success) {
        msg.innerHTML = '<div class="alert alert-success">✅ เพิ่มผู้ใช้เรียบร้อยแล้ว</div>';
        document.getElementById('add-username').value = '';
        document.getElementById('add-display').value = '';
        document.getElementById('add-password').value = '';
        await loadUsers();
      } else {
        msg.innerHTML = `<div class="alert alert-danger">${res.error}</div>`;
      }
    } catch (e) {
      msg.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    }
    APP.setButtonLoading(btn, false);
  };

  window.doReset = async (username) => {
    const newPw = prompt(`รหัสผ่านใหม่สำหรับ ${username}:`);
    if (!newPw || newPw.length < 4) { alert('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร'); return; }
    try {
      await APP.resetPassword(username, newPw);
      alert(`✅ รีเซ็ตรหัสผ่านของ ${username} เรียบร้อยแล้ว`);
    } catch (e) { alert('เกิดข้อผิดพลาด: ' + e.message); }
  };

  window.doEdit = (username, display_name, role, active) => {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="edit-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:400;display:flex;align-items:center;justify-content:center;padding:16px">
        <div style="background:white;border-radius:10px;padding:24px;max-width:400px;width:100%">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px">✏️ แก้ไขผู้ใช้: ${username}</div>
          <div class="form-group">
            <label class="form-label">ชื่อที่แสดง</label>
            <input class="form-control" id="edit-display" value="${display_name}">
          </div>
          <div class="form-group">
            <label class="form-label">สิทธิ์</label>
            <select class="form-control" id="edit-role">
              <option value="operator" ${role==='operator'?'selected':''}>Operator</option>
              <option value="viewer" ${role==='viewer'?'selected':''}>Viewer</option>
              <option value="admin" ${role==='admin'?'selected':''}>Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">สถานะ</label>
            <select class="form-control" id="edit-active">
              <option value="true" ${active?'selected':''}>ใช้งาน</option>
              <option value="false" ${!active?'selected':''}>ปิดใช้</option>
            </select>
          </div>
          <div id="edit-msg"></div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn btn-primary" onclick="submitEdit('${username}')">💾 บันทึก</button>
            <button class="btn btn-outline" onclick="document.getElementById('edit-modal').remove()">ยกเลิก</button>
          </div>
        </div>
      </div>`);
  };

  window.submitEdit = async (username) => {
    const display_name = document.getElementById('edit-display').value.trim();
    const role = document.getElementById('edit-role').value;
    const active = document.getElementById('edit-active').value === 'true';
    const msgEl = document.getElementById('edit-msg');
    try {
      const res = await APP.updateUser({ username, display_name, role, active });
      if (res.success) {
        document.getElementById('edit-modal').remove();
        await loadUsers();
      } else {
        msgEl.innerHTML = `<div class="alert alert-danger">${res.error}</div>`;
      }
    } catch (e) {
      msgEl.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    }
  };

  window.doDelete = async (username) => {
    if (!confirm(`ต้องการลบผู้ใช้ ${username} ใช่ไหม?`)) return;
    try {
      await APP.deleteUser(username);
      alert(`✅ ลบผู้ใช้ ${username} เรียบร้อยแล้ว`);
      await loadUsers();
    } catch (e) { alert('เกิดข้อผิดพลาด: ' + e.message); }
  };
};
