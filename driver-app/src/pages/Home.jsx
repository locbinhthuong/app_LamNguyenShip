import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import DriverProfileModal from '../components/DriverProfileModal';
import { getAvailableOrders, acceptOrder, getMyOrders, updateMyProfile, getFullImageUrl, getDriverRevenue } from '../services/api';
import api from '../services/api';
import { requestFirebaseToken } from '../utils/firebase';
import { Capacitor, registerPlugin } from '@capacitor/core';
const BackgroundGeolocation = registerPlugin("BackgroundGeolocation");

const STATUS_CONFIG = {
  ACCEPTED: { label: 'Đã nhận', color: 'bg-blue-500', textColor: 'text-blue-400' },
  PICKED_UP: { label: 'Đã lấy hàng', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
  DELIVERING: { label: 'Đang giao', color: 'bg-blue-600', textColor: 'text-blue-600' },
  COMPLETED: { label: 'Hoàn thành', color: 'bg-green-500', textColor: 'text-green-400' },
  CANCELLED: { label: 'Đã hủy', color: 'bg-red-500', textColor: 'text-red-400' }
};

const getServiceBadge = (order) => {
  if (order.serviceType === 'DAT_XE') {
    if (order.subServiceType === 'XE_OM') return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200">🛵 CHỞ KHÁCH</span>;
    if (order.subServiceType === 'LAI_HO_XE_MAY') return <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-[10px] font-bold border border-teal-200">🔑 LÁI HỘ XE MÁY</span>;
    if (order.subServiceType === 'LAI_HO_OTO') return <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-200">🚗 LÁI HỘ ÔTÔ</span>;
    return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200">🛵 ĐẶT XE</span>;
  }
  if (order.serviceType === 'DIEU_PHOI') {
    if (order.subServiceType === 'NAP_TIEN') return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200">🏦 NẠP TIỀN</span>;
    if (order.subServiceType === 'RUT_TIEN') return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-200">💵 RÚT TIỀN</span>;
    return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-200">🛠️ ĐIỀU PHỐI</span>;
  }
  if (order.serviceType === 'MUA_HO') {
    return <span className="bg-lime-100 text-lime-700 px-2 py-0.5 rounded text-[10px] font-bold border border-lime-200">🛒 MUA HỘ</span>;
  }
  return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-200">📦 GIAO HÀNG</span>;
};

function OrderCard({ order, onAccept, loading }) {
  const navigate = useNavigate();

  const handleAccept = async () => {
    await onAccept(order._id);
  };

  return (
    <div className="card mb-3" onClick={() => navigate(`/order/${order._id}`)}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 line-clamp-1">{order.orderCode || order._id?.slice(-8).toUpperCase()}</span>
          <div>{getServiceBadge(order)}</div>
        </div>
        <span className="text-sm font-bold text-blue-600">
          {order.codAmount?.toLocaleString()}đ COD
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <span className="text-green-400 mt-1">{order.serviceType === 'DAT_XE' ? '📍' : '📦'}</span>
          <div className="flex-1">
            <p className="text-xs text-slate-500">{order.serviceType === 'DAT_XE' ? 'Điểm đón' : order.serviceType === 'DIEU_PHOI' ? 'Gặp mặt tại' : 'Lấy hàng'}</p>
            <p className="text-sm text-slate-800 font-medium line-clamp-2">{order.pickupAddress}</p>
          </div>
        </div>
        {order.serviceType !== 'DIEU_PHOI' && (
          <div className="flex items-start gap-2">
            <span className="text-red-400 mt-1">🏁</span>
            <div className="flex-1">
              <p className="text-xs text-slate-500">{order.serviceType === 'DAT_XE' ? 'Điểm đến' : 'Giao hàng'}</p>
              <p className="text-sm text-slate-800 font-medium line-clamp-2">{order.deliveryAddress}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-col gap-1 text-sm text-slate-500 sm:flex-row sm:justify-between">
        <span className="truncate">👤 {order.customerName}</span>
        <span className="shrink-0">📞 {order.customerPhone}</span>
      </div>

      {order.note && (
        <div className="bg-slate-700 rounded-lg p-2 mb-3 text-xs text-yellow-300">
          📝 {order.note}
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5 mt-2 border-t border-slate-100 pt-3">
        <span className="text-green-600 font-black text-sm w-full text-center tracking-wide">
          💵 GIÁ CƯỚC: +{order.deliveryFee?.toLocaleString()}đ
        </span>
        {order.adminBonus > 0 && (
          <span className="text-emerald-600 font-black text-xs w-full text-center tracking-wide bg-emerald-50 py-1 rounded-md">
            🎁 THƯỞNG VÍ: +{order.adminBonus?.toLocaleString()}đ
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onAccept(); }}
          disabled={loading}
          className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold py-3 w-full text-[15px] rounded-xl shadow-md transition-all uppercase tracking-wider disabled:opacity-50"
        >
          {loading ? 'Đang xử lý...' : 'NHẬN ĐƠN NGAY'}
        </button>
      </div>
    </div>
  );
}

function ActiveOrderCard({ order, onAction, loading }) {
  const navigate = useNavigate();
  const config = STATUS_CONFIG[order.status] || {};

    const getNextAction = () => {
    switch (order.status) {
      case 'ACCEPTED':
        return { label: order.serviceType === 'DAT_XE' ? '🚙 Đã đón khách' : order.serviceType === 'MUA_HO' ? '🛒 Đã mua hàng' : '📦 Đã lấy hàng', action: 'pickup', color: 'btn-warning' };
      case 'PICKED_UP':
        return { label: order.serviceType === 'DAT_XE' ? '✅ Đã trả khách' : '✅ Hoàn thành', action: 'complete', color: 'btn-success' };
      case 'DELIVERING':
        return { label: order.serviceType === 'DAT_XE' ? '✅ Đã trả khách' : '✅ Hoàn thành', action: 'complete', color: 'btn-success' };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-4 mb-4 shadow-xl" onClick={() => navigate(`/order/${order._id}`)}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-slate-800 bg-white/50 px-2 py-0.5 rounded inline-block text-xs">{order.orderCode || order._id?.slice(-8).toUpperCase()}</span>
          <div className="mt-0.5">{getServiceBadge(order)}</div>
        </div>
        <span className={`status-badge ${config.color} text-slate-800`}>{config.label}</span>
      </div>

      <div className="space-y-1 mb-3">
        <p className="text-sm text-green-100">
          <span className="opacity-70">{order.serviceType === 'DAT_XE' ? 'Đón:' : order.serviceType === 'DIEU_PHOI' ? 'Gặp:' : order.serviceType === 'MUA_HO' ? 'Mua tại:' : 'Lấy:'}</span> {order.pickupAddress?.slice(0, 40)}...
        </p>
        {order.serviceType !== 'DIEU_PHOI' && (
          <p className="text-sm text-green-100">
            <span className="opacity-70">{order.serviceType === 'DAT_XE' ? 'Đến:' : 'Giao:'}</span> {order.deliveryAddress?.slice(0, 40)}...
          </p>
        )}
      </div>

      <div className="flex justify-between items-center mb-2">
        <span className="text-green-200 text-sm">👤 {order.customerName}</span>
        <a href={`tel:${order.customerPhone}`} onClick={(e) => e.stopPropagation()} className="bg-white/20 px-3 py-1 rounded-full text-sm">
          📞 Gọi
        </a>
      </div>
      
      {order.adminBonus > 0 && (
        <div className="mb-2 bg-emerald-500/30 rounded-lg p-2 text-center border border-emerald-400/50">
           <span className="text-white font-bold text-xs tracking-wide">🎁 ĐƯỢC THƯỞNG VÍ: +{order.adminBonus?.toLocaleString()}đ</span>
        </div>
      )}

      {nextAction && (
        <button
          onClick={(e) => { e.stopPropagation(); onAction(order._id, nextAction.action); }}
          disabled={loading}
          className={`${nextAction.color} mt-3 py-2 text-white font-bold w-full rounded-xl`}
        >
          {loading ? 'Đang xử lý...' : nextAction.label}
        </button>
      )}
    </div>
  );
}

export default function Home() {
  const { driver, setOnline, logout } = useAuth();
  const navigate = useNavigate();
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myActiveOrders, setMyActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter] = useState('available');
  const [showToast, setShowToast] = useState(null);
  const [logoutModal, setLogoutModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [confirmAcceptOrder, setConfirmAcceptOrder] = useState(null); // ID đơn hàng đang được hỏi Xác Nhận
  const [historyOrders, setHistoryOrders] = useState([]);
  const scrollRef = useRef(null);
  const [dailyStats, setDailyStats] = useState({ fee: 0, orders: 0 });

  // GPS Tracking States
  const [gpsStatus, setGpsStatus] = useState('OFF'); // OFF | FINDING | TRACKING | ERROR
  const watchIdRef = useRef(null);
  const [isToggling, setIsToggling] = useState(false); // Ngăn chống spam nút

  // WAKELOCK (Chống tắt màn hình)
  const wakeLockRef = useRef(null);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          console.log('WakeLock bị nhả (Màn hình có thể tắt)');
        });
        console.log('WakeLock kích hoạt: Đã ép sáng màn hình!');
      } catch (err) {
        console.error('WakeLock Error:', err);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current !== null) {
      wakeLockRef.current.release()
        .then(() => { wakeLockRef.current = null; })
        .catch(console.error);
    }
  };

  // Khôi phục WakeLock nếu Tài xế vuốt ẩn App rồi mở lại (Hệ điều hành tự cắt WakeLock khi ẩn)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && driver?.isOnline) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [driver?.isOnline]);

  // VŨ KHÍ HẠNG NẶNG: Định vị Background Ngầm (Chỉ kích hoạt nếu là App Native Android/iOS, Web thì xài GPS thường)
  const startGpsTracking = (onSuccess, onError) => {
    if (Capacitor.isNativePlatform()) {
      BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: "Ứng dụng đang lấy vị trí ngầm...",
          backgroundTitle: "AloShipp Định Vị Xe",
          requestPermissions: true,
          stale: false,
          distanceFilter: 3 // Chỉ quét khi xe di chuyển xấp xỉ 3 mét
        },
        (location, error) => {
          if (error) {
            if (error.code === "NOT_AUTHORIZED") {
              console.error("KHÔNG ĐƯỢC CẤP QUYỀN CHẠY NGẦM", error);
            }
            onError(error);
            return;
          }
          if (location) {
            onSuccess({ coords: { latitude: location.latitude, longitude: location.longitude } });
          }
        }
      ).then((watcherId) => {
        // watcherId ở đây là một String
        watchIdRef.current = watcherId;
      }).catch(onError);
    } else {
      // Bản Web - Đã bị ép sáng màn hình bởi WakeLock
      watchIdRef.current = navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }
  };

  const stopGpsTracking = () => {
    if (watchIdRef.current !== null) {
      if (Capacitor.isNativePlatform()) {
        BackgroundGeolocation.removeWatcher({ id: watchIdRef.current });
      } else {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    }
  };

  const toggleGPS = () => {
    if (isToggling) return;
    setIsToggling(true);
    setTimeout(() => setIsToggling(false), 800); // Khóa nút 800ms chống spam

    if (gpsStatus !== 'OFF' || !driver?.isOnline) {
      // Tắt GPS
      releaseWakeLock(); // Trả màn hình về bình thường
      stopGpsTracking();
      if (gpsStatus !== 'OFF') {
        if (window.driverSocket && window.driverSocket.connected) {
          window.driverSocket.emit('stop_location');
        }
        showNotification('Đã tắt chia sẻ vị trí', 'error');
      }
      setGpsStatus('OFF');
      return;
    }

    if (!Capacitor.isNativePlatform() && !navigator.geolocation) {
      showNotification('Thiết bị không hỗ trợ định vị GPS', 'error');
      setGpsStatus('ERROR');
      return;
    }

    setGpsStatus('FINDING');
    startGpsTracking(
      (pos) => {
        setGpsStatus('TRACKING');
        requestWakeLock(); // Ép sáng màn hình khi bắt đầu tracking
        if (window.driverSocket && window.driverSocket.connected) {
          window.driverSocket.emit('update_location', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        }
      },
      (err) => {
        setGpsStatus('ERROR');
        showNotification('Lỗi cấp quyền: Cần bật Vị Trí (Location/Luôn Luôn)!', 'error');
      }
    );
  };

  // Tự động quản lý Bật/Tắt định vị dựa theo trạng thái Online của Tài Xế
  useEffect(() => {
    // 1. Tự động bật GPS nếu Tài xế đang Online (Ví dụ: Lúc mới Load/Refresh trang)
    if (driver?.isOnline && gpsStatus === 'OFF' && watchIdRef.current === null) {
      if (!Capacitor.isNativePlatform() && !navigator.geolocation) {
        setGpsStatus('ERROR');
        return;
      }
      setGpsStatus('FINDING');

      const handleSuccess = (pos) => {
        setGpsStatus('TRACKING');
        requestWakeLock(); // Ép sáng màn hình
        if (window.driverSocket && window.driverSocket.connected) {
          window.driverSocket.emit('update_location', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        }
      };

      const handleError = (err) => {
        console.error("GPS Error:", err);
        setGpsStatus('ERROR');
      };

      // Gọi Get ngay lập tức để lấy tín hiệu đầu tiên (khắc phục lỗi xoay hoài lúc mới load trên web)
      if (!Capacitor.isNativePlatform()) {
        navigator.geolocation.getCurrentPosition(handleSuccess, handleError, { 
          enableHighAccuracy: true, timeout: 5000, maximumAge: 0 
        });
      }

      // Sau đó khởi động máy quét liên tục Chạy Ngầm (Native) hoặc Web
      startGpsTracking(handleSuccess, handleError);
    } 
    // 2. Tự động tắt GPS, huỷ vệ tinh nếu chuyển sang trạng thái Offline
    else if (!driver?.isOnline && gpsStatus !== 'OFF') {
      releaseWakeLock(); // Nhả màn hình
      stopGpsTracking(); // Chặn background Service nếu là AppNative
      setGpsStatus('OFF');
      // Đảm bảo Máy chủ nhận được lệnh xóa cục GPS cuối cùng trên Bản đồ
      if (window.driverSocket && window.driverSocket.connected) {
        window.driverSocket.emit('stop_location');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.isOnline]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [available, myAllRes] = await Promise.all([
        getAvailableOrders(),
        getMyOrders() // Lấy toàn bộ, filter trên Client vì backend không hỗ trợ list param
      ]);
      setAvailableOrders(Array.isArray(available.data) ? available.data : []);
      
      const allMyOrders = Array.isArray(myAllRes.data) ? myAllRes.data : [];
      let activeArr = allMyOrders.filter(o => ['ACCEPTED', 'PICKED_UP', 'DELIVERING'].includes(o.status));
      
      const statusWeight = { 'DELIVERING': 3, 'PICKED_UP': 2, 'ACCEPTED': 1 };
      
      activeArr.sort((a, b) => {
         const w1 = statusWeight[a.status] || 0;
         const w2 = statusWeight[b.status] || 0;
         if (w1 !== w2) return w2 - w1;
         return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
      setMyActiveOrders(activeArr);
      
      const historyArr = allMyOrders.filter(o => ['COMPLETED', 'CANCELLED'].includes(o.status)).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 15);
      setHistoryOrders(historyArr);

      // Nạp Doanh thu nóng trong ngày
      const revenueRes = await getDriverRevenue();
      if (revenueRes.success && revenueRes.data) {
        // Tìm biểu đồ của đúng hôm nay
        const todayLabel = new Date().toLocaleDateString('vi-VN', { weekday: 'short' }).replace(/^T/, 'T');
        const todayStats = revenueRes.data.chartData?.find(c => c.label === todayLabel) || { fee: 0, orders: 0 };
        // Hoặc tính từ recentOrders nếu an toàn hơn, nhưng DailyFee đã có sẵn từ backend
        setDailyStats({
          fee: revenueRes.data.dailyFee || 0,
          orders: todayStats.orders || 0
        });
      }

    } catch (error) {
      console.error('Lỗi lấy dữ liệu trang chủ:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Xin quyền Push Notification mồi (Dùng cho Notification Native lúc Màn hình chạy ngầm)
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
        LocalNotifications.requestPermissions();
      }).catch(console.error);
    }
    
    return () => {
      releaseWakeLock();
      stopGpsTracking();
    };
  }, []);

  const showNotification = (message, type = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };



  useEffect(() => {
    loadData();
    // Giảm tần suất Polling xuống 30s vì đã có Socket Realtime
    const interval = setInterval(loadData, 30000);

    const handleNewOrder = () => {
       loadData();
       // Global Alarm in App.jsx tự động lo khoản chuông
       
       if (Capacitor.isNativePlatform()) {
          import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
            LocalNotifications.schedule({
              notifications: [
                {
                  title: "HỆ THỐNG ĐIỀU PHỐI",
                  body: "🔔 CÓ ĐƠN HÀNG MỚI! Bấm vào đây để xem và giật đơn ngay!",
                  id: Math.floor(Math.random() * 1000000),
                  schedule: { at: new Date(Date.now() + 100) },
                  sound: null,
                  smallIcon: "ic_stat_icon_config_sample",
                }
              ]
            });
          }).catch(console.error);
       }
    };

    const handleOrderLost = (e) => {
      const orderId = typeof e?.detail === 'string' ? e.detail : e?.detail?._id;
      if (orderId) {
        setAvailableOrders(prev => prev.filter(o => o._id !== orderId));
        setMyActiveOrders(prev => prev.filter(o => o._id !== orderId));
      }
      loadData();
    };

    const handleOrderAccepted = (e) => {
      const orderId = typeof e?.detail === 'string' ? e.detail : e?.detail?._id;
      if (orderId) {
        setAvailableOrders(prev => prev.filter(o => o._id !== orderId));
      }
      loadData();
    };

    window.addEventListener('driver_new_order', handleNewOrder);
    window.addEventListener('driver_order_accepted', handleOrderAccepted);
    window.addEventListener('driver_order_cancelled', handleOrderLost);
    window.addEventListener('order_deleted_event', handleOrderLost);
    window.addEventListener('driver_order_picked_up', loadData);
    window.addEventListener('driver_order_delivering', loadData);
    window.addEventListener('driver_order_completed', loadData);

    return () => {
      clearInterval(interval);
      window.removeEventListener('driver_new_order', handleNewOrder);
      window.removeEventListener('driver_order_accepted', handleOrderAccepted);
      window.removeEventListener('driver_order_cancelled', handleOrderLost);
      window.removeEventListener('order_deleted_event', handleOrderLost);
      window.removeEventListener('driver_order_picked_up', loadData);
      window.removeEventListener('driver_order_delivering', loadData);
      window.removeEventListener('driver_order_completed', loadData);
    };
  }, [loadData]);

  const handleAccept = async () => {
    if (!confirmAcceptOrder) return;
    const orderId = confirmAcceptOrder;
    setConfirmAcceptOrder(null);

    if (actionLoading) return; // Chặn bấm đúp Spam mạng
    setActionLoading(orderId);
    try {
      window.dispatchEvent(new CustomEvent('stop_alarm_event'));
      await acceptOrder(orderId);
      showNotification('Nhận đơn thành công!');
      await loadData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Không thể nhận đơn', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (orderId, action) => {
    if (actionLoading) return; // Chặn bấm đúp nhiều lần Giao Xong
    setActionLoading(orderId);
    try {
      const actions = {
        pickup: async () => { const { pickedUpOrder } = await import('../services/api'); return pickedUpOrder(orderId); },
        complete: async () => { const { completeOrder } = await import('../services/api'); return completeOrder(orderId); }
      };
      await actions[action]();
      showNotification('Cập nhật thành công!');
      await loadData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleOnline = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      const newStatus = !driver?.isOnline;
      await setOnline(newStatus);
      showNotification(newStatus ? 'Bạn đang ONLINE - Nhận đơn ngay!' : 'Bạn đã OFFLINE');
      // Request push when going online
      if (newStatus) {
        try {
          const token = await requestFirebaseToken();
          if (token) {
            await api.post('/api/auth/fcm-token', { token });
          }
        } catch (e) {
          console.error("Push Token Error:", e);
        }
      }
    } finally {
      setTimeout(() => setIsToggling(false), 800);
    }
  };

  const handleUpdateProfile = async (data) => {
    try {
      await updateMyProfile(data);
      showNotification('Cập nhật hồ sơ thành công!');
      setEditModal(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Lỗi cập nhật', 'error');
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50 overflow-hidden relative">
      {/* Toast */}
      {showToast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg text-white font-medium ${
          showToast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {showToast.message}
        </div>
      )}

      {/* Header Siêu Gọn */}
      <div className="shrink-0 bg-gradient-to-r from-blue-600 to-blue-800 p-2 sm:p-3 pt-[max(1rem,env(safe-area-inset-top))] shadow-md relative z-20">
        <div className="flex items-center justify-between gap-2">
          {/* Cụm trái: Logo rút gọn + Tên Tài xế */}
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">🚚</span>
            <div 
              onClick={() => setEditModal(true)}
              className="flex items-center gap-2 bg-white/10 p-1 pr-3 rounded-full cursor-pointer hover:bg-white/20 transition-all active:scale-95 group"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border border-white/50 shadow-sm relative">
                {driver?.avatar ? (
                  <img src={getFullImageUrl(driver.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-blue-500">
                    {driver?.name?.charAt(0).toUpperCase() || '👤'}
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight truncate max-w-[100px] sm:max-w-[150px]">{driver?.name || 'Tài xế'}</p>
                <p className="text-[9px] text-blue-200 mt-0.5">{driver?.driverCode || 'Xem'}</p>
              </div>
            </div>
          </div>

          {/* Cụm phải: Nút Gộp Online + GPS + Đăng Xuất */}
          <div className="flex shrink-0 gap-1.5 items-center">
            <button
              type="button"
              onClick={toggleOnline}
              disabled={isToggling}
              className={`rounded-full px-3 py-1.5 text-[11px] sm:text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 min-w-[110px] justify-center ${
                driver?.isOnline 
                  ? (gpsStatus === 'TRACKING' ? 'bg-green-500 text-white border border-green-400' 
                     : gpsStatus === 'FINDING' ? 'bg-yellow-500 text-slate-900 border border-yellow-400 animate-pulse'
                     : 'bg-red-500 text-white') 
                  : 'bg-slate-600 text-slate-300'
              } ${isToggling ? 'opacity-70 cursor-wait' : ''}`}
            >
              {driver?.isOnline ? (
                <>
                  {gpsStatus === 'TRACKING' ? '🟢 Online (GPS Tốt)' : gpsStatus === 'FINDING' ? '⏳ Đang dò GPS...' : '🔴 Lỗi Vị trí'}
                </>
              ) : '⚫ Mở Nhận Đơn'}
            </button>
            <button
              onClick={() => setLogoutModal(true)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 text-xs"
            >
              🚪
            </button>
          </div>
        </div>
      </div>

      <div className="shrink-0 w-full bg-gradient-to-b from-blue-700 to-blue-600 p-2 pb-3 shadow-inner relative z-10 flex justify-center">

        {/* Cặp Thống kê Doanh Số Ngày Thay Vì Đơn Cũ */}
        <div className="mt-2 grid grid-cols-2 gap-3 w-full max-w-sm px-2">
          <div className="rounded-xl bg-white/20 p-2 sm:p-3 text-center text-white border border-white/10 shadow-sm backdrop-blur-sm">
            <p className="text-[11px] opacity-80 uppercase font-semibold tracking-wider mb-1 text-blue-100">Đã Hoàn Thành</p>
            <p className="text-xl sm:text-2xl font-black drop-shadow-sm">{dailyStats.orders}</p>
            <p className="text-[9px] mt-0.5 opacity-60">hôm nay</p>
          </div>
          <div className="rounded-xl bg-white/20 p-2 sm:p-3 text-center text-white border border-white/10 shadow-sm backdrop-blur-sm">
            <p className="text-[11px] opacity-80 uppercase font-semibold tracking-wider mb-1 text-blue-100">Thu Nhập Tạm Tính</p>
            <p className="text-xl sm:text-2xl font-black text-green-300 drop-shadow-md">
               {dailyStats.fee.toLocaleString()}<span className="text-xs ml-0.5 opacity-80">đ</span>
            </p>
            <p className="text-[9px] mt-0.5 opacity-60">chưa trừ 15%</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 sticky top-0 z-20 flex bg-white border-b border-slate-200 shadow-sm">
        <button
          type="button"
          onClick={() => { setFilter('available'); scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' }); }}
          className={`flex-1 py-3 text-xs font-bold transition-all sm:text-sm ${
            filter === 'available' ? 'border-b-2 border-blue-600 bg-blue-50/50 text-blue-600' : 'text-slate-500'
          }`}
        >
          📥 Chờ nhận ({availableOrders.length})
        </button>
        <button
          type="button"
          onClick={() => { setFilter('active'); scrollRef.current?.scrollTo({ left: window.innerWidth, behavior: 'smooth' }); }}
          className={`flex-1 py-3 text-xs font-bold transition-all sm:text-sm ${
            filter === 'active' ? 'border-b-2 border-blue-600 bg-blue-50/50 text-blue-600' : 'text-slate-500'
          }`}
        >
          🚚 Đang giao ({myActiveOrders.length})
        </button>
        <button
          type="button"
          onClick={() => { setFilter('history'); scrollRef.current?.scrollTo({ left: window.innerWidth * 2, behavior: 'smooth' }); }}
          className={`flex-1 py-3 text-xs font-bold transition-all sm:text-sm ${
            filter === 'history' ? 'border-b-2 border-blue-600 bg-blue-50/50 text-blue-600' : 'text-slate-500'
          }`}
        >
          📋 Lịch sử
        </button>
      </div>

      {/* Swipeable Content Container */}
      <div 
        ref={scrollRef}
        className="flex-1 w-full overflow-x-auto snap-x snap-mandatory hide-scrollbar flex items-start mb-[72px]"
        onScroll={(e) => {
          const w = e.target.offsetWidth;
          const idx = Math.round(e.target.scrollLeft / w);
          if (idx === 0 && filter !== 'available') setFilter('available');
          if (idx === 1 && filter !== 'active') setFilter('active');
          if (idx === 2 && filter !== 'history') setFilter('history');
        }}
      >
        
        {/* TAB 1: CHỜ NHẬN */}
        <div className="w-full h-full shrink-0 snap-center overflow-y-auto p-4" style={{ minWidth: '100%' }}>
          <div className="mx-auto max-w-lg p-4 sm:max-w-xl">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !driver?.isOnline ? (
              <div className="text-center py-12 bg-slate-100 rounded-2xl mt-4 border border-slate-200">
                <p className="text-5xl mb-3 grayscale opacity-80">😴</p>
                <p className="font-black text-slate-700 text-lg uppercase tracking-wide">Bạn đang Nghỉ / Offline</p>
                <p className="text-sm mt-2 text-slate-500 max-w-[250px] mx-auto">
                  Không thể nhìn thấy đơn hàng khi đang Offline.<br/><br/>
                  Hãy bật nút <b className="text-slate-800 bg-slate-200 px-2 py-1 rounded">⚫ Mở Nhận Đơn</b> phía trên để tiếp tục Cày cuốc!
                </p>
              </div>
            ) : availableOrders.length > 0 ? (
              <>
                <p className="text-slate-500 text-sm mb-3 font-medium">Có {availableOrders.length} đơn hàng chờ bạn</p>
                {availableOrders.map(order => (
                  <OrderCard key={order._id} order={order} onAccept={() => setConfirmAcceptOrder(order._id)} loading={actionLoading === order._id || confirmAcceptOrder === order._id} />
                ))}
              </>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p className="text-5xl mb-4">⏳</p>
                <p className="font-medium text-slate-600">Không có đơn hàng nào</p>
                <p className="text-sm mt-1">Đơn mới sẽ xuất hiện tại đây</p>
              </div>
            )}
          </div>
        </div>

        {/* TAB 2: ĐANG GIAO */}
        <div className="w-full h-full shrink-0 snap-center overflow-y-auto p-4" style={{ minWidth: '100%' }}>
          <div className="mx-auto max-w-lg p-4 sm:max-w-xl">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : myActiveOrders.length > 0 ? (
              <>
                <p className="text-slate-500 text-sm mb-3 font-medium">Đơn đang giao</p>
                {myActiveOrders.map(order => (
                  <ActiveOrderCard key={order._id} order={order} onAction={handleAction} loading={actionLoading === order._id} />
                ))}
              </>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p className="text-5xl mb-4">📦</p>
                <p className="font-medium text-slate-600">Chưa có đơn đang giao</p>
                <p className="text-sm mt-1">Nhận đơn mới ở tab "Chờ nhận"</p>
              </div>
            )}
          </div>
        </div>

        {/* TAB 3: LỊCH SỬ KHU TRÚ */}
        <div className="w-full h-full shrink-0 snap-center overflow-y-auto p-4" style={{ minWidth: '100%' }}>
          <div className="mx-auto max-w-lg p-4 sm:max-w-xl">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : historyOrders.length > 0 ? (
              <>
                <p className="text-slate-500 text-sm mb-3 font-medium">Lịch sử đơn (Gần đây nhất)</p>
                {historyOrders.map(order => (
                  <div key={order._id} className="bg-slate-200/50 rounded-2xl p-4 mb-3 border border-slate-200" onClick={() => navigate(`/order/${order._id}`)}>
                     <div className="flex justify-between items-center mb-2">
                       <span className="font-bold text-slate-600 text-xs">{order.orderCode || order._id.slice(-8).toUpperCase()}</span>
                       <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">{order.status === 'COMPLETED' ? 'Hoàn thành' : 'Đã hủy'}</span>
                     </div>
                     <p className="text-xs text-slate-500 truncate mb-1">📍 {order.pickupAddress}</p>
                     <p className="text-xs text-slate-500 truncate mb-2">🏁 {order.deliveryAddress}</p>
                     <div className="flex justify-between items-center mt-2 border-t border-slate-300 pt-2">
                        <span className="text-slate-600 text-xs font-bold">Cước: {order.deliveryFee?.toLocaleString()}đ</span>
                        <span className="text-[10px] text-slate-500">{new Date(order.updatedAt || order.createdAt).toLocaleDateString('vi-VN')}</span>
                     </div>
                  </div>
                ))}
                <button onClick={() => navigate('/my-orders')} className="w-full text-center py-3 text-blue-600 font-bold bg-blue-50 rounded-xl mt-2 active:bg-blue-100">
                  Xem toàn bộ thống kê
                </button>
              </>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p className="text-5xl mb-4">📋</p>
                <p className="font-medium text-slate-600">Chưa có lịch sử</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Nav */}
      <div className="bottom-nav-safe">
        <div className="mx-auto flex max-w-xl justify-around py-3 bg-white border-t border-slate-200">
          <Link to="/" className="flex flex-col items-center text-blue-600">
            <span className="text-xl">🏠</span>
            <span className="text-xs mt-1 font-medium">Trang chủ</span>
          </Link>
          <Link to="/my-orders" className="flex flex-col items-center text-slate-400 hover:text-slate-600 transition-colors">
            <span className="text-xl">📋</span>
            <span className="text-xs mt-1 font-medium">Đơn của tôi</span>
          </Link>
          <Link to="/earnings" className="flex flex-col items-center text-slate-400 hover:text-slate-600 transition-colors">
            <span className="text-xl">💰</span>
            <span className="text-xs mt-1 font-medium">Thu nhập</span>
          </Link>
        </div>
      </div>

      <DriverProfileModal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        driver={driver}
        onSave={handleUpdateProfile}
      />

      <ConfirmModal 
        isOpen={!!confirmAcceptOrder}
        title="Xác Nhận Nhận Đơn"
        message="Bạn có chắc chắn muốn lấy đơn này không?"
        confirmText="Xác nhận"
        cancelText="Hủy"
        onConfirm={() => { handleAccept(); }}
        onCancel={() => setConfirmAcceptOrder(null)}
      />

      <ConfirmModal 
        isOpen={logoutModal}
        title="Xác nhận đăng xuất"
        message="Phiên làm việc hiện tại của bạn sẽ bị kết thúc. Bạn có chắc chắn muốn thoát ra không?"
        onConfirm={() => { setLogoutModal(false); logout(); }}
        onCancel={() => setLogoutModal(false)}
        confirmText="Đăng xuất"
        isDestructive={true}
      />
    </div>
  );
}
