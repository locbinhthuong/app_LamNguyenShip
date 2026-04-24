import { useState, useEffect } from 'react';
import { addDriverPayment } from '../services/api';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

export default function DebtApprovalModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [payload, setPayload] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Ref để tạo tiếng chuông
  const [audio] = useState(new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'));

  useEffect(() => {
    const handleEvent = (e) => {
      setPayload(e.detail);
      setIsOpen(true);
      
      // Bật còi báo động khi có người nạp tiền
      audio.loop = true;
      audio.play().catch(e => console.log('Auto-play prevented by browser', e));
    };

    window.addEventListener('show_debt_approval_modal', handleEvent);
    return () => {
      window.removeEventListener('show_debt_approval_modal', handleEvent);
      audio.pause();
    };
  }, [audio]);

  // Dừng chuông
  const stopAlarm = () => {
    audio.pause();
    audio.currentTime = 0;
  };

  const handleClose = () => {
    stopAlarm();
    setIsOpen(false);
    setPayload(null);
  };

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      const res = await addDriverPayment(payload.driverId, payload.amount, 'Duyệt thanh toán QR tự động (Semi)');
      if (res.success) {
        alert('✅ ĐÃ GẠCH NỢ THÀNH CÔNG CHO TÀI XẾ!');
        handleClose();
      }
    } catch (error) {
      alert('Lỗi phê duyệt: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !payload) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header Rung Động */}
        <div className="bg-red-600 p-6 flex flex-col items-center justify-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-red-500 animate-pulse mix-blend-overlay"></div>
          <div className="text-5xl mb-2 animate-bounce">🚨</div>
          <h2 className="font-black text-2xl uppercase tracking-widest text-center shadow-black/20 drop-shadow-lg z-10">
            BÁO ĐỘNG NHẬN TIỀN
          </h2>
          <p className="text-red-100 font-medium z-10">Tài xế vừa báo cáo nạp tiền qua mã VietQR</p>
          
          <button onClick={handleClose} className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 transition-colors z-20">
            ✕
          </button>
        </div>
        
        <div className="p-8 flex flex-col items-center justify-center bg-slate-50 relative">
          
          <div className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="text-slate-500 font-semibold text-sm">THÔNG TIN CHUYỂN KHOẢN</span>
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded font-mono">{new Date(payload.timestamp).toLocaleTimeString('vi-VN')}</span>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Tài xế:</span>
                <span className="font-bold text-slate-800 text-lg uppercase text-right">
                  {payload.name} <br/>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{payload.driverCode}</span>
                </span>
              </div>
              <div className="h-px bg-slate-100 w-full" />
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Số điện thoại:</span>
                <span className="font-semibold text-slate-700">{payload.phone}</span>
              </div>
              <div className="h-px bg-slate-100 w-full" />
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Số tiền khai báo:</span>
                <span className="text-2xl font-black text-emerald-600 tracking-tight">{formatCurrency(payload.amount)}</span>
              </div>
            </div>
          </div>

          <p className="text-center text-sm font-medium text-slate-600 mb-6 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            Hãy Mở App Ngân Hàng của Sếp. Nếu đã thấy tiền vào tài khoản, vui lòng bấm Xác Nhận Gạch Nợ!
          </p>

          <div className="flex gap-4 w-full">
            <button
              onClick={handleClose}
              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-4 rounded-2xl transition-all"
            >
              CHƯA NHẬN ĐƯỢC
            </button>
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-[2] flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg py-4 rounded-2xl shadow-xl shadow-emerald-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isProcessing ? 'ĐANG GẠCH NỢ...' : (
                <><span>✅</span> ĐÃ NHẬN TIỀN XONG</>
              )}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
