import { Routes, Route, Navigate, useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import OrderDetail from './pages/OrderDetail';
import MyOrders from './pages/MyOrders';
import Earnings from './pages/Earnings';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AlertModal from './components/AlertModal';
import { AnimatePresence } from 'framer-motion';
import AnimatedPage from './components/AnimatedPage';
import api, { getAppVersionConfig } from './services/api';
import { requestFirebaseToken, setupForegroundListener } from './utils/firebase';
import ForceUpdateModal from './components/ForceUpdateModal';
import NearestOrderPopup from './components/NearestOrderPopup';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { NativeAudio } from '@capacitor-community/native-audio';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'https://api.aloshipp.com';

const compareVersions = (v1, v2) => {
  if (!v1 || !v2) return 0;
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
};

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
  const { driver, logout, loadProfile } = useAuth();
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();
  const direction = location.state?.direction || (navType === 'POP' ? -1 : 1);
  const [logoutAlert, setLogoutAlert] = useState(null);
  const [pushMessage, setPushMessage] = useState(null);
  
  const [forceUpdateConfig, setForceUpdateConfig] = useState(null);

  // Audio Alarm Global Array
  const audioCtxRef = useRef(null);
  const audioBufferRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const fallbackAudioRef = useRef(null);
  const intervalRef = useRef(null);

  const driverRef = useRef(driver);
  useEffect(() => {
    driverRef.current = driver;
  }, [driver]);

  // Ép Trình duyệt nhả quyền phát Âm thanh (Vượt qua chính sách cấm AutoPlay) và Tắt Splash Screen
  useEffect(() => {
    // Ẩn Splash Screen
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
      const timeElapsed = performance.now();
      const remainingTime = Math.max(0, 1500 - timeElapsed);
      setTimeout(() => {
        splashScreen.classList.add('fade-out');
        setTimeout(() => splashScreen.remove(), 400);
      }, remainingTime);
    }

    const initAudio = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
           const possiblePaths = ['chuong', 'chuong.mp3', 'public/chuong.mp3', 'assets/public/chuong.mp3', 'raw/chuong', 'res/raw/chuong.mp3'];
           for (const path of possiblePaths) {
               try {
                  await NativeAudio.preload({
                      assetId: 'chuong_aloshipp',
                      assetPath: path,
                      audioChannelNum: 1,
                      isUrl: false
                  });
                  console.log('Preloaded native audio with path:', path);
                  break; // Thoát vòng lặp khi load thành công
               } catch(e) {
                  // Thử path tiếp theo
               }
           }
        }

        if (!audioCtxRef.current) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) return;
          audioCtxRef.current = new AudioContext();
          
          const response = await fetch('/chuong.mp3');
          const arrayBuffer = await response.arrayBuffer();
          const decoded = await audioCtxRef.current.decodeAudioData(arrayBuffer);
          audioBufferRef.current = decoded;
        }
      } catch (err) {
        console.error("Audio init error:", err);
      }
    };
    
    // Khởi tạo tải trước file mp3 (nhưng chưa phát)
    initAudio();
    
    const resumeAudioContext = () => {
      initAudio();
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };

    // Đánh thức Audio Context ở mọi lần chạm tay vào màn hình
    document.addEventListener('touchstart', resumeAudioContext, { passive: true });
    document.addEventListener('click', resumeAudioContext, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', resumeAudioContext);
      document.removeEventListener('click', resumeAudioContext);
    };
  }, []);

  // Force Update Check
  useEffect(() => {
    const checkAppVersion = async () => {
      try {
        const res = await getAppVersionConfig();
        if (res && res.success && res.data && res.data.value && res.data.value.driverApp) {
          const config = res.data.value.driverApp;
          if (Capacitor.isNativePlatform()) {
            const info = await CapacitorApp.getInfo();
            if (compareVersions(info.version, config.minVersion) < 0) {
              setForceUpdateConfig(config);
            }
          }
        }
      } catch (err) {
        console.error("Lỗi khi kiểm tra phiên bản app:", err);
      }
    };
    checkAppVersion();
  }, []);

  const stopAlarm = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    if (Capacitor.isNativePlatform()) {
      NativeAudio.stop({ assetId: 'chuong_aloshipp' }).catch(e => {});
    }
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e){}
      try { sourceNodeRef.current.disconnect(); } catch(e){}
      sourceNodeRef.current = null;
    }
    if (fallbackAudioRef.current) {
      try { 
        fallbackAudioRef.current.pause(); 
        fallbackAudioRef.current.currentTime = 0; 
      } catch(e){}
      fallbackAudioRef.current = null;
    }
  }, []);

  const startAlarm = useCallback(() => {
    if (intervalRef.current) return; // Nếu đang kêu rồi thì bỏ qua để chống nhiễu (double-call)
    stopAlarm();

    // Set timeout ngay lập tức để block các lệnh gọi đồng thời khác
    intervalRef.current = setTimeout(() => { stopAlarm(); }, 30000);

    const playWebAudio = () => {
        if (audioCtxRef.current && audioBufferRef.current) {
            if (audioCtxRef.current.state !== 'running') {
                audioCtxRef.current.resume();
            }
            const source = audioCtxRef.current.createBufferSource();
            source.buffer = audioBufferRef.current;
            source.connect(audioCtxRef.current.destination);
            source.loop = true;
            source.start(0);
            sourceNodeRef.current = source;
        } else {
            try { 
              const audio = new Audio('/chuong.mp3');
              audio.loop = true;
              audio.play().catch(e => console.error('Audio play blocked:', e));
              fallbackAudioRef.current = audio;
            } catch(e) {}
        }
    };
    
    if (Capacitor.isNativePlatform()) {
        NativeAudio.loop({ assetId: 'chuong_aloshipp' })
          .catch(e => {
              console.log('Native play err, fallback to web', e);
              playWebAudio();
          });
          
        // Ép hệ điều hành phát ra âm thanh thông qua kênh Notification để chống tịt ngòi
        import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
            LocalNotifications.schedule({
              notifications: [{
                title: "🔥 ĐƠN HÀNG MỚI",
                body: "Vào ứng dụng kiểm tra ngay!",
                id: new Date().getTime(),
                schedule: { at: new Date(Date.now() + 100) },
                channelId: 'aloshipp_push_channel_v3'
              }]
            }).catch(() => {});
        });
    } else {
        playWebAudio();
    }
  }, [stopAlarm]);

  useEffect(() => {
    const handleStopEvent = () => {
      stopAlarm();
      setPushMessage(null);
    };
    window.addEventListener('stop_alarm_event', handleStopEvent);
    
    let lastOrderIds = new Map();
    const handleNewOrderEvent = (e) => {
       if (!driverRef.current?.isOnline) return;

       const order = e.detail;
       if (order && order._id) {
           // Ngăn hú đúp khi FCM và Socket cùng báo về 1 đơn (Chỉ chặn nếu cùng 1 đơn đến trong vòng 5 giây)
           if (lastOrderIds.has(order._id)) {
               const lastTime = lastOrderIds.get(order._id);
               if (Date.now() - lastTime < 5000) return;
           }
           lastOrderIds.set(order._id, Date.now());
           
           if (lastOrderIds.size > 20) {
               const firstKey = lastOrderIds.keys().next().value;
               lastOrderIds.delete(firstKey);
           }

           setPushMessage({ 
               title: '🔥 TING TING', 
               message: order.pickupAddress ? `Điểm đón: ${order.pickupAddress}` : 'Có Đơn Hàng Mới Cho Bạn!'
           });
       }

       // Luôn kích hoạt báo động không cần quan tâm đang ẩn hay mở
       startAlarm();
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

    const handleNearestAssign = (e) => {
        const order = e.detail;
        if (order) {
            setPushMessage({ 
                title: '🚀 ĐƠN MỚI GẦN BẠN', 
                message: order.pickupAddress ? `Điểm đón: ${order.pickupAddress}` : 'Bạn là tài xế gần nhất!'
            });
        }
        // Kích hoạt còi báo động cho đơn gán gần nhất
        startAlarm();
    };
    window.addEventListener('driver_nearest_order_assignment', handleNearestAssign);

    return () => {
      window.removeEventListener('stop_alarm_event', handleStopEvent);
      window.removeEventListener('driver_new_order', handleNewOrderEvent);
      window.removeEventListener('driver_order_accepted', handleStopEvent);
      window.removeEventListener('driver_order_cancelled', handleStopEvent);
      window.removeEventListener('driver_order_deleted_event', handleStopEvent);
      window.removeEventListener('driver_force_assigned', handleForceAssign);
      window.removeEventListener('driver_nearest_order_assignment', handleNearestAssign);
    };
  }, [startAlarm, stopAlarm]);

  useEffect(() => {
    // 1) Lắng nghe sự kiện từ axios interceptor
    const handleUnauthorized = (e) => {
      setLogoutAlert(e.detail?.message || 'Phiên đăng nhập không hợp lệ.');
    };
    window.addEventListener('api_unauthorized', handleUnauthorized);

    const handlePush = (e) => {
      // Nếu là sự kiện đơn mới thì FCM_foreground sẽ nổ trực tiếp driver_new_order để xử lý chung
      if (e.detail.title && e.detail.title.toUpperCase().includes('MỚI')) {
         // Truyền fake order id hoặc không truyền để xử lý fallback chuông,
         // Nếu Firebase có mang theo payload order id thì truyền vào, ở đây truyền rỗng tạm.
         window.dispatchEvent(new CustomEvent('driver_new_order', { detail: { pickupAddress: "Vào xem chi tiết ngay", _id: e.detail.orderId || null } })); 
      } else {
         setPushMessage({ title: e.detail.title, message: e.detail.body });
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
          LocalNotifications.createChannel({
            id: 'aloshipp_push_channel_v3',
            name: 'Kênh Báo Đơn 3KM (Push V3)',
            description: 'Kênh âm báo ưu tiên cho đơn hàng',
            importance: 5,
            visibility: 1,
            sound: 'chuong.mp3',
            vibration: true
          });
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
        const orderId = payload.data?.orderId || null;
        // Phát tín hiệu ra toàn App thay vì che màn hình ngay
        window.dispatchEvent(new CustomEvent('fcm_foreground_alert', { detail: { title, body, orderId } }));
      });

      socketRef.current = io(SOCKET_URL, { 
        transports: ['polling', 'websocket'],
        auth: { token: localStorage.getItem('driver_token') }
      });
      window.driverSocket = socketRef.current;
      
      socketRef.current.emit('driver_join', driver._id || driver.id);

      socketRef.current.on('force_logout', (data) => {
        setLogoutAlert(data.message || 'Tài khoản của bạn đã được đăng nhập ở thiết bị khác!');
      });

      socketRef.current.on('driver_status_updated', (data) => {
        if (data.status === 'active') {
          setPushMessage({
            title: '🎉 CHÚC MỪNG',
            message: 'Admin đã duyệt! Bạn đã trở thành tài xế chính thức của AloShipp và có thể nhận đơn ngay.'
          });
          loadProfile(); // Tải lại thông tin để mở khóa nút Online
        } else if (data.status === 'banned') {
          setLogoutAlert('Tài khoản của bạn đã bị khóa bởi Admin!');
        }
      });

      socketRef.current.on('driver_deleted', () => {
        setLogoutAlert('Tài khoản của bạn đã bị xóa khỏi hệ thống!');
      });

      const forwardEvents = ['new_order', 'order_accepted', 'order_cancelled', 'order_picked_up', 'order_delivering', 'order_completed', 'wallet_updated', 'debt_updated', 'order_deleted_event', 'refresh_orders_data', 'order_updated', 'force_assigned', 'nearest_order_assignment'];
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
      {forceUpdateConfig && <ForceUpdateModal config={forceUpdateConfig} />}
      <div className="h-[100dvh] w-full relative overflow-hidden bg-gray-50">
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={driver ? <Navigate to="/" /> : <AnimatedPage direction={direction}><Login /></AnimatedPage>} />
          <Route path="/register" element={driver ? <Navigate to="/" /> : <AnimatedPage direction={direction}><Register /></AnimatedPage>} />
          <Route path="/" element={<PrivateRoute><AnimatedPage direction={direction}><Home /></AnimatedPage></PrivateRoute>} />
          <Route path="/order/:id" element={<PrivateRoute><AnimatedPage direction={direction}><OrderDetail /></AnimatedPage></PrivateRoute>} />
          <Route path="/my-orders" element={<PrivateRoute><AnimatedPage direction={direction}><MyOrders /></AnimatedPage></PrivateRoute>} />
          <Route path="/earnings" element={<PrivateRoute><AnimatedPage direction={direction}><Earnings /></AnimatedPage></PrivateRoute>} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/privacy-policy.html" element={<PrivacyPolicy />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AnimatePresence>

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
      <NearestOrderPopup />
    </div>
    </>
  );
}

export default function App() {
  return <AppContent />;
}
