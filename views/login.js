// views/login.js — Login page redesign
window.VIEW_LOGIN = function render(container) {
  // Ensure sidebar/topbar hidden on login page
  ['sidebar', 'topbar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  document.body.style.paddingLeft = '0';
  document.body.style.paddingTop = '0';

  container.innerHTML = `
    <div class="login-page-bg">
      <div class="login-card-new">
        <div class="login-logo">
          <img src="Logo.png" onerror="this.style.display='none'">
        </div>
        <div class="login-company">บริษัท ส.ศิวโรจน์ ขนส่ง จำกัด</div>
        <div class="login-system">⚙️ ระบบบันทึก เป่ากรอง เดรนน้ำ อัดจาระบี</div>
        <div class="login-by-new">By KhunMeen</div>
        <div id="login-error" class="alert alert-danger" style="display:none"></div>
        <form id="login-form">
          <div class="form-group">
            <label class="form-label">ชื่อผู้ใช้</label>
            <input class="form-control" type="text" id="login-username" placeholder="username" autocomplete="username" required>
          </div>
          <div class="form-group">
            <label class="form-label">รหัสผ่าน</label>
            <input class="form-control" type="password" id="login-password" placeholder="password" autocomplete="current-password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-full" id="login-btn" style="margin-top:8px">เข้าสู่ระบบ</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    APP.setButtonLoading(btn, true);
    errEl.style.display = 'none';
    try {
      const res = await APP.login(username, password);
      if (res.success) {
        APP.preWarm();
        APP.startNotificationPoll();
        window.location.hash = '#dashboard';
      } else {
        errEl.textContent = res.error || 'เข้าสู่ระบบไม่สำเร็จ';
        errEl.style.display = 'flex';
        APP.setButtonLoading(btn, false);
      }
    } catch (err) {
      errEl.textContent = 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่';
      errEl.style.display = 'flex';
      APP.setButtonLoading(btn, false);
    }
  });
};
