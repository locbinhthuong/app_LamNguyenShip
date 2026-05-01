import { useState, useEffect } from 'react';
import { getDriverWalletAdmin, adjustDriverWalletAdmin, processWithdrawAdmin, deleteWalletTxAdmin } from '../services/api';
import CurrencyInput from './CurrencyInput';

export default function DriverWalletModal({ driverId, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [actionType, setActionType] = useState('DEPOSIT'); // 'DEPOSIT' hoặc 'ADMIN_ADJUST'
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && driverId) {
      loadData();
    }
  }, [isOpen, driverId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getDriverWalletAdmin(driverId);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      alert('Không thể tải dữ liệu Ví');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustWallet = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Nếu là điều chỉnh trừ tiền, cần đảm bảo amount nhập vào là âm
      let adjustAmount = Number(amount);
      if (actionType === 'ADMIN_ADJUST' && adjustAmount > 0) {
        adjustAmount = -adjustAmount; 
      }
      if (actionType === 'DEPOSIT' && adjustAmount < 0) {
        adjustAmount = Math.abs(adjustAmount);
      }

      await adjustDriverWalletAdmin(driverId, adjustAmount, description, actionType);
      alert('Cập nhật ví thành công!');
      
      setAmount('');
      setDescription('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi cấp phát ví');
    } finally {
      setSubmitting(false);
    }
  };

  const handeProcessPending = async (txId, action) => {
    let reason = '';
    if (action === 'REJECT') {
       reason = window.prompt('Nhập lý do từ chối (bỏ trống cũng được):');
       if (reason === null) return; // Người dùng bấm Hủy
    } else {
       if (!window.confirm('Chắc chắn DUYỆT chi cho lệnh rút này?')) return;
    }

    try {
       await processWithdrawAdmin(txId, action, reason);
       alert(action === 'APPROVE' ? 'Đã duyệt lệnh rút thành công!' : 'Đã Hủy Lệnh Rút!');
       loadData();
    } catch(err) {
       alert(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDeleteHistory = async (txId) => {
    if (!window.confirm('Hành động này CHỈ XÓA LOG LỊCH SỬ và KHÔNG TÁC ĐỘNG ĐẾN TỔNG TIỀN VÍ hiện tại của tài xế.\nBạn có chắc muốn xóa không?')) return;
    try {
       await deleteWalletTxAdmin(txId);
       alert('Xóa thành công!');
       loadData();
    } catch(e) {
       alert('Chưa xoá được');
    }
  }

  if (!isOpen) return null;

  // Tính tiền Pending
  const pendingTxs = data?.transactions?.filter(t => t.status === 'PENDING') || [];
  const totalPendingAmount = pendingTxs.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-50 h-full flex flex-col shadow-2xl animate-fade-in-right">
        
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-emerald-700 flex items-center gap-2">🏦 Ví Tài Xế</h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide">Quản lý nhận tiền COD / Thưởng</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-red-100 hover:text-red-500 rounded-full text-slate-500 transition-colors">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex justify-center items-center">
             <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !data ? (
          <div className="flex-1 flex justify-center items-center p-6 text-center text-slate-500">
             <p>⚠️ Chưa thể kết nối (404).<br/><span className="text-xs">Tính năng này cần Server Backend chạy bản Cập Nhật Mới Nhất. Vui lòng Pull code lên VPS.</span></p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* THÔNG TIN VÍ */}
            <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-400 p-6 shadow-md relative overflow-hidden text-white flex flex-col items-center">
              <div className="absolute right-0 top-0 opacity-10">
                 <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 7H4A2 2 0 002 9V19A2 2 0 004 21H20A2 2 0 0022 19V9A2 2 0 0020 7ZM20 19H4V13H20V19ZM20 11H4V9H20V11Z" />
                 </svg>
              </div>
              <p className="text-emerald-100 font-medium text-[10px] mb-1 uppercase tracking-widest relative z-10">SỐ DƯ VÍ KHẢ DỤNG</p>
              <h2 className="text-4xl font-black mb-1 relative z-10 ">
                 {(data.driver.walletBalance - totalPendingAmount).toLocaleString()} đ
              </h2>
              <p className="text-[10px] font-medium bg-emerald-900/20 px-3 py-1 rounded-full border border-emerald-400/20">
                Sổ gốc (Bao gồm Pending): {data.driver.walletBalance.toLocaleString()}đ
              </p>
              
              <div className="mt-4 w-full bg-white/10 rounded-xl p-3 backdrop-blur border border-white/20 text-center">
                 Tài xế: <strong className="text-lg uppercase">{data.driver.name}</strong> • {data.driver.phone}
              </div>
            </div>

            {/* DANH SÁCH LỆNH CHỜ DUYỆT RÚT */}
            {pendingTxs.length > 0 && (
               <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                 <h4 className="font-bold text-amber-800 border-b border-amber-200/50 pb-2 mb-3">🔔 Yêu Cầu Rút Tiền Kìa Sếp!</h4>
                 <div className="space-y-3">
                    {pendingTxs.map(ptx => (
                       <div key={ptx._id} className="bg-white border border-amber-200 p-3 rounded-xl">
                          <p className="font-black text-lg text-amber-600 mb-1">Rút: {Math.abs(ptx.amount).toLocaleString()} đ</p>
                          <div className="bg-slate-50 p-2 rounded text-xs text-slate-600 border border-slate-100 mb-3 space-y-0.5">
                             <div className="flex justify-between"><span>Bank:</span> <strong className="text-blue-700">{ptx.bankInfo?.bankName}</strong></div>
                             <div className="flex justify-between"><span>Chủ TK:</span> <strong>{ptx.bankInfo?.accountName}</strong></div>
                             <div className="flex justify-between"><span>STK:</span> <strong className="text-teal-700 font-mono text-sm">{ptx.bankInfo?.accountNumber}</strong></div>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => handeProcessPending(ptx._id, 'APPROVE')} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded text-xs transition-colors">🔥 DUYỆT CHI & CHUYỂN KHOẢN</button>
                             <button onClick={() => handeProcessPending(ptx._id, 'REJECT')} className="basis-1/3 bg-slate-100 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold py-2 rounded border border-slate-200 text-xs transition-colors">TỪ CHỐI</button>
                          </div>
                       </div>
                    ))}
                 </div>
               </div>
            )}

            {/* FORM GIAO DỊCH VÍ CHỦ ĐỘNG */}
            <form onSubmit={handleAdjustWallet} className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
               <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2 text-sm">Trao Thưởng / Nạp Rút Chủ Động</h4>
               
               <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                 <button type="button" onClick={() => setActionType('DEPOSIT')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${actionType === 'DEPOSIT' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>Tặng Tiền</button>
                 <button type="button" onClick={() => setActionType('ADMIN_ADJUST')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${actionType === 'ADMIN_ADJUST' ? 'bg-white shadow text-orange-600' : 'text-slate-500'}`}>Trừ Tiền Lỗi</button>
               </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wide font-bold text-slate-500">Số lượng (đ)</label>
                  <CurrencyInput 
                    min="0" required 
                    placeholder="VD: 50.000"
                    className={`w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 outline-none font-bold ${actionType === 'DEPOSIT' ? 'border-emerald-200 focus:ring-emerald-500 text-emerald-700' : 'border-orange-200 focus:ring-orange-500 text-orange-700'}`}
                    value={amount} onChange={e => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide font-bold text-slate-500">Ghi chú Hành Động này</label>
                  <input 
                    type="text" required 
                    placeholder="VD: Thưởng lễ / Hoàn phí..."
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 outline-none text-sm"
                    value={description} onChange={e => setDescription(e.target.value)}
                  />
                </div>

               <button 
                 disabled={submitting}
                 className={`w-full py-2.5 rounded-xl font-bold text-white shadow-md transition-transform hover:scale-[1.02] active:scale-95 ${actionType === 'DEPOSIT' ? 'bg-emerald-600' : 'bg-orange-500'}`}
               >
                 {submitting ? 'Xin chờ...' : actionType === 'DEPOSIT' ? 'NẠP XU VÀO VÍ' : 'KÉO TRỪ TIỀN VÍ'}
               </button>
            </form>

            {/* LỊCH SỬ GIAO DỊCH */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200">
               <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                  <span className="text-xl">💰</span> Sao Kê Giao Dịch Ví
               </h4>
               
               {data.transactions.length === 0 ? (
                 <div className="text-center py-6 text-slate-400 text-sm italic">
                   Chưa có biến động số dư nào
                 </div>
               ) : (
                 <div className="space-y-4">
                   {data.transactions.map(tx => {
                     // Nếu là pending, đã render ở trên rồi, ẩn ở list nhỏ
                     if (tx.status === 'PENDING') return null;

                     let colorClass = 'text-slate-600';
                     if (tx.amount > 0) colorClass = 'text-emerald-600';
                     if (tx.amount < 0) colorClass = 'text-slate-600';
                     if (tx.type === 'WITHDRAW_REJECT') colorClass = 'text-red-500 opacity-50 line-through';

                     return (
                     <div key={tx._id} className="flex justify-between items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                       <div>
                         <div className="flex items-center gap-2 mb-1">
                           <span className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-wide ${tx.type === 'WITHDRAW_SUCCESS' ? 'bg-emerald-100 text-emerald-800' : tx.type === 'WITHDRAW_REJECT' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                             {tx.type === 'WITHDRAW_SUCCESS' ? 'ĐÃ RÚT' : tx.type === 'WITHDRAW_REJECT' ? 'TỪ CHỐI RÚT' : tx.type === 'DEPOSIT' ? 'NẠP THƯỞNG' : 'ADMIN CHỈNH SỬA'}
                           </span>
                           <span className="text-[10px] text-slate-400">{new Date(tx.createdAt).toLocaleString('vi-VN')}</span>
                         </div>
                         <p className="text-xs font-semibold text-slate-700 leading-relaxed mt-1">
                            {tx.description}
                         </p>

                         {tx.createdByAdminId && (
                           <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Người thực hiện: {tx.createdByAdminId.name}</p>
                         )}

                         <div className="mt-2">
                           <button onClick={() => handleDeleteHistory(tx._id)} className="text-[10px] uppercase font-bold text-red-500 hover:text-red-700 decoration-red-500 underline underline-offset-2">Xóa bỏ</button>
                         </div>
                       </div>
                       <div className={`font-black tracking-tight text-right ${colorClass}`}>
                         {tx.type === 'WITHDRAW_REJECT' ? 'Hoàn lại tiền' : (tx.amount > 0 ? '+' : '')}
                         {tx.type === 'WITHDRAW_REJECT' ? '' : Math.abs(tx.amount).toLocaleString() + 'đ'}
                       </div>
                     </div>
                   )})}
                 </div>
               )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
