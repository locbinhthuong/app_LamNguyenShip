import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDriverRevenue, requestDebtPayment, getMyDebtDetail, getMyWalletDetail, requestWithdraw } from '../services/api';
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
  const [activeTab, setActiveTab] = useState('revenue'); // 'revenue' | 'wallet'
  
  // States cho Công Nợ Chi Tiết
  const [debtTransactions, setDebtTransactions] = useState([]);
  
  // States cho Ví Rút / Nạp
  const [walletDetail, setWalletDetail] = useState({ availableBalance: 0, paddingAmount: 0, transactions: [] });
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', bankName: '', accountNumber: '', accountName: '' });
  
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestPayment = async () => {
    try {
      setIsRequesting(true);
      const res = await requestDebtPayment(driver._id, stats.totalDebt);
      if (res.success) {
        alert('✅ Đã gửi yêu cầu xác nhận thanh toán nợ đến Tổng đài. Vui lòng chờ Sếp kiểm tra.');
        setShowQRModal(false);
      }
    } catch (error) {
      alert('Lỗi khi gửi yêu cầu. Vui lòng thử lại sau.');
    } finally {
      setIsRequesting(false);
    }
  };

  const fetchEarnings = useCallback(async () => {
    try {
      setLoading(true);
      
      const [resRev, resDebt, resWallet] = await Promise.all([
        getDriverRevenue(),
        getMyDebtDetail().catch(() => ({ success: false })),
        getMyWalletDetail().catch(() => ({ success: false }))
      ]);

      if (resRev.success && resRev.data) {
        setStats(resRev.data);
      }
      if (resDebt.success && resDebt.data) {
        setDebtTransactions(resDebt.data.transactions || []);
      }
      if (resWallet.success && resWallet.data) {
        setWalletDetail(resWallet.data);
      }
    } catch (error) {
      console.error('Lỗi lấy dữ liệu thu nhập:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsRequesting(true);
      const res = await requestWithdraw(withdrawForm.amount, withdrawForm.bankName, withdrawForm.accountNumber, withdrawForm.accountName);
      if (res.success) {
        alert('Đã gửi Lệnh Rút Tiền thành công! Vui lòng chờ Admin duyệt vào sáng mai.');
        setShowWithdrawModal(false);
        setWithdrawForm({ amount: '', bankName: '', accountNumber: '', accountName: '' });
        fetchEarnings(); // Refresh
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi gửi yêu cầu rút tiền');
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  useEffect(() => {
    window.addEventListener('driver_wallet_updated', fetchEarnings);
    window.addEventListener('driver_debt_updated', fetchEarnings);
    return () => {
      window.removeEventListener('driver_wallet_updated', fetchEarnings);
      window.removeEventListener('driver_debt_updated', fetchEarnings);
    };
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
        <h1 className="text-sm font-bold text-white uppercase tracking-widest relative z-10 drop-shadow-sm">Doanh Thu Của Mì Hôm Nay</h1>
        <p className="mt-1 text-4xl font-black text-white relative z-10 drop-shadow-md">
          {formatCurrency(stats.dailyFee)}
        </p>

        {/* TABS SWITCHER */}
        <div className="flex bg-white/20 p-1 rounded-xl w-fit mx-auto mt-6 relative z-10">
           <button 
             onClick={() => setActiveTab('revenue')}
             className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'revenue' ? 'bg-white text-blue-600 shadow-md' : 'text-white/80 hover:text-white'}`}
           >
             📈 Báo Cáo
           </button>
           <button 
             onClick={() => setActiveTab('wallet')}
             className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'wallet' ? 'bg-white text-emerald-600 shadow-md' : 'text-white/80 hover:text-white'}`}
           >
             🏦 Ví Điện Tử
           </button>
        </div>
      </div>

      <div className="mx-auto max-w-lg p-4 sm:max-w-xl relative z-20">
        
        {/* ===================== TAB 1: BÁO CÁO DOANH THU & NỢ ===================== */}
        {activeTab === 'revenue' && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Lịch Sử Cuốc Xe Mới Nhất chuyển lên Tab ví hoặc giữ ở đây? Giữ ở đây hoặc dưới list Nợ */}
            
            {/* Vùng Thanh Toán Nợ Chi Tiết Nằm Đầu */}
            <div className="rounded-2xl bg-sky-50/80 border border-sky-100 p-4 mb-4 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-sky-700 mb-1 font-semibold flex items-center gap-1">
                    <span>Tổng Nợ Hệ Thống Của Mì</span>
                  </p>
                  <p className="text-2xl font-black text-sky-800 drop-shadow-sm">{formatCurrency(stats.totalDebt)}</p>
                </div>
                <div className="h-10 w-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg text-lg transform rotate-[-5deg]">
                  🧾
                </div>
              </div>
              
              <button 
                onClick={() => setShowQRModal(true)}
                disabled={!stats.totalDebt || stats.totalDebt <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                <span>📱</span> Thanh Toán Gạch Nợ Ngay
              </button>
            </div>

            {/* Chi tiết từng ngày - Lịch sử cấn nợ (Công nợ theo dòng thời gian) */}
            <h2 className="text-slate-800 font-bold mt-6 mb-3 px-1">Lịch Sử Cấn Nợ / Nạp Rút Sổ Đen</h2>
            {loading ? (
                <div className="flex justify-center p-4">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : debtTransactions.length === 0 ? (
                <div className="bg-slate-50 p-4 rounded-xl text-center text-slate-500 text-sm">Chưa có lịch sử phát sinh công nợ</div>
            ) : (
                <div className="space-y-3 mb-6 max-h-80 overflow-y-auto pr-1">
                  {debtTransactions.map((dtx) => (
                     <div key={dtx._id} className="bg-white border text-sm border-slate-200 p-3 rounded-xl flex justify-between items-center shadow-sm">
                       <div>
                          <p className={`font-semibold ${dtx.type === 'PENALTY' ? 'text-red-600' : 'text-emerald-600'}`}>
                             {dtx.type === 'PENALTY' ? '🔴 Trừ tiền Nợ' : '🟢 Thanh Toán Vô Ví Nợ'}
                          </p>
                          <p className="text-slate-500 text-xs mt-0.5 line-clamp-1 w-48">{dtx.description}</p>
                          <p className="text-slate-400 text-[10px] mt-0.5">{new Date(dtx.createdAt).toLocaleString('vi-VN')}</p>
                       </div>
                       <div className="text-right">
                          <p className={`font-black ${dtx.amount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {dtx.amount > 0 ? '+' : ''}{formatCurrency(dtx.amount)}
                          </p>
                       </div>
                     </div>
                  ))}
                </div>
            )}

            {/* Biểu Đồ Cột 7 Ngày (Chuyển xuống dưới Sổ Đen) */}
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

        </div>
        )}

      {/* ===================== TAB 2: VÍ RÚT TIỀN (WALLET) ===================== */}
      {activeTab === 'wallet' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
           {/* Card Ví Tiền */}
           <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-400 p-6 mb-6 shadow-xl relative overflow-hidden text-white">
              <div className="absolute right-0 top-0 opacity-10">
                 <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 7H4A2 2 0 002 9V19A2 2 0 004 21H20A2 2 0 0022 19V9A2 2 0 0020 7ZM20 19H4V13H20V19ZM20 11H4V9H20V11Z" />
                 </svg>
              </div>
              <p className="text-emerald-100 font-medium text-sm mb-1 uppercase tracking-wider relative z-10">Số Dư Hoàn COD / Thưởng</p>
              <h2 className="text-4xl font-black mb-4 relative z-10 drop-shadow-md">
                 {formatCurrency(walletDetail.availableBalance || 0)}
              </h2>
              
              {walletDetail.pendingAmount > 0 && (
                <div className="bg-emerald-900/30 w-fit px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md mb-4 border border-emerald-400/20">
                   ⏳ Đang chờ duyệt chi: {formatCurrency(walletDetail.pendingAmount)}
                </div>
              )}

              <button 
                onClick={() => setShowWithdrawModal(true)}
                disabled={(walletDetail.availableBalance || 0) < 50000}
                className="w-full bg-white text-emerald-600 hover:bg-emerald-50 font-black py-4 px-4 rounded-2xl flex items-center justify-center gap-2 transition-transform shadow-lg active:scale-[0.98] disabled:opacity-80 disabled:active:scale-100 disabled:pointer-events-none"
              >
                <span>🚀</span> ĐẶT LỆNH RÚT TIỀN
              </button>
              {(walletDetail.availableBalance || 0) < 50000 && (
                 <p className="text-center text-[10px] text-emerald-100 mt-2">Cần tối thiểu 50,000đ để rút</p>
              )}
           </div>

           {/* Lịch Sử Giao Dịch Ví Điện Tử */}
           <h2 className="text-slate-800 font-bold mb-3 px-1">Lịch sử Giao Dịch / Rút Tiền</h2>
           {loading ? (
                <div className="flex justify-center p-4">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : walletDetail.transactions.length === 0 ? (
                <div className="bg-slate-50 p-6 rounded-2xl text-center text-slate-500 text-sm border-dashed border-2 border-slate-200">
                  <p className="text-3xl mb-2 grayscale">📭</p>
                  Chưa có lịch sử rút/nạp tiền nào
                </div>
            ) : (
                <div className="space-y-3 mb-6 pb-20 max-h-[500px] overflow-y-auto pr-1">
                  {walletDetail.transactions.map((wtx) => {
                     let colorObj = { icon: '💰', color: 'text-emerald-600', bg: 'bg-emerald-50' };
                     if (wtx.type === 'WITHDRAW_REQUEST') colorObj = { icon: '⏳', color: 'text-amber-600', bg: 'bg-amber-50' };
                     if (wtx.type === 'WITHDRAW_REJECT') colorObj = { icon: '❌', color: 'text-red-600', bg: 'bg-red-50' };
                     if (wtx.type === 'ADMIN_ADJUST' && wtx.amount < 0) colorObj = { icon: '📉', color: 'text-orange-600', bg: 'bg-orange-50' };

                     return (
                     <div key={wtx._id} className="bg-white border text-sm border-slate-200 p-3.5 rounded-2xl flex justify-between items-center shadow-sm">
                       <div className="flex gap-3 items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${colorObj.bg}`}>{colorObj.icon}</div>
                          <div>
                            <p className={`font-semibold line-clamp-1 ${colorObj.color}`}>
                              {wtx.type === 'WITHDRAW_REQUEST' ? 'Yêu Cầu Rút' : (wtx.type === 'WITHDRAW_SUCCESS' ? 'Rút Tiền Thành Công' : wtx.description)}
                            </p>
                            <p className="text-slate-400 text-[11px] mt-0.5">{new Date(wtx.createdAt).toLocaleString('vi-VN')}</p>
                          </div>
                       </div>
                       <div className="text-right pl-2">
                          <p className={`font-black text-lg ${wtx.amount > 0 ? 'text-emerald-500' : 'text-slate-700'}`}>
                            {wtx.amount > 0 ? '+' : ''}{formatCurrency(wtx.amount)}
                          </p>
                       </div>
                     </div>
                  )})}
                </div>
            )}
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
      {showQRModal && activeTab === 'revenue' && (
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
                <p className="text-sm font-semibold text-slate-500 mb-1">CƠ CẤU THANH TOÁN (1 ✕ VND)</p>
                <div className="text-3xl font-black text-blue-600 tabular-nums tracking-tight bg-blue-100 px-4 py-2 rounded-2xl border-2 border-blue-200 border-dashed inline-block">
                  {formatCurrency(stats.totalDebt)}
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 relative mb-4">
                <img 
                  src={`https://img.vietqr.io/image/MB-0857986911-compact2.jpg?amount=${Math.round(stats.totalDebt)}&addInfo=THANHTOANNO ${driver?.driverCode || ''}&accountName=NGUYEN LAM NGUYEN`} 
                  alt="QR Code Công Nợ" 
                  className="w-56 h-56 object-contain mix-blend-multiply"
                />
              </div>

              <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 w-full space-y-2 mb-4">
                 <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Mã giao dịch:</span>
                    <span className="text-sky-700 bg-sky-100 px-2 py-0.5 rounded uppercase">{driver?.driverCode || 'N/A'}</span>
                 </div>
                 <div className="flex justify-between text-[11px] font-medium text-slate-500">
                    <p className="text-center w-full">Thanh toán bằng App ngân hàng bất kỳ để gạch nợ.</p>
                 </div>
              </div>

              {/* MỚI: Nút Báo Cáo Đã Chuyển Khoản */}
              <button
                onClick={handleRequestPayment}
                disabled={isRequesting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
              >
                {isRequesting ? (
                  <span className="animate-spin text-xl">⏳</span>
                ) : (
                  <>
                    <span className="text-lg">💸</span> TÔI ĐÃ CHUYỂN KHOẢN
                  </>
                )}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Modal Form Nhập Rút Tiền Ví */}
      {showWithdrawModal && activeTab === 'wallet' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <form onSubmit={handleWithdrawSubmit} className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-emerald-500 p-4 flex justify-between items-center text-white">
                  <h3 className="font-bold text-lg">Yêu Cầu Rút Số Dư Ví</h3>
                  <button type="button" onClick={() => setShowWithdrawModal(false)} className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30">✕</button>
              </div>
              <div className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Số tiền rút (Tối đa {formatCurrency(walletDetail.availableBalance)})</label>
                    <input 
                      type="number" max={walletDetail.availableBalance} min={50000} required
                      placeholder="VD: 100000"
                      className="w-full border-2 border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-3 text-lg font-bold outline-none transition-colors"
                      value={withdrawForm.amount} onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Ngân hàng (Tên NGÂN HÀNG)</label>
                    <input 
                      type="text" required placeholder="VD: MBBank, Vietcombank..."
                      className="w-full border-2 border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 outline-none font-medium uppercase"
                      value={withdrawForm.bankName} onChange={e => setWithdrawForm({...withdrawForm, bankName: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Số Tài Khoản</label>
                    <input 
                      type="number" required placeholder="Chỉ nhập số"
                      className="w-full border-2 border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 outline-none font-medium text-lg"
                      value={withdrawForm.accountNumber} onChange={e => setWithdrawForm({...withdrawForm, accountNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Tên Người Thụ Hưởng</label>
                    <input 
                      type="text" required placeholder="TÊN KHÔNG DẤU"
                      className="w-full border-2 border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 outline-none uppercase font-bold"
                      value={withdrawForm.accountName} onChange={e => setWithdrawForm({...withdrawForm, accountName: e.target.value.toUpperCase()})}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isRequesting}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg py-4 px-4 rounded-xl shadow-lg mt-2 disabled:opacity-50"
                  >
                    {isRequesting ? 'Đang gửi...' : 'Xác Nhận Đặt Lệnh'}
                  </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
}
