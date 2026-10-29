import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Clock, CheckCircle2, XCircle, Phone, MessageSquare, X, Send, AlertTriangle } from 'lucide-react';
import { requestAccountVerification } from '../services/api';
import { useToast } from '../context/ToastContext';

const AccountVerificationModal = ({ isOpen, onClose, user, onVerifiedSuccess }) => {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [zaloPhone, setZaloPhone] = useState(user?.phone || '');
  const [note, setNote] = useState('');
  const [currentStatus, setCurrentStatus] = useState(user?.verificationStatus || 'UNVERIFIED');
  const [rejectReason, setRejectReason] = useState(user?.rejectReason || '');

  useEffect(() => {
    if (user) {
      setCurrentStatus(user.verificationStatus || 'UNVERIFIED');
      setZaloPhone(user.zaloPhone || user.phone || '');
      setRejectReason(user.rejectReason || '');
    }
  }, [user]);

  // Lắng nghe socket realtime khi Admin duyệt tài khoản
  useEffect(() => {
    const handleVerificationUpdated = (e) => {
      const data = e.detail;
      if (data) {
        setCurrentStatus(data.verificationStatus);
        setRejectReason(data.rejectReason || '');
        if (data.verificationStatus === 'VERIFIED') {
          showToast('🎉 Tài khoản của bạn đã được xác minh thành công! Bạn có thể sử dụng dịch vụ ngay.', 'success', 6000);
          if (onVerifiedSuccess) onVerifiedSuccess(data);
          onClose();
        } else if (data.verificationStatus === 'REJECTED') {
          showToast(`⚠️ Yêu cầu bị từ chối: ${data.rejectReason || 'Vui lòng liên hệ Admin'}`, 'error', 6000);
        }
      }
    };

    window.addEventListener('user_verification_updated_event', handleVerificationUpdated);
    return () => window.removeEventListener('user_verification_updated_event', handleVerificationUpdated);
  }, [onClose, onVerifiedSuccess, showToast]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!zaloPhone.trim()) {
      return showToast('Vui lòng nhập số điện thoại Zalo của bạn', 'error');
    }

    setSubmitting(true);
    try {
      const res = await requestAccountVerification({
        zaloPhone: zaloPhone.trim(),
        verificationNote: note.trim()
      });
      if (res.success) {
        setCurrentStatus('PENDING');
        showToast('Đã gửi yêu cầu xác minh. Ban quản trị sẽ duyệt trong ít phút!', 'success');
        
        // Cập nhật customerData local
        const saved = JSON.parse(localStorage.getItem('customerData') || '{}');
        saved.verificationStatus = 'PENDING';
        localStorage.setItem('customerData', JSON.stringify(saved));
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
          <div className="p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-2.5 z-10">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <ShieldCheck size={22} className="text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-base leading-tight">Xác Minh Tài Khoản</h3>
                <p className="text-[11px] text-white/80">Phòng chống bom hàng & tài khoản rác</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-4">
            
            {/* TRẠNG THÁI: PENDING (Đang chờ duyệt) */}
            {currentStatus === 'PENDING' && (
              <div className="space-y-4 text-center py-2">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto border-2 border-amber-200 animate-pulse">
                  <Clock size={36} />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-800 text-lg">Đang Chờ Admin Xác Minh</h4>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed px-2">
                    Hồ sơ của bạn đang được Ban quản trị AloShipp kiểm tra số điện thoại chính chủ qua Zalo/cuộc gọi. Vui lòng đợi trong giây lát.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-left text-xs space-y-2">
                  <p className="font-bold text-blue-900 flex items-center gap-1.5">
                    🚀 Cần đặt đơn hoặc tạo quán gấp?
                  </p>
                  <p className="text-blue-700">
                    Bấm liên hệ Admin bên dưới để được duyệt ngay trong vòng 30 giây:
                  </p>
                  <div className="flex gap-2 pt-1">
                    <a 
                      href="https://zalo.me/0868844883" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-xs shadow-sm"
                    >
                      <MessageSquare size={14} /> Nhắn Zalo Admin
                    </a>
                    <a 
                      href="tel:0868844883" 
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-xs shadow-sm"
                    >
                      <Phone size={14} /> Gọi Hotline
                    </a>
                  </div>
                </div>

                <button 
                  onClick={onClose}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Đóng (Hệ thống sẽ tự mở khóa khi được duyệt)
                </button>
              </div>
            )}

            {/* TRẠNG THÁI: REJECTED (Bị từ chối) */}
            {currentStatus === 'REJECTED' && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-left">
                  <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-1.5">
                    <XCircle size={18} /> Yêu Cầu Xác Minh Bị Từ Chối
                  </div>
                  <p className="text-xs text-red-600 leading-relaxed">
                    Lý do: <strong>{rejectReason || 'Số điện thoại không liên lạc được hoặc không đúng chính chủ.'}</strong>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Vui lòng kiểm tra lại số Zalo chính chủ hoặc nhắn tin với Admin để được hỗ trợ.
                  </p>
                </div>
              </div>
            )}

            {/* FORM GỬI YÊU CẦU: UNVERIFIED hoặc REJECTED */}
            {(currentStatus === 'UNVERIFIED' || currentStatus === 'REJECTED') && (
              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3">
                  <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <p className="font-bold mb-0.5">Xác nhận SĐT chính chủ để mở khóa dịch vụ</p>
                    <p className="text-amber-800 text-[11px]">
                      Để bảo vệ quyền lợi của bạn và tránh tài xế bị bom hàng, AloShipp xác minh số điện thoại chính chủ của bạn một lần duy nhất.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Số điện thoại đăng ký Zalo của bạn:
                  </label>
                  <input 
                    type="tel"
                    required
                    value={zaloPhone}
                    onChange={e => setZaloPhone(e.target.value)}
                    placeholder="Ví dụ: 0912345678"
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm font-bold text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Ban quản trị sẽ đối chiếu số này trên Zalo để duyệt tài khoản cho bạn.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Ghi chú thêm (Tùy chọn):
                  </label>
                  <input 
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Ví dụ: Tên quán, số nhà, địa chỉ quen thuộc..."
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-700 focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="pt-2 space-y-2">
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-xl shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    <Send size={16} />
                    {submitting ? 'Đang gửi yêu cầu...' : 'Gửi Yêu Cầu Xác Minh'}
                  </button>
                  <button 
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 text-gray-500 hover:text-gray-700 font-bold rounded-xl text-xs transition-colors"
                  >
                    Để sau (Tôi chỉ muốn xem giá & dịch vụ)
                  </button>
                </div>
              </form>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AccountVerificationModal;
