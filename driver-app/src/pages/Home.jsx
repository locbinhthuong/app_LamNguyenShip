import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import DriverProfileModal from '../components/DriverProfileModal';
import { getAvailableOrders, acceptOrder, getMyOrders, updateMyProfile } from '../services/api';

const STATUS_CONFIG = {
  ACCEPTED: { label: 'Đã nhận', color: 'bg-blue-500', textColor: 'text-blue-400' },
  PICKED_UP: { label: 'Đã lấy hàng', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
  DELIVERING: { label: 'Đang giao', color: 'bg-blue-600', textColor: 'text-blue-600' },
  COMPLETED: { label: 'Hoàn thành', color: 'bg-green-500', textColor: 'text-green-400' },
  CANCELLED: { label: 'Đã hủy', color: 'bg-red-500', textColor: 'text-red-400' }
};

function OrderCard({ order, onAccept, loading }) {
  const navigate = useNavigate();

  const handleAccept = async () => {
    await onAccept(order._id);
  };

  return (
    <div className="card mb-3" onClick={() => navigate(`/order/${order._id}`)}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-xs text-slate-500">{order.orderCode || order._id?.slice(-8).toUpperCase()}</span>
        </div>
        <span className="text-sm font-bold text-blue-600">
          {order.codAmount?.toLocaleString()}đ COD
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <span className="text-green-400 mt-1">📦</span>
          <div className="flex-1">
            <p className="text-xs text-slate-500">Lấy hàng</p>
            <p className="text-sm text-slate-800 font-medium line-clamp-2">{order.pickupAddress}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-red-400 mt-1">🏁</span>
          <div className="flex-1">
            <p className="text-xs text-slate-500">Giao hàng</p>
            <p className="text-sm text-slate-800 font-medium line-clamp-2">{order.deliveryAddress}</p>
          </div>
        </div>
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

      <div className="flex justify-between items-center">
        <span className="text-green-400 font-bold">
          +{order.deliveryFee?.toLocaleString()}đ
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); handleAccept(); }}
          disabled={loading}
          className="btn-success py-2 px-6 text-sm"
        >
          {loading ? '...' : 'Nhận đơn'}
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
        return { label: '📦 Đã lấy hàng', action: 'pickup', color: 'btn-warning' };
      case 'PICKED_UP':
        return { label: '✅ Hoàn thành', action: 'complete', color: 'btn-success' };
      case 'DELIVERING':
        return { label: '✅ Hoàn thành', action: 'complete', color: 'btn-success' };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-4 mb-4 shadow-xl" onClick={() => navigate(`/order/${order._id}`)}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-slate-800">{order.orderCode || order._id?.slice(-8).toUpperCase()}</span>
        <span className={`status-badge ${config.color} text-slate-800`}>{config.label}</span>
      </div>

      <div className="space-y-1 mb-3">
        <p className="text-sm text-green-100">
          <span className="opacity-70">Lấy:</span> {order.pickupAddress?.slice(0, 40)}...
        </p>
        <p className="text-sm text-green-100">
          <span className="opacity-70">Giao:</span> {order.deliveryAddress?.slice(0, 40)}...
        </p>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-green-200 text-sm">👤 {order.customerName}</span>
        <a href={`tel:${order.customerPhone}`} onClick={(e) => e.stopPropagation()} className="bg-white/20 px-3 py-1 rounded-full text-sm">
          📞 Gọi
        </a>
      </div>

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

  const showNotification = (message, type = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [availableRes, myRes] = await Promise.all([
        getAvailableOrders(),
        getMyOrders()
      ]);
      setAvailableOrders(availableRes.data || []);
      const active = (myRes.data || []).filter(o => ['ACCEPTED', 'PICKED_UP', 'DELIVERING'].includes(o.status));
      setMyActiveOrders(active);
    } catch (err) {
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleAccept = async (orderId) => {
    setActionLoading(orderId);
    try {
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
    const newStatus = !driver?.isOnline;
    await setOnline(newStatus);
    showNotification(newStatus ? 'Bạn đang ONLINE - Nhận đơn ngay!' : 'Bạn đã OFFLINE');
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
    <div className="min-h-screen bg-slate-50 pb-24 sm:pb-28">
      {/* Toast */}
      {showToast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg text-white font-medium ${
          showToast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {showToast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 pt-[max(2.5rem,env(safe-area-inset-top))]">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xl">🚚</span>
          <h1 className="text-lg font-bold text-white tracking-wide">LamNguyenShip</h1>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div 
            onClick={() => setEditModal(true)}
            className="flex items-center gap-3 bg-white/10 p-1.5 pr-4 rounded-full cursor-pointer hover:bg-white/20 transition-all active:scale-95 group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-2 border-white/50 shadow-sm relative">
              {driver?.avatar ? (
                <img src={driver.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-blue-500">
                  {driver?.name?.charAt(0).toUpperCase() || '👤'}
                </span>
              )}
              {/* Overlay edit icon */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] pb-1">✏️</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">{driver?.name || 'Tài xế'}</p>
              <p className="text-[10px] text-blue-200 mt-0.5">{driver?.driverCode || 'Xem hồ sơ ➔'}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={toggleOnline}
              className={`rounded-full px-3 py-2 text-xs font-bold transition-all sm:px-4 sm:text-sm ${
                driver?.isOnline ? 'bg-green-500 text-white' : 'bg-slate-600 text-slate-300'
              }`}
            >
              {driver?.isOnline ? '🟢 Online' : '⚫ Offline'}
            </button>
            <button
              onClick={() => setLogoutModal(true)}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white"
            >
              🚪
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/20 p-2 text-center sm:p-3 text-white">
            <p className="text-xl font-bold sm:text-2xl">{driver?.stats?.completedOrders || 0}</p>
            <p className="text-[10px] opacity-80 sm:text-xs">Hoàn thành</p>
          </div>
          <div className="rounded-xl bg-white/20 p-2 text-center sm:p-3 text-white">
            <p className="text-xl font-bold sm:text-2xl">{availableOrders.length}</p>
            <p className="text-[10px] opacity-80 sm:text-xs">Chờ nhận</p>
          </div>
          <div className="rounded-xl bg-white/20 p-2 text-center sm:p-3 text-white">
            <p className="text-xl font-bold sm:text-2xl">{myActiveOrders.length}</p>
            <p className="text-[10px] opacity-80 sm:text-xs">Đang giao</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 flex bg-white border-b border-slate-200">
        <button
          type="button"
          onClick={() => setFilter('available')}
          className={`flex-1 py-3 text-xs font-bold transition-all sm:text-sm ${
            filter === 'available' ? 'border-b-2 border-blue-600 bg-blue-50/50 text-blue-600' : 'text-slate-500'
          }`}
        >
          📥 Chờ nhận ({availableOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`flex-1 py-3 text-xs font-bold transition-all sm:text-sm ${
            filter === 'active' ? 'border-b-2 border-blue-600 bg-blue-50/50 text-blue-600' : 'text-slate-500'
          }`}
        >
          🚚 Đang giao ({myActiveOrders.length})
        </button>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-lg p-4 sm:max-w-xl">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filter === 'active' ? (
          myActiveOrders.length > 0 ? (
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
          )
        ) : availableOrders.length > 0 ? (
          <>
            <p className="text-slate-500 text-sm mb-3 font-medium">Có {availableOrders.length} đơn hàng chờ bạn</p>
            {availableOrders.map(order => (
              <OrderCard key={order._id} order={order} onAccept={handleAccept} loading={actionLoading === order._id} />
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
