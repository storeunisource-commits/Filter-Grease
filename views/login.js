// views/login.js
window.VIEW_LOGIN = function render(container) {
  container.innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <div class="login-title">⚙️ Filter-Grease</div>
        <div class="login-subtitle">ระบบบันทึก เป่ากรอง เดรนน้ำ อัดจาระบี</div>
        <div class="login-by">By KhunMeen</div>
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
          <button type="submit" class="btn btn-primary btn-full" id="login-btn">เข้าสู่ระบบ</button>
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
        APP.preWarm(); // warm up GAS ก่อนที่จะ navigate
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
