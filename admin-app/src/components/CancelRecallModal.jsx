import { useState, useEffect } from 'react';

export default function CancelOrderModal({ isOpen, order, onClose, onAction }) {
  const [reason, setReason] = useState('');
  const [autoAssignNearest, setAutoAssignNearest] = useState(true);

  useEffect(() => {
    if (order) {
      setAutoAssignNearest(order.autoAssignNearest !== undefined ? Boolean(order.autoAssignNearest) : true);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleCancelDie = () => {
    const finalReason = reason.trim() || 'Hủy bởi admin';
    onAction('CANCELLED', finalReason, autoAssignNearest);
  };

  const handleDraft = () => {
    onAction('DRAFT', '', autoAssignNearest);
  };

  const handleDraftAndEdit = () => {
    onAction('DRAFT_AND_EDIT', '', autoAssignNearest);
  };

  const handleRepublishNow = () => {
    onAction('REPUBLISH', '', autoAssignNearest);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span className="p-2 bg-orange-100 text-orange-500 rounded-full text-sm">⚠️</span> 
              Thu hồi / Xử lý đơn #{order.orderCode || order._id.slice(-8)}
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:bg-slate-100 rounded-lg w-8 h-8 flex items-center justify-center font-bold">✕</button>
          </div>
          
          <p className="text-sm text-slate-600 mb-4 font-medium">
            Chọn chế độ điều phối khi thu hồi đơn để <span className="text-blue-600 font-bold">Chỉnh Sửa / Đẩy Lại</span> hoặc <span className="text-red-500 font-bold">Hủy Vĩnh Viễn</span>:
          </p>

          {/* Nút bật/tắt Gán Đơn Tự Động ngay trong popup Thu hồi */}
          <div className={`mb-4 p-3.5 rounded-2xl border transition-all ${
            autoAssignNearest
              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 shadow-xs'
              : 'bg-slate-50 border-slate-300'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-bold ${
                  autoAssignNearest ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-300 text-slate-600'
                }`}>
                  {autoAssignNearest ? '⚡' : '🛑'}
                </div>
                <div>
                  <h4 className={`text-xs sm:text-sm font-black ${
                    autoAssignNearest ? 'text-emerald-900' : 'text-slate-700'
                  }`}>
                    {autoAssignNearest 
                      ? 'ĐANG BẬT: GÁN ĐƠN TỰ ĐỘNG (FULLTIME 1KM)' 
                      : 'ĐANG TẮT: LÊN ĐƠN TREO THỦ CÔNG'}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    {autoAssignNearest
                      ? 'Tự quét tài xế Fulltime trong 1km (popup 30s). Không ai nhận mới chuyển sang đơn treo.'
                      : 'Đơn sẽ treo thẳng lên cho toàn bộ tài xế nhận tự do (bỏ qua vòng gán Fulltime 1km).'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAutoAssignNearest(prev => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoAssignNearest ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    autoAssignNearest ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            {/* Tùy chọn 1: Thu hồi & Mở form Sửa đơn ngay */}
            <div
              className="border border-orange-200 bg-orange-50/60 rounded-xl p-3.5 hover:border-orange-400 transition-colors cursor-pointer"
              onClick={handleDraftAndEdit}
            >
              <div className="flex gap-3 items-start">
                <span className="text-2xl mt-0.5">✏️</span>
                <div>
                  <h4 className="font-bold text-orange-700 text-sm sm:text-base">Thu hồi & Sửa đơn ngay</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Thu hồi đơn khỏi tài xế hiện tại và mở ngay bảng chỉnh sửa đơn hàng (giữ trạng thái bật/tắt gán tự động ở trên).
                  </p>
                </div>
              </div>
            </div>

            {/* Tùy chọn 2: Thu hồi & Đẩy lại đơn ngay (Gán tự động hoặc Đơn treo theo nút gạt) */}
            <div
              className={`border rounded-xl p-3.5 transition-colors cursor-pointer ${
                autoAssignNearest
                  ? 'border-emerald-200 bg-emerald-50/60 hover:border-emerald-400'
                  : 'border-indigo-200 bg-indigo-50/60 hover:border-indigo-400'
              }`}
              onClick={handleRepublishNow}
            >
              <div className="flex gap-3 items-start">
                <span className="text-2xl mt-0.5">🚀</span>
                <div>
                  <h4 className={`font-bold text-sm sm:text-base ${autoAssignNearest ? 'text-emerald-700' : 'text-indigo-700'}`}>
                    {autoAssignNearest ? 'Thu hồi & Gán Tự Động Lại Ngay (Fulltime 1km)' : 'Thu hồi & Treo Đơn Thủ Công Ngay'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {autoAssignNearest
                      ? 'Gỡ đơn khỏi tài xế cũ và lập tức quét gán tự động cho tài xế Fulltime trong 1km.'
                      : 'Gỡ đơn khỏi tài xế cũ và lập tức đẩy thẳng lên chợ Đơn Treo cho toàn bộ tài xế.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tùy chọn 3: Chỉ thu hồi về Lưu nháp */}
            <div
              className="border border-blue-200 bg-blue-50/50 rounded-xl p-3.5 hover:border-blue-400 transition-colors cursor-pointer"
              onClick={handleDraft}
            >
              <div className="flex gap-3 items-start">
                <span className="text-2xl mt-0.5">📦</span>
                <div>
                  <h4 className="font-bold text-blue-700 text-sm sm:text-base">Chỉ thu hồi về Bản Nháp</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Ẩn đơn khỏi tài xế và cất vào tab Treo sửa (Bản nháp) để xử lý sau.
                  </p>
                </div>
              </div>
            </div>

            {/* Tùy chọn 4: Hủy chết */}
            <div className="border border-red-200 bg-red-50/50 rounded-xl p-3.5">
              <div className="flex gap-3">
                <span className="text-2xl mt-0.5">🧧</span>
                <div className="flex-1">
                  <h4 className="font-bold text-red-600 text-sm sm:text-base">Hủy vĩnh viễn</h4>
                  <p className="text-xs text-red-500 mb-2">Đơn sẽ bị hủy hoàn toàn, không thể khôi phục.</p>
                  <input 
                    type="text" 
                    placeholder="Lý do hủy (Không bắt buộc)..." 
                    value={reason} 
                    onChange={e => setReason(e.target.value)}
                    className="w-full text-sm p-2 rounded-lg border border-red-200 focus:outline-none focus:border-red-400 mb-2 bg-white" 
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
