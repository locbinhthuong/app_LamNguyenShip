import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import DriverProfileModal from '../components/DriverProfileModal';
import { getAvailableOrders, acceptOrder, getMyOrders, updateMyProfile, getFullImageUrl, getDriverRevenue, updateDriverLocationApi } from '../services/api';
import { Package, Bike, Key, Car, Building2, Landmark, Wrench, ShoppingCart, MapPin, CheckCircle2, Gift, Home as HomeIcon, ClipboardList, Wallet, Flag, Navigation, Phone, MessageSquare, AlertCircle, RefreshCw, X, ShieldAlert, Inbox, Truck, Moon, Hourglass } from 'lucide-react';
import api from '../services/api';
import { requestFirebaseToken } from '../utils/firebase';
import { Capacitor } from '@capacitor/core';
import { useGps } from '../context/GpsContext';

const STATUS_CONFIG = {
  ACCEPTED: { label: 'Đã nhận', color: 'bg-blue-500', textColor: 'text-blue-400' },
  PICKED_UP: { label: 'Đã lấy hàng', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
  DELIVERING: { label: 'Đang giao', color: 'bg-blue-600', textColor: 'text-blue-600' },
  COMPLETED: { label: 'Hoàn thành', color: 'bg-green-500', textColor: 'text-green-400' },
  CANCELLED: { label: 'Đã hủy', color: 'bg-red-500', textColor: 'text-red-400' }
};

const getServiceBadge = (order) => {
  const baseClass = "bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 flex items-center gap-1 inline-flex";
  if (order.serviceType === 'DAT_XE') {
    if (order.subServiceType === 'XE_OM') return <span className={baseClass}><Bike size={12}/> CHỞ KHÁCH</span>;
    if (order.subServiceType === 'LAI_HO_XE_MAY') return <span className={baseClass}><Key size={12}/> LÁI HỘ XE MÁY</span>;
    if (order.subServiceType === 'LAI_HO_OTO') return <span className={baseClass}><Car size={12}/> LÁI HỘ ÔTÔ</span>;
    return <span className={baseClass}><Bike size={12}/> ĐẶT XE</span>;
  }
  if (order.serviceType === 'DIEU_PHOI') {
    if (order.subServiceType === 'NAP_TIEN') return <span className={baseClass}><Building2 size={12}/> NẠP TIỀN</span>;
    if (order.subServiceType === 'RUT_TIEN') return <span className={baseClass}><Landmark size={12}/> RÚT TIỀN</span>;
    return <span className={baseClass}><Wrench size={12}/> ĐIỀU PHỐI</span>;
  }
  if (order.serviceType === 'MUA_HO') {
    return <span className={baseClass}><ShoppingCart size={12}/> MUA HỘ</span>;
  }
  return <span className={baseClass}><Package size={12}/> GIAO HÀNG</span>;
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

      {order.driverReminder && (
        <div className="bg-red-100 border border-red-200 rounded-lg p-2.5 mb-3 text-base text-red-700 font-bold whitespace-pre-wrap">
          ⚠️ {order.driverReminder}
        </div>
      )}

      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <span className="text-slate-400 mt-1">{order.serviceType === 'DAT_XE' ? <MapPin size={16}/> : <Package size={16}/>}</span>
          <div className="flex-1">
            <p className="text-xs text-slate-500">{order.serviceType === 'DAT_XE' ? 'Điểm đón' : order.serviceType === 'DIEU_PHOI' ? 'Gặp mặt tại' : 'Lấy hàng'}</p>
            <p className="text-sm text-slate-800 font-medium line-clamp-2">{order.pickupAddress}</p>
          </div>
        </div>
        {order.serviceType !== 'DIEU_PHOI' && (
          <div className="flex items-start gap-2">
            <span className="text-slate-400 mt-1"><CheckCircle2 size={16}/></span>
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

      {order.items && order.items.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 mb-3">
          <p className="text-xs font-bold text-slate-500 mb-1">📦 Hàng hóa:</p>
          <ul className="text-sm font-medium text-slate-800 list-disc list-inside space-y-0.5">
            {order.items.map((item, idx) => <li key={idx} className="line-clamp-2">{item}</li>)}
          </ul>
        </div>
      )}

      {order.note && (
        <div className="bg-white border border-slate-200 rounded-lg p-2 mb-3 text-sm text-slate-900 font-bold whitespace-pre-wrap">
          📝 {order.note}
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5 mt-2 border-t border-slate-100 pt-3">
        <span className="text-green-600 font-black text-sm w-full text-center tracking-wide flex flex-col items-center">
          <span>💵 GIÁ CƯỚC: +{((order.deliveryFee || 0) + (order.packageDetails?.bulkyFee || 0) + (order.rideDetails?.surcharge || 0)).toLocaleString()}đ</span>
          {order.packageDetails?.bulkyFee > 0 && <span className="text-[10px] text-orange-600 font-bold tracking-normal mt-0.5">( đã cộng phí cồng kềnh: {order.packageDetails.bulkyFee.toLocaleString()}đ )</span>}
          {order.rideDetails?.surcharge > 0 && <span className="text-[10px] text-purple-600 font-bold tracking-normal mt-0.5">( đã cộng phí lái hộ: {order.rideDetails.surcharge.toLocaleString()}đ )</span>}
        </span>
        {order.adminBonus > 0 && (
          <span className="text-slate-600 font-black text-xs w-full text-center tracking-wide flex items-center justify-center gap-1 bg-slate-50 py-1 rounded-md">
            <Gift size={14}/> THƯỞNG HIỆU SUẤT HOÀN THÀNH ĐƠN HÀNG: +{order.adminBonus?.toLocaleString()}đ
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
        return { label: order.serviceType === 'DAT_XE' ? 'Đã đón khách' : order.serviceType === 'MUA_HO' ? 'Đã mua hàng' : 'Đã lấy hàng', action: 'pickup', color: 'bg-slate-700 hover:bg-slate-600 text-white' };
      case 'PICKED_UP':
      case 'DELIVERING':
        return { label: order.serviceType === 'DAT_XE' ? 'Đã trả khách' : 'Hoàn thành', action: 'complete', color: 'bg-slate-800 hover:bg-slate-700 text-white' };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <div className="card mb-3 border-2 border-blue-500 relative overflow-hidden" onClick={() => navigate(`/order/${order._id}`)}>
      <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
         {config.label}
      </div>
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 line-clamp-1">{order.orderCode || order._id?.slice(-8).toUpperCase()}</span>
          <div>{getServiceBadge(order)}</div>
        </div>
        <span className="text-sm font-bold text-blue-600 mr-20">
          {order.codAmount?.toLocaleString()}đ COD
        </span>
      </div>

      {order.driverReminder && (
        <div className="bg-red-100 border border-red-200 rounded-lg p-2.5 mb-3 text-base text-red-700 font-bold whitespace-pre-wrap">
          ⚠️ {order.driverReminder}
        </div>
      )}

      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <span className="text-slate-400 mt-1">{order.serviceType === 'DAT_XE' ? <MapPin size={16}/> : <Package size={16}/>}</span>
          <div className="flex-1">
            <p className="text-xs text-slate-500">{order.serviceType === 'DAT_XE' ? 'Điểm đón' : order.serviceType === 'DIEU_PHOI' ? 'Gặp mặt tại' : 'Lấy hàng'}</p>
            <p className="text-sm text-slate-800 font-medium line-clamp-2">{order.pickupAddress}</p>
          </div>
        </div>
        {order.serviceType !== 'DIEU_PHOI' && (
          <div className="flex items-start gap-2">
            <span className="text-slate-400 mt-1"><CheckCircle2 size={16}/></span>
            <div className="flex-1">
              <p className="text-xs text-slate-500">{order.serviceType === 'DAT_XE' ? 'Điểm đến' : 'Giao hàng'}</p>
              <p className="text-sm text-slate-800 font-medium line-clamp-2">{order.deliveryAddress}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-col gap-1 text-sm text-slate-500 sm:flex-row sm:justify-between">
        <span className="truncate">👤 {order.customerName}</span>
        <div className="flex justify-between sm:justify-end items-center gap-3">
          <span className="shrink-0">📞 {order.customerPhone}</span>
          <a href={`tel:${order.customerPhone}`} onClick={(e) => e.stopPropagation()} className="bg-green-100 text-green-700 px-3 py-0.5 rounded-full text-xs font-bold border border-green-200">
            GỌI
          </a>
        </div>
      </div>

      {order.items && order.items.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 mb-3">
          <p className="text-xs font-bold text-slate-500 mb-1">📦 Hàng hóa:</p>
          <ul className="text-sm font-medium text-slate-800 list-disc list-inside space-y-0.5">
            {order.items.map((item, idx) => <li key={idx} className="line-clamp-2">{item}</li>)}
          </ul>
        </div>
      )}

      {order.note && (
        <div className="bg-white border border-slate-200 rounded-lg p-2 mb-3 text-sm text-slate-900 font-bold whitespace-pre-wrap">
          📝 {order.note}
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5 mt-2 border-t border-slate-100 pt-3">
        <span className="text-green-600 font-black text-sm w-full text-center tracking-wide flex flex-col items-center">
          <span>💵 GIÁ CƯỚC: +{((order.deliveryFee || 0) + (order.packageDetails?.bulkyFee || 0) + (order.rideDetails?.surcharge || 0)).toLocaleString()}đ</span>
          {order.packageDetails?.bulkyFee > 0 && <span className="text-[10px] text-orange-600 font-bold tracking-normal mt-0.5">( đã cộng phí cồng kềnh: {order.packageDetails.bulkyFee.toLocaleString()}đ )</span>}
          {order.rideDetails?.surcharge > 0 && <span className="text-[10px] text-purple-600 font-bold tracking-normal mt-0.5">( đã cộng phí lái hộ: {order.rideDetails.surcharge.toLocaleString()}đ )</span>}
        </span>
      </div>
      
      {order.adminBonus > 0 && (
        <div className="mb-2 bg-slate-50 rounded-lg p-2 text-center border border-slate-200 flex items-center justify-center gap-1">
           <Gift size={14} className="text-slate-600"/> <span className="text-slate-700 font-bold text-xs tracking-wide">THƯỞNG HIỆU SUẤT HOÀN THÀNH ĐƠN HÀNG: +{order.adminBonus?.toLocaleString()}đ</span>
        </div>
      )}

      {nextAction && (
        <button
          onClick={(e) => { e.stopPropagation(); onAction(order._id, nextAction.action); }}
          disabled={loading}
          className={`${nextAction.color} mt-2 py-2.5 text-white font-bold w-full rounded-xl uppercase tracking-wider text-sm`}
        >
          {loading ? 'Đang xử lý...' : nextAction.label}
        </button>
      )}
    </div>
  );
}

export default function Home() {
  const { driver, setOnline, logout, loadProfile } = useAuth();
  const navigate = useNavigate();
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myActiveOrders, setMyActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter] = useState('available');
  const [showToast, setShowToast] = useState(null);
  const [logoutModal, setLogoutModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [confirmAcceptOrder, setConfirmAcceptOrder] = useState(null); // ID đơn hàng đang được hỏi Xác Nhận
  const [historyOrders, setHistoryOrders] = useState([]);
  const scrollRef = useRef(null);
  const [dailyStats, setDailyStats] = useState({ fee: 0, orders: 0 });

  // GPS Tracking via Context
  const { 
    gpsStatus, 
    toggleGPS, 
    isToggling, 
    showLocationDisclosure, 
    handleAcceptDisclosure, 
    handleDeclineDisclosure 
  } = useGps();

  // WakeLock and Background Tracking are now handled in GpsContext

  const loadData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
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
  }, []);

  const showNotification = (message, type = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };



  useEffect(() => {
    loadData(false);
    window.addEventListener('refresh_data', () => loadData(false));
    // Giảm tần suất Polling xuống 30s vì đã có Socket Realtime
    const interval = setInterval(() => loadData(true), 30000);

    const handleNewOrder = (e) => {
       if (!driver?.isOnline) return; // BỎ QUA NẾU ĐANG OFFLINE
       
       loadData();
       // Global Alarm in App.jsx tự động lo khoản chuông
       
       if (Capacitor.isNativePlatform() && document.visibilityState !== 'visible') {
          // Bỏ qua tạo LocalNotification thủ công vì Firebase Push đã làm việc này
          // để tránh lỗi nhảy đúp 2 thông báo.
       }
    };

    const handleOrderLost = (e) => {
      const orderId = typeof e?.detail === 'string' ? e.detail : e?.detail?._id;
      if (orderId) {
        setAvailableOrders(prev => prev.filter(o => o._id !== orderId));
        setMyActiveOrders(prev => prev.filter(o => o._id !== orderId));
      }
      loadData(true);
    };

    const handleOrderAccepted = (e) => {
      const orderId = typeof e?.detail === 'string' ? e.detail : e?.detail?._id;
      if (orderId) {
        setAvailableOrders(prev => prev.filter(o => o._id !== orderId));
      }
      loadData(true);
    };

    const handleOrderUpdated = (e) => {
      const updatedOrder = e.detail;
      if (!updatedOrder) return;
      
      const driverRate = driver?.commissionRate || 15;
      
      if (updatedOrder.status === 'PENDING') {
         // Lọc bỏ nếu đơn hàng đang được gán độc quyền cho nhóm tài xế gần nhất
         if (updatedOrder.pendingAssignTo && updatedOrder.pendingAssignTo.length > 0) {
             const isDriverInGroup = updatedOrder.pendingAssignTo.some(id => id.toString() === (driver?._id || driver?.id)?.toString());
             if (!isDriverInGroup) {
               setAvailableOrders(prev => prev.filter(o => o._id !== updatedOrder._id));
               return;
             }
         }

         if (updatedOrder.commissionRate != null && Number(updatedOrder.commissionRate) !== Number(driverRate)) {
             setAvailableOrders(prev => prev.filter(o => o._id !== updatedOrder._id));
         } else {
             setAvailableOrders(prev => {
                const exists = prev.find(o => o._id === updatedOrder._id);
                if (exists) return prev.map(o => o._id === updatedOrder._id ? updatedOrder : o);
                return [updatedOrder, ...prev];
             });
         }
      }
    };

    const loadBackground = () => loadData(true);
    const loadForeground = () => loadData(false);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadData(true); // Tải lại ngầm để cập nhật đơn khi vừa bật lại app
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    window.addEventListener('driver_new_order', handleNewOrder);
    window.addEventListener('driver_force_assigned', loadBackground); // Lắng nghe sự kiện Gán Đơn
    window.addEventListener('driver_order_accepted', handleOrderAccepted);
    window.addEventListener('driver_order_cancelled', handleOrderLost);
    window.addEventListener('driver_order_deleted_event', handleOrderLost);
    window.addEventListener('driver_order_updated', handleOrderUpdated);
    window.addEventListener('driver_order_picked_up', loadBackground);
    window.addEventListener('driver_order_delivering', loadBackground);
    window.addEventListener('driver_order_completed', loadBackground);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('refresh_data', loadForeground);
      window.removeEventListener('driver_new_order', handleNewOrder);
      window.removeEventListener('driver_force_assigned', loadBackground);
      window.removeEventListener('driver_order_accepted', handleOrderAccepted);
      window.removeEventListener('driver_order_cancelled', handleOrderLost);
      window.removeEventListener('driver_order_deleted_event', handleOrderLost);
      window.removeEventListener('driver_order_updated', handleOrderUpdated);
      window.removeEventListener('driver_order_picked_up', loadBackground);
      window.removeEventListener('driver_order_delivering', loadBackground);
      window.removeEventListener('driver_order_completed', loadBackground);
    };
  }, [loadData, driver]);

  const handleAccept = async () => {
    if (!confirmAcceptOrder) return;
    const orderId = confirmAcceptOrder;
    setConfirmAcceptOrder(null);

    if (actionLoading) return; // Chặn bấm đúp Spam mạng
    setActionLoading(orderId);
    try {
      window.dispatchEvent(new CustomEvent('stop_alarm_event'));
      const res = await acceptOrder(orderId);
      if (res.success === false) {
        showNotification(res.message || 'Không thể nhận đơn', 'error');
        return;
      }
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

    if (!driver?.isOnline && driver?.status === 'pending') {
      setShowPendingModal(true);
      return;
    }

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
    } catch (err) {
      showNotification(err.response?.data?.message || err.message || 'Lỗi không xác định', 'error');
    } finally {
      setTimeout(() => setIsToggling(false), 800);
    }
  };

  const handleUpdateProfile = async (data) => {
    try {
      await updateMyProfile(data);
      showNotification('Cập nhật hồ sơ thành công!');
      setEditModal(false);
      setTimeout(() => loadProfile(), 500);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Lỗi cập nhật', 'error');
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50 overflow-hidden relative">
      {/* Toast */}
      {showToast && (
        <div className={`fixed safe-top left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg text-white font-medium ${
          showToast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {showToast.message}
        </div>
      )}

      {/* Header Siêu Gọn - Đã chuyển sang nền trắng */}
      <div className="shrink-0 bg-white px-3 py-3.5 safe-pt relative z-20 shadow-sm border-b border-slate-100 flex items-center justify-between gap-2">
        {/* Logo rút gọn */}
        <img src="/logoALOSHIPP.png" alt="AloShipp Logo" className="h-8 w-auto object-contain shrink-0 hidden sm:block" />
        <img src="/logoALOSHIPP.png" alt="AloShipp Logo" className="h-7 w-auto object-contain shrink-0 sm:hidden" />
        
        {/* Tên Tài xế */}
        <div 
          onClick={() => setEditModal(true)}
          className="flex items-center gap-2 bg-slate-50 p-1 pr-3.5 rounded-full cursor-pointer hover:bg-slate-100 transition-all border border-slate-200 shadow-sm flex-1 min-w-0 max-w-[170px] sm:max-w-[220px]"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border border-white relative shadow-sm shrink-0">
            {driver?.avatar ? (
              <img src={getFullImageUrl(driver.avatar)} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs sm:text-sm font-bold text-blue-500">
                {driver?.name?.charAt(0).toUpperCase() || '👤'}
              </span>
            )}
          </div>
          <div className="flex flex-col justify-center overflow-hidden flex-1">
            <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight truncate w-full">{driver?.name || 'Tài xế'}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight truncate w-full">{driver?.driverCode || 'Hồ sơ'}</p>
          </div>
        </div>

        {/* Nút Trạng Thái Online/Offline & Đăng xuất */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={toggleOnline}
            disabled={isToggling}
            className={`rounded-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-bold transition-all flex items-center shadow-sm ${
              driver?.isOnline 
                ? (gpsStatus === 'TRACKING' ? 'bg-green-500 text-white border border-green-600' 
                   : gpsStatus === 'FINDING' ? 'bg-yellow-400 text-yellow-900 border border-yellow-500 animate-pulse'
                   : 'bg-red-500 text-white border border-red-600') 
                : 'bg-slate-800 text-white border border-slate-900 shadow-md'
            } ${isToggling ? 'opacity-70 cursor-wait' : ''}`}
          >
            {driver?.isOnline ? (
              <>
                {gpsStatus === 'TRACKING' ? '🟢 Online' : gpsStatus === 'FINDING' ? '⏳ Đang dò...' : '🔴 Lỗi GPS'}
              </>
            ) : '⚫ Offline'}
          </button>
          
          {/* Đăng Xuất */}
          <button
            onClick={() => setLogoutModal(true)}
            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors border border-slate-200 shrink-0"
          >
            <span className="text-sm">🚪</span>
          </button>
        </div>
      </div>

      {/* Cặp Thống kê Doanh Số Ngày Thay Vì Đơn Cũ */}
      <div className="shrink-0 w-full bg-white px-3 pb-2 relative z-10 flex justify-center border-b border-slate-200">
        <div className="grid grid-cols-2 gap-2 w-full max-w-sm mt-0.5">
          <div className="rounded-xl bg-blue-50/50 p-1 text-center border border-blue-200 shadow-sm flex flex-col justify-center">
            <p className="text-[8px] font-bold tracking-wider mb-0.5 text-slate-500">ĐÃ HOÀN THÀNH</p>
            <div className="flex items-baseline justify-center gap-1">
              <p className="text-base font-black text-blue-600 leading-none">{dailyStats.orders}</p>
              <p className="text-[8px] text-slate-400 font-medium">hôm nay</p>
            </div>
          </div>
          <div className="rounded-xl bg-green-50/50 p-1 text-center border border-green-200 shadow-sm flex flex-col justify-center">
            <p className="text-[8px] font-bold tracking-wider mb-0.5 text-slate-500">ĐIỂM THƯỞNG (TẠM)</p>
            <div className="flex items-baseline justify-center gap-0.5">
              <p className="text-base font-black text-green-600 leading-none">
                 {dailyStats.fee.toLocaleString()}
              </p>
              <p className="text-[8px] text-green-600/80 font-bold">đ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 sticky top-0 z-20 flex bg-white border-b border-slate-200">
        <button
          type="button"
          onClick={() => { setFilter('available'); scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' }); }}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all sm:text-sm ${
            filter === 'available' ? 'border-b-2 border-blue-600 bg-blue-50/50 text-blue-600' : 'text-slate-500'
          }`}
        >
          <Inbox size={16} /> Chờ nhận ({availableOrders.length})
        </button>
        <button
          type="button"
          onClick={() => { setFilter('active'); scrollRef.current?.scrollTo({ left: window.innerWidth, behavior: 'smooth' }); }}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all sm:text-sm ${
            filter === 'active' ? 'border-b-2 border-blue-600 bg-blue-50/50 text-blue-600' : 'text-slate-500'
          }`}
        >
          <Truck size={16} /> Đang giao ({myActiveOrders.length})
        </button>
        <button
          type="button"
          onClick={() => { setFilter('history'); scrollRef.current?.scrollTo({ left: window.innerWidth * 2, behavior: 'smooth' }); }}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all sm:text-sm ${
            filter === 'history' ? 'border-b-2 border-blue-600 bg-blue-50/50 text-blue-600' : 'text-slate-500'
          }`}
        >
          <ClipboardList size={16} /> Lịch sử
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
              <div className="text-center py-12 bg-slate-100 rounded-2xl mt-4 border border-slate-200 flex flex-col items-center">
                <Moon size={48} strokeWidth={1} className="mb-3 text-slate-400" />
                <p className="font-black text-slate-700 text-lg uppercase tracking-wide">Bạn đang Nghỉ / Offline</p>
                <p className="text-sm mt-2 text-slate-500 max-w-[250px] mx-auto">
                  Không thể nhìn thấy đơn hàng khi đang Offline.<br/><br/>
                  Hãy bật nút <b className="text-slate-800 bg-slate-200 px-2 py-1 rounded">Mở Nhận Đơn</b> phía trên để tiếp tục Cày cuốc!
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
              <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                <Hourglass size={48} strokeWidth={1} className="mb-4 text-slate-300" />
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
              <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                <Package size={48} strokeWidth={1} className="mb-4 text-slate-300" />
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
                     <p className="text-xs text-slate-500 truncate mb-1 flex items-center gap-1"><MapPin size={12}/> {order.pickupAddress}</p>
                     <p className="text-xs text-slate-500 truncate mb-2 flex items-center gap-1"><Flag size={12}/> {order.deliveryAddress}</p>
                     <div className="flex justify-between items-center mt-2 border-t border-slate-300 pt-2">
                        <div className="flex flex-col">
                           <span className="text-slate-600 text-xs font-bold">Cước: {((order.deliveryFee || 0) + (order.packageDetails?.bulkyFee || 0)).toLocaleString()}đ</span>
                           {order.packageDetails?.bulkyFee > 0 && <span className="text-[9px] text-orange-600 font-bold mt-0.5">( đã cộng phí cồng kềnh: {order.packageDetails.bulkyFee.toLocaleString()}đ )</span>}
                        </div>
                        <span className="text-[10px] text-slate-500">{new Date(order.updatedAt || order.createdAt).toLocaleDateString('vi-VN')}</span>
                     </div>
                  </div>
                ))}
                <button onClick={() => navigate('/my-orders')} className="w-full text-center py-3 text-blue-600 font-bold bg-blue-50 rounded-xl mt-2 active:bg-blue-100">
                  Xem toàn bộ thống kê
                </button>
              </>
            ) : (
              <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                <ClipboardList size={48} strokeWidth={1} className="mb-4 text-slate-300" />
                <p className="font-medium text-slate-600">Chưa có lịch sử</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Nav */}
      <div className="bottom-nav-safe">
        <div className="mx-auto flex max-w-xl justify-around py-3 bg-white border-t border-slate-200">
          <Link to="/" className="flex flex-col items-center text-slate-800">
            <HomeIcon size={24} strokeWidth={1.5} />
            <span className="text-xs mt-1 font-bold">Trang chủ</span>
          </Link>
          <Link to="/my-orders" className="flex flex-col items-center text-slate-400 hover:text-slate-600 transition-colors">
            <ClipboardList size={24} strokeWidth={1.5} />
            <span className="text-xs mt-1 font-medium">Đơn của tôi</span>
          </Link>
          <Link to="/earnings" className="flex flex-col items-center text-slate-400 hover:text-slate-600 transition-colors">
            <Wallet size={24} strokeWidth={1.5} />
            <span className="text-xs mt-1 font-medium">Điểm thưởng</span>
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

      <ConfirmModal 
        isOpen={showPendingModal}
        title="Tài khoản chưa được duyệt"
        message="Vui lòng liên hệ Admin để được phê duyệt và trở thành tài xế chính thức của AloShipp."
        onConfirm={() => {
          setShowPendingModal(false);
          window.location.href = "tel:0765120777";
        }}
        onCancel={() => setShowPendingModal(false)}
        confirmText="Liên hệ ngay"
        cancelText="Đóng"
        isDestructive={false}
      />

      {/* PROMINENT DISCLOSURE MODAL FOR GOOGLE PLAY */}
      {showLocationDisclosure && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="bg-blue-600 p-4 text-center">
              <MapPin size={48} className="mx-auto text-white mb-2" />
              <h3 className="text-lg font-black text-white uppercase tracking-wide">Yêu Cầu Quyền Vị Trí</h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-700 leading-relaxed mb-4 text-justify font-medium">
                Ứng dụng <b>AloShipp Driver</b> thu thập dữ liệu vị trí để cho phép hệ thống điều phối đơn hàng, tính toán quãng đường và theo dõi lộ trình giao hàng <b className="text-blue-600">ngay cả khi ứng dụng bị đóng hoặc không sử dụng.</b>
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleDeclineDisclosure}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl active:bg-slate-200 transition-colors"
                >
                  Từ chối
                </button>
                <button
                  onClick={handleAcceptDisclosure}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl active:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                >
                  Đồng ý
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
