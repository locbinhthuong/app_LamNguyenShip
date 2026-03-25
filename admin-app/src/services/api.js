import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
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
export const getOrders = async (params) => {
  const response = await api.get('/api/orders', { params });
  return response.data;
};

export const getDashboardStats = async () => {
  const response = await api.get('/api/orders/stats/dashboard');
  return response.data;
};

export const createOrder = async (data) => {
  const response = await api.post('/api/orders', data);
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

export const resetDriverPassword = async (id, newPassword) => {
  const response = await api.put(`/api/drivers/${id}/reset-password`, { newPassword });
  return response.data;
};

export const deleteDriver = async (id) => {
  const response = await api.delete(`/api/drivers/${id}`);
  return response.data;
};

export default api;
