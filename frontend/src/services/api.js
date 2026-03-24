import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('[API] Response error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ==================== ORDER API ====================

// Lấy danh sách đơn hàng
export const getOrders = async (status = null) => {
  try {
    const params = status ? { status } : {};
    const response = await api.get('/api/orders', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách đơn hàng' };
  }
};

// Lấy chi tiết đơn hàng
export const getOrderById = async (id) => {
  try {
    const response = await api.get(`/api/orders/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy chi tiết đơn hàng' };
  }
};

// Tạo đơn hàng mới
export const createOrder = async (orderData) => {
  try {
    const response = await api.post('/api/orders', orderData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi tạo đơn hàng' };
  }
};

// Nhận đơn hàng
export const acceptOrder = async (orderId, shipperId) => {
  try {
    const response = await api.post(`/api/orders/${orderId}/accept`, { shipperId });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi nhận đơn hàng' };
  }
};

// Hoàn thành đơn hàng
export const completeOrder = async (orderId, shipperId) => {
  try {
    const response = await api.post(`/api/orders/${orderId}/complete`, { shipperId });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi hoàn thành đơn hàng' };
  }
};

// Xóa đơn hàng
export const deleteOrder = async (orderId) => {
  try {
    const response = await api.delete(`/api/orders/${orderId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi xóa đơn hàng' };
  }
};

// ==================== SOCKET.IO ====================

// Socket instance
let socket = null;

// Kết nối Socket.IO
export const connectSocket = (onNewOrder, onOrderTaken, onOrderDone) => {
  if (socket?.connected) {
    console.log('[Socket] Already connected');
    return socket;
  }

  socket = io(API_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
    socket.emit('join_room', 'orders');
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected');
  });

  socket.on('new_order', (order) => {
    console.log('[Socket] New order:', order);
    if (onNewOrder) onNewOrder(order);
  });

  socket.on('order_taken', (order) => {
    console.log('[Socket] Order taken:', order);
    if (onOrderTaken) onOrderTaken(order);
  });

  socket.on('order_done', (order) => {
    console.log('[Socket] Order done:', order);
    if (onOrderDone) onOrderDone(order);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error);
  });

  return socket;
};

// Ngắt kết nối Socket.IO
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket] Disconnected manually');
  }
};

// Get socket instance
export const getSocket = () => socket;

export default api;
