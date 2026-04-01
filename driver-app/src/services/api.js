import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.aloshipp.com';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
};

// Request interceptor - Add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('driver_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (localStorage.getItem('driver_token')) {
        window.dispatchEvent(new CustomEvent('api_unauthorized', { 
          detail: { message: 'Tài khoản của bạn đã được đăng nhập ở thiết bị khác hoặc phiên làm việc hết hạn!' } 
        }));
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const loginDriver = async (phone, password) => {
  const response = await api.post('/api/auth/driver/login', { phone, password });
  return response.data;
};

export const getDriverProfile = async () => {
  const response = await api.get('/api/auth/driver/me');
  return response.data;
};

export const updateDriverStatus = async (isOnline, lat, lng) => {
  const response = await api.put('/api/auth/driver/status', { isOnline, lat, lng });
  return response.data;
};

export const updateMyProfile = async (profileData) => {
  const response = await api.put('/api/auth/driver/me', profileData);
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

// ==================== ORDERS ====================
export const getAvailableOrders = async () => {
  const response = await api.get('/api/orders/available');
  return response.data;
};

export const getMyOrders = async (status) => {
  const params = status ? { status } : {};
  const response = await api.get('/api/orders/my', { params });
  return response.data;
};

export const getOrderById = async (id) => {
  const response = await api.get(`/api/orders/${id}`);
  return response.data;
};

export const acceptOrder = async (id) => {
  const response = await api.post(`/api/orders/${id}/accept`);
  return response.data;
};

export const pickedUpOrder = async (id) => {
  const response = await api.post(`/api/orders/${id}/pickup`);
  return response.data;
};

export const deliveringOrder = async (id) => {
  const response = await api.post(`/api/orders/${id}/deliver`);
  return response.data;
};

export const completeOrder = async (id) => {
  const response = await api.post(`/api/orders/${id}/complete`);
  return response.data;
};

export const cancelOrder = async (id, reason) => {
  const response = await api.post(`/api/orders/${id}/cancel`, { reason });
  return response.data;
};

// ==================== REVENUE ====================
export const getDriverRevenue = async () => {
  const response = await api.get('/api/revenue/driver/me');
  return response.data;
};

export default api;
