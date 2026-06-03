// gas/Auth.gs — Authentication functions

function hashPassword(pw) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pw, Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function createToken(user) {
  const payload = { u: user.username, r: user.role, n: user.display_name, e: Date.now() + TOKEN_EXPIRY_HOURS * 3600000 };
  return Utilities.base64Encode(JSON.stringify(payload));
}

function verifyToken(token) {
  if (!token) return null;
  try {
    // ระบุ UTF-8 ชัดเจน เพื่อให้ display_name ภาษาไทยไม่กลายเป็น ?????
    const payload = JSON.parse(Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString('UTF-8'));
    if (payload.e < Date.now()) return null;
    return { username: payload.u, role: payload.r, display_name: payload.n };
  } catch (e) { return null; }
}

function login(params) {
  const { username, password } = params;
  if (!username || !password) return { success: false, error: 'กรุณากรอก username และ password' };
  const data = sheetToObjects('Users');
  const hash = hashPassword(password);
  const user = data.find(r => r.username === username && r.password_hash === hash && r.active !== false && r.active !== 'FALSE');
  if (!user) return { success: false, error: 'username หรือ password ไม่ถูกต้อง' };
  const u = { username, role: user.role, display_name: user.display_name };
  return { success: true, token: createToken(u), user: u };
}
