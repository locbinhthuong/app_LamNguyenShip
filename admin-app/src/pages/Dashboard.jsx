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
  
  // Bộ lọc
  const [selectedDate, setSelectedDate] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);

  // Trạng thái cho Dọn dẹp dữ liệu
  const [cleanupMonths, setCleanupMonths] = useState(6);
  const [isCleaning, setIsCleaning] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await getDashboardStats({ date: selectedDate, weekOffset });
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
  }, [selectedDate, weekOffset]);

  useEffect(() => {
    // Load lần đầu và mỗi khi đổi bộ lọc
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-slate-800 sm:text-2xl">📊 Dashboard</h1>
          <span className="rounded-full bg-blue-600/20 px-2 py-0.5 text-[10px] font-bold text-blue-600 sm:text-xs">
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-medium text-slate-700 bg-transparent px-2 py-1 outline-none"
          />
          <button 
            onClick={() => setSelectedDate('')}
            className={`text-xs px-3 py-1 rounded-lg transition-colors ${!selectedDate ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Hôm nay
          </button>
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
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col max-h-[400px]">
          <div className="mb-3 flex items-center justify-between shrink-0">
            <h2 className="flex items-center gap-1.5 font-bold text-slate-800">
              <span>🟢</span> Tài xế đang hoạt động
            </h2>
            <Link to="/drivers" className="text-xs text-blue-600 hover:underline">Xem tất cả →</Link>
          </div>
          {(stats?.topDrivers || []).length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">Không có tài xế nào đang online</p>
          ) : (
            <div className="space-y-1.5 overflow-y-auto pr-1">
              {stats?.topDrivers?.map((d, i) => (
                <div key={d._id} className="flex items-center justify-between rounded-xl bg-green-50/40 border border-green-100/50 px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{d.name}</p>
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
            <div className="space-y-2 overflow-y-auto max-h-[400px] pr-1">
              {stats?.recentOrders?.map(order => (
                <div key={order._id} className="flex flex-col rounded-xl bg-blue-50/50 hover:bg-blue-100/50 p-3 transition-colors border border-blue-100/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs font-bold text-blue-600">
                        #{order.orderCode || order._id?.slice(-8).toUpperCase()}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold text-slate-800 ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-green-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format((order.deliveryFee || 0) + (order.extraSurcharge || 0))}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 text-[10px]">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-start gap-1.5">
                        <span className="text-slate-400">👤</span>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-700">Khách: </span>
                          <span className="text-slate-600 truncate block sm:inline">{order.customerName} - {order.customerPhone}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-slate-400">🛵</span>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-700">Tài xế: </span>
                          <span className={order.assignedTo?.name ? "text-blue-600 font-medium truncate block sm:inline" : "text-slate-400 italic block sm:inline"}>
                            {order.assignedTo?.name || 'Chưa có tài xế nhận'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-start gap-1.5">
                        <span className="text-orange-400 font-bold w-3 text-center">A</span>
                        <span className="text-slate-600 truncate" title={order.pickupAddress}>{order.pickupAddress || 'N/A'}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-blue-500 font-bold w-3 text-center">B</span>
                        <span className="text-slate-600 truncate" title={order.deliveryAddress}>{order.deliveryAddress || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bảng xếp hạng tuần */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="flex items-center gap-1.5 font-bold text-slate-800">
              <span className="text-xl">🏆</span> Xếp hạng tuần
            </h2>
            <span className="mt-1 rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold text-orange-600 uppercase tracking-wide w-fit">
              {stats?.weekRange 
                ? `Từ ${new Date(stats.weekRange.start).toLocaleDateString('vi-VN')} đến ${new Date(stats.weekRange.end).toLocaleDateString('vi-VN')}`
                : 'Đang tải...'}
            </span>
          </div>

          {/* Điều hướng tuần */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white shadow-sm hover:bg-slate-50 rounded-md transition-colors"
            >
              ← Tuần trước
            </button>
            <button 
              onClick={() => setWeekOffset(0)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${weekOffset === 0 ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
            >
              Tuần này
            </button>
            <button 
              onClick={() => setWeekOffset(prev => prev + 1)}
              disabled={weekOffset >= 0}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white shadow-sm hover:bg-slate-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Tuần sau →
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
            <thead className="bg-slate-50/80 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-center w-16">Hạng</th>
                <th className="px-4 py-3">Tài xế</th>
                <th className="px-4 py-3 text-center">Số đơn</th>
                <th className="px-4 py-3 text-right">Tổng cước</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(stats?.weeklyDriverStats || []).length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-12 text-center text-sm text-slate-500">
                    <p className="text-2xl mb-2">📭</p>
                    <p>Chưa có dữ liệu tuần này</p>
                  </td>
                </tr>
              ) : (
                stats?.weeklyDriverStats?.map((driver, index) => (
                  <tr key={driver._id?._id || index} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-center">
                      {index === 0 ? <span className="text-xl drop-shadow-sm">🥇</span> : 
                       index === 1 ? <span className="text-xl drop-shadow-sm">🥈</span> : 
                       index === 2 ? <span className="text-xl drop-shadow-sm">🥉</span> : 
                       <span className="text-sm font-bold text-slate-400 group-hover:text-slate-600">#{index + 1}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800 text-sm">{driver._id?.name || 'Không rõ'}</div>
                      <div className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5">{driver._id?.phone || '---'}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-blue-50 border border-blue-100 px-2 text-xs font-black text-blue-600 shadow-sm">
                        {driver.totalOrders}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-green-600 sm:text-base text-sm bg-green-50/50 px-2 py-1 rounded-lg">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(driver.totalMoney || 0)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
