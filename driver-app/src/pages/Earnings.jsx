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
    totalWalletBonus: 0,
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);

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

        {/* Nợ 15% Platform & Vùng Thanh Toán */}
        <div className="rounded-2xl bg-sky-50/80 border border-sky-100 p-4 mb-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-sky-700 mb-1 font-semibold flex items-center gap-1">
                <span>Cần Nộp Hôm Nay (15%)</span>
              </p>
              <p className="text-xl font-black text-sky-800 drop-shadow-sm">{formatCurrency(stats.dailyFee * 0.15)}</p>
            </div>
            <div className="h-10 w-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg text-lg transform rotate-[-5deg]">
              🧾
            </div>
          </div>
          
          <button 
            onClick={() => setShowQRModal(true)}
            disabled={stats.dailyFee === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            <span>📱</span> Quét Chuyển Khoản Ngay
          </button>
        </div>

        {/* Ví Tài Xế */}
        <div className="rounded-2xl bg-emerald-50/80 border border-emerald-100 p-4 mb-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-emerald-700 mb-1 font-semibold flex items-center gap-1">
                <span>Ví Tài Xế (Tiền Thưởng / Chờ Rút)</span>
              </p>
              <p className="text-xl font-black text-emerald-800 drop-shadow-sm">{formatCurrency(stats.totalWalletBonus)}</p>
            </div>
            <div className="h-10 w-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center text-white shadow-lg text-lg transform rotate-[5deg]">
              🏦
            </div>
          </div>
          
          <button 
            onClick={() => window.open('https://zalo.me/0827758062', '_blank')}
            className={`w-full font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] ${stats.totalWalletBonus > 0 ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 text-slate-500 pointer-events-none'}`}
          >
            <span>💳</span> Yêu Cầu Rút Tiền Ví
          </button>
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

      {/* Modal QR Code Thanh Toán Động VietQR */}
      {showQRModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-sky-500 p-4 flex justify-between items-center text-white">
              <div>
                 <h3 className="font-bold text-lg">Mã QR Thanh Toán Nợ</h3>
                 <p className="text-xs opacity-90">Bank: MB • NGUYEN LAM NGUYEN</p>
              </div>
              <button onClick={() => setShowQRModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/30 transition-colors">
                ✕
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center justify-center bg-slate-50 relative">
              <div className="mb-4 text-center">
                <p className="text-sm font-semibold text-slate-500 mb-1">CÔNG NỢ CẦN THANH TOÁN</p>
                <div className="text-3xl font-black text-blue-600 tabular-nums tracking-tight bg-blue-100 px-4 py-2 rounded-2xl border-2 border-blue-200 border-dashed inline-block">
                  {formatCurrency(stats.dailyFee * 0.15)}
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 relative mb-4">
                <img 
                  src={`https://img.vietqr.io/image/MB-0857986911-compact2.jpg?amount=${Math.round(stats.dailyFee * 0.15)}&addInfo=Thanh toan cong no ngay ${new Date().toLocaleDateString('vi-VN')} lai xe ${driver?.driverCode || ''}&accountName=NGUYEN LAM NGUYEN`} 
                  alt="QR Code Công Nợ" 
                  className="w-56 h-56 object-contain mix-blend-multiply"
                />
              </div>

              <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 w-full space-y-2">
                 <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Mã giao dịch:</span>
                    <span className="text-sky-700 bg-sky-100 px-2 py-0.5 rounded uppercase">{driver?.driverCode || 'N/A'}</span>
                 </div>
                 <div className="flex justify-between text-[11px] font-medium text-slate-500">
                    <p className="text-center w-full">Vui lòng quét bằng app ngân hàng hoặc Momo, ZaloPay để thanh toán chính xác.</p>
                 </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
