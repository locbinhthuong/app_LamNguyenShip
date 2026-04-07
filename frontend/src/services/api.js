import axios from 'axios';
import { io } from 'socket.io-client';

let API_URL = import.meta.env.VITE_API_URL || 'https://api.aloshipp.com/api';
if (API_URL && !API_URL.endsWith('/api')) {
  API_URL = `${API_URL}/api`;
}
let socket = null;

// Axios instance for HTTP requests
export const api = axios.create({
  baseURL: API_URL,
});

// Interceptor for attaching token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('customerToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==================== AUTH API ====================
export const registerCustomer = async (userData) => {
  const response = await api.post('/auth/customer/register', userData);
  return response.data;
};

export const loginCustomer = async (credentials) => {
  const response = await api.post('/auth/customer/login', credentials);
  return response.data;
};

export const getCustomerProfile = async () => {
  const response = await api.get('/auth/customer/me');
  return response.data;
};

// ==================== ORDER API ====================
export const createOrder = async (orderData) => {
  const response = await api.post('/orders/customer', orderData);
  return response.data;
};

export const getMyOrders = async () => {
  const response = await api.get('/orders/customer/my');
  return response.data;
};

export const getOrderDetails = async (orderId) => {
  const response = await api.get(`/orders/${orderId}`);
  return response.data;
};

// ==================== BẢNG TIN (ANNOUNCEMENTS) ====================
export const getActiveAnnouncements = async () => {
  const response = await api.get(`/announcements?t=${new Date().getTime()}`);
  return response.data;
};

// ==================== SOCKET.IO ====================
export const connectSocket = (token, role, options = {}) => {
  if (socket) {
    socket.disconnect();
  }

  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://api.aloshipp.com';
  
  socket = io(SOCKET_URL, {
    auth: { token, role },
    transports: ['polling', 'websocket']
  });

  socket.on('connect', () => {
    console.log('🔗 Đã kết nối Socket.IO');
  });

  socket.on('connect_error', (error) => {
    console.error('Lỗi kết nối Socket:', error);
  });

  if (options.onOrderStatusChanged) {
    socket.on('order_status_changed', options.onOrderStatusChanged);
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// ==================== HỖ TRỢ UPLOAD ====================
export const uploadCustomerAvatar = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  // Không truyền headers explicitly để Axios tự sinh Content-Type kèm Boundary chính xác
  const response = await api.post('/upload/avatar', formData);
  return response;
};

export const getFullImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  let API_URL = import.meta.env.VITE_API_URL || 'https://api.aloshipp.com/api';
  if (API_URL.endsWith('/api')) {
    API_URL = API_URL.replace('/api', '');
  }
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};
