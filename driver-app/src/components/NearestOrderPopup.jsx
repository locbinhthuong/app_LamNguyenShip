import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { acceptOrder, rejectNearestAssignment } from '../services/api';

export default function NearestOrderPopup() {
  const [order, setOrder] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAssignment = (e) => {
      const newOrder = e.detail;
      if (newOrder) {
        setOrder(newOrder);
        setTimeLeft(30);
      }
    };

    const handleOrderAccepted = (e) => {
      const acceptedOrder = e.detail;
      if (order && (acceptedOrder._id === order._id || acceptedOrder.id === order.id || acceptedOrder._id === order.id)) {
        // Nếu người khác đã nhận đơn này, tự động ẩn popup
        setOrder(null);
        window.dispatchEvent(new CustomEvent('stop_alarm_event'));
      }
    };
    
    window.addEventListener('driver_nearest_order_assignment', handleAssignment);
    window.addEventListener('driver_order_accepted', handleOrderAccepted);
    
    return () => {
      window.removeEventListener('driver_nearest_order_assignment', handleAssignment);
      window.removeEventListener('driver_order_accepted', handleOrderAccepted);
    };
  }, [order]);

  useEffect(() => {
    if (!order) return;
    
    if (timeLeft <= 0) {
      handleReject(true); // Auto reject when timeout
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, order]);

  const handleAccept = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await acceptOrder(order._id || order.id);
      window.dispatchEvent(new CustomEvent('stop_alarm_event'));
      setOrder(null);
      navigate(`/order/${order._id || order.id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi nhận đơn!');
      // Vẫn tắt popup nếu lỗi (ví dụ đơn đã bị hủy hoặc người khác nhận mất)
      setOrder(null);
      window.dispatchEvent(new CustomEvent('stop_alarm_event'));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (isTimeout = false) => {
    if (loading) return;
    setLoading(true);
    window.dispatchEvent(new CustomEvent('stop_alarm_event'));
    try {
      await rejectNearestAssignment(order._id || order.id);
    } catch (err) {
      console.log('Lỗi khi từ chối đơn:', err);
    } finally {
      setOrder(null);
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 rounded-full bg-white opacity-20 animate-ping"></div>
          <h3 className="text-white font-bold text-lg relative z-10 flex items-center justify-center gap-2">
            🚀 ĐƠN MỚI GẦN BẠN
          </h3>
          <p className="text-purple-100 text-sm mt-1 relative z-10 font-medium">Bạn là tài xế gần nhất!</p>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
             <div className="text-xs text-slate-500 font-medium uppercase">Thu hộ (COD)</div>
             <div className="font-bold text-lg text-slate-800">
               {order.codAmount > 0 ? `${order.codAmount.toLocaleString('vi-VN')}đ` : 'Không thu'}
             </div>
          </div>
          
          <div className="flex items-center justify-between border-b pb-3">
             <div className="text-xs text-slate-500 font-medium uppercase">Phí ship</div>
               <div className="font-bold text-xl text-green-600 flex flex-col items-center">
                 {order.deliveryFee > 0 ? `${((order.deliveryFee || 0) + (order.packageDetails?.bulkyFee || 0) + (order.rideDetails?.surcharge || 0) + (order.extraSurcharge || 0)).toLocaleString('vi-VN')}đ` : 'Thỏa thuận'}
                 {order.serviceType !== 'DON_GHEP' && order.serviceType !== 'DAT_XE' && order.serviceType !== 'DIEU_PHOI' && order.deliveryFee > 0 && (
                   <span className="text-[10px] mt-0.5 font-bold px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 leading-tight">
                     {order.feePaidBy === 'SENDER' ? 'Shop trả ship' : 'Khách trả ship'}
                   </span>
                 )}
               </div>
          </div>
          
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-[10px]">📍</span>
              </div>
              <div>
                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Điểm lấy hàng</div>
                <div className="text-sm font-semibold text-slate-700 leading-tight">
                  {order.pickupAddress}
                </div>
              </div>
            </div>
            
            {order.deliveryAddress && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <span className="text-[10px]">🏁</span>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-0.5">Điểm giao hàng</div>
                  <div className="text-sm font-medium text-slate-600 leading-tight">
                    {order.deliveryAddress}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Progress Bar Countdown */}
          <div className="mt-5 relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
             <div 
               className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-linear ${timeLeft <= 10 ? 'bg-red-500' : 'bg-indigo-500'}`}
               style={{ width: `${(timeLeft / 30) * 100}%` }}
             ></div>
          </div>
          <div className="text-center text-xs font-bold mt-2 text-slate-500">
            Còn lại <span className={timeLeft <= 10 ? 'text-red-500 text-sm' : 'text-indigo-600 text-sm'}>{timeLeft}</span> giây để nhận đơn
          </div>
        </div>

        <div className="p-4 bg-slate-50 flex gap-3">
          <button
            onClick={() => handleReject(false)}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl active:scale-95 transition-transform"
          >
            ❌ BỎ QUA
          </button>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-[2] py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 active:scale-95 transition-transform flex items-center justify-center"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : '✅ NHẬN ĐƠN NGAY'}
          </button>
        </div>
      </div>
    </div>
  );
}
