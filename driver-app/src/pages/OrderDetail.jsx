import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrderById, acceptOrder, pickedUpOrder, completeOrder, cancelOrder } from '../services/api';

const STATUS_STEPS = ['ACCEPTED', 'PICKED_UP', 'COMPLETED'];
const STATUS_LABELS = {
  PENDING: 'Chờ nhận',
  ACCEPTED: 'Đã nhận',
  PICKED_UP: 'Đã lấy hàng',
  DELIVERING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy'
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { driver } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showToast, setShowToast] = useState(null);

  const showNotification = (message, type = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const loadOrder = async () => {
    try {
      const response = await getOrderById(id);
      setOrder(response.data);
    } catch (err) {
      showNotification('Không tìm thấy đơn hàng', 'error');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleAction = async (action) => {
    if (actionLoading) return; // Chặn bấm đúp Spam mạng
    setActionLoading(true);
    try {
      const actions = {
        accept: acceptOrder,
        pickup: pickedUpOrder,
        complete: completeOrder
      };
      await actions[action](id);
      showNotification('Cập nhật thành công!');
      await loadOrder();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getActionButton = () => {
    if (!order) return null;
    if (order.status === 'PENDING' && !order.assignedTo) {
      return <button onClick={() => handleAction('accept')} disabled={actionLoading} className="btn-success">Nhận đơn này</button>;
    }
    if (order.assignedTo?._id === driver?._id || order.assignedTo === driver?._id) {
      if (order.status === 'ACCEPTED') {
         // Nếu là chở khách thì text là "Đã Đón Khách", giao hàng là "Đã lấy hàng"
         const btnText = order.serviceType === 'DAT_XE' ? '🚙 Đã Đón Khách' : '📦 Đã lấy hàng';
         return <button onClick={() => handleAction('pickup')} disabled={actionLoading} className="btn-warning">{btnText}</button>;
      }
      if (order.status === 'PICKED_UP') {
         // Nếu là chở khách thì text là "Trả Khách & Hoàn Thành"
         const btnText = order.serviceType === 'DAT_XE' ? '✅ Trả Khách & Hoàn Thành' : '✅ Hoàn thành giao hàng';
         return <button onClick={() => handleAction('complete')} disabled={actionLoading} className="btn-success">{btnText}</button>;
      }
    }
    return null;
  };

  const currentStep = STATUS_STEPS.indexOf(order?.status);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!order) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-36 sm:pb-40">
      {showToast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg text-white font-medium ${
          showToast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {showToast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-4 pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <button type="button" onClick={() => navigate(-1)} className="shrink-0 text-xl text-slate-800">
            ←
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-slate-800 sm:text-lg">
              {order.serviceType === 'GIAO_HANG' ? 'Đơn Giao Hàng' :
               order.serviceType === 'DAT_XE' ? (order.subServiceType === 'XE_OM' ? 'Chở Khách Xe Máy' : order.subServiceType === 'LAI_HO_OTO' ? 'Lái Hộ Ô Tô' : 'Lái Hộ Xe Máy') :
               order.serviceType === 'MUA_HO' ? 'Mua Hàng Hộ' :
               order.serviceType === 'DIEU_PHOI' ? 'Dịch Vụ Điều Phối' : 'Chi tiết đơn hàng'}
            </h1>
            <p className="truncate text-[11px] font-bold text-blue-600 bg-blue-50 max-w-max px-2 py-0.5 rounded uppercase mt-0.5 border border-blue-100">{order.orderCode || id?.slice(-8).toUpperCase()}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="rounded-full bg-blue-500 px-2 py-1 text-xs font-bold text-white sm:px-3 sm:text-sm">
              {STATUS_LABELS[order.status] || order.status}
            </span>
            <button onClick={loadOrder} className="text-[10px] bg-slate-100 px-2 py-1.5 rounded-lg text-slate-600 font-bold hover:bg-slate-200 active:scale-95 transition-all shadow-sm flex items-center gap-1 border border-slate-200">
               🔄 LÀM MỚI ĐƠN
            </button>
          </div>
        </div>

        {/* Progress */}
        {STATUS_STEPS.includes(order.status) && (
          <div className="flex gap-1 mb-4">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className={`flex-1 h-2 rounded-full ${i <= currentStep ? 'bg-green-500' : 'bg-slate-700'}`} />
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-lg space-y-4 p-4 sm:max-w-xl">
        {/* Addresses */}
        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <span className="w-8 h-8 shrink-0 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 font-bold">
              {order.serviceType === 'DAT_XE' ? '📍' : '📦'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs text-slate-500 font-bold uppercase">
                  {order.serviceType === 'DAT_XE' ? 'ĐIỂM ĐÓN KHÁCH' : 'Lấy Hàng Tại'}
                </p>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${order.pickupCoordinates?.lat ? `${order.pickupCoordinates.lat},${order.pickupCoordinates.lng}` : encodeURIComponent(order.pickupAddress)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full border border-blue-100 transition-colors shadow-sm"
                >
                  🗺️ DẪN ĐƯỜNG
                </a>
              </div>
              <p className="text-slate-800 font-bold text-sm leading-snug">{order.pickupAddress || 'Chưa xác định'}</p>
            </div>
          </div>
          <div className="border-l-2 border-dashed border-slate-600 ml-4 h-4 mb-4" />
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 font-bold">🏁</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs text-slate-500 font-bold uppercase">
                  {order.serviceType === 'DAT_XE' ? 'ĐIỂM ĐẾN (TRẢ KHÁCH)' : 'Giao Hàng (Đến)'}
                </p>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${order.deliveryCoordinates?.lat ? `${order.deliveryCoordinates.lat},${order.deliveryCoordinates.lng}` : encodeURIComponent(order.deliveryAddress)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full border border-blue-100 transition-colors shadow-sm"
                >
                  🗺️ DẪN ĐƯỜNG
                </a>
              </div>
              <p className="text-slate-800 font-medium text-sm leading-snug">{order.deliveryAddress || 'Chưa xác định'}</p>
            </div>
          </div>
        </div>

        {/* Liên Hệ */}
        <div className="card">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
            <span className="text-sm">☎️</span> {order.serviceType === 'DAT_XE' ? 'LIÊN HỆ KHÁCH ĐẶT CHUYẾN' : 'LIÊN HỆ GIAO NHẬN'}
          </p>
          <div className="flex flex-col gap-5">
            
            {order.serviceType === 'DAT_XE' ? (
              <>
                {/* ĐIỂM ĐÓN KHÁCH */}
                <div className="flex items-center justify-between mx-[-12px] px-3 border-b border-slate-100 pb-4">
                  <div className="min-w-0 pr-2 flex-1">
                     <p className="font-bold text-slate-400 text-[10px] uppercase mb-0.5">📍 TRẠM 1: ĐÓN KHÁCH</p>
                     <p className="text-slate-800 font-bold text-sm mb-1">{order.customerName}</p>
                     <div className="space-y-2">
                       <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">SĐT CHÍNH</span>
                         <a href={`tel:${order.customerPhone}`} className="text-blue-600 font-black text-lg tracking-wider active:text-blue-800">{order.customerPhone}</a>
                       </div>
                       {order.senderPhone && order.senderPhone !== order.customerPhone && (
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded">SĐT PHỤ</span>
                           <a href={`tel:${order.senderPhone}`} className="text-violet-600 font-black text-lg tracking-wider active:text-violet-800">{order.senderPhone}</a>
                         </div>
                       )}
                     </div>
                  </div>
                  <div className="shrink-0 flex flex-col gap-2">
                     <a href={`tel:${order.customerPhone}`} className="rounded-xl bg-blue-500 px-4 py-2 text-center text-[10px] font-black text-white shadow-sm flex items-center justify-center gap-1 active:scale-95">📞 SỐ CHÍNH</a>
                     {order.senderPhone && order.senderPhone !== order.customerPhone && (
                        <a href={`tel:${order.senderPhone}`} className="rounded-xl bg-violet-500 px-4 py-2 text-center text-[10px] font-black text-white shadow-sm flex items-center justify-center gap-1 active:scale-95">📞 SỐ PHỤ</a>
                     )}
                  </div>
                </div>

                {/* ĐIỂM TỚI */}
                <div className="flex items-center justify-between pt-4 mx-[-12px] px-3">
                  <div className="min-w-0 pr-2 flex-1">
                     <p className="font-bold text-slate-400 text-[10px] uppercase mb-0.5">🏁 TRẠM 2: CÁC LIÊN HỆ ĐIỂM ĐẾN</p>
                     <div className="space-y-2 mt-2">
                       {order.receiverPhone ? (
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">SĐT CHÍNH</span>
                           <a href={`tel:${order.receiverPhone}`} className="text-sky-600 font-black text-lg tracking-wider">{order.receiverPhone}</a>
                         </div>
                       ) : <p className="text-xs text-slate-400 italic">Không có SĐT tại điểm đến</p>}
                       
                       {order.receiverPhone2 && (
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">SĐT PHỤ</span>
                           <a href={`tel:${order.receiverPhone2}`} className="text-indigo-600 font-black text-lg tracking-wider">{order.receiverPhone2}</a>
                         </div>
                       )}
                     </div>
                  </div>
                  <div className="shrink-0 flex flex-col gap-2">
                     {order.receiverPhone && (
                        <a href={`tel:${order.receiverPhone}`} className="rounded-xl bg-sky-500 px-4 py-2 text-center text-[10px] font-black text-white shadow-sm flex items-center justify-center gap-1 active:scale-95">📞 SỐ CHÍNH</a>
                     )}
                     {order.receiverPhone2 && (
                        <a href={`tel:${order.receiverPhone2}`} className="rounded-xl bg-indigo-500 px-4 py-2 text-center text-[10px] font-black text-white shadow-sm flex items-center justify-center gap-1 active:scale-95">📞 SỐ PHỤ</a>
                     )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* 1. NƠI LẤY HÀNG (SENDER / SHOP) */}
                <div className="flex items-center justify-between border-b mx-[-12px] px-3 border-slate-100 pb-5">
                  <div className="min-w-0 pr-2 flex-1">
                    <p className="font-bold text-slate-400 text-[10px] uppercase mb-1 flex items-center gap-1">
                       📍 TRẠM 1: LẤY HÀNG / GẶP MẶT
                    </p>
                    <p className="text-slate-800 font-bold text-sm mb-2">{order.senderName || order.customerName || 'Khách / Shop'}</p>
                    <div className="space-y-2">
                       <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">SĐT CHÍNH</span>
                         <a href={`tel:${order.customerPhone}`} className="text-orange-600 font-black text-lg tracking-wider">{order.customerPhone}</a>
                       </div>
                       {order.senderPhone && order.senderPhone !== order.customerPhone && (
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">SĐT PHỤ</span>
                           <a href={`tel:${order.senderPhone}`} className="text-amber-600 font-black text-lg tracking-wider">{order.senderPhone}</a>
                         </div>
                       )}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col gap-2">
                     <a href={`tel:${order.customerPhone}`} className="rounded-xl bg-orange-500 px-4 py-2 text-center text-[10px] font-black text-white shadow flex items-center justify-center gap-1 active:scale-95">📞 SỐ CHÍNH</a>
                     {order.senderPhone && order.senderPhone !== order.customerPhone && (
                        <a href={`tel:${order.senderPhone}`} className="rounded-xl bg-amber-500 px-4 py-2 text-center text-[10px] font-black text-white shadow flex items-center justify-center gap-1 active:scale-95">📞 SỐ PHỤ</a>
                     )}
                  </div>
                </div>

                {/* 2. NƠI GIAO ĐẾN (RECEIVER / CUSTOMER) */}
                {order.serviceType !== 'DIEU_PHOI' && (
                  <div className="flex items-center justify-between pt-4 mx-[-12px] px-3">
                    <div className="min-w-0 pr-2 flex-1">
                      <p className="font-bold text-slate-400 text-[10px] uppercase mb-1">🏁 TRẠM 2: GIAO ĐẾN / NHẬN HÀNG</p>
                      <p className="text-slate-800 font-bold text-sm mb-2">{order.receiverName || order.customerName || 'Người nhận'}</p>
                      <div className="space-y-2">
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">SĐT CHÍNH</span>
                           <a href={`tel:${order.receiverPhone || order.customerPhone}`} className="text-blue-600 font-black text-lg tracking-wider">{order.receiverPhone || order.customerPhone}</a>
                         </div>
                         {order.receiverPhone2 && (
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded">SĐT PHỤ</span>
                             <a href={`tel:${order.receiverPhone2}`} className="text-sky-600 font-black text-lg tracking-wider">{order.receiverPhone2}</a>
                           </div>
                         )}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col gap-2">
                       <a href={`tel:${order.receiverPhone || order.customerPhone}`} className="rounded-xl bg-blue-500 px-4 py-2 text-center text-[10px] font-black text-white shadow flex items-center justify-center gap-1 active:scale-95">📞 SỐ CHÍNH</a>
                       {order.receiverPhone2 && (
                          <a href={`tel:${order.receiverPhone2}`} className="rounded-xl bg-sky-500 px-4 py-2 text-center text-[10px] font-black text-white shadow flex items-center justify-center gap-1 active:scale-95">📞 SỐ PHỤ</a>
                       )}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>

        {/* Order Info */}
        <div className="card">
          <p className="text-xs text-slate-500 mb-2 font-bold uppercase">THÔNG TIN CHUYẾN</p>
          
          {/* GIAO_HANG INFO */}
          {order.serviceType === 'GIAO_HANG' && (
             <div className="mb-4">
               <p className="text-slate-500 text-xs mb-1">Chi tiết hàng hóa:</p>
               {order.items?.length > 0 ? (
                 <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mb-2 shadow-inner">
                   {order.items.map((item, i) => (
                     <p key={i} className="text-slate-800 text-sm font-medium">• {item.name || item} {item.quantity ? `(SL: ${item.quantity})` : ''}</p>
                   ))}
                 </div>
               ) : <p className="text-slate-800 text-sm mb-2 italic">Không có danh sách hàng cụ thể.</p>}
               {order.packageDetails?.weight && <p className="text-sm font-medium text-slate-700 mt-2">⚖️ Trọng lượng ước tính: <b>{order.packageDetails.weight}kg</b></p>}
               {order.packageDetails?.isFragile && <p className="text-sm font-bold text-red-500 mt-1">⚠️ Cẩn thận: Hàng dễ vỡ</p>}
             </div>
          )}

          {/* MUA_HO INFO */}
          {order.serviceType === 'MUA_HO' && (
             <div className="mb-4">
               <p className="text-slate-500 text-xs mb-1">Danh sách cần mua hộ:</p>
               {order.items?.length > 0 ? (
                 <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100 mb-2 shadow-inner">
                   {order.items.map((item, i) => (
                     <div key={i} className="flex justify-between items-center py-1 border-b border-blue-100/50 last:border-0">
                        <span className="text-slate-800 text-sm font-bold">• {item.name || item} {item.quantity ? `(x${item.quantity})` : ''}</span>
                        {item.estimatedPrice && <span className="text-blue-600 font-medium text-sm">{item.estimatedPrice.toLocaleString()}đ</span>}
                     </div>
                   ))}
                 </div>
               ) : <p className="text-slate-800 text-sm mb-2 italic">Không có danh sách hàng (Xem ghi chú của khách).</p>}
             </div>
          )}

          {/* DIEU_PHOI INFO (KÈM THỢ) */}
          {order.serviceType === 'DIEU_PHOI' && (
             <div className="mb-4 bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm relative overflow-hidden">
               <div className="absolute -right-4 -top-4 text-7xl opacity-[0.05]">🛠️</div>
               <p className="text-purple-800 text-sm flex flex-col relative z-10">
                 <span className="text-[10px] text-purple-400 font-bold uppercase mb-1 tracking-wider">MÔ TẢ NHIỆM VỤ THỢ:</span>
                 <span className="font-black text-lg">
                   {order.subServiceType === 'KEM_THO_DIEN' ? '⚡ Thợ Điện' : order.subServiceType === 'KEM_THO_NUOC' ? '💧 Thợ Nước' : '🛠️ Sửa Chữa Khác'}
                 </span>
               </p>
             </div>
          )}

          {/* XE ÔM / LÁI HỘ INFO (DAT_XE) */}
          {order.serviceType === 'DAT_XE' && order.rideDetails && (
            <div className="mb-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 shadow-sm relative overflow-hidden">
              <div className="absolute -right-4 -top-4 text-7xl opacity-[0.03]">🛵</div>
              <p className="text-indigo-800 text-sm flex flex-col relative z-10">
                <span className="text-[10px] text-indigo-400 font-bold uppercase mb-1 tracking-wider">PHƯƠNG TIỆN YÊU CẦU:</span>
                <span className="font-black text-lg">
                  {order.subServiceType === 'XE_OM' ? '🛵 Xe Máy (Chở khách)' : order.subServiceType === 'LAI_HO_OTO' ? '🚗 Lái hộ Ô Tô' : '🔑 Lái hộ Xe Máy'}
                </span>
                {order.rideDetails?.vehicleClass && (
                  <span className="text-xs text-indigo-600 font-semibold bg-white px-2 py-0.5 rounded border border-indigo-100 mt-2 max-w-max">
                     Hạng: {order.rideDetails.vehicleClass === 'TAY_GA' ? 'Xe Tay Ga' : order.rideDetails.vehicleClass === 'XE_SO' ? 'Xe Số' : 'Côn Tay / Mô Tô'}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* GHI CHÚ CHUNG */}
          {order.note && (
            <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200 mb-4 shadow-sm">
              <p className="text-yellow-600 text-xs font-bold uppercase mb-0.5">📝 Ghi chú từ khách hàng</p>
              <p className="text-slate-800 text-sm font-medium">{order.note}</p>
            </div>
          )}

          {/* BLOCK THANH TOÁN */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            
            {/* Cột 1: Tiền Phí/Cước */}
            <div className="bg-slate-700 rounded-xl p-3 flex flex-col justify-center relative overflow-hidden group">
               <div className="absolute -right-3 -bottom-3 text-5xl opacity-10 group-hover:scale-110 transition-transform">💰</div>
               <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider relative z-10">
                 {order.serviceType === 'DAT_XE' ? 'Cước chuyến đi' : order.serviceType === 'DIEU_PHOI' ? 'Phí gọi thợ' : 'Phí dịch vụ / Ship'}
               </p>
               {order.deliveryFee > 0 ? (
                  <p className="text-green-400 font-black text-2xl drop-shadow-sm relative z-10">{order.deliveryFee?.toLocaleString()}đ</p>
               ) : (
                  <p className="text-green-400 font-black text-xl drop-shadow-sm relative z-10">Thỏa Thuận</p>
               )}
            </div>
            
            {/* Cột 2: Thu Hộ (Giao Hàng) */}
            {order.serviceType === 'GIAO_HANG' && (order.codAmount > 0 || order.codAmount === 0) && (
              <div className="bg-slate-700 rounded-xl p-3 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute -right-3 -bottom-3 text-5xl opacity-10 group-hover:scale-110 transition-transform">💎</div>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider relative z-10">Cần Thu hộ (COD)</p>
                <p className="text-blue-400 font-black text-2xl drop-shadow-sm relative z-10">{order.codAmount?.toLocaleString() || 0}đ</p>
              </div>
            )}

            {/* Cột 2: Tiền Hàng Dự Kiến (Mua Hộ) */}
            {order.serviceType === 'MUA_HO' && (
              <div className="bg-slate-700 rounded-xl p-3 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute -right-3 -bottom-3 text-5xl opacity-10 group-hover:scale-110 transition-transform">🛒</div>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider relative z-10">Tiền hàng dự kiến</p>
                <p className="text-orange-400 font-black text-2xl drop-shadow-sm relative z-10">
                  {order.purchaseDetails?.estimatedTotal ? `${order.purchaseDetails.estimatedTotal.toLocaleString()}đ` : 'Thỏa thuận'}
                </p>
              </div>
            )}

          </div>
          
          {/* BLOCK THƯỞNG VÍ */}
          {order.adminBonus > 0 && (
             <div className="mt-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl p-3 flex items-center justify-between border border-emerald-400 shadow-lg shadow-emerald-500/20 relative overflow-hidden">
               <div className="absolute -right-2 text-6xl opacity-[0.15]">🎁</div>
               <div className="relative z-10">
                  <p className="text-emerald-100 text-[11px] font-bold uppercase tracking-wider">Thưởng thêm vào Ví</p>
                  <p className="text-white font-black text-2xl drop-shadow-md">+{order.adminBonus?.toLocaleString()}đ</p>
               </div>
               <div className="relative z-10 bg-white/20 px-3 py-1.5 rounded-lg border border-white/30 backdrop-blur-sm">
                 <span className="text-white text-xs font-bold uppercase tracking-widest">ĐỘC QUYỀN</span>
               </div>
             </div>
          )}
        </div>

        {/* Timeline */}
        {order.acceptedAt && (
          <div className="card">
            <p className="text-xs text-slate-500 mb-3">TIMELINE</p>
            <div className="space-y-2">
              <div className="flex gap-3">
                <span className="text-green-400">✓</span>
                <div>
                  <p className="text-slate-800 text-sm">Nhận đơn</p>
                  <p className="text-slate-500 text-xs">{new Date(order.acceptedAt).toLocaleString('vi-VN')}</p>
                </div>
              </div>
              {order.pickedUpAt && (
                <div className="flex gap-3">
                  <span className="text-yellow-400">✓</span>
                  <div>
                    <p className="text-slate-800 text-sm">Lấy hàng</p>
                    <p className="text-slate-500 text-xs">{new Date(order.pickedUpAt).toLocaleString('vi-VN')}</p>
                  </div>
                </div>
              )}
              {order.deliveredAt && (
                <div className="flex gap-3">
                  <span className="text-blue-400">✓</span>
                  <div>
                    <p className="text-slate-800 text-sm">Giao hàng</p>
                    <p className="text-slate-500 text-xs">{new Date(order.deliveredAt).toLocaleString('vi-VN')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bottom-nav-safe p-4">
        <div className="mx-auto max-w-xl space-y-2">
          {getActionButton()}
        </div>
      </div>
    </div>
  );
}
