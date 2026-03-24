import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginAdmin, getAdminProfile } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) { setLoading(false); return; }
    try {
      const response = await getAdminProfile();
      setAdmin(response.data);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const login = async (phone, password) => {
    const response = await loginAdmin(phone, password);
    const { token, admin: adminData } = response.data;
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_info', JSON.stringify(adminData));
    setAdmin(adminData);
    return response;
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_info');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
