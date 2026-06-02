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
  `;

  await loadUsers();

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

  window.doDelete = async (username) => {
    if (!confirm(`ต้องการลบผู้ใช้ ${username} ใช่ไหม?`)) return;
    try {
      await APP.deleteUser(username);
      alert(`✅ ลบผู้ใช้ ${username} เรียบร้อยแล้ว`);
      await loadUsers();
    } catch (e) { alert('เกิดข้อผิดพลาด: ' + e.message); }
  };
};
