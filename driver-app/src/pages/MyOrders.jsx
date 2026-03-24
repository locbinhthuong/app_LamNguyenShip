import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getMyOrders } from '../services/api';

const STATUS_LABELS = {
  PENDING: 'Chờ nhận',
  ACCEPTED: 'Đã nhận',
  PICKED_UP: 'Đã lấy',
  DELIVERING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy'
};

const STATUS_COLORS = {
  PENDING: 'bg-yellow-500',
  ACCEPTED: 'bg-blue-500',
  PICKED_UP: 'bg-yellow-500',
  DELIVERING: 'bg-orange-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-red-500'
};

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadOrders = useCallback(async () => {
    try {
      const response = await getMyOrders();
      setOrders(response.data || []);
    } catch (err) {
      console.error('Load orders error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(o => o.status === filter);

  const counts = {
    all: orders.length,
    ACCEPTED: orders.filter(o => o.status === 'ACCEPTED').length,
    DELIVERING: orders.filter(o => ['PICKED_UP', 'DELIVERING'].includes(o.status)).length,
    COMPLETED: orders.filter(o => o.status === 'COMPLETED').length,
    CANCELLED: orders.filter(o => o.status === 'CANCELLED').length
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-slate-800 p-4 pt-10">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/" className="text-white text-xl">←</Link>
          <h1 className="text-lg font-bold text-white">Đơn của tôi</h1>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'ACCEPTED', label: 'Đang giao' },
            { key: 'DELIVERING', label: 'Hoàn thành' },
            { key: 'CANCELLED', label: 'Đã hủy' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                filter === tab.key ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {tab.label} ({counts[tab.key]})
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-5xl mb-4">📋</p>
            <p>Không có đơn hàng nào</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div
              key={order._id}
              className="card mb-3"
              onClick={() => navigate(`/order/${order._id}`)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-white font-bold">{order.orderCode || order._id?.slice(-8).toUpperCase()}</span>
                <span className={`status-badge ${STATUS_COLORS[order.status]} text-white`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-1">📍 {order.deliveryAddress?.slice(0, 50)}...</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-green-400 font-bold">+{order.deliveryFee?.toLocaleString()}đ</span>
                <span className="text-slate-500 text-xs">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 max-w-[430px] mx-auto">
        <div className="flex justify-around py-3">
          <Link to="/" className="flex flex-col items-center text-slate-400">
            <span className="text-xl">🏠</span>
            <span className="text-xs mt-1">Trang chủ</span>
          </Link>
          <Link to="/my-orders" className="flex flex-col items-center text-blue-400">
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
