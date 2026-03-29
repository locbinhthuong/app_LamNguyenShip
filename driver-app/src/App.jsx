import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import OrderDetail from './pages/OrderDetail';
import MyOrders from './pages/MyOrders';
import Earnings from './pages/Earnings';
import AlertModal from './components/AlertModal';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PrivateRoute = ({ children }) => {
  const { driver, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return driver ? children : <Navigate to="/login" />;
};

function AppContent() {
  const { driver, logout } = useAuth();
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const [logoutAlert, setLogoutAlert] = useState(null);

  useEffect(() => {
    // 1) Lắng nghe sự kiện từ axios interceptor
    const handleUnauthorized = (e) => {
      setLogoutAlert(e.detail?.message || 'Phiên đăng nhập không hợp lệ.');
    };
    window.addEventListener('api_unauthorized', handleUnauthorized);

    return () => window.removeEventListener('api_unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (driver) {
      socketRef.current = io(SOCKET_URL, { 
        transports: ['polling', 'websocket'],
        auth: { token: localStorage.getItem('driver_token') }
      });
      window.driverSocket = socketRef.current;
      
      socketRef.current.emit('driver_join', driver._id);

      socketRef.current.on('force_logout', (data) => {
        setLogoutAlert(data.message || 'Tài khoản của bạn đã được đăng nhập ở thiết bị khác!');
      });

      // Phát loa sự kiện Custom để các Trang/Component khác an tâm lắng nghe (Tránh lỗi Socket chưa kịp Load lúc React chạy useEffect)
      const forwardEvents = ['new_order', 'order_accepted', 'order_cancelled', 'order_picked_up', 'order_delivering', 'order_completed'];
      forwardEvents.forEach(event => {
        socketRef.current.on(event, (data) => {
          window.dispatchEvent(new CustomEvent(`driver_${event}`, { detail: data }));
        });
      });

      return () => {
        if (socketRef.current) socketRef.current.disconnect();
        window.driverSocket = null;
      };
    }
  }, [driver]);

  const handleForceLogoutClose = () => {
    setLogoutAlert(null);
    logout();
    navigate('/login');
  };

  return (
    <>
      <Routes>
        <Route path="/login" element={driver ? <Navigate to="/" /> : <Login />} />
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/order/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
        <Route path="/my-orders" element={<PrivateRoute><MyOrders /></PrivateRoute>} />
        <Route path="/earnings" element={<PrivateRoute><Earnings /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <AlertModal 
        isOpen={!!logoutAlert}
        title="Đăng xuất bắt buộc"
        message={logoutAlert}
        onConfirm={handleForceLogoutClose}
        isError={true}
      />
    </>
  );
}

export default function App() {
  return <AppContent />;
}
