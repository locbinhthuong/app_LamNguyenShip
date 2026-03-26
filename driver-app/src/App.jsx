import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import OrderDetail from './pages/OrderDetail';
import MyOrders from './pages/MyOrders';
import Profile from './pages/Profile';
import Earnings from './pages/Earnings';

const PrivateRoute = ({ children }) => {
  const { driver, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return driver ? children : <Navigate to="/login" />;
};

export default function App() {
  const { driver } = useAuth();
  const socketRef = useRef(null);
  const watchId = useRef(null);
  const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;

  useEffect(() => {
    // Chỉ bật theo dõi vị trí nếu đã có thông tin tài xế và đang ONLINE
    if (driver && driver.isOnline) {
      const token = localStorage.getItem('driver_token');

      // 1. Kết nối với Server Socket
      socketRef.current = io(API_BASE_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      socketRef.current.on('connect', () => console.log('✅ Driver Socket Connected!'));

      // 2. Lắng nghe GPS liên tục
      if (navigator.geolocation) {
        watchId.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            if (socketRef.current?.connected) {
              socketRef.current.emit('update_location', { lat, lng });
            }
          },
          (err) => console.warn('Lỗi định vị:', err.message),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Realtime accuracy
        );
      }
    }

    // Dọn dẹp: Khi tài xế tắt Online hoặc tắt App
    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [driver?.isOnline, driver?._id]); // Chạy lại khi trạng thái isOnline thay đổi

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/order/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
      <Route path="/my-orders" element={<PrivateRoute><MyOrders /></PrivateRoute>} />
      <Route path="/earnings" element={<PrivateRoute><Earnings /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
