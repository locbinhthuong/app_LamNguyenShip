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
import api from './services/api';
import { requestFirebaseToken, setupForegroundListener } from './utils/firebase';

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
  const [pushMessage, setPushMessage] = useState(null);

  useEffect(() => {
    // 1) Lắng nghe sự kiện từ axios interceptor
    const handleUnauthorized = (e) => {
      setLogoutAlert(e.detail?.message || 'Phiên đăng nhập không hợp lệ.');
    };
    window.addEventListener('api_unauthorized', handleUnauthorized);

    const handlePush = (e) => {
      setPushMessage({ title: e.detail.title, message: e.detail.body });
    };
    window.addEventListener('fcm_foreground_alert', handlePush);

    return () => {
      window.removeEventListener('api_unauthorized', handleUnauthorized);
      window.removeEventListener('fcm_foreground_alert', handlePush);
    };
  }, []);

  useEffect(() => {
    if (driver) {
      // Bật Màng Lọc Cảnh Báo Khẩn (Firebase Push)
      const setupPush = async () => {
        try {
          const token = await requestFirebaseToken();
          if (token) {
            await api.post('/api/auth/fcm-token', { token });
            console.log('[PUSH] Setup thành công, chạy nền...');
          }
        } catch (e) {
          console.error('Không lưu được Thiết Bị!', e);
        }
      };
      setupPush();

      // Loa kêu khi Lái xe đang Mở Màn Hình
      setupForegroundListener((payload) => {
        console.log('[FCM] FOREGROUND ALERT:', payload);
        const title = payload.notification?.title || 'Thông báo';
        const body = payload.notification?.body || '';
        // Phát tín hiệu ra toàn App thay vì che màn hình ngay
        window.dispatchEvent(new CustomEvent('fcm_foreground_alert', { detail: { title, body } }));
      });

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
      {pushMessage && (
        <div className="fixed top-4 left-4 right-4 z-[9999] animate-[slideDown_0.3s_ease-out]">
          <div 
            className="bg-slate-900 border-2 border-slate-700 shadow-2xl rounded-2xl p-4 flex gap-3 cursor-pointer ring-4 ring-blue-500/30"
            onClick={() => setPushMessage(null)}
          >
            <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
              <span className="text-xl">🔔</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-blue-400 truncate">{pushMessage.title || "Thông Báo Nhiệm Vụ"}</h3>
              <p className="text-sm text-slate-300 font-medium whitespace-pre-wrap leading-tight mt-1">
                {pushMessage.message}
              </p>
              <p className="text-[10px] uppercase text-blue-400 font-black mt-2 opacity-80">
                Chạm vào đây để đóng
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  return <AppContent />;
}
