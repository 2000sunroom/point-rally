const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'エラーが発生しました');
  }

  return data;
}

export const api = {
  // 認証
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (username, password, display_name) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, display_name }) }),
  getMe: () => request('/auth/me'),

  // ポイント
  scanQR: (qr_code, user_lat, user_lng) =>
    request('/points/scan', { method: 'POST', body: JSON.stringify({ qr_code, user_lat, user_lng }) }),
  getHistory: () => request('/points/history'),
  redeemPrize: (prizeId) =>
    request(`/points/redeem/${prizeId}`, { method: 'POST' }),

  // 景品
  getPrizes: () => request('/prizes'),
  getAllPrizes: () => request('/prizes/all'),
  createPrize: (data) =>
    request('/prizes', { method: 'POST', body: JSON.stringify(data) }),
  updatePrize: (id, data) =>
    request(`/prizes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePrize: (id) =>
    request(`/prizes/${id}`, { method: 'DELETE' }),

  // QRコード
  getQRCodes: () => request('/qrcodes'),
  createQRCode: (data) =>
    request('/qrcodes', { method: 'POST', body: JSON.stringify(data) }),
  toggleQRCode: (id) =>
    request(`/qrcodes/${id}/toggle`, { method: 'PATCH' }),
  updateQRLocation: (id, admin_lat, admin_lng) =>
    request(`/qrcodes/${id}/location`, { method: 'PATCH', body: JSON.stringify({ admin_lat, admin_lng }) }),
  deleteQRCode: (id) =>
    request(`/qrcodes/${id}`, { method: 'DELETE' }),

  // パスワード変更
  changePassword: (current_password, new_password) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password, new_password }) }),

  // お問い合わせ
  sendInquiry: (subject, message) =>
    request('/inquiries', { method: 'POST', body: JSON.stringify({ subject, message }) }),
  getInquiries: () => request('/inquiries'),
  markInquiryRead: (id) =>
    request(`/inquiries/${id}/read`, { method: 'PATCH' }),
  getUnreadCount: () => request('/inquiries/unread-count'),

  // 管理者
  getUsers: () => request('/admin/users'),
  getAdminHistory: () => request('/admin/history'),
  getUserHistory: (userId) => request(`/admin/users/${userId}/history`),
  getStats: () => request('/admin/stats'),
};
