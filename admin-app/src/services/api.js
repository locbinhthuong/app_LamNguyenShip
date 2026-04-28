import axios from 'axios';

/**
 * Mặc định trỏ về VPS API
 */
const DEFAULT_PRODUCTION_API = 'https://api.aloshipp.com';

function resolveApiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (trimmed !== '') return trimmed;
  if (import.meta.env.PROD) return DEFAULT_PRODUCTION_API;
  return '';
}

/** Base URL API (dev có thể '' để dùng proxy Vite → /api) */
export const API_BASE_URL = resolveApiBaseUrl();

export const getFullImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('blob:')) return path;
  return `${API_BASE_URL}${path}`;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_info');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const loginAdmin = async (phone, password) => {
  const response = await api.post('/api/auth/admin/login', { phone, password });
  return response.data;
};

export const getAdminProfile = async () => {
  const response = await api.get('/api/auth/admin/me');
  return response.data;
};

export const updateFcmToken = async (token) => {
  const response = await api.post('/api/auth/fcm-token', { token });
  return response.data;
};

// ==================== ORDERS ====================
/** Trả về { orders, pagination } — cùng kiểu unwrap như getDashboardStats, tránh nhầm cấp .data */
export const getOrders = async (params) => {
  const response = await api.get('/api/orders', { params });
  const body = response.data;
  if (body?.success && Array.isArray(body.data)) {
    return { orders: body.data, pagination: body.pagination || {} };
  }
  throw new Error(body?.message || 'Không tải danh sách đơn');
};

export const getDashboardStats = async () => {
  const response = await api.get('/api/orders/stats/dashboard');
  const body = response.data;
  if (body?.success && body?.data != null) return body.data;
  throw new Error(body?.message || 'Không tải được thống kê');
};

export const createOrder = async (data) => {
  const response = await api.post('/api/orders', data);
  return response.data;
};

export const updateOrder = async (id, data) => {
  const response = await api.put(`/api/orders/${id}`, data);
  return response.data;
};

export const cancelOrder = async (id, reason) => {
  const response = await api.post(`/api/orders/${id}/cancel`, { reason });
  return response.data;
};

export const cleanupOldOrders = async (monthsAgo) => {
  const response = await api.delete('/api/orders/cleanup', { data: { monthsAgo } });
  return response.data;
};

export const deleteOrder = async (id) => {
  const response = await api.delete(`/api/orders/${id}`);
  return response.data;
};

// ==================== DRIVERS ====================
export const getDrivers = async (params) => {
  const response = await api.get('/api/drivers', { params });
  return response.data;
};

export const getDriverById = async (id) => {
  const response = await api.get(`/api/drivers/${id}`);
  return response.data;
};

export const createDriver = async (data) => {
  const response = await api.post('/api/drivers', data);
  return response.data;
};

export const updateDriver = async (id, data) => {
  const response = await api.put(`/api/drivers/${id}`, data);
  return response.data;
};

export const uploadDriverAvatar = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await api.post('/api/upload/avatar', formData);
  return response.data;
};

export const resetDriverPassword = async (id, newPassword) => {
  const response = await api.put(`/api/drivers/${id}/reset-password`, { newPassword });
  return response.data;
};

export const deleteDriver = async (id) => {
  const response = await api.delete(`/api/drivers/${id}`);
  return response.data;
};

// ==================== REVENUE ====================
export const getRevenueStats = async () => {
  const response = await api.get('/api/revenue/stats');
  return response.data;
};

export const getDriverStatsAdmin = async (id) => {
  const response = await api.get(`/api/revenue/driver-stats/${id}`);
  return response.data;
};

// ==================== ANNOUNCEMENTS ====================
export const getAnnouncements = async () => {
  const response = await api.get('/api/announcements/all');
  return response.data;
};

export const createAnnouncement = async (data) => {
  const response = await api.post('/api/announcements', data);
  return response.data;
};

export const updateAnnouncement = async (id, data) => {
  const response = await api.put(`/api/announcements/${id}`, data);
  return response.data;
};

export const deleteAnnouncement = async (id) => {
  const response = await api.delete(`/api/announcements/${id}`);
  return response.data;
};

export const uploadMedia = async (file) => {
  const formData = new FormData();
  formData.append('media', file);
  const response = await api.post('/api/upload/media', formData);
  return response.data;
};

// ==================== DEBTS ====================
export const getDriverDebtDetail = async (driverId) => {
  const response = await api.get(`/api/debts/driver/${driverId}`);
  return response.data;
};

export const addDriverPenalty = async (driverId, amount, description, targetDate = null) => {
  const response = await api.post(`/api/debts/driver/${driverId}/penalty`, { amount, description, targetDate });
  return response.data;
};

export const adjustDailyDebt = async (driverId, targetDate, newAmount) => {
  const response = await api.put(`/api/debts/driver/${driverId}/daily-debt`, { targetDate, newAmount });
  return response.data;
};

export const addDriverPayment = async (driverId, amount, description, targetDate) => {
  const response = await api.post(`/api/debts/driver/${driverId}/payment`, { amount, description, targetDate });
  return response.data;
};

export const resetDriverDebt = async (driverId) => {
  const response = await api.post(`/api/debts/driver/${driverId}/reset`);
  return response.data;
};

export const deleteDriverDebt = async (txId) => {
  const response = await api.delete(`/api/debts/tx/${txId}`);
  return response.data;
};

export const updateDriverDebt = async (txId, amount, description) => {
  const response = await api.put(`/api/debts/tx/${txId}`, { amount, description });
  return response.data;
};

// ==================== WALLET (ADMIN) ====================
export const getDriverWalletAdmin = async (driverId) => {
  const response = await api.get(`/api/wallets/admin/${driverId}`);
  return response.data;
};

export const adjustDriverWalletAdmin = async (driverId, amount, description, type) => {
  const response = await api.post(`/api/wallets/admin/${driverId}/adjust`, { amount, description, type });
  return response.data;
};

export const processWithdrawAdmin = async (txId, action, rejectReason) => {
  const response = await api.post(`/api/wallets/admin/tx/${txId}/process`, { action, rejectReason });
  return response.data;
};

export const deleteWalletTxAdmin = async (txId) => {
  const response = await api.delete(`/api/wallets/admin/tx/${txId}`);
  return response.data;
};

// ==================== USERS (CUSTOMERS) ====================
export const getCustomers = async () => {
  const response = await api.get('/api/users');
  return response.data;
};

export const createCustomer = async (data) => {
  const response = await api.post('/api/users', data);
  return response.data;
};

export const updateCustomer = async (id, data) => {
  const response = await api.put(`/api/users/${id}`, data);
  return response.data;
};

export const deleteCustomer = async (id) => {
  const response = await api.delete(`/api/users/${id}`);
  return response.data;
};

// ==================== STAFF (ADMIN_USERS) ====================
export const getStaffs = async () => {
  const response = await api.get('/api/staffs');
  return response.data;
};

export const createStaff = async (data) => {
  const response = await api.post('/api/staffs', data);
  return response.data;
};

export const updateStaff = async (id, data) => {
  const response = await api.put(`/api/staffs/${id}`, data);
  return response.data;
};

export const deleteStaff = async (id) => {
  const response = await api.delete(`/api/staffs/${id}`);
  return response.data;
};

export default api;
