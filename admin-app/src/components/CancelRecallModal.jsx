import { useState } from 'react';

export default function CancelOrderModal({ isOpen, order, onClose, onAction }) {
  const [reason, setReason] = useState('');

  if (!isOpen || !order) return null;

  const handleCancelDie = () => {
    const finalReason = reason.trim() || 'Hủy bởi admin';
    onAction('CANCELLED', finalReason);
  };

  const handleDraft = () => {
    onAction('DRAFT');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span className="p-2 bg-orange-100 text-orange-500 rounded-full text-sm">⚠️</span> 
              Xử lý đơn #{order.orderCode || order._id.slice(-8)}
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:bg-slate-100 rounded-lg w-8 h-8 flex items-center justify-center font-bold">✕</button>
          </div>
          
          <p className="text-sm text-slate-600 mb-6 font-medium">Bạn muốn thu hồi đơn hàng này để <span className="text-blue-600 font-bold">Chỉnh Sửa</span> hay muốn <span className="text-red-500 font-bold">Hủy Vĩnh Viễn</span>?</p>
          
          <div className="space-y-4">
            {/* Tùy chọn 1: Lưu nháp */}
            <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-4 hover:border-blue-400 transition-colors cursor-pointer" onClick={handleDraft}>
              <div className="flex gap-3">
                <span className="text-2xl mt-1">📦</span>
                <div>
                  <h4 className="font-bold text-blue-700 text-base">Thu hồi về Bản Nháp</h4>
                  <p className="text-xs text-slate-600 mt-1">Đơn sẽ được ẩn khỏi tài xế và chuyển vào tab Treo sửa để bạn thay đổi SĐT, cước phí sau đó có thể đăng lại.</p>
                </div>
              </div>
            </div>

            {/* Tùy chọn 2: Hủy chết */}
            <div className="border border-red-200 bg-red-50/50 rounded-xl p-4">
              <div className="flex gap-3 mb-3">
                <span className="text-2xl mt-1">🧧</span>
                <div>
                  <h4 className="font-bold text-red-600 text-base">Hủy vĩnh viễn</h4>
                  <p className="text-xs text-red-500 mb-2">Đơn sẽ bị đánh mất hoàn toàn, không thể khôi phục.</p>
                  <input 
                    type="text" 
                    placeholder="Lý do hủy (Không bắt buộc)..." 
                    value={reason} 
                    onChange={e => setReason(e.target.value)}
                    className="w-full text-sm p-2 rounded-lg border border-red-200 focus:outline-none focus:border-red-400 mb-2" 
                  />
                  <button onClick={handleCancelDie} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg transition-colors text-sm shadow-md shadow-red-500/20">
                    Xóa vĩnh viễn đơn này
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
