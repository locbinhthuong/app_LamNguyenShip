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
    <div className="flex items-center justify-center h-screen"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
  );

  const o = stats?.orders || {};

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">📊 Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-gray-400 text-xs uppercase mb-1">Tổng đơn</p>
          <p className="text-3xl font-bold text-white">{o.total || 0}</p>
        </div>
        <div className="stat-card">
          <p className="text-gray-400 text-xs uppercase mb-1">Chờ xử lý</p>
          <p className="text-3xl font-bold text-yellow-400">{o.pending || 0}</p>
        </div>
        <div className="stat-card">
          <p className="text-gray-400 text-xs uppercase mb-1">Đang giao</p>
          <p className="text-3xl font-bold text-blue-400">{o.active || 0}</p>
        </div>
        <div className="stat-card">
          <p className="text-gray-400 text-xs uppercase mb-1">Hoàn thành</p>
          <p className="text-3xl font-bold text-green-400">{o.completed || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Drivers */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">🚗 Tài xế đang hoạt động</h2>
            <Link to="/drivers" className="text-orange-400 text-sm hover:underline">Xem tất cả</Link>
          </div>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 bg-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats?.drivers?.total || 0}</p>
              <p className="text-gray-400 text-xs">Tổng tài xế</p>
            </div>
            <div className="flex-1 bg-green-500/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{stats?.drivers?.active || 0}</p>
              <p className="text-gray-400 text-xs">Online</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Top tài xế:</p>
          <div className="mt-2 space-y-2">
            {stats?.topDrivers?.map(d => (
              <div key={d._id} className="flex justify-between items-center py-2 border-b border-gray-700">
                <div>
                  <p className="text-white text-sm">{d.name}</p>
                  <p className="text-gray-500 text-xs">{d.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-bold">{d.stats?.completedOrders || 0}</p>
                  <p className="text-gray-500 text-xs">đơn</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">📦 Đơn hàng gần đây</h2>
            <Link to="/orders" className="text-orange-400 text-sm hover:underline">Xem tất cả</Link>
          </div>
          <div className="space-y-2">
            {stats?.recentOrders?.map(order => (
              <div key={order._id} className="flex justify-between items-center py-2 border-b border-gray-700">
                <div>
                  <p className="text-white text-sm">{order.orderCode || order._id?.slice(-8).toUpperCase()}</p>
                  <p className="text-gray-500 text-xs">{order.customerName} • {order.customerPhone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[order.status]}`} />
                  <span className="text-gray-300 text-xs">{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <Link to="/orders/create" className="card hover:border-orange-500 transition-all cursor-pointer text-center">
          <p className="text-3xl mb-2">📦</p>
          <p className="text-white font-bold">Tạo đơn hàng mới</p>
          <p className="text-gray-400 text-sm mt-1">Thêm đơn hàng vào hệ thống</p>
        </Link>
        <Link to="/drivers/create" className="card hover:border-orange-500 transition-all cursor-pointer text-center">
          <p className="text-3xl mb-2">👤</p>
          <p className="text-white font-bold">Thêm tài xế mới</p>
          <p className="text-gray-400 text-sm mt-1">Đăng ký tài xế mới</p>
        </Link>
      </div>
    </div>
  );
}
