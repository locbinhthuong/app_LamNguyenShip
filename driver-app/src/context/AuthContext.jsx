import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginDriver, getDriverProfile, updateDriverStatus, registerDriver, confirmDriverActive } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [driver, setDriver] = useState(() => {
    try {
      const cached = localStorage.getItem('driver_info');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem('driver_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await getDriverProfile();
      setDriver(response.data);
      localStorage.setItem('driver_info', JSON.stringify(response.data));
    } catch (err) {
      console.error('Load profile error:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        logout();
      } else {
        // Lỗi mạng hoặc server, sử dụng lại data từ localStorage để app không bị văng
        const cachedDriver = localStorage.getItem('driver_info');
        if (cachedDriver) {
          try {
            setDriver(JSON.parse(cachedDriver));
          } catch (e) {
            logout();
          }
        } else {
          logout();
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && localStorage.getItem('driver_token')) {
        loadProfile();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadProfile]);

  const login = async (phone, password) => {
    setError(null);
    try {
      const response = await loginDriver(phone, password);
      const { token, driver: driverData } = response.data;
      localStorage.setItem('driver_token', token);
      localStorage.setItem('driver_info', JSON.stringify(driverData));
      setDriver(driverData);
      return response;
    } catch (err) {
      const message = err.response?.data?.message || 'Đăng nhập thất bại';
      setError(message);
      throw new Error(message);
    }
  };

  const register = async (data) => {
    setError(null);
    try {
      const response = await registerDriver(data);
      return response;
    } catch (err) {
      const message = err.response?.data?.message || 'Đăng ký thất bại';
      setError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    if (localStorage.getItem('driver_token')) {
      try {
        await updateDriverStatus(false);
      } catch (e) {
        console.error('Không thể offline trước khi đăng xuất', e);
      }
    }
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_info');
    setDriver(null);
  };

  const setOnline = async (isOnline) => {
    try {
      const response = await updateDriverStatus(isOnline);
      setDriver(response.data);
      localStorage.setItem('driver_info', JSON.stringify(response.data));
      return response;
    } catch (err) {
      console.error('Set online error:', err);
      if (err.response?.data?.code === 'IDLE_LOCKED') {
        setDriver(prev => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            isOnline: false,
            idleWarningLevel: err.response.data.idleWarningLevel ?? prev.idleWarningLevel,
            idleLockedUntil: err.response.data.idleLockedUntil ?? prev.idleLockedUntil
          };
          localStorage.setItem('driver_info', JSON.stringify(updated));
          return updated;
        });
      }
      throw err;
    }
  };

  const confirmActive = async () => {
    try {
      const response = await confirmDriverActive();
      if (response.data) {
        setDriver(prev => {
          const updated = { ...(prev || {}), ...response.data };
          localStorage.setItem('driver_info', JSON.stringify(updated));
          return updated;
        });
      }
      return response;
    } catch (err) {
      console.error('Confirm active error:', err);
      throw err;
    }
  };

  const value = { driver, setDriver, loading, error, login, register, logout, setOnline, confirmActive, loadProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
