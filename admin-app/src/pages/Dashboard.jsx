import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats, cleanupOldOrders, API_BASE_URL } from '../services/api';
import { startOfTodayVietnam } from '../utils/todayVietnam';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-500',
  ACCEPTED: 'bg-blue-500',
  PICKED_UP: 'bg-yellow-500',
  DELIVERING: 'bg-blue-600',
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
  const [loadError, setLoadError] = useState(null);

  // Trạng thái cho Dọn dẹp dữ liệu
  const [cleanupMonths, setCleanupMonths] = useState(6);
  const [isCleaning, setIsCleaning] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Không tải được thống kê (kiểm tra GET /api/orders/stats/dashboard và token admin).';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load lần đầu
    load();

    // Lắng nghe sự kiện kiện từ useAdminSocket.jsx (Singleton Socket)
    window.addEventListener('refresh_admin_orders', load);

    // Backup: polling 15s phòng khi socket lỗi
    const interval = setInterval(load, 15000);
    return () => {
      window.removeEventListener('refresh_admin_orders', load);
      clearInterval(interval);
    };
  }, [load]);


  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );

  if (!stats && loadError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="max-w-md text-sm text-red-400">{loadError}</p>
        <p className="max-w-md text-xs text-slate-500">
          Trang Đơn hàng dùng <code className="rounded bg-white px-1">GET /api/orders</code>; Dashboard dùng{' '}
          <code className="rounded bg-white px-1">GET /api/orders/stats/dashboard</code>. Nếu chỉ một trong hai lỗi, mở tab Network (F12) để xem status code.
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            load();
          }}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const o = stats?.orders || {};
  const t = stats?.today || {};

  const handleCleanup = async () => {
    if (!window.confirm(`⚠️ CẢNH BÁO NGUY HIỂM\n\nBạn có chắc chắn muốn xoá vĩnh viễn các đơn hàng đã hoàn thành và đã huỷ từ ${cleanupMonths} tháng trước?\n\nHành động này KHÔNG THỂ KHÔI PHỤC và sẽ làm mất lịch sử tra cứu của các đơn hàng này.`)) {
      return;
    }

    try {
      setIsCleaning(true);
      const res = await cleanupOldOrders(cleanupMonths);
      alert(`✅ Thành công!\n\n${res.message}`);
      load(); // Tải lại thống kê
    } catch (err) {
      alert(`❌ Lỗi: ${err.response?.data?.message || err.message || 'Không thể xoá dữ liệu'}`);
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="p-4 pb-8 sm:p-6">

      {/* Tiêu đề + ngày */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-slate-800 sm:text-2xl">📊 Dashboard</h1>
          <span className="rounded-full bg-blue-600/20 px-2 py-0.5 text-[10px] font-bold text-blue-600 sm:text-xs">
            LIVE
          </span>
        </div>
        <div className="text-xs text-slate-500">
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* 4 chỉ số chính — hero row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Shipper online */}
        <div className="group rounded-2xl border border-green-500/30 bg-gradient-to-b from-green-500/15 to-green-500/5 p-4 text-center transition-all hover:border-green-500/60">
          <p className="mb-1 text-3xl font-black text-green-400 sm:text-4xl">
            {stats?.drivers?.active || 0}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-green-300 sm:text-xs">Shipper Online</p>
          <p className="mt-1 text-[9px] text-gray-600 sm:text-[10px]">
            / {stats?.drivers?.total || 0} tổng tài xế
          </p>
        </div>

        {/* Đơn hàng hôm nay */}
        <div className="group rounded-2xl border border-blue-600/30 bg-gradient-to-b from-orange-500/15 to-orange-500/5 p-4 text-center transition-all hover:border-blue-600/60">
          <p className="mb-1 text-3xl font-black text-blue-600 sm:text-4xl">
            {t.total ?? 0}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-blue-500 sm:text-xs">Đơn hàng hôm nay</p>
          <p className="mt-1 text-[9px] text-gray-600 sm:text-[10px]">theo ngày tạo đơn</p>
        </div>

        {/* Đơn đang xử lí */}
        <div className="group rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-500/15 to-blue-500/5 p-4 text-center transition-all hover:border-blue-500/60">
          <p className="mb-1 text-3xl font-black text-blue-500 sm:text-4xl">
            {o.active ?? 0}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 sm:text-xs">Đơn đã có tài xế</p>
          <p className="mt-1 text-[9px] text-slate-500 sm:text-[10px] font-medium">Đơn treo chờ nhận: <span className="text-yellow-500 font-bold">{o.pending ?? 0}</span></p>
        </div>

        {/* Đơn hoàn thành */}
        <Link
          to="/orders?status=COMPLETED"
          className="group rounded-2xl border border-green-500/30 bg-gradient-to-b from-green-500/10 to-green-500/3 p-4 text-center transition-all hover:border-green-500/60 active:scale-95"
        >
          <p className="mb-1 text-3xl font-black text-green-400 sm:text-4xl">
            {o.completed ?? 0}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-green-300 sm:text-xs">Đơn hoàn thành</p>
          <p className="mt-1 text-[9px] text-gray-600 sm:text-[10px]">xem chi tiết →</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <Link
          to="/orders/create"
          className="flex items-center gap-2 rounded-2xl border border-blue-600/30 bg-blue-600/10 p-3 transition-all active:scale-95"
        >
          <span className="text-xl">📦</span>
          <div>
            <p className="text-xs font-bold text-slate-800">Tạo đơn mới</p>
            <p className="text-[10px] text-slate-500">Thêm đơn hàng</p>
          </div>
        </Link>
        <Link
          to="/orders"
          className="flex items-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3 transition-all active:scale-95"
        >
          <span className="text-xl">📋</span>
          <div>
            <p className="text-xs font-bold text-slate-800">Danh sách đơn</p>
            <p className="text-[10px] text-slate-500">Xem tất cả đơn</p>
          </div>
        </Link>
        <Link
          to="/drivers"
          className="flex items-center gap-2 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3 transition-all active:scale-95"
        >
          <span className="text-xl">🚗</span>
          <div>
            <p className="text-xs font-bold text-slate-800">Tài xế</p>
            <p className="text-[10px] text-slate-500">{stats?.drivers?.total || 0} tài xế</p>
          </div>
        </Link>
      </div>

      {/* Tài xế online + Đơn gần đây */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

        {/* Tài xế online */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-bold text-slate-800">
              <span>🚗</span> Tài xế online
            </h2>
            <Link to="/drivers" className="text-xs text-blue-600 hover:underline">Xem tất cả →</Link>
          </div>
          {(stats?.topDrivers || []).length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">Chưa có tài xế nào</p>
          ) : (
            <div className="space-y-1.5">
              {stats?.topDrivers?.slice(0, 6).map((d, i) => (
                <div key={d._id} className="flex items-center justify-between rounded-xl bg-blue-50/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                      i === 0 ? 'bg-yellow-500 text-black' : 'bg-gray-600 text-slate-600'
                    }`}>{i + 1}</span>
                    <div>
                      <p className="text-xs font-medium text-slate-800">{d.name}</p>
                      <p className="text-[10px] text-slate-500">{d.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-green-400">{d.stats?.completedOrders || 0}</p>
                    <p className="text-[10px] text-slate-500">đơn hoàn thành</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Đơn gần đây */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-bold text-slate-800">
              <span>📦</span> Đơn gần đây
            </h2>
            <Link to="/orders" className="text-xs text-blue-600 hover:underline">Xem tất cả →</Link>
          </div>
          {(stats?.recentOrders || []).length === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-1 text-3xl">📦</p>
              <p className="text-xs text-slate-500">Chưa có đơn hàng nào</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {stats?.recentOrders?.slice(0, 8).map(order => (
                <div key={order._id} className="flex items-center justify-between rounded-xl bg-blue-50 hover:bg-blue-100/40 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs font-bold text-blue-600">
                      #{order.orderCode || order._id?.slice(-8).toUpperCase()}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">{order.customerName} · {order.customerPhone}</p>
                  </div>
                  <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-800 ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dọn dẹp dữ liệu */}
      <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-1.5 font-bold text-red-700">
              <span>🧹</span> Bảo trì & Dọn dẹp dữ liệu
            </h2>
            <p className="text-xs text-red-600/80 mt-1">Xoá vĩnh viễn các đơn hàng cũ (đã giao/huỷ) để giảm tải cho máy chủ. Không thể khôi phục!</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={cleanupMonths}
              onChange={(e) => setCleanupMonths(Number(e.target.value))}
              className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 outline-none focus:border-red-500"
              disabled={isCleaning}
            >
              <option value={6}>Trang thái: Cũ hơn 6 tháng</option>
              <option value={3}>Trang thái: Cũ hơn 3 tháng</option>
              <option value={1}>Trang thái: Cũ hơn 1 tháng</option>
            </select>
            <button
              onClick={handleCleanup}
              disabled={isCleaning}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center min-w-[100px]"
            >
              {isCleaning ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Xoá ngay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
