import axios from 'axios';
import { App as CapacitorApp } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.aloshipp.com';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

export const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
};

let cachedNativeHeaders = null;

// Request interceptor - Add token
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('driver_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    try {
      if (Capacitor.isNativePlatform()) {
        if (!cachedNativeHeaders) {
          const [info, device] = await Promise.all([
            CapacitorApp.getInfo(),
            Device.getInfo()
          ]);
          cachedNativeHeaders = {
            version: info.version,
            os: device.operatingSystem
          };
        }
        config.headers['X-App-Version'] = cachedNativeHeaders.version;
        config.headers['X-Device-Platform'] = cachedNativeHeaders.os;
      }
    } catch (e) {
      console.warn("Lỗi lấy thông tin version:", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Sync Server Time & Handle 401 & 426
api.interceptors.response.use(
  (response) => {
    const perfNow = performance.now();
    const serverTime = response?.data?.serverTime;
    if (typeof serverTime === 'number') {
      window.serverTimeOffset = serverTime - Date.now();
    } else if (response?.headers?.date) {
      const headerTime = new Date(response.headers.date).getTime();
      if (!Number.isNaN(headerTime)) {
        window.serverTimeOffset = headerTime - Date.now();
      }
    }

    if (response?.data?.data) {
      if (Array.isArray(response.data.data)) {
        response.data.data.forEach(item => {
          if (item && typeof item === 'object') {
            item._receivedPerfNow = perfNow;
            if (typeof serverTime === 'number' && !item.serverTime) item.serverTime = serverTime;
          }
        });
      } else if (typeof response.data.data === 'object') {
        response.data.data._receivedPerfNow = perfNow;
        if (typeof serverTime === 'number' && !response.data.data.serverTime) {
          response.data.data.serverTime = serverTime;
        }
      }
    }
    return response;
  },
  (error) => {
    const originalRequest = error.config;
    // Bỏ qua lỗi 401 khi đang thực hiện api đăng nhập
    if (error.response?.status === 401 && originalRequest && !originalRequest.url.includes('/login')) {
      if (localStorage.getItem('driver_token')) {
        window.dispatchEvent(new CustomEvent('api_unauthorized', { 
          detail: { message: 'Tài khoản của bạn đã được đăng nhập ở thiết bị khác hoặc phiên làm việc hết hạn!' } 
        }));
      } else {
        window.location.href = '/login';
      }
    }
    if (error.response?.status === 426) {
      window.dispatchEvent(new CustomEvent('api_upgrade_required', { detail: error.response.data }));
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const registerDriver = async (data) => {
  const response = await api.post('/api/auth/driver/register', data);
  return response.data;
};

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

export const confirmDriverActive = async () => {
  const response = await api.post('/api/auth/driver/confirm-active');
  return response.data;
};

export const updateDriverLocationApi = async (lat, lng) => {
  const response = await api.put('/api/auth/driver/location', { lat, lng });
  return response.data;
};

export const updateMyProfile = async (profileData) => {
  const response = await api.put('/api/auth/driver/me', profileData);
  return response.data;
};

export const deleteMyAccount = async () => {
  const response = await api.delete('/api/auth/driver/me');
  return response.data;
};

export const uploadDriverAvatar = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await api.post('/api/upload/avatar', formData);
  return response.data;
};

// ==================== ORDERS ====================
export const getAvailableOrders = async () => {
  const response = await api.get('/api/orders/available');
  return response.data;
};

export const getMyOrders = async (params) => {
  const queryParams = typeof params === 'string' ? { status: params } : (params || {});
  const response = await api.get('/api/orders/my', { params: queryParams });
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

export const rejectNearestAssignment = async (id) => {
  const response = await api.post(`/api/orders/${id}/nearest-reject`);
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

export const completeOrder = async (id, payload = {}) => {
  const response = await api.post(`/api/orders/${id}/complete`, payload);
  return response.data;
};

export const updateOrderLateReason = async (id, lateReason) => {
  const response = await api.put(`/api/orders/${id}/late-reason`, { lateReason });
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

// ==================== DEBT ====================
export const requestDebtPayment = async (amount, targetDate) => {
  const response = await api.post(`/api/debts/driver/request-payment`, { amount, targetDate });
  return response.data;
};

export const requestPayOSLink = async (amount, targetDate) => {
  const response = await api.post(`/api/payos/driver/create-link`, { amount, targetDate });
  return response.data;
};

export const getMyDebtDetail = async () => {
  const response = await api.get('/api/debts/driver/me');
  return response.data;
};

// ==================== WALLET ====================
export const getMyWalletDetail = async () => {
  const response = await api.get('/api/wallets/driver/me');
  return response.data;
};

export const requestWithdraw = async (amount, bankName, accountNumber, accountName) => {
  const response = await api.post('/api/wallets/driver/request-withdraw', { amount, bankName, accountNumber, accountName });
  return response.data;
};
// ==================== BẢNG TIN / ANNOUNCEMENTS ====================
export const getActiveAnnouncements = async () => {
  const response = await api.get(`/api/announcements?t=${new Date().getTime()}`);
  return response.data;
};

export default api;
export const getAppVersionConfig = async () => { const response = await api.get(`/api/config/APP_VERSION_CONFIG?t=${new Date().getTime()}`); return response.data; };
export const reportRain = async () => { const response = await api.post('/api/drivers/report-rain'); return response.data; };
export const getRainConfig = async () => { const response = await api.get(`/api/config/RAIN_SURCHARGE_CONFIG?t=${new Date().getTime()}`); return response.data; };
