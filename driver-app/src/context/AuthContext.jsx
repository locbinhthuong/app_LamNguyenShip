import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginDriver, getDriverProfile, updateDriverStatus } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [driver, setDriver] = useState(null);
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
    } catch (err) {
      console.error('Load profile error:', err);
      logout();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
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
      return response;
    } catch (err) {
      console.error('Set online error:', err);
    }
  };

  const value = { driver, loading, error, login, logout, setOnline, loadProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
