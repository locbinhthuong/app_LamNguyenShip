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
    <div className="min-h-screen bg-white pb-24 sm:pb-28">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-sky-400 p-6 pt-[max(3rem,env(safe-area-inset-top))] text-center shadow-lg relative overflow-hidden">
        <div className="absolute -right-4 -top-8 text-sky-300/30 h-32 w-32">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-sm font-bold text-white uppercase tracking-widest relative z-10 drop-shadow-sm">Thu Nhập Hôm Nay</h1>
        <p className="mt-1 text-4xl font-black text-white relative z-10 drop-shadow-md">
          {formatCurrency(stats.dailyFee)}
        </p>
      </div>

      <div className="mx-auto max-w-lg p-4 sm:max-w-xl -mt-6 relative z-20">
        
        {/* Biểu Đồ Cột 7 Ngày */}
        {stats.chartData && stats.chartData.length > 0 && (
          <div className="rounded-2xl bg-blue-50/80 border border-blue-100 p-4 mb-4 shadow-sm">
            <h2 className="text-slate-800 font-bold mb-4 text-sm">Thống Kê Doanh Thu Tuần Đi Làm</h2>
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
                        <span className="text-[10px] text-blue-600 font-bold whitespace-nowrap">{feeText}</span>
                        {d.orders > 0 && <span className="text-[8px] text-slate-500 whitespace-nowrap">{d.orders} đơn</span>}
                      </div>
                    )}

                    {/* Cái Cột Phép Thuật */}
                    <div 
                      className={`w-full max-w-[28px] sm:max-w-[40px] rounded-[4px] transition-all duration-1000 ${
                        d.fee > 0 ? 'bg-gradient-to-t from-blue-500 to-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.3)] group-hover:from-blue-400 group-hover:to-sky-300' : 'bg-slate-100'
                      }`}
                      style={{ height: `${finalHeight}%` }}
                    ></div>

                    {/* Tên Ngày ở Dưới Cùng */}
                    <div className="text-[10px] font-medium text-slate-500 mt-2 text-center w-full">
                      {d.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Nợ 15% Platform */}
        <div className="rounded-2xl bg-sky-50/80 border border-sky-100 p-4 mb-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-sky-700 mb-1 font-semibold">Cần Nộp Hôm Nay (15%)</p>
            <p className="text-xl font-bold text-sky-800 drop-shadow-sm">{formatCurrency(stats.dailyFee * 0.15)}</p>
          </div>
          <div className="h-10 w-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 shadow-inner">
            🧾
          </div>
        </div>

        {/* Thống kê 2 cột */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-2xl bg-blue-50/80 border border-blue-100 p-4 shadow-sm">
            <p className="text-xs text-blue-600 mb-1 font-semibold">Tuần này</p>
            <p className="text-lg font-bold text-blue-800">{formatCurrency(stats.weeklyFee)}</p>
          </div>
          <div className="rounded-2xl bg-blue-50/80 border border-blue-100 p-4 shadow-sm">
            <p className="text-xs text-blue-600 mb-1 font-semibold">Tháng này</p>
            <p className="text-lg font-bold text-blue-800">{formatCurrency(stats.monthlyFee)}</p>
          </div>
        </div>
        {/* Thu Nhập Cả Tháng */}
        <div className="rounded-2xl bg-blue-100 border border-blue-200 p-4 mb-6 text-center shadow-md">
          <p className="text-xs text-blue-600 font-semibold mb-1">Tổng Tích Lũy Từ Trước Đến Nay</p>
          <p className="text-2xl font-black text-blue-700 drop-shadow-sm shadow-blue-500/20">{formatCurrency(stats.totalFee)}</p>
        </div>

        {/* Lịch Sử Cuốc Xe Mới Nhất */}
        <h2 className="text-slate-800 font-bold mb-3 px-1">Lịch Sử Cuốc Giao Gần Nhất</h2>
        {loading ? (
           <div className="flex justify-center py-6">
             <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
           </div>
        ) : stats.recentOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center">
            <p className="text-4xl opacity-50 mb-2">💸</p>
            <p className="text-slate-500 text-sm">Bạn chưa hoàn thành đơn hàng nào.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.recentOrders.map(order => (
              <div key={order.id} className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100 shadow-sm flex justify-between items-center">
                <div>
                  <p className="text-slate-800 font-bold text-sm mb-1">{order.orderCode}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                     <span className="inline-block w-2 h-2 rounded-full bg-slate-500"></span> 
                     {new Date(order.date).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-1">Khách: {order.customerName}</p>
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
          <Link to="/" className="flex flex-col items-center text-slate-400 hover:text-slate-600 transition-colors">
            <span className="text-xl">🏠</span>
            <span className="text-xs mt-1 font-medium">Trang chủ</span>
          </Link>
          <Link to="/my-orders" className="flex flex-col items-center text-slate-400 hover:text-slate-600 transition-colors">
            <span className="text-xl">📋</span>
            <span className="text-xs mt-1 font-medium">Đơn của tôi</span>
          </Link>
          <Link to="/earnings" className="flex flex-col items-center text-blue-600">
            <span className="text-xl">💰</span>
            <span className="text-xs mt-1 font-medium">Thu nhập</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
