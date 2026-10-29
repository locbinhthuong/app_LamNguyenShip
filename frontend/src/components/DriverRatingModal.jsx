import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, ThumbsUp, ThumbsDown, MessageSquare, Send } from 'lucide-react';
import { rateDriverOrder, getFullImageUrl } from '../services/api';
import { useToast } from '../context/ToastContext';

const SATISFIED_TAGS = [
  '⚡ Giao siêu nhanh',
  '😊 Thân thiện, lịch sự',
  '📦 Giữ hàng cẩn thận',
  '🛵 Lái xe an toàn',
  '📞 Gọi trước chu đáo'
];

const UNSATISFIED_TAGS = [
  '🐢 Giao hàng quá lâu',
  '😡 Thái độ cộc cằn',
  '💸 Đòi thêm tiền ngoài app',
  '📦 Hàng bị đổ vỡ',
  '📞 Không gọi trước khi đến',
  '🧭 Đi lạc đường'
];

const DriverRatingModal = ({ isOpen, onClose, order, onRatingSuccess }) => {
  const { showToast } = useToast();
  const [stars, setStars] = useState(order?.driverRating?.stars || order?.rating || 5);
  const [hoverStars, setHoverStars] = useState(0);
  const [selectedTags, setSelectedTags] = useState(order?.driverRating?.tags || []);
  const [comment, setComment] = useState(order?.driverRating?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (order?.driverRating?.stars) {
      setStars(order.driverRating.stars);
      setSelectedTags(order.driverRating.tags || []);
      setComment(order.driverRating.comment || '');
    }
    return () => setMounted(false);
  }, [order]);

  if (!isOpen || !order || !mounted) return null;

  const driver = order.assignedTo || {};
  const activeStars = hoverStars || stars;
  const isSatisfied = activeStars >= 4;
  const currentTags = isSatisfied ? SATISFIED_TAGS : UNSATISFIED_TAGS;

  const handleStarClick = (num) => {
    setStars(num);
    // Nếu đổi nhóm từ hài lòng sang không hài lòng hoặc ngược lại thì reset tag
    const willBeSatisfied = num >= 4;
    if (willBeSatisfied !== isSatisfied) {
      setSelectedTags([]);
    }
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
    if (e) e.preventDefault();
    if (submitting) return;

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

  const modalContent = (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-t-[28px] sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[90vh] z-[100000]"
          onClick={e => e.stopPropagation()}
        >
          {/* Mobile Handle Bar */}
          <div className="w-full flex justify-center pt-2.5 pb-1 sm:hidden">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          {/* Header */}
          <div className={`px-4 py-3 sm:py-3.5 text-white flex items-center justify-between transition-colors ${
            isSatisfied ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-amber-600 to-orange-600'
          }`}>
            <div className="flex items-center gap-2">
              <Star size={18} className="fill-white text-white" />
              <h3 className="font-extrabold text-sm sm:text-base">Đánh Giá Bác Tài & Dịch Vụ</h3>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="p-4 overflow-y-auto space-y-3.5 flex-1 overscroll-contain">
            
            {/* Thông tin tài xế */}
            <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
              <div className="w-11 h-11 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-base overflow-hidden shrink-0 border-2 border-white shadow-sm">
                {driver.avatar ? (
                  <img src={getFullImageUrl(driver.avatar)} alt={driver.name} className="w-full h-full object-cover" />
                ) : (
                  driver.name?.charAt(0) || 'X'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{driver.name || 'Tài xế AloShipp'}</p>
                <p className="text-xs text-blue-600 font-semibold uppercase">
                  {driver.licensePlate || driver.vehiclePlate || 'Biển số đang cập nhật'}
                </p>
                <p className="text-[10px] text-slate-400">Mã đơn: #{order.orderCode || order._id?.slice(-6).toUpperCase()}</p>
              </div>
            </div>

            {/* Chọn Sao */}
            <div className="text-center py-1 bg-amber-50/50 rounded-2xl border border-amber-100/60 p-2.5">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Mức độ hài lòng của bạn
              </p>
              <div className="flex items-center justify-center gap-2 mb-1">
                {[1, 2, 3, 4, 5].map(starNum => {
                  const isActive = starNum <= activeStars;
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
                        size={32} 
                        className={`transition-colors ${
                          isActive 
                            ? isSatisfied ? 'text-amber-400 fill-amber-400 drop-shadow-sm' : 'text-orange-500 fill-orange-500'
                            : 'text-gray-200'
                        }`} 
                      />
                    </button>
                  );
                })}
              </div>
              <p className={`text-xs font-extrabold transition-colors ${isSatisfied ? 'text-blue-600' : 'text-orange-600'}`}>
                {getStarLabel(activeStars)}
              </p>
            </div>

            {/* Huy hiệu chọn nhanh */}
            <div>
              <p className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                {isSatisfied ? (
                  <><ThumbsUp size={13} className="text-blue-600" /> Bạn hài lòng nhất về điều gì?</>
                ) : (
                  <><ThumbsDown size={13} className="text-orange-600" /> Bác tài cần cải thiện điều gì?</>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {currentTags.map((tag, idx) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all active:scale-95 ${
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
                <MessageSquare size={12} className="text-gray-400" />
                Góp ý chi tiết cho bác tài (Tùy chọn):
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Nhập cảm nhận của bạn về chuyến đi..."
                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-700 focus:border-blue-500 outline-none"
              />
            </div>

          </div>

          {/* Sticky Pinned Footer - BẢO ĐẢM NÚT LUÔN NẰM TRÊN MỌI MENU VÀ KHÔNG BỊ DÍNH */}
          <div className="p-4 pt-3 border-t border-slate-100 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.05)] pb-[calc(1.2rem+env(safe-area-inset-bottom))] sm:pb-4">
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className={`w-full py-3 text-white font-extrabold rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer ${
                isSatisfied 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 shadow-blue-500/25' 
                  : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 shadow-orange-500/25'
              }`}
            >
              <Send size={15} />
              {submitting ? 'Đang gửi...' : 'Gửi Đánh Giá Ngay'}
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default DriverRatingModal;
