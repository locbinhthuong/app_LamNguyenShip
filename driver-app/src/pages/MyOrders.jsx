import { useState, useEffect, useCallback, useMemo } from 'react';
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
  DELIVERING: 'bg-blue-600',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-red-500'
};

const getServiceBadge = (type) => {
  switch(type) {
    case 'DAT_XE': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200">🛵 CHỞ KHÁCH</span>;
    case 'MUA_HO': return <span className="bg-lime-100 text-lime-700 px-2 py-0.5 rounded text-[10px] font-bold border border-lime-200">🛒 MUA HỘ</span>;
    case 'DIEU_PHOI': return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-200">🛠️ KÈM THỢ</span>;
    case 'GIAO_HANG':
    default: return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-200">📦 GIAO HÀNG</span>;
  }
};

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    
    // Tính đầu tuần (Thứ 2)
    const currentDay = now.getDay() || 7; 
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - currentDay + 1);
    weekStart.setHours(0,0,0,0);

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Chart Data (7 Days)
    const chartMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      let label = d.toLocaleDateString('vi-VN', { weekday: 'short' });
      label = label === 'CN' ? 'CN' : label.replace(/^T/, 'T');
      chartMap[d.toDateString()] = { label, orders: 0 };
    }

    let dCount = 0, wCount = 0, mCount = 0, yCount = 0;

    orders.forEach(o => {
      if (o.status !== 'COMPLETED') return;
      const oDate = new Date(o.updatedAt || o.createdAt);
      const oDateStr = oDate.toDateString();
      
      if (chartMap[oDateStr]) chartMap[oDateStr].orders += 1;
      if (oDateStr === todayStr) dCount += 1;
      if (oDate >= weekStart) wCount += 1;
      if (oDate.getMonth() === currentMonth && oDate.getFullYear() === currentYear) mCount += 1;
      if (oDate.getFullYear() === currentYear) yCount += 1;
    });

    return { 
      day: dCount, 
      week: wCount, 
      month: mCount, 
      year: yCount,
      chartData: Object.values(chartMap)
    };
  }, [orders]);

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
    : filter === 'DELIVERING'
      ? orders.filter(o => ['PICKED_UP', 'DELIVERING', 'ACCEPTED'].includes(o.status))
      : orders.filter(o => o.status === filter);

  const counts = {
    all: orders.length,
    ACCEPTED: orders.filter(o => o.status === 'ACCEPTED').length,
    DELIVERING: orders.filter(o => ['PICKED_UP', 'DELIVERING'].includes(o.status)).length,
    COMPLETED: orders.filter(o => o.status === 'COMPLETED').length,
    CANCELLED: orders.filter(o => o.status === 'CANCELLED').length
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 sm:pb-28">
      {/* Header */}
      <div className="bg-white p-4 pt-[max(2.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3 mb-3">
          <Link to="/" className="text-slate-800 text-xl font-bold p-1 rounded-full bg-slate-100 hover:bg-slate-200 w-8 h-8 flex items-center justify-center transition-colors">←</Link>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Thống Kê Đơn Hàng</h1>
        </div>

        {/* Biểu Đồ Cột 7 Ngày Mới */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-4 overflow-hidden">
          <h2 className="text-slate-800 font-black mb-4 text-sm tracking-tight text-center">Hoạt Động 7 Ngày Qua</h2>
          <div className="flex items-end justify-between h-32 gap-1 px-1">
             {stats.chartData.map((d, idx) => {
                const maxOrders = Math.max(...stats.chartData.map(c => c.orders), 1);
                const heightPercent = (d.orders / maxOrders) * 100;
                const finalHeight = d.orders > 0 ? Math.max(12, heightPercent) : 2;
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end relative group">
                    {d.orders > 0 && (
                      <span className="text-[10px] text-blue-600 font-bold whitespace-nowrap mb-1 drop-shadow-sm">{d.orders}</span>
                    )}
                    <div 
                      className={`w-full max-w-[28px] sm:max-w-[40px] rounded-[4px] transition-all duration-500 ${
                        d.orders > 0 ? 'bg-gradient-to-t from-blue-500 to-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.3)]' : 'bg-slate-100'
                      }`}
                      style={{ height: `${finalHeight}%` }}
                    ></div>
                    <div className="text-[10px] font-medium text-slate-500 mt-2 text-center w-full">
                      {d.label}
                    </div>
                  </div>
                );
             })}
          </div>
        </div>

        {/* Khung Thống Kê Nhập Liền / Gạch Ngang Mới */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col mb-4 overflow-hidden divide-y divide-slate-100">
          <div className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
             <span className="text-sm font-bold text-slate-500 flex items-center gap-2"><span className="text-xl">⚡</span> Hôm Nay</span>
             <span className="text-lg font-black text-blue-600">{stats.day} Đơn</span>
          </div>
          <div className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
             <span className="text-sm font-bold text-slate-500 flex items-center gap-2"><span className="text-xl">📅</span> Tuần Này</span>
             <span className="text-lg font-black text-blue-600">{stats.week} Đơn</span>
          </div>
          <div className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
             <span className="text-sm font-bold text-slate-500 flex items-center gap-2"><span className="text-xl">🏆</span> Tháng Này</span>
             <span className="text-lg font-black text-blue-600">{stats.month} Đơn</span>
          </div>
          <div className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
             <span className="text-sm font-bold text-slate-500 flex items-center gap-2"><span className="text-xl">📦</span> Năm Nay</span>
             <span className="text-lg font-black text-blue-600">{stats.year} Đơn</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'DELIVERING', label: 'Đang giao' },
            { key: 'COMPLETED', label: 'Hoàn thành' },
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
      <div className="mx-auto max-w-lg p-4 sm:max-w-xl">
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
                <div className="flex flex-col gap-1">
                  <span className="text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded text-xs inline-block">{order.orderCode || order._id?.slice(-8).toUpperCase()}</span>
                  <div className="mt-0.5">{getServiceBadge(order.serviceType)}</div>
                </div>
                <span className={`status-badge ${STATUS_COLORS[order.status]} text-slate-800 shrink-0 mt-1`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>
              <p className="text-slate-500 text-sm mb-1">📍 {order.deliveryAddress?.slice(0, 50)}...</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-green-400 font-bold">+{order.deliveryFee?.toLocaleString()}đ</span>
                <span className="text-slate-500 text-xs">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Nav */}
      <div className="bottom-nav-safe">
        <div className="mx-auto flex max-w-xl justify-around py-3">
          <Link to="/" className="flex flex-col items-center text-slate-500">
            <span className="text-xl">🏠</span>
            <span className="text-xs mt-1">Trang chủ</span>
          </Link>
          <Link to="/my-orders" className="flex flex-col items-center text-blue-400">
            <span className="text-xl">📋</span>
            <span className="text-xs mt-1">Đơn của tôi</span>
          </Link>
          <Link to="/earnings" className="flex flex-col items-center text-slate-400 hover:text-slate-600 transition-colors">
            <span className="text-xl">💰</span>
            <span className="text-xs mt-1 font-medium">Thu nhập</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
