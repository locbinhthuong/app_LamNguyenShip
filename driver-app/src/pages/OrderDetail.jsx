import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrderById, acceptOrder, pickedUpOrder, completeOrder, cancelOrder } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { Package, Bike, Wrench, ShoppingCart, MapPin, CheckCircle2, Gift, Phone, Map, Car, Key, Building2, Zap, Droplet, Wallet, Diamond, Trophy, Scale, AlertTriangle, ArrowLeft, RefreshCw, FileText, DollarSign } from 'lucide-react';

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
  const [driverLocation, setDriverLocation] = useState(null);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const mapRef = useRef(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showToast, setShowToast] = useState(null);

  // Logic vuốt màn hình có hiệu ứng
  const [touchStart, setTouchStart] = useState({ x: null, y: null });
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e) => {
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  const handleTouchMove = (e) => {
    if (touchStart.x === null) return;
    
    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    
    const deltaX = currentX - touchStart.x;
    const deltaY = currentY - touchStart.y;
    
    // Xác định chủ đích người dùng (vuốt ngang hay cuộn dọc)
    if (!isSwiping) {
      // Nếu có xu hướng cuộn dọc rõ rệt hơn vuốt ngang -> Hủy theo dõi vuốt
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        setTouchStart({ x: null, y: null });
        return;
      }
      // Nếu vuốt ngang rõ rệt -> Khóa là đang vuốt ngang
      if (Math.abs(deltaX) > 10) {
        setIsSwiping(true);
      }
    }
    
    // Chỉ kích hoạt khi đã xác nhận vuốt ngang và hướng sang phải
    if (isSwiping && deltaX > 0) {
      setSwipeOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (touchStart.x === null) return;
    
    // Kéo > 80px thì chuyển trang, không thì hồi lại
    if (swipeOffset > 80) {
      navigate(-1);
    } else {
      setSwipeOffset(0);
    }
    setTouchStart({ x: null, y: null });
    setIsSwiping(false);
  };

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

  // Hàm theo dõi trạng thái thay đổi realtime
  useEffect(() => {
    loadOrder();

    const handleOrderChange = (e) => {
      const eventData = e.detail;
      if (
        (typeof eventData === 'string' && eventData === id) || 
        (eventData && eventData._id === id)
      ) {
        showNotification('Đơn hàng đã được quản trị viên xử lý hoặc không còn tồn tại.', 'error');
        navigate('/');
      }
    };

    const handleOrderUpdate = (e) => {
      const eventData = e.detail;
      if ((typeof eventData === 'string' && eventData === id) || (eventData && eventData._id === id)) {
        loadOrder();
      }
    };

    const handleOrderAccepted = (e) => {
      const eventData = e.detail;
      if (eventData && eventData._id === id) {
        const assignedDriverId = eventData.assignedTo?._id || eventData.assignedTo;
        if (assignedDriverId && assignedDriverId !== driver?._id) {
          showNotification('Đơn hàng đã được tài xế khác nhận.', 'error');
          navigate('/');
        } else {
          loadOrder();
        }
      }
    };

    window.addEventListener('driver_order_accepted', handleOrderAccepted);
    window.addEventListener('driver_order_cancelled', handleOrderChange);
    window.addEventListener('driver_order_deleted_event', handleOrderChange);
    window.addEventListener('driver_order_updated', handleOrderUpdate);
    window.addEventListener('driver_order_picked_up', handleOrderUpdate);
    window.addEventListener('driver_order_delivering', handleOrderUpdate);
    window.addEventListener('driver_order_completed', handleOrderUpdate);

    return () => {
      window.removeEventListener('driver_order_accepted', handleOrderAccepted);
      window.removeEventListener('driver_order_cancelled', handleOrderChange);
      window.removeEventListener('driver_order_deleted_event', handleOrderChange);
      window.removeEventListener('driver_order_updated', handleOrderUpdate);
      window.removeEventListener('driver_order_picked_up', handleOrderUpdate);
      window.removeEventListener('driver_order_delivering', handleOrderUpdate);
      window.removeEventListener('driver_order_completed', handleOrderUpdate);
    };
  }, [id, navigate, driver]);

  const handleAction = async (action) => {
    if (actionLoading) return; // Chặn bấm đúp Spam mạng
    setActionLoading(true);
    try {
      const actions = {
        accept: acceptOrder,
        pickup: pickedUpOrder,
        complete: completeOrder
      };
      const res = await actions[action](id);
      if (res && res.success === false) {
        showNotification(res.message || 'Thao tác thất bại', 'error');
        return;
      }
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
    
    // Khách hoặc Admin vừa tạo đơn, đang treo
    if (order.status === 'PENDING' && !order.assignedTo) {
      return (
        <button 
          onClick={() => {
            if (driver?.isPriority5s) {
              handleAction('accept');
            } else {
              setConfirmAccept(true);
            }
          }} 
          disabled={actionLoading} 
          className="btn-success"
        >
          Nhận đơn này
        </button>
      );
    }
    
    // Kiểm tra xem đơn này có đúng là của tài xế đang login không
    const assignedId = String(order.assignedTo?._id || order.assignedTo);
    const myId = String(driver?._id);
    
    if (assignedId === myId) {
      if (order.status === 'ACCEPTED') {
         const btnText = order.serviceType === 'DAT_XE' ? 'Đã Đón Khách' : order.serviceType === 'MUA_HO' ? 'Đã mua hàng' : order.serviceType === 'ALOFOOD' ? 'Đã lấy đồ ăn' : 'Đã lấy hàng';
         return <button onClick={() => handleAction('pickup')} disabled={actionLoading} className="btn-warning flex items-center justify-center gap-2"><MapPin size={20}/> {btnText}</button>;
      }
      if (order.status === 'PICKED_UP' || order.status === 'DELIVERING') {
         const btnText = order.serviceType === 'DAT_XE' ? 'Trả Khách & Hoàn Thành' : 'Hoàn thành chuyến';
         return <button onClick={() => handleAction('complete')} disabled={actionLoading} className="btn-success flex items-center justify-center gap-2"><CheckCircle2 size={20}/> {btnText}</button>;
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
    <div 
      className="min-h-screen bg-slate-50 pb-36 sm:pb-40"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateX(${swipeOffset}px)`,
        transition: touchStart.x !== null ? 'none' : 'transform 0.2s ease-out'
      }}
    >
      {showToast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg text-white font-medium ${
          showToast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {showToast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-4 safe-pt">
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <button type="button" onClick={() => navigate(-1)} className="shrink-0 text-slate-800 p-1 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-slate-800 sm:text-lg">
              {order.serviceType === 'GIAO_HANG' ? 'Đơn Giao Hàng' :
               order.serviceType === 'DON_GHEP' ? 'Đơn Ghép' :
               order.serviceType === 'DAT_XE' ? (order.subServiceType === 'XE_OM' ? 'Chở Khách Xe Máy' : order.subServiceType === 'LAI_HO_OTO' ? 'Lái Hộ Ô Tô' : 'Lái Hộ Xe Máy') :
               order.serviceType === 'MUA_HO' ? 'Mua Hàng Hộ' :
               order.serviceType === 'ALOFOOD' ? 'Đơn AloFood' :
               order.serviceType === 'DIEU_PHOI' ? 'Dịch Vụ Điều Phối' : 'Chi tiết đơn hàng'}
            </h1>
            <p className="truncate text-[11px] font-bold text-blue-600 bg-blue-50 max-w-max px-2 py-0.5 rounded uppercase mt-0.5 border border-blue-100">{order.orderCode || id?.slice(-8).toUpperCase()}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="rounded-full bg-blue-500 px-2 py-1 text-xs font-bold text-white sm:px-3 sm:text-sm">
              {STATUS_LABELS[order.status] || order.status}
            </span>
            <button onClick={loadOrder} className="text-[10px] bg-slate-100 px-2 py-1.5 rounded-lg text-slate-600 font-bold hover:bg-slate-200 active:scale-95 transition-all flex items-center gap-1 border border-slate-200">
               <RefreshCw size={12}/> LÀM MỚI ĐƠN
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
        {/* LỜI NHẮN TỪ ADMIN */}
        {order.driverReminder && (
          <div className="bg-red-50 rounded-xl p-3.5 sm:p-4 border-2 border-red-300 mb-4 shadow-md overflow-hidden relative">
            <div className="absolute right-0 top-0 text-red-100 opacity-20 transform translate-x-4 -translate-y-4">
               <AlertTriangle size={80} />
            </div>
            <p className="text-red-700 text-[11px] sm:text-xs font-black uppercase tracking-wider mb-1.5 flex items-center gap-1.5 relative z-10"><AlertTriangle size={16}/> NHẮC NHỞ TÀI XẾ TỪ ĐIỀU PHỐI</p>
            <p className="text-red-900 text-base sm:text-lg font-bold whitespace-pre-wrap leading-snug relative z-10">{order.driverReminder}</p>
          </div>
        )}

        {/* HẸN GIỜ */}
        {order.scheduledTime && (
          <div className="bg-purple-100 rounded-xl p-3.5 sm:p-4 border-2 border-purple-300 mb-4 shadow-md flex items-center gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="text-purple-700 text-[11px] sm:text-xs font-black uppercase tracking-wider mb-0.5">HẸN GIỜ GIAO ĐƠN</p>
              <p className="text-purple-900 text-base sm:text-lg font-bold">
                {new Date(order.scheduledTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        {/* Addresses */}
        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <span className="w-8 h-8 shrink-0 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
              {order.serviceType === 'DAT_XE' ? <MapPin size={16}/> : <Package size={16}/>}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs text-slate-500 font-bold uppercase">
                  {order.serviceType === 'DAT_XE' ? 'ĐIỂM ĐÓN KHÁCH' : order.serviceType === 'DIEU_PHOI' ? 'NƠI GẶP MẶT / GIAO DỊCH' : order.serviceType === 'MUA_HO' ? 'MUA HÀNG TẠI' : order.serviceType === 'ALOFOOD' ? 'LẤY ĐỒ ĂN TẠI' : 'Lấy Hàng Tại'}
                </p>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${order.pickupCoordinates?.lat && order.pickupCoordinates.lat !== 10.045 && order.pickupCoordinates.lat !== 10.050 ? `${order.pickupCoordinates.lat},${order.pickupCoordinates.lng}` : encodeURIComponent(order.pickupAddress)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full border border-blue-100 transition-colors"
                >
                  <Map size={12}/> DẪN ĐƯỜNG
                </a>
              </div>
              <p className="text-slate-800 font-bold text-sm leading-snug">{order.pickupAddress || 'Chưa xác định'}</p>

              {order.serviceType === 'DON_GHEP' && (order.senderPhone || order.pickupPhone || (!order.createdBy ? order.customerPhone : null)) && (
                 <a href={`tel:${order.senderPhone || order.pickupPhone || (!order.createdBy ? order.customerPhone : '')}`} className="inline-flex bg-orange-100 text-orange-700 font-black tracking-wider px-3 py-1.5 rounded-lg active:scale-95 transition-transform items-center gap-1.5 border border-orange-200 text-xs mt-3"><Phone size={12}/> Gọi Lấy Hàng: {order.senderPhone || order.pickupPhone || (!order.createdBy ? order.customerPhone : '')}</a>
              )}
            </div>
          </div>
          {order.serviceType !== 'DIEU_PHOI' && order.serviceType !== 'DON_GHEP' && (
            <>
              <div className="border-l-2 border-dashed border-slate-600 ml-4 h-4 mb-4" />
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold"><MapPin size={16}/></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs text-slate-500 font-bold uppercase">
                      {order.serviceType === 'DAT_XE' ? 'ĐIỂM ĐẾN (TRẢ KHÁCH)' : order.serviceType === 'ALOFOOD' ? 'GIAO ĐỒ ĂN CHO KHÁCH' : 'Giao Hàng (Đến)'}
                    </p>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryCoordinates?.lat && order.deliveryCoordinates.lat !== 10.045 && order.deliveryCoordinates.lat !== 10.050 ? `${order.deliveryCoordinates.lat},${order.deliveryCoordinates.lng}` : encodeURIComponent(order.deliveryAddress)}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full border border-blue-100 transition-colors"
                    >
                      <Map size={12}/> DẪN ĐƯỜNG
                    </a>
                  </div>
                  <p className="text-slate-800 font-medium text-sm leading-snug">{order.deliveryAddress || 'Chưa xác định'}</p>
                </div>
              </div>
            </>
          )}

          {/* ĐƠN GHÉP (DON_GHEP) - HIỂN THỊ DANH SÁCH ĐIỂM GIAO */}
          {order.serviceType === 'DON_GHEP' && order.batchedDeliveries?.map((d, index) => (
             <div key={index}>
               <div className="border-l-2 border-dashed border-purple-300 ml-4 h-4 mb-4" />
               <div className="flex items-start gap-3">
                 <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold"><MapPin size={16}/></span>
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between gap-2 mb-1">
                     <p className="text-xs text-purple-600 font-bold uppercase flex items-center gap-1">Điểm Thứ {index + 1} {d.receiverName && <span className="text-[10px] text-slate-500 normal-case font-medium">- {d.receiverName}</span>}</p>
                     <a 
                       href={`https://www.google.com/maps/dir/?api=1&destination=${d.deliveryCoordinates?.lat && d.deliveryCoordinates.lat !== 10.045 ? `${d.deliveryCoordinates.lat},${d.deliveryCoordinates.lng}` : encodeURIComponent(d.deliveryAddress)}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="flex items-center gap-1 text-[11px] font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full border border-blue-100 transition-colors"
                     >
                       <Map size={12}/> DẪN ĐƯỜNG
                     </a>
                   </div>
                   <p className="text-slate-800 font-medium text-sm leading-snug mb-2">{d.deliveryAddress || 'Chưa xác định'}</p>
                   {d.note && (
                     <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-100 mb-2">
                       <p className="text-[10px] font-bold text-amber-700 uppercase mb-0.5 flex items-center gap-1"><AlertTriangle size={10}/> LƯU Ý ĐIỂM NÀY:</p>
                       <p className="text-xs text-amber-900 font-medium whitespace-pre-wrap">{d.note}</p>
                     </div>
                   )}
                   <div className="flex flex-col gap-2 mt-2">
                     <div className="flex flex-wrap items-center gap-2">
                       {d.receiverPhone && (
                          <a href={`tel:${d.receiverPhone}`} className="inline-flex bg-blue-100 text-blue-700 font-black tracking-wider px-3 py-1.5 rounded-lg active:scale-95 transition-transform items-center gap-1.5 border border-blue-200 text-xs"><Phone size={12}/> Gọi Khách: {d.receiverPhone}</a>
                       )}
                     </div>
                     
                     {(() => {
                       const pointShipFee = (d.fee || 0) + (d.extraSurcharge || 0);
                       const pointCustomerAmount = d.feePaidBy === 'SENDER' ? (d.codAmount || 0) : ((d.codAmount || 0) + pointShipFee);
                       const shopAdvance = d.feePaidBy === 'SENDER' ? ((d.codAmount || 0) - pointShipFee) : (d.codAmount || 0);
                       
                       return (
                         <div className="flex flex-col gap-2 mt-2 border-t border-slate-100 pt-3">
                           {/* Khối Tài Xế Ứng/Đưa Shop */}
                           {shopAdvance !== 0 && (
                             <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl flex flex-col gap-1.5 relative overflow-hidden">
                               <div className="absolute -right-3 -bottom-4 text-blue-100 opacity-30"><Wallet size={60}/></div>
                               <div className="flex justify-between items-center relative z-10">
                                 <span className="text-[11px] font-bold text-blue-700 uppercase">
                                   {shopAdvance > 0 ? 'Ứng Cho Shop:' : 'Nhận Từ Shop:'}
                                 </span>
                                 <span className="text-lg font-black text-blue-700">{Math.abs(shopAdvance).toLocaleString()}đ</span>
                               </div>
                               {shopAdvance > 0 && d.feePaidBy === 'SENDER' && (
                                 <div className="text-[10px] text-blue-600 font-medium border-t border-blue-100/50 pt-1.5 relative z-10">
                                   (COD {d.codAmount?.toLocaleString()}đ - Phí Ship {pointShipFee.toLocaleString()}đ)
                                 </div>
                               )}
                             </div>
                           )}

                           {/* Khối Khách Cần Trả */}
                           <div className="bg-red-50 border border-red-100 p-2.5 rounded-xl flex flex-col gap-1.5 relative overflow-hidden">
                             <div className="absolute -right-3 -bottom-4 text-red-100 opacity-40"><DollarSign size={60}/></div>
                             <div className="flex justify-between items-center relative z-10">
                               <span className="text-[11px] font-bold text-red-700 uppercase">Khách Cần Trả:</span>
                               <span className="text-lg font-black text-red-600">{pointCustomerAmount.toLocaleString()}đ</span>
                             </div>
                             <div className="flex gap-2 text-[10px] text-slate-500 font-medium flex-wrap border-t border-red-100/60 pt-1.5 relative z-10">
                               <span>• Thu hộ (COD): {d.codAmount?.toLocaleString() || 0}đ</span>
                               <span>• Ship ({d.feePaidBy === 'SENDER' ? 'Shop trả' : 'Khách trả'}): {pointShipFee > 0 ? `${pointShipFee.toLocaleString()}đ` : '0đ'}</span>
                             </div>
                           </div>
                         </div>
                       );
                     })()}
                   </div>
                 </div>
               </div>
             </div>
          ))}
        </div>

        {/* Liên Hệ */}
        {order.serviceType !== 'DON_GHEP' && (
        <div className="card">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
            <Phone size={14}/> LIÊN HỆ GIAO NHẬN
          </p>
          <div className="flex flex-col gap-3">
            
            {order.serviceType === 'DAT_XE' ? (
              <div className="flex items-center justify-between mx-[-12px] px-3 pb-2">
                <span className="font-bold text-slate-500 text-[11px] uppercase bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-1"><MapPin size={12}/> ĐÓN KHÁCH</span>
                <a href={`tel:${order.senderPhone || order.pickupPhone || order.customerPhone}`} className="bg-blue-100 text-blue-700 font-black tracking-wider px-4 py-2 rounded-xl active:scale-95 transition-transform flex items-center gap-2 border border-blue-200 text-sm"><Phone size={14}/> {order.senderPhone || order.pickupPhone || order.customerPhone}</a>
              </div>
            ) : order.serviceType === 'MUA_HO' ? (
              <div className="flex items-center justify-between mx-[-12px] px-3 pb-2">
                <span className="font-bold text-slate-500 text-[11px] uppercase bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-1"><Phone size={12}/> LIÊN HỆ KHÁCH</span>
                <a href={`tel:${order.receiverPhone || order.senderPhone || order.pickupPhone || order.customerPhone}`} className="bg-orange-100 text-orange-700 font-black tracking-wider px-4 py-2 rounded-xl active:scale-95 transition-transform flex items-center gap-2 border border-orange-200 text-sm"><Phone size={14}/> {order.receiverPhone || order.senderPhone || order.pickupPhone || order.customerPhone}</a>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mx-[-12px] px-3 pb-3 border-b border-slate-100">
                  <span className="font-bold text-slate-500 text-[11px] uppercase bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-1"><MapPin size={12}/> ĐIỂM ĐI</span>
                  {(order.senderPhone || order.pickupPhone || (!order.createdBy ? order.customerPhone : null)) ? (
                    <a href={`tel:${order.senderPhone || order.pickupPhone || (!order.createdBy ? order.customerPhone : '')}`} className="bg-orange-100 text-orange-700 font-black tracking-wider px-4 py-2 rounded-xl active:scale-95 transition-transform flex items-center gap-2 border border-orange-200 text-sm"><Phone size={14}/> {order.senderPhone || order.pickupPhone || (!order.createdBy ? order.customerPhone : '')}</a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Không có SĐT</span>
                  )}
                </div>
                <div className="flex items-center justify-between mx-[-12px] px-3 pt-1 pb-2">
                  <span className="font-bold text-slate-500 text-[11px] uppercase bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-1"><MapPin size={12}/> ĐIỂM ĐẾN</span>
                  {(order.receiverPhone || (order.createdBy ? order.customerPhone : null)) ? (
                    <a href={`tel:${order.receiverPhone || (order.createdBy ? order.customerPhone : '')}`} className="bg-blue-100 text-blue-700 font-black tracking-wider px-4 py-2 rounded-xl active:scale-95 transition-transform flex items-center gap-2 border border-blue-200 text-sm"><Phone size={14}/> {order.receiverPhone || (order.createdBy ? order.customerPhone : '')}</a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Không có SĐT</span>
                  )}
                </div>
              </>
            )}

          </div>
        </div>
        )}

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
               {order.packageDetails?.weight && <p className="text-sm font-medium text-slate-700 mt-2 flex items-center gap-1"><Scale size={14}/> Trọng lượng ước tính: <b>{order.packageDetails.weight}kg</b></p>}
               {order.packageDetails?.isFragile && <p className="text-sm font-bold text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={14}/> Cẩn thận: Hàng dễ vỡ</p>}
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

          {/* ALOFOOD INFO */}
          {order.serviceType === 'ALOFOOD' && order.alofoodDetails && (
             <div className="mb-4">
               <p className="text-slate-500 text-xs mb-1 font-bold uppercase">THÔNG TIN MÓN ĂN:</p>
               {order.alofoodDetails.cartItems?.length > 0 ? (
                 <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 mb-2 shadow-inner">
                   {order.alofoodDetails.cartItems.map((item, i) => (
                     <div key={i} className="py-2 border-b border-amber-200/50 last:border-0">
                        <div className="flex justify-between items-start">
                          <span className="text-slate-800 text-sm font-bold flex-1 pr-2">• {item.name} <span className="text-amber-600">(x{item.quantity})</span></span>
                          <span className="text-amber-700 font-bold text-sm whitespace-nowrap">{(item.price * item.quantity).toLocaleString()}đ</span>
                        </div>
                        {item.note && (
                          <div className="mt-1 ml-3 p-1.5 bg-white/70 border border-amber-200/50 rounded flex items-start gap-1">
                            <FileText size={12} className="text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-800 font-medium whitespace-pre-wrap leading-snug">Ghi chú món: {item.note}</p>
                          </div>
                        )}
                     </div>
                   ))}
                 </div>
               ) : <p className="text-slate-800 text-sm mb-2 italic">Không tìm thấy danh sách món.</p>}
               
               {/* Note about shop paying */}
               <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2">
                 <Wallet size={16} className="text-blue-500 shrink-0"/>
                 <p className="text-[11px] text-blue-800 font-medium">Bạn cần ứng trước <b>{order.alofoodDetails.foodTotal?.toLocaleString()}đ</b> cho Quán. Khách sẽ thanh toán lại khi nhận hàng.</p>
               </div>
             </div>
          )}

          {/* DIEU_PHOI INFO */}
          {order.serviceType === 'DIEU_PHOI' && (
             <>
               {(order.subServiceType === 'NAP_TIEN' || order.subServiceType === 'RUT_TIEN') ? (
                 <div className="mb-4 bg-blue-50/50 p-4 rounded-xl border border-blue-200 relative overflow-hidden">
                   <div className="absolute -right-4 -top-4 text-7xl opacity-[0.05]"><Building2 size={80}/></div>
                   <div className="flex flex-col relative z-10 space-y-2">
                     <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider border-b border-blue-100 pb-1">THÔNG TIN GIAO DỊCH ĐỐI TÁC:</span>
                     <div className="font-medium text-xs text-slate-600 flex justify-between items-center pt-1"><span>Ngân Hàng:</span> <b className="text-blue-800 text-sm border border-blue-200 bg-white px-2 py-0.5 rounded">{order.financialDetails?.bankName || 'Chưa rõ'}</b></div>
                     <div className="font-medium text-xs text-slate-600 flex justify-between items-center"><span>Tài Khoản:</span> <b className="text-blue-800 text-lg tracking-wider font-black">{order.financialDetails?.bankAccount || 'Rỗng'}</b></div>
                     <div className="font-medium text-xs text-slate-600 flex justify-between items-center"><span>Chủ TK:</span> <b className="text-blue-800 text-sm uppercase">{order.financialDetails?.bankAccountName || 'Chưa rõ'}</b></div>
                     <div className="font-medium text-xs text-slate-600 flex justify-between items-center mt-2 pt-2 border-t border-blue-100/50"><span>Yêu cầu giao dịch:</span> <b className="text-orange-600 text-xl font-black bg-orange-100 px-2 rounded-lg">{order.financialDetails?.transactionAmount?.toLocaleString() || 0}đ</b></div>
                   </div>
                 </div>
               ) : (
                 <div className="mb-4 bg-purple-50 p-4 rounded-xl border border-purple-100 relative overflow-hidden">
                   <div className="absolute -right-4 -top-4 text-7xl opacity-[0.05]"><Wrench size={80}/></div>
                   <p className="text-purple-800 text-sm flex flex-col relative z-10">
                     <span className="text-[10px] text-purple-400 font-bold uppercase mb-1 tracking-wider">MÔ TẢ NHIỆM VỤ THỢ:</span>
                     <span className="font-black text-lg flex items-center gap-2">
                       {order.subServiceType === 'KEM_THO_DIEN' ? <><Zap size={20}/> Thợ Điện</> : order.subServiceType === 'KEM_THO_NUOC' ? <><Droplet size={20}/> Thợ Nước</> : <><Wrench size={20}/> Sửa Chữa Khác</>}
                     </span>
                   </p>
                 </div>
               )}
             </>
          )}

          {/* XE ÔM / LÁI HỘ INFO (DAT_XE) */}
          {order.serviceType === 'DAT_XE' && order.rideDetails && (
            <div className="mb-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 text-7xl opacity-[0.03]"><Bike size={80}/></div>
              <p className="text-indigo-800 text-sm flex flex-col relative z-10">
                <span className="text-[10px] text-indigo-400 font-bold uppercase mb-1 tracking-wider">PHƯƠNG TIỆN YÊU CẦU:</span>
                <span className="font-black text-lg flex items-center gap-2">
                  {order.subServiceType === 'XE_OM' ? <><Bike size={20}/> Xe Máy (Chở khách)</> : order.subServiceType === 'LAI_HO_OTO' ? <><Car size={20}/> Lái hộ Ô Tô</> : <><Key size={20}/> Lái hộ Xe Máy</>}
                </span>
                {order.rideDetails?.vehicleClass && (
                  <span className="text-xs text-indigo-600 font-semibold bg-white px-2 py-0.5 rounded border border-indigo-100 mt-2 max-w-max">
                     {order.subServiceType === 'LAI_HO_OTO' ? `Dòng xe: ${order.rideDetails.vehicleClass}` : `Hạng: ${order.rideDetails.vehicleClass === 'TAY_GA' ? 'Xe Tay Ga' : order.rideDetails.vehicleClass === 'XE_SO' ? 'Xe Số' : 'Côn Tay / Mô Tô'}`}
                  </span>
                )}
              </p>
            </div>
          )}


          {/* GHI CHÚ CHUNG */}
          {order.note && (
            <div className="bg-amber-50 rounded-xl p-3.5 sm:p-4 border-2 border-amber-200 mb-4 shadow-sm">
              <p className="text-amber-700 text-[11px] sm:text-xs font-black uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><FileText size={16}/> GHI CHÚ ĐƠN HÀNG</p>
              <p className="text-slate-900 text-base sm:text-lg font-bold whitespace-pre-wrap leading-snug">{order.note}</p>
            </div>
          )}

          {/* BLOCK THANH TOÁN (GỘP CHUNG THÀNH GRID 2 CỘT TỰ ĐỘNG) */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            
            {/* Cột 1: Tiền Phí/Cước */}
            <div className="bg-white rounded-xl p-3 flex flex-col justify-center relative overflow-hidden group border border-slate-200">
               <div className="absolute -right-3 -top-1 text-slate-100 opacity-50 group-hover:scale-110 transition-transform"><Wallet size={80}/></div>
               <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider relative z-10 mb-1">
                 {order.serviceType === 'DAT_XE' ? 'Cước xe' : order.serviceType === 'DIEU_PHOI' ? 'Phí thợ' : 'Phí giao hàng'}
               </p>
               <div className="flex flex-col relative z-10">
                  {order.deliveryFee > 0 ? (
                    <div className="flex flex-col items-start">
                      <p className="text-green-600 font-black text-xl sm:text-2xl ">{((order.deliveryFee || 0) + (order.packageDetails?.bulkyFee || 0) + (order.rideDetails?.surcharge || 0) + (order.extraSurcharge || 0)).toLocaleString()}đ</p>
                      {order.serviceType !== 'DON_GHEP' && order.serviceType !== 'DAT_XE' && order.serviceType !== 'DIEU_PHOI' && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 mt-0.5 rounded font-bold">{order.feePaidBy === 'SENDER' ? 'Shop trả ship' : 'Khách trả ship'}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-green-600 font-black text-lg sm:text-xl ">Thỏa Thuận</p>
                 )}
                 {order.packageDetails?.bulkyFee > 0 && (
                   <p className="text-[10px] text-orange-600 font-bold mt-1 bg-orange-50 px-1.5 py-0.5 rounded inline-block max-w-max border border-orange-100">
                     ( đã cộng phí cồng kềnh: {order.packageDetails.bulkyFee.toLocaleString()}đ )
                   </p>
                 )}
                 {order.rideDetails?.surcharge > 0 && (
                   <p className="text-[10px] text-purple-600 font-bold mt-1 bg-purple-50 px-1.5 py-0.5 rounded inline-block max-w-max border border-purple-100">
                     ( đã cộng phí phụ/lái hộ: {order.rideDetails.surcharge.toLocaleString()}đ )
                   </p>
                 )}
                 {order.extraSurcharge > 0 && (
                   <p className="text-[10px] text-red-600 font-bold mt-1 bg-red-50 px-1.5 py-0.5 rounded inline-block max-w-max border border-red-100">
                     ( đã cộng phụ thu thêm: {order.extraSurcharge.toLocaleString()}đ )
                   </p>
                 )}
               </div>
            </div>
            
            {/* Cột 2: Thu Hộ (Giao Hàng/Đơn Ghép) */}
            {order.serviceType === 'DON_GHEP' ? (
              <div className="bg-white rounded-xl p-3 flex flex-col justify-center relative overflow-hidden group border border-slate-200">
                <div className="absolute -right-3 -top-1 text-slate-100 opacity-50 group-hover:scale-110 transition-transform"><Wallet size={80}/></div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider relative z-10 mb-1">Tổng tiền ứng Shop</p>
                <p className="text-blue-600 font-black text-xl sm:text-2xl relative z-10">
                   {(() => {
                     let totalAdvance = 0;
                     order.batchedDeliveries?.forEach(d => {
                       const pointShipFee = (d.fee || 0) + (d.extraSurcharge || 0);
                       const shopAdvance = d.feePaidBy === 'SENDER' ? ((d.codAmount || 0) - pointShipFee) : (d.codAmount || 0);
                       totalAdvance += shopAdvance;
                     });
                     return `${totalAdvance.toLocaleString()}đ`;
                   })()}
                </p>
              </div>
            ) : (order.serviceType === 'GIAO_HANG' || order.serviceType === 'ALOFOOD') && (order.codAmount > 0 || order.codAmount === 0) && (
              <div className="bg-white rounded-xl p-3 flex flex-col justify-center relative overflow-hidden group border border-slate-200">
                <div className="absolute -right-3 -top-1 text-slate-100 opacity-50 group-hover:scale-110 transition-transform"><Diamond size={80}/></div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider relative z-10 mb-1">{order.serviceType === 'ALOFOOD' ? 'Tiền đồ ăn (Khách trả)' : 'Cần Thu hộ COD'}</p>
                <p className="text-blue-600 font-black text-xl sm:text-2xl  relative z-10">{order.serviceType === 'ALOFOOD' ? (order.alofoodDetails?.foodTotal || 0).toLocaleString() + 'đ' : (order.codAmount?.toLocaleString() || 0) + 'đ'}</p>
              </div>
            )}

            {/* Cột 2: Tiền Hàng Dự Kiến (Mua Hộ) */}
            {order.serviceType === 'MUA_HO' && (
              <div className="bg-white rounded-xl p-3 flex flex-col justify-center relative overflow-hidden group border border-slate-200">
                <div className="absolute -right-3 -top-1 text-slate-100 opacity-50 group-hover:scale-110 transition-transform"><ShoppingCart size={80}/></div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider relative z-10 mb-1">Giá trị hàng hóa (Tạm ứng)</p>
                <p className="text-orange-600 font-black text-xl sm:text-2xl  relative z-10">
                  {order.purchaseDetails?.estimatedTotal ? `${order.purchaseDetails.estimatedTotal.toLocaleString()}đ` : 'Thỏa thuận'}
                </p>
              </div>
            )}

            {/* Cột 3: BLOCK THƯỞNG VÍ (Nằm chung Grid) */}
            {order.adminBonus > 0 && (
               <div className="bg-slate-50 rounded-xl p-3 flex flex-col justify-center border border-slate-200 relative overflow-hidden group">
                 <div className="absolute -right-3 -top-1 text-slate-200 opacity-50 group-hover:scale-110 transition-transform"><Gift size={80}/></div>
                 <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider relative z-10 mb-1">Thưởng Độc quyền</p>
                 <p className="text-slate-700 font-black text-xl sm:text-2xl  relative z-10">+{order.adminBonus?.toLocaleString()}đ</p>
               </div>
            )}

            {/* Cột 4: BLOCK THƯỞNG KPI HẰNG NGÀY (Nằm chung Grid) */}
            {order.kpiBonus > 0 && (
               <div className={`rounded-xl p-3 flex flex-col justify-center border relative overflow-hidden group ${order.isExpectedKpi ? 'bg-slate-50 border-slate-200 border-dashed' : 'bg-slate-50 border-slate-200'}`}>
                 <div className={`absolute -right-3 -top-1 text-slate-200 opacity-50 group-hover:scale-110 transition-transform ${order.isExpectedKpi ? 'grayscale opacity-20' : ''}`}><Trophy size={80}/></div>
                 <p className={`${order.isExpectedKpi ? 'text-slate-500' : 'text-slate-600'} text-[10px] font-bold uppercase tracking-wider relative z-10 mb-1`}>
                   {order.isExpectedKpi ? 'DỰ KIẾN (NẾU HOÀN THÀNH)' : 'Thưởng hiệu suất đơn hàng'}
                 </p>
                 <p className={`${order.isExpectedKpi ? 'text-slate-600' : 'text-slate-800'} font-black text-xl sm:text-2xl  relative z-10`}>+{order.kpiBonus?.toLocaleString()}đ</p>
               </div>
            )}
          </div>

          {/* BLOCK TỔNG KẾT RÕ RÀNG CHO GIAO_HANG & ALOFOOD */}
          {(order.serviceType === 'GIAO_HANG' || order.serviceType === 'ALOFOOD') && (
            <div className="mt-4">
              {(() => {
                const totalShipFee = (order.deliveryFee || 0) + (order.packageDetails?.bulkyFee || 0) + (order.financialDetails?.surcharge || 0) + (order.rideDetails?.surcharge || 0) + (order.extraSurcharge || 0);
                
                let shopAmount = 0;
                let customerAmount = 0;
                
                if (order.serviceType === 'ALOFOOD') {
                  shopAmount = order.alofoodDetails?.foodTotal || 0; // Tài xế ứng tiền món ăn
                  customerAmount = shopAmount + totalShipFee; // Khách trả món ăn + ship
                } else {
                  shopAmount = order.feePaidBy === 'SENDER' ? ((order.codAmount || 0) - totalShipFee) : (order.codAmount || 0);
                  customerAmount = order.feePaidBy === 'SENDER' ? (order.codAmount || 0) : ((order.codAmount || 0) + totalShipFee);
                }
                
                return (
                  <div className="flex flex-col gap-3 mt-4">
                     <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200">
                       <span className="text-[11px] text-slate-500 font-bold uppercase flex items-center gap-1">
                         <Wallet size={14} /> 
                         {order.serviceType === 'ALOFOOD' ? 'TÀI XẾ CẦN ỨNG CHO QUÁN' : (shopAmount > 0 ? 'TÀI XẾ ỨNG CHO SHOP' : shopAmount < 0 ? 'TÀI XẾ THU TỪ SHOP' : 'KHÔNG ỨNG/THU Ở SHOP')}
                       </span>
                       <span className="font-black text-xl text-slate-700">
                         {shopAmount === 0 ? '0đ' : `${Math.abs(shopAmount).toLocaleString()}đ`}
                       </span>
                     </div>

                     <div className="flex justify-between items-end bg-red-50 p-4 rounded-xl border-2 border-red-200">
                       <div className="flex flex-col">
                         <span className="text-xs text-red-600 font-bold uppercase">TỔNG THU CỦA KHÁCH</span>
                         <span className="text-[10px] text-red-500 italic">
                           {order.serviceType === 'ALOFOOD' ? '(Bao gồm Tiền Đồ Ăn + Phí Ship)' : (order.feePaidBy === 'SENDER' ? '(Chỉ thu COD vì Shop đã trả ship)' : '(Đã bao gồm Tiền Ship + COD)')}
                         </span>
                       </div>
                       <span className="font-black text-3xl text-red-600">
                         {customerAmount.toLocaleString()}đ
                       </span>
                     </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Timeline */}
        {order.acceptedAt && (
          <div className="card">
            <p className="text-xs text-slate-500 mb-3">TIMELINE</p>
            <div className="space-y-2">
              <div className="flex gap-3">
                <span className="text-slate-400"><CheckCircle2 size={16}/></span>
                <div>
                  <p className="text-slate-800 text-sm">Nhận đơn</p>
                  <p className="text-slate-500 text-xs">{new Date(order.acceptedAt).toLocaleString('vi-VN')}</p>
                </div>
              </div>
              {order.pickedUpAt && (
                <div className="flex gap-3">
                  <span className="text-slate-400"><CheckCircle2 size={16}/></span>
                  <div>
                    <p className="text-slate-800 text-sm">
                      {order.serviceType === 'DAT_XE' ? 'Tài xế đã Đón Khách' : order.serviceType === 'MUA_HO' ? 'Tài xế đã Mua Hàng' : order.serviceType === 'ALOFOOD' ? 'Tài xế đã Lấy Đồ Ăn' : 'Lấy hàng'}
                    </p>
                    <p className="text-slate-500 text-xs">{new Date(order.pickedUpAt).toLocaleString('vi-VN')}</p>
                  </div>
                </div>
              )}
              {order.deliveredAt && (
                <div className="flex gap-3">
                  <span className="text-slate-400"><CheckCircle2 size={16}/></span>
                  <div>
                    <p className="text-slate-800 text-sm">
                      {order.serviceType === 'DAT_XE' ? 'Tài xế đã Trả Khách' : 'Giao hàng'}
                    </p>
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

      <ConfirmModal 
        isOpen={confirmAccept}
        title="Xác Nhận Nhận Đơn"
        message="Bạn có chắc chắn muốn lấy đơn này không?"
        confirmText="Xác nhận"
        cancelText="Hủy"
        onConfirm={() => {
          setConfirmAccept(false);
          handleAction('accept');
        }}
        onCancel={() => setConfirmAccept(false)}
      />
    </div>
  );
}
