import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvailableOrders, acceptOrder, getMyOrders } from '../services/api';

const STATUS_CONFIG = {
  ACCEPTED: { label: 'Đã nhận', color: 'bg-blue-500', textColor: 'text-blue-400' },
  PICKED_UP: { label: 'Đã lấy hàng', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
  DELIVERING: { label: 'Đang giao', color: 'bg-orange-500', textColor: 'text-orange-400' },
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
          <span className="text-xs text-slate-400">{order.orderCode || order._id?.slice(-8).toUpperCase()}</span>
        </div>
        <span className="text-sm font-bold text-orange-400">
          {order.codAmount?.toLocaleString()}đ COD
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <span className="text-green-400 mt-1">📦</span>
          <div className="flex-1">
            <p className="text-xs text-slate-400">Lấy hàng</p>
            <p className="text-sm text-white font-medium line-clamp-2">{order.pickupAddress}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-red-400 mt-1">🏁</span>
          <div className="flex-1">
            <p className="text-xs text-slate-400">Giao hàng</p>
            <p className="text-sm text-white font-medium line-clamp-2">{order.deliveryAddress}</p>
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-1 text-sm text-slate-400 sm:flex-row sm:justify-between">
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
        return { label: '🚚 Bắt đầu giao', action: 'deliver', color: 'btn-primary' };
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
        <span className="font-bold text-white">{order.orderCode || order._id?.slice(-8).toUpperCase()}</span>
        <span className={`status-badge ${config.color} text-white`}>{config.label}</span>
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
          className={`${nextAction.color} mt-3 py-2`}
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
        deliver: async () => { const { deliveringOrder } = await import('../services/api'); return deliveringOrder(orderId); },
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

  const handleLogout = () => {
    if (confirm('Đăng xuất?')) logout();
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-24 sm:pb-28">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold sm:text-xl">🚚 LamNguyenShip</h1>
            <p className="truncate text-sm text-blue-200">{driver?.name || 'Tài xế'}</p>
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
            <button type="button" onClick={handleLogout} className="rounded-full bg-white/20 px-3 py-2 text-white">
              🚪
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl bg-white/20 p-2 text-center sm:p-3">
            <p className="text-xl font-bold sm:text-2xl">{driver?.stats?.completedOrders || 0}</p>
            <p className="text-[10px] opacity-80 sm:text-xs">Hoàn thành</p>
          </div>
          <div className="rounded-xl bg-white/20 p-2 text-center sm:p-3">
            <p className="text-xl font-bold sm:text-2xl">{driver?.stats?.rating || 0}⭐</p>
            <p className="text-[10px] opacity-80 sm:text-xs">Đánh giá</p>
          </div>
          <div className="rounded-xl bg-white/20 p-2 text-center sm:p-3">
            <p className="text-xl font-bold sm:text-2xl">{availableOrders.length}</p>
            <p className="text-[10px] opacity-80 sm:text-xs">Chờ nhận</p>
          </div>
          <div className="rounded-xl bg-white/20 p-2 text-center sm:p-3">
            <p className="text-xl font-bold sm:text-2xl">{myActiveOrders.length}</p>
            <p className="text-[10px] opacity-80 sm:text-xs">Đang giao</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 flex bg-slate-800">
        <button
          type="button"
          onClick={() => setFilter('available')}
          className={`flex-1 py-3 text-xs font-bold transition-all sm:text-sm ${
            filter === 'available' ? 'border-b-2 border-blue-400 bg-slate-700 text-blue-400' : 'text-slate-400'
          }`}
        >
          📥 Chờ nhận ({availableOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`flex-1 py-3 text-xs font-bold transition-all sm:text-sm ${
            filter === 'active' ? 'border-b-2 border-blue-400 bg-slate-700 text-blue-400' : 'text-slate-400'
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
              <p className="text-slate-400 text-sm mb-3">Đơn đang giao</p>
              {myActiveOrders.map(order => (
                <ActiveOrderCard key={order._id} order={order} onAction={handleAction} loading={actionLoading === order._id} />
              ))}
            </>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <p className="text-5xl mb-4">📦</p>
              <p>Chưa có đơn đang giao</p>
              <p className="text-sm mt-1">Nhận đơn mới ở tab "Chờ nhận"</p>
            </div>
          )
        ) : availableOrders.length > 0 ? (
          <>
            <p className="text-slate-400 text-sm mb-3">Có {availableOrders.length} đơn hàng chờ bạn</p>
            {availableOrders.map(order => (
              <OrderCard key={order._id} order={order} onAccept={handleAccept} loading={actionLoading === order._id} />
            ))}
          </>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <p className="text-5xl mb-4">⏳</p>
            <p>Không có đơn hàng nào</p>
            <p className="text-sm mt-1">Đơn mới sẽ xuất hiện tại đây</p>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="bottom-nav-safe">
        <div className="mx-auto flex max-w-xl justify-around py-3">
          <Link to="/" className="flex flex-col items-center text-blue-400">
            <span className="text-xl">🏠</span>
            <span className="text-xs mt-1">Trang chủ</span>
          </Link>
          <Link to="/my-orders" className="flex flex-col items-center text-slate-400">
            <span className="text-xl">📋</span>
            <span className="text-xs mt-1">Đơn của tôi</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center text-slate-400">
            <span className="text-xl">👤</span>
            <span className="text-xs mt-1">Cá nhân</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
