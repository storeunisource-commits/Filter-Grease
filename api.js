// api.js — Filter-Grease Frontend API Module
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

function isLoggedIn() { return !!sessionStorage.getItem(TOKEN_KEY); }
function getUserInfo() {
  const u = sessionStorage.getItem(USER_KEY);
  return u ? JSON.parse(u) : null;
}

// ==================== TRUCKS ====================
function getTrucks() { return apiCall({ action: 'gettrucks' }); }
function updateTruck(data) { return apiCall({ action: 'updatetruck', ...data }); }

// ==================== SAVE ====================
function saveBlow(record, date) { return apiCall({ action: 'saveblow', record, date }); }
function saveGreasing(record, date, cycle, month_year) { return apiCall({ action: 'savegreasing', record, date, cycle, month_year }); }
function saveDrain(record, date) { return apiCall({ action: 'savedrain', record, date }); }
function saveCall(data) { return apiCall({ action: 'savecall', ...data }); }
function saveViolation(data) { return apiCall({ action: 'saveviolation', ...data }); }
function saveReport(data) { return apiCall({ action: 'savereport', ...data }); }

// ==================== IMAGE ====================
function uploadImage(base64, mimeType, truck_no, task_type, date) {
  return apiCall({ action: 'uploadimage', base64, mimeType, truck_no, task_type, date });
}

// ==================== GET ====================
function getHistory(type, year, month) { return apiCall({ action: 'gethistory', type, year, month }); }
function getStats(date) { return apiCall({ action: 'getstats', date }); }
function getDashboardFull(date) { return apiCall({ action: 'getdashboardfull', date }); }
function getCompare(month1, month2) { return apiCall({ action: 'getcompare', month1, month2 }); }
function getViolations(params) { return apiCall({ action: 'getviolations', ...(params||{}) }); }
function getReportHistory() { return apiCall({ action: 'getreporthistory' }); }
function getFleetStatus(month_year) { return apiCall({ action: 'getfleetstatus', month_year }); }

// ==================== IMPORT ====================
function bulkImport(records, type) { return apiCall({ action: 'bulkimport', records, type }); }

// ==================== ADMIN ====================
function getUsers() { return apiCall({ action: 'getusers' }); }
function addUser(data) { return apiCall({ action: 'adduser', ...data }); }
function deleteUser(username) { return apiCall({ action: 'deleteuser', username }); }
function resetPassword(username, new_password) { return apiCall({ action: 'resetpassword', username, new_password }); }
