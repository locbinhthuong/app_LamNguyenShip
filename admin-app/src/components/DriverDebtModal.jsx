import { useState, useEffect } from 'react';
import { getDriverDebtDetail, addDriverPenalty, addDriverPayment, resetDriverDebt, deleteDriverDebt, updateDriverDebt } from '../services/api';
import CurrencyInput from './CurrencyInput';

export default function DriverDebtModal({ driverId, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Trạng thái Sửa giao dịch Nợ
  const [editingTx, setEditingTx] = useState(null);

  useEffect(() => {
    if (isOpen && driverId) {
      loadData();
    }
  }, [isOpen, driverId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getDriverDebtDetail(driverId);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      alert('Không thể tải dữ liệu Công nợ');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e, forcedAmount = null, targetDate = null) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    try {
       if (editingTx) {
         await updateDriverDebt(editingTx._id, amount, description);
         alert('Đã cập nhật giao dịch thành công!');
         setEditingTx(null);
      } else {
         const payAmount = forcedAmount || amount;
         const payDesc = forcedAmount ? `Thu tiền công nợ ngày ${new Date(targetDate).toLocaleDateString('vi-VN')}` : description;
         await addDriverPayment(driverId, payAmount, payDesc, targetDate);
         alert('Đã thu tiền nợ thành công!');
      }
      
      setAmount('');
      setDescription('');
      loadData(); // Tải lại lịch sử
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (txId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa giao dịch này? Nợ sẽ được hoàn lại!')) return;
    try {
       await deleteDriverDebt(txId);
       alert('Xóa thành công!');
       loadData();
    } catch(err) {
       alert('Lỗi xóa giao dịch');
    }
  };

  const handleEditSetup = (tx) => {
     setEditingTx(tx);
     setAmount(Math.abs(tx.amount).toString());
     setDescription(tx.description);
     window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll lên form
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-50 h-full flex flex-col shadow-2xl animate-fade-in-right">
        
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Sổ Đen Công Nợ</h2>
            <p className="text-xs text-slate-500 font-medium">Quản lý thu chi vi phạm / chiết khấu</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-red-100 hover:text-red-500 rounded-full text-slate-500 transition-colors">
            ✕
          </button>
        </div>

        {loading || !data ? (
          <div className="flex-1 flex justify-center items-center">
             <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* THÔNG TIN CHUNG */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl mb-3">
                 {data.driver.name.charAt(0)}
              </div>
              <h3 className="font-bold text-slate-800">{data.driver.name}</h3>
              <p className="text-slate-500 text-xs">{data.driver.phone}</p>
              
              <div className="mt-4 w-full grid grid-cols-2 gap-3">
                 <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">CÒN PHẢI THU</p>
                   <p className={`text-xl font-black ${(data.totalUnpaid || 0) > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                      {(data.totalUnpaid || 0).toLocaleString()} đ
                   </p>
                 </div>
                 <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex flex-col items-center">
                   <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1">ĐÃ THU ĐƯỢC</p>
                   <p className={`text-xl font-black text-emerald-600`}>
                      {(data.totalPaid || 0).toLocaleString()} đ
                   </p>
                 </div>
              </div>
              <span className="mt-3 inline-block bg-blue-100 text-blue-800 text-[10px] px-3 py-1 rounded-full font-bold">
                 ⚡ Tỷ lệ Chiết Khấu trên 1 Đơn: {data.driver.commissionRate}%
              </span>
            </div>

            {/* FORM HOẶC DANH SÁCH THU NỢ THEO NGÀY */}
            {!editingTx ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 uppercase text-sm">
                   Các Khung Nợ Chờ Thu
                </h4>
                {(!data.unpaidDays || data.unpaidDays.length === 0) ? (
                   <div className="p-4 bg-emerald-50 text-emerald-700 text-sm rounded-xl text-center font-semibold border border-emerald-100">
                      Chưa có ngày nào phát sinh công nợ hoặc đã thu hết! 🎉
                   </div>
                ) : (
                   <div className="space-y-3">
                     {data.unpaidDays.map((day, idx) => (
                       <div key={idx} className="flex flex-col sm:flex-row justify-between items-center p-4 bg-sky-50 rounded-xl border border-sky-100 gap-3">
                         <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Khung Ngày: {new Date(day.date).toLocaleDateString('vi-VN')}</p>
                            <p className="text-xl font-black text-red-600">{day.amount.toLocaleString()} đ</p>
                         </div>
                         <button 
                           onClick={() => handleSubmit(null, day.amount, day.date)}
                           disabled={submitting}
                           className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition-transform active:scale-95 disabled:opacity-50 inline-flex items-center gap-2 whitespace-nowrap"
                         >
                           {submitting ? '⏳ Đang Xử Lý...' : '✅ Xác Nhận Thu Ngày Này'}
                         </button>
                       </div>
                     ))}
                   </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4 border-l-4 border-l-amber-500">
                  <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2 flex justify-between items-center">
                     <span>Sửa Giao Dịch Đã Chọn</span>
                     <button type="button" onClick={() => { setEditingTx(null); setAmount(''); setDescription(''); }} className="text-xs text-slate-400 font-normal underline hover:text-slate-700">Hủy sửa</button>
                  </h4>

                 <div>
                   <label className="text-xs font-bold text-slate-600">Số Tiền (đ)</label>
                   <CurrencyInput 
                     required 
                     className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                     value={amount} onChange={e => setAmount(e.target.value)}
                   />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-slate-600">Lý do/Ghi chú</label>
                   <input 
                     type="text" required 
                     className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                     value={description} onChange={e => setDescription(e.target.value)}
                   />
                 </div>

                 <button 
                   disabled={submitting}
                   className="w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 bg-amber-500 shadow-amber-500/30"
                 >
                   {submitting ? 'Đang Xử Lý...' : 'LƯU THAY ĐỔI'}
                 </button>
              </form>
            )}

            {/* LỊCH SỬ GIAO DỊCH */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                 🕒 Lịch sử Sổ Đen
              </h4>
              
              {data.transactions.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm italic">
                  Chưa có giao dịch / phí chiết khấu nào
                </div>
              ) : (
                <div className="space-y-4">
                  {data.transactions.map(tx => (
                    <div key={tx._id} className="flex justify-between items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${tx.type === 'PAYMENT' ? 'bg-green-100 text-green-700' : tx.type === 'PENALTY' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                            {tx.type === 'PAYMENT' ? 'THU NỢ' : tx.type === 'PENALTY' ? 'PHẠT' : 'PHÍ ĐƠN'}
                          </span>
                          <span className="text-xs text-slate-400">{new Date(tx.createdAt).toLocaleString('vi-VN')}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-700">{tx.description}</p>
                        {tx.createdByAdminId && (
                          <p className="text-[10px] text-slate-500 mt-1">Người duyệt: {tx.createdByAdminId.name}</p>
                        )}
                        <div className="mt-2 flex gap-3">
                           <button onClick={() => handleEditSetup(tx)} className="text-[10px] uppercase font-bold text-blue-500 hover:text-blue-700 decoration-blue-500 underline underline-offset-2">Sửa</button>
                           <button onClick={() => handleDelete(tx._id)} className="text-[10px] uppercase font-bold text-red-500 hover:text-red-700 decoration-red-500 underline underline-offset-2">Xóa</button>
                        </div>
                      </div>
                      <div className={`font-black tracking-tight ${tx.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}đ
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
