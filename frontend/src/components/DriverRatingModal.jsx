import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Check, ThumbsUp, ThumbsDown, MessageSquare, Send, Truck } from 'lucide-react';
import { rateDriverOrder, getFullImageUrl } from '../services/api';
import { useToast } from '../context/ToastContext';

const SATISFIED_TAGS = [
  '⚡ Giao hàng siêu nhanh',
  '😊 Thái độ thân thiện, lịch sự',
  '📦 Bảo quản hàng hóa cẩn thận',
  '🛵 Lái xe an toàn, đúng hẹn',
  '📞 Gọi điện trước chu đáo'
];

const UNSATISFIED_TAGS = [
  '🐢 Giao hàng quá lâu / Trễ hẹn',
  '😡 Thái độ cộc cằn, bất lịch sự',
  '💸 Tự ý đòi thêm tiền ngoài app',
  '📦 Hàng hóa bị đổ vỡ, móp méo',
  '📞 Không liên hệ trước khi đến',
  '🧭 Đi sai lộ trình / Lạc đường'
];

const DriverRatingModal = ({ isOpen, onClose, order, onRatingSuccess }) => {
  const { showToast } = useToast();
  const [stars, setStars] = useState(5);
  const [hoverStars, setHoverStars] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !order) return null;

  const driver = order.assignedTo || {};
  const isSatisfied = (hoverStars || stars) >= 4;
  const currentTags = isSatisfied ? SATISFIED_TAGS : UNSATISFIED_TAGS;

  const handleStarClick = (num) => {
    setStars(num);
    setSelectedTags([]); // Reset tags khi chuyển từ hài lòng sang không hài lòng
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getStarLabel = (num) => {
    switch(num) {
      case 1: return 'Rất không hài lòng';
      case 2: return 'Không hài lòng';
      case 3: return 'Bình thường';
      case 4: return 'Hài lòng';
      case 5: return 'Rất hài lòng & Tuyệt vời!';
      default: return '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await rateDriverOrder(order._id, {
        stars,
        satisfaction: isSatisfied ? 'SATISFIED' : 'UNSATISFIED',
        tags: selectedTags,
        comment: comment.trim()
      });

      if (res.success) {
        showToast('Cảm ơn bạn đã gửi đánh giá cho bác tài!', 'success');
        if (onRatingSuccess) {
          onRatingSuccess(res.data);
        }
        onClose();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Có lỗi xảy ra khi gửi đánh giá', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`p-4 text-white flex items-center justify-between transition-colors ${
            isSatisfied ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-amber-600 to-orange-600'
          }`}>
            <div className="flex items-center gap-2">
              <Star size={20} className="fill-white text-white" />
              <h3 className="font-extrabold text-base">Đánh Giá Dịch Vụ Tài Xế</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
            
            {/* Thông tin tài xế */}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 border-2 border-white shadow-sm">
                {driver.avatar ? (
                  <img src={getFullImageUrl(driver.avatar)} alt={driver.name} className="w-full h-full object-cover" />
                ) : (
                  driver.name?.charAt(0) || 'X'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{driver.name || 'Tài xế AloShipp'}</p>
                <p className="text-xs text-blue-600 font-semibold uppercase mt-0.5">
                  {driver.licensePlate || driver.vehiclePlate || 'Biển số đang cập nhật'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Mã đơn: #{order.orderCode || order._id.slice(-6).toUpperCase()}</p>
              </div>
            </div>

            {/* Chọn Sao */}
            <div className="text-center py-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Mức độ hài lòng của bạn
              </p>
              <div className="flex items-center justify-center gap-2 mb-1.5">
                {[1, 2, 3, 4, 5].map(starNum => {
                  const isActive = starNum <= (hoverStars || stars);
                  return (
                    <button
                      key={starNum}
                      type="button"
                      onMouseEnter={() => setHoverStars(starNum)}
                      onMouseLeave={() => setHoverStars(0)}
                      onClick={() => handleStarClick(starNum)}
                      className="p-1 transition-transform active:scale-125 focus:outline-none"
                    >
                      <Star 
                        size={34} 
                        className={`transition-colors ${
                          isActive 
                            ? isSatisfied ? 'text-amber-400 fill-amber-400 drop-shadow-sm' : 'text-orange-500 fill-orange-500'
                            : 'text-gray-300'
                        }`} 
                      />
                    </button>
                  );
                })}
              </div>
              <p className={`text-sm font-extrabold transition-colors ${isSatisfied ? 'text-blue-600' : 'text-orange-600'}`}>
                {getStarLabel(hoverStars || stars)}
              </p>
            </div>

            {/* Huy hiệu chọn nhanh */}
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                {isSatisfied ? (
                  <><ThumbsUp size={14} className="text-blue-600" /> Bạn hài lòng nhất về điều gì?</>
                ) : (
                  <><ThumbsDown size={14} className="text-orange-600" /> Bác tài cần cải thiện điều gì?</>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {currentTags.map((tag, idx) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all active:scale-95 ${
                        isSelected 
                          ? isSatisfied 
                            ? 'bg-blue-600 text-white font-bold shadow-sm' 
                            : 'bg-orange-600 text-white font-bold shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Góp ý chi tiết */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <MessageSquare size={13} className="text-gray-400" />
                Góp ý chi tiết cho bác tài (Tùy chọn):
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Nhập cảm nhận của bạn về chuyến đi..."
                className="w-full border border-gray-300 rounded-xl p-3 text-xs text-gray-700 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Nút hành động */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3.5 text-white font-extrabold rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-50 ${
                  isSatisfied 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 shadow-blue-500/25' 
                    : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 shadow-orange-500/25'
                }`}
              >
                <Send size={16} />
                {submitting ? 'Đang gửi...' : 'Gửi Đánh Giá'}
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DriverRatingModal;
