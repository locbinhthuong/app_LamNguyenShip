import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {ArrowLeft, MapPin, Navigation, Package, DollarSign, Clock, CheckCircle2, Circle, Truck, Info, PhoneCall, RefreshCcw} from 'lucide-react';
import { getOrderDetails, api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await getOrderDetails(id);
      if (res.success) {
        setOrder(res.data);
      } else {
        setError('Không thể lấy thông tin đơn hàng');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra!');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();

    const handleRefresh = (e) => {
      const updatedOrder = e.detail;
      if (updatedOrder && updatedOrder._id === id) {
        // Cập nhật State trực tiếp cực nhanh
        setOrder(updatedOrder);
      } else {
        // Fallback fetch nếu không truyền data
        fetchDetail();
      }
    };

    window.addEventListener('refresh_orders_data', handleRefresh);

    const handleDeleted = (e) => {
      if (e.detail === id) {
        setError('Đơn hàng đã bị huỷ hoặc xoá khỏi hệ thống.');
        setOrder(null);
      }
    };
    window.addEventListener('order_deleted_event', handleDeleted);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDetail();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('refresh_orders_data', handleRefresh);
      window.removeEventListener('order_deleted_event', handleDeleted);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id]);

  const handleCancelOrder = async () => {
    const reason = window.prompt('Hủy đơn hàng này? Vui lòng nhập lý do ngắn gọn:');
    if (reason === null) return;
    try {
      setLoading(true);
      const res = await api.post(`/orders/${id}/cancel`, { reason });
      if (res.data.success) {
        showToast('Đã hủy đơn thành công', 'success');
        fetchDetail();
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Không thể hủy đơn', 'error');
      setLoading(false);
    }
  };

  if (loading && !order) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
         <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50 p-4">
         <p className="text-red-500 font-bold mb-4">{error}</p>
         <button onClick={() => navigate(-1)} className="px-4 py-2 bg-slate-200 rounded-xl font-bold">Quay lại</button>
      </div>
    );
  }

  // Helper để vẽ Stepper trạng thái
  const STEPS = order?.serviceType === 'DAT_XE' ? [
    { key: 'DRAFT', label: 'Chờ Báo Giá' },
    { key: 'PENDING', label: 'Đã Báo Giá (Chờ Tài Xế)' },
    { key: 'ACCEPTED', label: 'Tài Xế Đang Xếp Xe' },
    { key: 'PICKED_UP', label: 'Tài Xế Đang Đến Đón' },
    { key: 'COMPLETED', label: 'Hoàn Tất Chuyến Đi' }
  ] : [
    { key: 'DRAFT', label: 'Chờ Báo Giá' },
    { key: 'PENDING', label: 'Đã Báo Giá (Chờ Xế)' },
    { key: 'ACCEPTED', label: 'Tài Xế Đã Nhận' },
    { key: 'PICKED_UP', label: order?.serviceType === 'MUA_HO' ? 'Xế Đã Mua Hàng' : 'Xế Đã Lấy Hàng' },
    { key: 'COMPLETED', label: 'Hoàn Tất' }
  ];

  // Map status thực tế sang stepper index
  let currentIndex = 0;
  if (order.status === 'PENDING') currentIndex = 1;
  else if (order.status === 'ACCEPTED') currentIndex = 2;
  else if (order.status === 'PICKED_UP' || order.status === 'DELIVERING') currentIndex = 3;
  else if (order.status === 'COMPLETED') currentIndex = 4;
  else if (order.status === 'CANCELLED') currentIndex = -1; // Hủy

  return (
    <div className="flex flex-col flex-1 w-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-white px-4 py-3 safe-pt z-40 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 active:scale-90 transition-transform">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-slate-800 text-lg">Chi Tiết Đơn Hàng</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">{order.orderCode || order._id.slice(-8)}</p>
        </div>
        <button onClick={fetchDetail} className="p-2 -mr-2 text-blue-600 active:rotate-180 transition-transform">
           <RefreshCcw size={20} />
        </button>
      </div>

      <div className="flex-1 min-h-0 w-full overflow-y-auto p-4">
        <div className="max-w-lg mx-auto space-y-4 pb-8">
        
        {/* Khối Trạng Thái Hoạt Động (Stepper) */}
        {!['CANCELLED'].includes(order.status) ? (
          <div className="bg-white p-5 rounded-3xl border border-slate-100 mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">TIẾN ĐỘ ĐƠN HÀNG</h3>
            <div className="relative flex flex-col gap-5 pl-4 before:absolute before:inset-y-2 before:left-[21px] before:w-[2px] before:bg-slate-100">
              {STEPS.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                // Tô màu theo trạng thái
                let colorClass = 'text-slate-300 bg-slate-100';
                if (isCompleted) colorClass = 'text-blue-500 bg-blue-50';
                if (isCurrent) colorClass = 'text-white bg-blue-600 shadow-md shadow-blue-200';
                
                return (
                  <div key={step.key} className="relative z-10 flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center -ml-[3px] transition-colors ${colorClass}`}>
                       {isCompleted ? <CheckCircle2 size={10} className="text-blue-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
                        {step.label}
                      </p>
                      {isCurrent && order.status === 'PENDING' && <p className="text-[10px] text-slate-500">Đang tìm tài xế gần nhất...</p>}
                      {isCurrent && order.status === 'DRAFT' && <p className="text-[10px] text-slate-500">Tổng đài đang tính toán cước phí...</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100 mb-2">
            <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">⚠️ ĐƠN BỊ HUỶ</h3>
            {order.cancelReason && <p className="text-xs text-red-500 mt-1">Lý do: {order.cancelReason}</p>}
          </div>
        )}

        {/* Khối Thông Tin Tài Xế (Bật khi có xế) */}
        {order.assignedTo && (
          <div className="bg-white p-4 rounded-3xl border border-slate-100 mb-2 flex flex-col gap-3">
            <div className="flex justify-between items-center">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Truck size={14}/> THÔNG TIN TÀI XẾ</h3>
               <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-lg">Đã Có Xế</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
               <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                 {order.assignedTo.name?.charAt(0) || 'X'}
               </div>
               <div className="flex-1">
                 <p className="font-bold text-slate-800">{order.assignedTo.name}</p>
                 <p className="text-xs font-medium text-slate-500 uppercase">{order.assignedTo.vehiclePlate || 'ĐANG CẬP NHẬT BIỂN SỐ'}</p>
               </div>
               <a href={`tel:${order.assignedTo.phone}`} className="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-200 transition-transform active:scale-95">
                 <PhoneCall size={18} />
               </a>
            </div>
          </div>
        )}

        {/* Khối Hoá Đơn / Phí Dịch Vụ */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1"><DollarSign size={14}/> CHI TIẾT CƯỚC PHÍ</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                 <span className="text-sm text-slate-600 font-medium">Phí Giao Hàng (Ship)</span>
                 <span className="font-black text-slate-800">
                   {order.deliveryFee > 0 ? `${order.deliveryFee.toLocaleString()}đ` : <span className="text-blue-500 text-xs italic">Đang cập nhật...</span>}
                 </span>
              </div>

              {order.financialDetails?.surcharge > 0 && (
                <div className="flex justify-between items-center px-2">
                   <span className="text-sm text-slate-500">Phụ phí (Cồng kềnh, Mưa,...)</span>
                   <span className="font-medium text-slate-700">{order.financialDetails.surcharge.toLocaleString()}đ</span>
                </div>
              )}

              {order.codAmount > 0 && (
                <div className="flex justify-between items-center bg-blue-50 p-3 rounded-2xl border border-blue-100">
                   <span className="text-sm text-blue-800 font-bold">Thu hộ tiền hàng (COD)</span>
                   <span className="font-black text-blue-600">{order.codAmount.toLocaleString()}đ</span>
                </div>
              )}

              <div className="border-t border-dashed border-slate-200 my-2"></div>
              
              <div className="flex justify-between items-end px-1">
                 <div className="flex flex-col">
                   <span className="text-[10px] text-slate-400 font-bold uppercase">TỔNG TÀI XẾ SẼ THU</span>
                   <span className="text-[10px] text-slate-400 italic">(Bao gồm COD + Phí Ship)</span>
                 </div>
                 <span className="font-black text-2xl text-red-500">
                   {(order.deliveryFee > 0 || order.codAmount > 0) ? `${((order.deliveryFee || 0) + (order.financialDetails?.surcharge || 0) + (order.codAmount || 0)).toLocaleString()}đ` : '--'}
                 </span>
              </div>
            </div>
        </div>

        {/* Khối Thông Tin Giao Dịch Tài Chính (Nạp/Rút Tiền) */}
        {order.serviceType === 'DIEU_PHOI' && (order.subServiceType === 'NAP_TIEN' || order.subServiceType === 'RUT_TIEN') && (
          <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 mb-2 space-y-3 relative overflow-hidden">
             <div className="absolute -right-4 -top-4 text-7xl opacity-[0.05]">🏦</div>
             <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1 relative z-10">🏦 THÔNG TIN TÀI CHÍNH</h3>
             
             <div className="space-y-3 relative z-10">
               <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-blue-100/50">
                  <span className="text-xs text-slate-500 font-medium">Ngân Hàng</span>
                  <span className="font-bold text-slate-800">{order.financialDetails?.bankName || 'Đang chờ cập nhật'}</span>
               </div>
               <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-blue-100/50">
                  <span className="text-xs text-slate-500 font-medium">Tài Khoản</span>
                  <span className="font-black text-blue-700 tracking-wider text-[15px]">{order.financialDetails?.bankAccount || 'Rỗng'}</span>
               </div>
               <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-blue-100/50">
                  <span className="text-xs text-slate-500 font-medium">Tên Chủ Tài Khoản</span>
                  <span className="font-bold text-slate-800 uppercase line-clamp-1 text-right max-w-[60%]">{order.financialDetails?.bankAccountName || 'Chưa cung cấp'}</span>
               </div>
               
               <div className="flex justify-between items-end bg-blue-50 p-3 rounded-2xl border border-blue-200 mt-2">
                  <span className="text-[11px] text-blue-800 font-bold uppercase tracking-wider">{order.subServiceType === 'NAP_TIEN' ? 'SỐ TIỀN CẦN NẠP VÀO' : 'SỐ TIỀN CẦN RÚT RA'}</span>
                  <span className="font-black text-xl text-blue-600 ">{order.financialDetails?.transactionAmount?.toLocaleString() || 0}đ</span>
               </div>
             </div>
          </div>
        )}

        {/* Khối Thông tin Giao Nhận */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 mb-2 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              <MapPin size={14}/> {order.serviceType === 'DAT_XE' ? 'LỘ TRÌNH CHUYẾN ĐI' : order.serviceType === 'DIEU_PHOI' ? 'ĐỊA ĐIỂM GIAO DỊCH' : 'LỘ TRÌNH GIAO HÀNG'}
            </h3>
            
            <div className="relative pl-6">
               <div className="absolute left-1.5 top-2 bottom-6 w-0.5 bg-dashed bg-slate-200 border-l-2 border-dashed border-slate-200"></div>
               
               {/* ĐIỂM XUẤT PHÁT */}
               <div className="mb-5 relative">
                  <div className="absolute -left-[27px] top-1 w-3 h-3 bg-blue-400 rounded-full ring-4 ring-blue-50"></div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{order.serviceType === 'DAT_XE' ? 'ĐIỂM ĐÓN KHÁCH' : order.serviceType === 'DIEU_PHOI' ? 'NƠI GẶP MẶT / GIAO DỊCH' : 'NGƯỜI GỬI / NƠI LẤY'}</p>
                  <p className="text-sm font-bold text-slate-800 leading-snug tracking-tight mb-2">{order.pickupAddress || 'Chưa xác định'}</p>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-slate-600 font-medium">👤 {order.senderName || order.customerName || 'Người đặt'}</p>
                    <p className="text-xs text-slate-500 font-medium whitespace-nowrap overflow-x-hidden text-ellipsis">
                      <span className="font-bold text-blue-600">SĐT Liên Hệ:</span> {order.senderPhone || order.customerPhone || order.pickupPhone}
                    </p>
                  </div>
               </div>

               {/* ĐIỂM ĐẾN */}
               {order.serviceType !== 'DIEU_PHOI' && (
                 <div className="relative">
                    <div className="absolute -left-[27px] top-1 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-blue-50"></div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{order.serviceType === 'DAT_XE' ? 'ĐIỂM ĐẾN (TRẢ KHÁCH)' : 'NGƯỜI NHẬN / NƠI GIAO'}</p>
                    <p className="text-sm font-bold text-slate-800 leading-snug tracking-tight mb-2">{order.deliveryAddress || 'Chưa xác định'}</p>
                    
                    <div className="space-y-1">
                      <p className="text-xs text-slate-600 font-medium">👤 {order.receiverName || order.customerName || 'Khách hàng'}</p>
                      <p className="text-xs text-slate-500 font-medium whitespace-nowrap overflow-x-hidden text-ellipsis">
                        <span className="font-bold text-blue-600">SĐT Liên Hệ:</span> {order.receiverPhone || order.customerPhone}
                      </p>
                    </div>
                 </div>
               )}
            </div>
            
            {/* THÔNG TIN XE CHO LÁI HỘ / XE ÔM */}
            {order.serviceType === 'DAT_XE' && order.rideDetails && (
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                 <div className="bg-indigo-50 p-2 rounded-xl text-center">
                    <p className="text-[10px] text-indigo-400 font-bold uppercase">Phương Tiện</p>
                    <p className="text-xs text-indigo-700 font-bold">{order.subServiceType === 'XE_OM' ? 'Xe Máy' : order.subServiceType === 'LAI_HO_OTO' ? 'Ô Tô' : 'Xe Máy'}</p>
                 </div>
                 {order.rideDetails.vehicleClass && (
                 <div className="bg-teal-50 p-2 rounded-xl text-center">
                    <p className="text-[10px] text-teal-400 font-bold uppercase">{order.subServiceType === 'LAI_HO_OTO' ? 'Dòng Xe' : 'Phân Khúc'}</p>
                    <p className="text-xs text-teal-700 font-bold">
                       {order.rideDetails.vehicleClass === 'TAY_GA' ? 'Xe Tay Ga' : 
                        order.rideDetails.vehicleClass === 'XE_SO' ? 'Xe Số' : 
                        order.rideDetails.vehicleClass === 'CON_TAY' ? 'Xe Côn Tay' : 
                        order.rideDetails.vehicleClass}
                    </p>
                 </div>
                 )}
              </div>
            )}
        </div>
        
        {order.note && (
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
             <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
             <div className="flex-1">
               <p className="text-xs font-bold text-amber-800 mb-0.5">LƯU Ý CỦA BẠN</p>
               <p className="text-sm text-amber-700">{order.note}</p>
             </div>
          </div>
        )}

        {/* Nút Hủy Đơn */}
        {['PENDING', 'DRAFT'].includes(order.status) && (
          <div className="mt-6 mb-2">
            <button 
              onClick={handleCancelOrder}
              disabled={loading}
              className="w-full bg-red-50 text-red-600 font-bold border border-red-200 py-3.5 rounded-2xl active:bg-red-100 transition-colors"
            >
              HỦY ĐƠN HÀNG
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-2">Bạn chỉ có thể hủy trước khi Tài xế nhận đơn.</p>
          </div>
        )}

        </div>
      </div>
    </div>
  );
}
