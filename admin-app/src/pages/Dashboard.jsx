import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../services/api';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-500',
  ACCEPTED: 'bg-blue-500',
  PICKED_UP: 'bg-yellow-500',
  DELIVERING: 'bg-orange-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-red-500'
};

const STATUS_LABELS = {
  PENDING: 'Chờ nhận',
  ACCEPTED: 'Đã nhận',
  PICKED_UP: 'Đã lấy',
  DELIVERING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy'
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await getDashboardStats();
      setStats(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); const interval = setInterval(load, 15000); return () => clearInterval(interval); }, [load]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
    </div>
  );

  const o = stats?.orders || {};

  return (
    <div className="p-4 pb-8 sm:p-6">

      {/* Tiêu đề */}
      <div className="mb-5 flex items-center gap-2">
        <h1 className="text-lg font-bold text-white sm:text-2xl">📊 Dashboard</h1>
        <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-400 sm:text-xs">
          LIVE
        </span>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        {[
          { label: 'Tổng đơn', value: o.total || 0, color: 'text-white', bg: 'bg-gray-800', border: 'border-gray-700' },
          { label: 'Chờ xử lý', value: o.pending || 0, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
          { label: 'Đang giao', value: o.active || 0, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
          { label: 'Hoàn thành', value: o.completed || 0, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
        ].map((item, i) => (
          <div key={i} className={`rounded-2xl border p-3 text-center sm:p-4 ${item.bg} ${item.border}`}>
            <p className={`mb-0.5 text-2xl font-black sm:text-3xl ${item.color}`}>{item.value}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 sm:text-xs">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Driver stats + Recent Orders — xếp cột trên mobile */}
      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">

        {/* Tài xế */}
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-white">🚗 Tài xế</h2>
            <Link to="/drivers" className="text-xs text-orange-400 hover:underline">Xem tất cả →</Link>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-gray-700 p-3 text-center">
              <p className="text-xl font-black text-white">{stats?.drivers?.total || 0}</p>
              <p className="text-[10px] text-gray-400">Tổng</p>
            </div>
            <div className="rounded-xl bg-green-500/10 p-3 text-center">
              <p className="text-xl font-black text-green-400">{stats?.drivers?.active || 0}</p>
              <p className="text-[10px] text-gray-400">Online</p>
            </div>
          </div>
          {(stats?.topDrivers || []).length === 0 ? (
            <p className="py-3 text-center text-xs text-gray-500">Chưa có tài xế</p>
          ) : (
            <div className="space-y-1">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">Top tài xế</p>
              {stats?.topDrivers?.map((d, i) => (
                <div key={d._id} className="flex items-center justify-between rounded-xl bg-gray-700/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                      i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : 'bg-orange-800 text-orange-200'
                    }`}>{i + 1}</span>
                    <div>
                      <p className="text-xs font-medium text-white">{d.name}</p>
                      <p className="text-[10px] text-gray-500">{d.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-green-400">{d.stats?.completedOrders || 0}</p>
                    <p className="text-[10px] text-gray-500">đơn</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Đơn gần đây */}
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-white">📦 Đơn gần đây</h2>
            <Link to="/orders" className="text-xs text-orange-400 hover:underline">Xem tất cả →</Link>
          </div>
          {(stats?.recentOrders || []).length === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-1 text-3xl">📦</p>
              <p className="text-xs text-gray-500">Chưa có đơn hàng nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats?.recentOrders?.map(order => (
                <div key={order._id} className="flex items-center justify-between rounded-xl bg-gray-700/40 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs font-bold text-orange-400">
                      #{order.orderCode || order._id?.slice(-8).toUpperCase()}
                    </p>
                    <p className="truncate text-[10px] text-gray-400">{order.customerName} · {order.customerPhone}</p>
                  </div>
                  <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Link
          to="/orders/create"
          className="group flex flex-col items-center justify-center gap-1 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-center transition-all active:scale-95 sm:flex-row sm:text-left"
        >
          <span className="text-2xl sm:text-3xl">📦</span>
          <div>
            <p className="text-sm font-bold text-white">Tạo đơn mới</p>
            <p className="text-[10px] text-gray-400">Thêm đơn hàng vào hệ thống</p>
          </div>
        </Link>
        <Link
          to="/drivers/create"
          className="group flex flex-col items-center justify-center gap-1 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-center transition-all active:scale-95 sm:flex-row sm:text-left"
        >
          <span className="text-2xl sm:text-3xl">👤</span>
          <div>
            <p className="text-sm font-bold text-white">Thêm tài xế</p>
            <p className="text-[10px] text-gray-400">Đăng ký tài xế mới</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
