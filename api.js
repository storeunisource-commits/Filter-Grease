// api.js — Filter-Grease Frontend API Module
// Replace GAS_URL with your deployed Google Apps Script Web App URL

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzbdKanCODP8wk6O2sfUlD6Q_XaEbe9R0L3fWIyAWrW_Q73WbZowFE0d3d_KO5KT6Zq/exec';
const TOKEN_KEY = 'fg_token';
const USER_KEY = 'fg_user';

// ==================== AUTH ====================

async function apiCall(params) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) params.token = token;

  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(params)
  });
  const data = await res.json();
  if (!data.success && data.error === 'Unauthorized') {
    logout();
    window.location.hash = '#login';
    throw new Error('กรุณา login ใหม่');
  }
  return data;
}

function login(username, password) {
  return apiCall({ action: 'login', username, password }).then(data => {
    if (data.success) {
      sessionStorage.setItem(TOKEN_KEY, data.token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }
    return data;
  });
}

function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

function isLoggedIn() {
  return !!sessionStorage.getItem(TOKEN_KEY);
}

function getUserInfo() {
  const u = sessionStorage.getItem(USER_KEY);
  return u ? JSON.parse(u) : null;
}

// ==================== TRUCKS ====================

function getTrucks() {
  return apiCall({ action: 'gettrucks' });
}

// ==================== SAVE ====================

function saveBlow(records, date) {
  return apiCall({ action: 'saveblow', records, date });
}

function saveGreasing(records, date, cycle, month_year) {
  return apiCall({ action: 'savegreasing', records, date, cycle, month_year });
}

function saveDrain(records, date) {
  return apiCall({ action: 'savedrain', records, date });
}

function saveCall(data) {
  return apiCall({ action: 'savecall', ...data });
}

function saveViolation(data) {
  return apiCall({ action: 'saveviolation', ...data });
}

function saveReport(data) {
  return apiCall({ action: 'savereport', ...data });
}

// ==================== GET ====================

function getHistory(type, month_year) {
  return apiCall({ action: 'gethistory', type, month_year });
}

function getStats(date) {
  return apiCall({ action: 'getstats', date });
}

function getViolations() {
  return apiCall({ action: 'getviolations' });
}

function getReportHistory() {
  return apiCall({ action: 'getreporthistory' });
}

// ==================== ADMIN ====================

function getUsers() {
  return apiCall({ action: 'getusers' });
}

function addUser(data) {
  return apiCall({ action: 'adduser', ...data });
}

function deleteUser(username) {
  return apiCall({ action: 'deleteuser', username });
}

function resetPassword(username, new_password) {
  return apiCall({ action: 'resetpassword', username, new_password });
}
