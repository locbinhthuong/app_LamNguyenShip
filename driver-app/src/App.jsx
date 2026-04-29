import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
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

const SOCKET_URL = import.meta.env.VITE_API_URL || 'https://api.aloshipp.com';

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

  // Audio Alarm Global Array
  const audioCtxRef = useRef(null);
  const audioBufferRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const intervalRef = useRef(null);

  const driverRef = useRef(driver);
  useEffect(() => {
    driverRef.current = driver;
  }, [driver]);

  // Ép Trình duyệt nhả quyền phát Âm thanh (Vượt qua chính sách cấm AutoPlay) và Tắt Splash Screen
  useEffect(() => {
    // Ẩn Splash Screen sau khi React đã mount
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
      setTimeout(() => {
        splashScreen.classList.add('fade-out');
        setTimeout(() => splashScreen.remove(), 500); // Chờ CSS fade-out 0.5s rồi xoá node
      }, 1500); // Giữ tối thiểu 1.5s để người dùng kịp nhìn thấy hiệu ứng
    }

    const initAudio = async () => {
      try {
        if (!audioCtxRef.current) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) return;
          audioCtxRef.current = new AudioContext();
          
          const response = await fetch('/chuong.mp3');
          const arrayBuffer = await response.arrayBuffer();
          const decoded = await audioCtxRef.current.decodeAudioData(arrayBuffer);
          audioBufferRef.current = decoded;
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
      } catch (e) {
        console.error("Lỗi buffer mp3:", e);
      }
    };
    
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });
    
    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const stopAlarm = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e){}
      try { sourceNodeRef.current.disconnect(); } catch(e){}
      sourceNodeRef.current = null;
    }
  }, []);

  const startAlarm = useCallback(() => {
    stopAlarm();
    
    if (audioCtxRef.current && audioBufferRef.current) {
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        
        const source = audioCtxRef.current.createBufferSource();
        source.buffer = audioBufferRef.current;
        source.connect(audioCtxRef.current.destination);
        source.loop = true;
        source.start(0);
        sourceNodeRef.current = source;
        
        // Tự ngắt chuông sau 30 giây
        intervalRef.current = setTimeout(() => {
            stopAlarm();
        }, 30000);
    } else {
        // Fallback nhẹ nếu chưa tương tác (hên xui)
        try { new Audio('/chuong.mp3').play(); } catch(e) {}
    }
  }, [stopAlarm]);

  useEffect(() => {
    const handleStopEvent = () => {
      stopAlarm();
      setPushMessage(null);
    };
    window.addEventListener('stop_alarm_event', handleStopEvent);
    
    let lastNewOrderTime = 0;
    const handleNewOrderEvent = (e) => {
       if (!driverRef.current?.isOnline) return; // BỎ QUA NẾU ĐANG OFFLINE

       const order = e.detail;
       if (order) {
           setPushMessage({ 
               title: '🔥 TING TING', 
               message: order.pickupAddress ? `Điểm đón: ${order.pickupAddress}` : 'Có Đơn Hàng Mới Cho Bạn!'
           });
       }

       const now = Date.now();
       if (now - lastNewOrderTime < 2000) return; // Chỉ Debounce tiếng chuông để chống hú Spam
       lastNewOrderTime = now;
       
       // CHỈ BẬT CHUÔNG VÀ CÒI KHI TÀI XẾ ĐANG MỞ APP TRÊN MÀN HÌNH
       if (document.visibilityState === 'visible') {
           startAlarm();
       }
    };
    window.addEventListener('driver_new_order', handleNewOrderEvent);
    window.addEventListener('driver_order_accepted', handleStopEvent);
    window.addEventListener('driver_order_cancelled', handleStopEvent);
    window.addEventListener('driver_order_deleted_event', handleStopEvent);

    const handleForceAssign = (e) => {
        const order = e.detail;
        if (order) {
            setPushMessage({ 
                title: '⚡ TỔNG ĐÀI GÁN ĐƠN ĐẶC BIỆT', 
                message: order.pickupAddress ? `Nơi lấy/đón: ${order.pickupAddress}` : 'Nhiệm vụ mới Mở app ngay!'
            });
        }
        if (document.visibilityState === 'visible') {
            startAlarm(); // Còi rú ngay lập tức
        }
    };
    window.addEventListener('driver_force_assigned', handleForceAssign);

    return () => {
      window.removeEventListener('stop_alarm_event', handleStopEvent);
      window.removeEventListener('driver_new_order', handleNewOrderEvent);
      window.removeEventListener('driver_order_accepted', handleStopEvent);
      window.removeEventListener('driver_order_cancelled', handleStopEvent);
      window.removeEventListener('driver_order_deleted_event', handleStopEvent);
      window.removeEventListener('driver_force_assigned', handleForceAssign);
    };
  }, [startAlarm, stopAlarm]);

  useEffect(() => {
    // 1) Lắng nghe sự kiện từ axios interceptor
    const handleUnauthorized = (e) => {
      setLogoutAlert(e.detail?.message || 'Phiên đăng nhập không hợp lệ.');
    };
    window.addEventListener('api_unauthorized', handleUnauthorized);

    const handlePush = (e) => {
      setPushMessage({ title: e.detail.title, message: e.detail.body });
      // PHÁT CHUÔNG NGAY LẬP TỨC (Chống delay Socket)
      if (e.detail.title && e.detail.title.toUpperCase().includes('MỚI')) {
         window.dispatchEvent(new CustomEvent('driver_new_order')); 
      }
    };
    window.addEventListener('fcm_foreground_alert', handlePush);

    return () => {
      window.removeEventListener('api_unauthorized', handleUnauthorized);
      window.removeEventListener('fcm_foreground_alert', handlePush);
    };
  }, []);

  useEffect(() => {
    // Tắt chuông khi bấm vào Local Notification hoặc FCM Notification (App đang chạy ngầm)
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
        LocalNotifications.addListener('localNotificationActionPerformed', () => {
          window.dispatchEvent(new CustomEvent('stop_alarm_event'));
        });
      }).catch(console.error);

      import('@capacitor-firebase/messaging').then(({ FirebaseMessaging }) => {
        FirebaseMessaging.addListener('notificationActionPerformed', () => {
          window.dispatchEvent(new CustomEvent('stop_alarm_event'));
        });
      }).catch(console.error);
    }
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

      const forwardEvents = ['new_order', 'order_accepted', 'order_cancelled', 'order_picked_up', 'order_delivering', 'order_completed', 'wallet_updated', 'debt_updated', 'order_deleted_event', 'refresh_orders_data', 'order_updated', 'force_assigned'];
      forwardEvents.forEach(event => {
        socketRef.current.on(event, (data) => {
          if (event === 'new_order') {
            const driverRate = driver.commissionRate || 15;
            if (data && data.commissionRate != null && Number(data.commissionRate) !== Number(driverRate)) {
              return; // Bỏ qua đơn hàng không khớp chiết khấu
            }
          }
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
        <div className="fixed top-2 left-2 right-2 z-[9999] animate-[slideDown_0.3s_ease-out] flex justify-center pointer-events-none safe-pt">
          <div 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('stop_alarm_event'));
              setPushMessage(null);
              navigate('/');
            }}
            className="cursor-pointer bg-slate-900 border border-slate-700 shadow-2xl rounded-xl p-2.5 flex items-center gap-3 ring-2 ring-blue-500/50 w-full max-w-md pointer-events-auto active:scale-[0.98] transition-transform"
          >
            <span className="text-xl animate-pulse shrink-0">🔔</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-[13px] font-bold text-blue-400 truncate">{pushMessage.title || "Có đơn hàng mới"}</h3>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">{pushMessage.message?.replace(/\n/g, ' 🔜 ')}</p>
            </div>
            <div className="shrink-0 bg-red-600 text-white text-[10px] font-black px-3 py-2 rounded-lg ml-1 shadow-md uppercase tracking-wider">
              🔕 TẮT
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
