import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getDriverRevenue } from '../services/api';
import { useAuth } from '../context/AuthContext';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

export default function Earnings() {
  const { driver } = useAuth();
  const [stats, setStats] = useState({
    totalFee: 0,
    dailyFee: 0,
    weeklyFee: 0,
    monthlyFee: 0,
    totalDebt: 0,
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);

  const fetchEarnings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDriverRevenue();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (error) {
      console.error('Lỗi lấy dữ liệu thu nhập:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  return (
    <div className="min-h-screen bg-slate-900 pb-24 sm:pb-28">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-6 pt-[max(3rem,env(safe-area-inset-top))] text-center shadow-lg relative overflow-hidden">
        <div className="absolute -right-4 -top-8 text-emerald-500/20 h-32 w-32">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-sm font-bold text-green-100 uppercase tracking-widest relative z-10">Thu Nhập Hôm Nay</h1>
        <p className="mt-1 text-4xl font-black text-white relative z-10 drop-shadow-md">
          {formatCurrency(stats.dailyFee)}
        </p>
      </div>

      <div className="mx-auto max-w-lg p-4 sm:max-w-xl -mt-6 relative z-20">
        
        {/* Biểu Đồ Cột 7 Ngày */}
        {stats.chartData && stats.chartData.length > 0 && (
          <div className="rounded-2xl bg-slate-800 border border-slate-700 p-4 mb-4 shadow-xl">
            <h2 className="text-white font-bold mb-4 text-sm">Thống Kê Doanh Thu Tuần Đi Làm</h2>
            <div className="flex items-end justify-between h-48 gap-1 px-1">
              {stats.chartData.map((d, idx) => {
                const maxFee = Math.max(...stats.chartData.map(c => c.fee));
                const heightPercent = maxFee > 0 ? (d.fee / maxFee) * 100 : 0;
                // Nếu có cước thì min cao là 12%, nếu không có cước thì cao 2% để làm nền xám
                const finalHeight = d.fee > 0 ? Math.max(12, heightPercent) : 2;
                
                // Format text hiển thị đẹp mắt (Bỏ số lẻ)
                const feeText = d.fee >= 1000000 
                  ? (d.fee / 1000000).toFixed(1).replace('.0', '') + 'M' 
                  : d.fee > 0 ? Math.round(d.fee / 1000) + 'k' : '';

                return (
                  <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end relative group">
                    
                    {/* Chữ hiển thị Tiền & Số đơn Mọc lên trên Cột */}
                    {d.fee > 0 && (
                      <div className="flex flex-col items-center mb-1 drop-shadow-md">
                        <span className="text-[10px] text-emerald-100 font-bold whitespace-nowrap">{feeText}</span>
                        {d.orders > 0 && <span className="text-[8px] text-slate-400 whitespace-nowrap">{d.orders} đơn</span>}
                      </div>
                    )}

                    {/* Cái Cột Phép Thuật */}
                    <div 
                      className={`w-full max-w-[28px] sm:max-w-[40px] rounded-[4px] transition-all duration-1000 ${
                        d.fee > 0 ? 'bg-gradient-to-t from-emerald-600 to-green-400 shadow-[0_0_8px_rgba(52,211,153,0.3)] group-hover:from-emerald-500 group-hover:to-green-300' : 'bg-slate-700/50'
                      }`}
                      style={{ height: `${finalHeight}%` }}
                    ></div>

                    {/* Tên Ngày ở Dưới Cùng */}
                    <div className="text-[10px] font-medium text-slate-400 mt-2 text-center w-full">
                      {d.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Nợ 15% Platform - Cảnh báo */}
        <div className="rounded-2xl bg-slate-800 border border-red-500/30 p-4 mb-4 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Nợ Phí Nền Tảng (15%)</p>
            <p className="text-xl font-bold text-red-500">{formatCurrency(stats.totalDebt)}</p>
          </div>
          <div className="bg-red-500/10 p-3 rounded-full border border-red-500/20">
            <span className="text-xl">🧾</span>
          </div>
        </div>

        {/* Bảng Kê Doanh Thu Tổng */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 shadow-md">
            <p className="text-xs text-slate-400 mb-1">Tuần này</p>
            <p className="text-lg font-bold text-white">{formatCurrency(stats.weeklyFee)}</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 shadow-md">
            <p className="text-xs text-slate-400 mb-1">Tháng này</p>
            <p className="text-lg font-bold text-white">{formatCurrency(stats.monthlyFee)}</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-emerald-700/50 bg-emerald-900/20 p-4 shadow-md text-center">
            <p className="text-xs text-emerald-400 mb-1">Tổng Tích Lũy Từ Trước Đến Nay</p>
            <p className="text-2xl font-black text-emerald-400">{formatCurrency(stats.totalFee)}</p>
          </div>
        </div>

        {/* Lịch Sử Cuốc Xe Mới Nhất */}
        <h2 className="text-white font-bold mb-3 px-1">Lịch Sử Cuốc Giao Gần Nhất</h2>
        {loading ? (
           <div className="flex justify-center py-6">
             <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
           </div>
        ) : stats.recentOrders.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 text-center">
            <p className="text-4xl opacity-50 mb-2">💸</p>
            <p className="text-slate-400 text-sm">Bạn chưa hoàn thành đơn hàng nào.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.recentOrders.map(order => (
              <div key={order.id} className="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow flex justify-between items-center">
                <div>
                  <p className="text-white font-bold text-sm mb-1">{order.orderCode}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                     <span className="inline-block w-2 h-2 rounded-full bg-slate-500"></span> 
                     {new Date(order.date).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-1">Khách: {order.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-bold text-lg">+{formatCurrency(order.deliveryFee)}</p>
                  <p className="text-[10px] text-red-500 bg-red-500/10 px-2 py-0.5 rounded mt-1 inline-block">Nợ -{formatCurrency(order.deliveryFee * 0.15)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="bottom-nav-safe">
        <div className="mx-auto flex max-w-xl justify-around py-3">
          <Link to="/" className="flex flex-col items-center text-slate-400">
            <span className="text-xl">🏠</span>
            <span className="text-xs mt-1">Trang chủ</span>
          </Link>
          <Link to="/my-orders" className="flex flex-col items-center text-slate-400">
            <span className="text-xl">📋</span>
            <span className="text-xs mt-1">Đơn của tôi</span>
          </Link>
          <Link to="/earnings" className="flex flex-col items-center text-emerald-400">
            <span className="text-xl drop-shadow-md">💰</span>
            <span className="text-xs mt-1 font-bold">Thu nhập</span>
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
