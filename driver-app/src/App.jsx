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
import { Haptics } from '@capacitor/haptics';
import { GpsProvider } from './context/GpsContext';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'https://api.aloshipp.com';

class SilentWebAudioPlayer {
  constructor(url) {
    this.url = url;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.buffer = null;
    this.source = null;
    this.paused = true;
    this.muted = false;
    this.currentTime = 0;

    fetch(url)
      .then(res => res.arrayBuffer())
      .then(buf => this.ctx.decodeAudioData(buf))
      .then(decoded => { this.buffer = decoded; })
      .catch(e => console.error('SilentWebAudioPlayer decode error', e));
  }

  async play() {
    if (!this.buffer) return;
    if (!this.paused) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.loop = true;
    
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = this.muted ? 0 : 1;
    
    this.source.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    this.source.start(0);
    this.paused = false;
  }

  pause() {
    if (this.source && !this.paused) {
      try { this.source.stop(); } catch(e) {}
      this.source.disconnect();
      this.source = null;
    }
    this.paused = true;
  }
}
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
  const appStartTimeRef = useRef(Date.now());
  const lastPushTapTimeRef = useRef(0);
  
  const [forceUpdateConfig, setForceUpdateConfig] = useState(null);

  // Audio Alarm Global Array
  const fallbackAudioRef = useRef(null);
  const intervalRef = useRef(null);
  const lastResumeTimeRef = useRef(0);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        lastResumeTimeRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

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
      if (!fallbackAudioRef.current) {
        try {
          fallbackAudioRef.current = new SilentWebAudioPlayer('chuong.mp3');
        } catch (e) {
          console.error("Audio init error:", e);
        }
      }

      if (!window.html5Audio) {
          window.html5Audio = new Audio('chuong.mp3');
          window.html5Audio.loop = true;
      }

      if (Capacitor.isNativePlatform()) {
        try {
          await NativeAudio.preload({
              assetId: 'chuong_alarm',
              assetPath: Capacitor.getPlatform() === 'ios' ? 'chuong.mp3' : 'public/chuong.mp3',
              audioChannelNum: 1,
              isUrl: false
          });
        } catch (e) {
          console.error("NativeAudio preload error:", e);
        }
      }
    };
    
    initAudio();
    
    const unlockAudio = () => {
      if (fallbackAudioRef.current && fallbackAudioRef.current.paused) {
          fallbackAudioRef.current.muted = true; // Tắt tiếng để không bị ré lên khi chạm
          fallbackAudioRef.current.play().then(() => {
              fallbackAudioRef.current.pause();
              fallbackAudioRef.current.currentTime = 0;
              fallbackAudioRef.current.muted = false; // Trả lại tiếng bình thường
          }).catch(e => {});
      }
      
      if (window.html5Audio) {
          window.html5Audio.muted = true;
          window.html5Audio.play().then(() => {
              window.html5Audio.pause();
              window.html5Audio.currentTime = 0;
              window.html5Audio.muted = false;
          }).catch(e => {});
      }

      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };

    if (Capacitor.getPlatform() !== 'ios') {
      document.addEventListener('touchstart', unlockAudio, { passive: true });
      document.addEventListener('click', unlockAudio, { passive: true });
    }
    
    return () => {
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
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
      NativeAudio.stop({ assetId: 'chuong_alarm' }).catch(e => {});
    }
    if (fallbackAudioRef.current) {
      try { 
        fallbackAudioRef.current.pause(); 
        fallbackAudioRef.current.currentTime = 0; 
      } catch(e){}
    }
    if (window.html5Audio) {
      try {
        window.html5Audio.pause();
        window.html5Audio.currentTime = 0;
      } catch(e){}
    }
  }, []);

  const startAlarm = useCallback(() => {
    if (intervalRef.current) return; // Nếu đang kêu rồi thì bỏ qua để chống nhiễu (double-call)
    if (Date.now() - lastPushTapTimeRef.current < 5000) {
        console.log("Bỏ qua startAlarm vì user vừa bấm Push Notification");
        return;
    }
    stopAlarm();

    // Set timeout ngay lập tức để block các lệnh gọi đồng thời khác
    intervalRef.current = setTimeout(() => { stopAlarm(); }, 30000);

    const playAudio = async () => {
        if (document.visibilityState === 'visible') {
            if (Capacitor.isNativePlatform()) {
                Haptics.vibrate({ duration: 1000 }).catch(e => {});
                if (Capacitor.getPlatform() === 'ios') {
                    NativeAudio.loop({ assetId: 'chuong_alarm' }).catch(e => {
                        console.error('NativeAudio play blocked, falling back to HTML5:', e);
                        if (fallbackAudioRef.current) {
                            fallbackAudioRef.current.play().catch(console.error);
                        }
                    });
                } else {
                    // Android: Bypass NativeAudio (SoundPool) which fails silently on large MP3 files.
                    // WebView is already configured in MainActivity to allow media playback without gesture.
                    if (fallbackAudioRef.current) {
                        fallbackAudioRef.current.play().catch(console.error);
                    }
                    if (window.html5Audio) {
                        window.html5Audio.play().catch(e => console.log('HTML5 audio play failed', e));
                    }
                }
            } else {
                if (fallbackAudioRef.current) {
                    fallbackAudioRef.current.play().catch(console.error);
                }
                if (window.html5Audio) {
                    window.html5Audio.play().catch(e => console.log('HTML5 audio play failed', e));
                }
            }
        }
    };
    
    playAudio();
  }, [stopAlarm]);

  useEffect(() => {
    let lastOrderIds = new Map();
    
    const handleStopEvent = (e) => {
      stopAlarm();
      setPushMessage(null);
      // Xóa orderId khỏi lịch sử để nếu Admin phát lại ngay lập tức thì vẫn kêu chuông
      const orderId = e?.detail?._id || e?.detail?.id;
      if (orderId && lastOrderIds.has(orderId)) {
        lastOrderIds.delete(orderId);
      }
    };
    window.addEventListener('stop_alarm_event', handleStopEvent);
    
    const handleNewOrderEvent = (e) => {
       if (!driverRef.current?.isOnline) return;

       const order = e.detail;
       if (order && order._id) {
           // Ngăn hú đúp khi FCM và Socket cùng báo về 1 đơn
           // Đã bỏ delay ở Backend nên Socket và FCM sẽ nổ cách nhau chỉ vài mili-giây, giảm xuống 1.5s là an toàn
           if (lastOrderIds.has(order._id)) {
               const lastTime = lastOrderIds.get(order._id);
               if (Date.now() - lastTime < 1500) return;
           }
           lastOrderIds.set(order._id, Date.now());
           
           if (lastOrderIds.size > 20) {
               const firstKey = lastOrderIds.keys().next().value;
               lastOrderIds.delete(firstKey);
           }

           setPushMessage({ 
               title: '🔥 TING TING', 
               message: order.isDummy ? 'Có Đơn Hàng Mới Cho Bạn!' : (order.pickupAddress ? `Điểm đón: ${order.pickupAddress}` : 'Có Đơn Hàng Mới Cho Bạn!')
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
            if (lastOrderIds.has(order._id)) {
                if (Date.now() - lastOrderIds.get(order._id) < 1500) return;
            }
            lastOrderIds.set(order._id, Date.now());

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
            if (lastOrderIds.has(order._id)) {
                if (Date.now() - lastOrderIds.get(order._id) < 1500) return;
            }
            lastOrderIds.set(order._id, Date.now());

            setPushMessage({ 
                title: order.isVipAssigning ? '⭐ ĐƠN HÀNG ƯU TIÊN' : '🚀 ĐƠN MỚI GẦN BẠN', 
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
      if (Date.now() - appStartTimeRef.current < 5000) {
         console.log("Bỏ qua FCM push lúc khởi động app");
         return;
      }
      if (Date.now() - lastResumeTimeRef.current < 2000) {
         console.log("Bỏ qua FCM push do OS flush khi app vừa resume");
         return;
      }
      // Nếu là sự kiện đơn mới thì FCM_foreground sẽ nổ trực tiếp driver_new_order để xử lý chung
      // Dù tiêu đề là gì (Gán đơn, Đơn mới, Điều phối), cứ có Push tới là bắt App tải lại data ngầm cho chắc
      window.dispatchEvent(new CustomEvent('driver_new_order', { detail: { pickupAddress: "Vào xem chi tiết ngay", _id: e.detail.orderId || null, isDummy: true } }));
      
      if (!e.detail.title || !e.detail.title.toUpperCase().includes('MỚI')) {
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
            id: 'aloshipp_push_channel_v8',
            name: 'Kênh Báo Đơn Trong App',
            description: 'Kênh âm báo ưu tiên cho đơn hàng',
            importance: 5,
            visibility: 1,
            sound: Capacitor.getPlatform() === 'ios' ? 'chuong.mp3' : 'chuong',
            vibration: true
          });
          LocalNotifications.createChannel({
            id: 'aloshipp_push_channel_v9',
            name: 'Kênh Báo Đơn Ngoài App',
            description: 'Kênh âm báo ưu tiên cho đơn hàng (FCM)',
            importance: 5,
            visibility: 1,
            sound: Capacitor.getPlatform() === 'ios' ? 'thongbaongoaiapp.mp3' : 'thongbaongoaiapp',
            vibration: true
          });
        LocalNotifications.addListener('localNotificationActionPerformed', () => {
          lastPushTapTimeRef.current = Date.now();
          window.dispatchEvent(new CustomEvent('stop_alarm_event'));
        });
      }).catch(console.error);

      import('@capacitor-firebase/messaging').then(({ FirebaseMessaging }) => {
        FirebaseMessaging.createChannel({
            id: 'aloshipp_push_channel_v9',
            name: 'Kênh Báo Đơn Ngoài App',
            description: 'Kênh âm báo ưu tiên cho đơn hàng (FCM)',
            importance: 5,
            visibility: 1,
            sound: Capacitor.getPlatform() === 'ios' ? 'thongbaongoaiapp.mp3' : 'thongbaongoaiapp',
            vibration: true
        }).catch(e => console.log('FCM createChannel error:', e));
        FirebaseMessaging.addListener('notificationActionPerformed', () => {
          lastPushTapTimeRef.current = Date.now();
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
  return (
    <GpsProvider>
      <AppContent />
    </GpsProvider>
  );
}
