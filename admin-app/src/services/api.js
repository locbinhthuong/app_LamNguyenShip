import axios from 'axios';

/**
 * Khi build production mà CI không có VITE_API_URL, không được fallback về localhost
 * (trình duyệt sẽ gọi máy người dùng → Axios báo "Network Error").
 */
const DEFAULT_PRODUCTION_API = 'https://app-lamnguyenship.onrender.com';

function resolveApiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (trimmed !== '') return trimmed;
  if (import.meta.env.PROD) return DEFAULT_PRODUCTION_API;
  return '';
}

/** Base URL API (dev có thể '' để dùng proxy Vite → /api) */
export const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
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
  
  const response = await api.post('/api/upload/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
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

export default api;
