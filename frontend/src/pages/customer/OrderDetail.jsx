import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Navigation, Package, DollarSign, Clock, CheckCircle2, Truck, Info, PhoneCall, RefreshCcw, LocateFixed, Check, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getOrderDetails, api, getFullImageUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getRoadRoute } from '../../utils/routing';

// --- CUSTOM MAP ICONS ---
const pickupMarkerIcon = L.divIcon({
  html: `<div class="relative flex flex-col items-center">
    <div class="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-extrabold rounded-full shadow-md whitespace-nowrap mb-0.5">Điểm lấy</div>
    <div class="w-6 h-6 bg-blue-600 rounded-full border-[3px] border-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] flex items-center justify-center"><div class="w-2 h-2 bg-white rounded-full"></div></div>
  </div>`,
  className: '',
  iconSize: [60, 42],
  iconAnchor: [30, 38]
});

const deliveryMarkerIcon = L.divIcon({
  html: `<div class="relative flex flex-col items-center">
    <div class="px-2 py-0.5 bg-red-500 text-white text-[9px] font-extrabold rounded-full shadow-md whitespace-nowrap mb-0.5">Điểm giao</div>
    <div class="w-6 h-6 bg-red-500 rounded-full border-[3px] border-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] flex items-center justify-center"><div class="w-2 h-2 bg-white rounded-full"></div></div>
  </div>`,
  className: '',
  iconSize: [60, 42],
  iconAnchor: [30, 38]
});

const driverMarkerIcon = L.divIcon({
  html: `<div class="relative flex flex-col items-center">
    <div class="px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-extrabold rounded-full shadow-md whitespace-nowrap mb-0.5 flex items-center gap-1">
      <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span> Tài xế
    </div>
    <div class="w-9 h-9 bg-emerald-500 rounded-full border-[3px] border-white shadow-[0_4px_12px_rgba(16,185,129,0.5)] flex items-center justify-center text-base">🛵</div>
  </div>`,
  className: '',
  iconSize: [64, 52],
  iconAnchor: [32, 46]
});

const TrackingMapController = ({ points, driverCoords, followDriverTrigger }) => {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15, { animate: true });
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length]);

  useEffect(() => {
    if (followDriverTrigger > 0 && driverCoords?.lat && driverCoords?.lng) {
      map.flyTo([driverCoords.lat, driverCoords.lng], 16, { animate: true, duration: 0.8 });
    }
  }, [followDriverTrigger, driverCoords, map]);

  return null;
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [driverCoords, setDriverCoords] = useState(null);
  const [followTrigger, setFollowTrigger] = useState(0);

  // Tuyến đường bộ thực tế (đường bộ, không phải đường chim bay)
  const [deliveryRoadRoute, setDeliveryRoadRoute] = useState([]);
  const [driverRoadRoute, setDriverRoadRoute] = useState([]);

  // Nhận biết người xem là Shop hay Khách hàng
  const cData = JSON.parse(localStorage.getItem('customerData') || '{}');
  const userRole = localStorage.getItem('customerRole') || cData.role || 'CUSTOMER';
  const isShopViewer = location.pathname.startsWith('/shop') || userRole === 'SHOP';

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await getOrderDetails(id);
      if (res.success) {
        setOrder(res.data);
        if (res.data?.assignedTo?.currentLocation?.lat && res.data?.assignedTo?.currentLocation?.lng) {
          setDriverCoords({
            lat: res.data.assignedTo.currentLocation.lat,
            lng: res.data.assignedTo.currentLocation.lng
          });
        }
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
        setOrder(prev => {
          const mergedAssignedTo = updatedOrder.assignedTo && prev?.assignedTo && typeof updatedOrder.assignedTo === 'object'
            ? { ...prev.assignedTo, ...updatedOrder.assignedTo }
            : updatedOrder.assignedTo;
          return { ...updatedOrder, assignedTo: mergedAssignedTo };
        });
        if (updatedOrder.assignedTo?.currentLocation?.lat) {
          setDriverCoords({
            lat: updatedOrder.assignedTo.currentLocation.lat,
            lng: updatedOrder.assignedTo.currentLocation.lng
          });
        }
      } else {
        fetchDetail();
      }
    };

    const handleDriverLocation = (e) => {
      const data = e.detail;
      if (!data || !data.lat || !data.lng) return;
      setOrder(currentOrder => {
        const assignedDriverId = currentOrder?.assignedTo?._id || currentOrder?.assignedTo;
        if (
          (data.orderId && data.orderId === id) ||
          (assignedDriverId && String(assignedDriverId) === String(data.driverId))
        ) {
          setDriverCoords({ lat: data.lat, lng: data.lng });
        }
        return currentOrder;
      });
    };

    window.addEventListener('refresh_orders_data', handleRefresh);
    window.addEventListener('driver_location_update', handleDriverLocation);

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
      window.removeEventListener('driver_location_update', handleDriverLocation);
      window.removeEventListener('order_deleted_event', handleDeleted);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id]);

  // 1. Tải lộ trình ĐƯỜNG BỘ giao hàng giữa Điểm lấy và Điểm giao (không phải đường chim bay)
  useEffect(() => {
    if (!order) return;
    const pCoords = order.pickupCoordinates;
    const dCoords = order.deliveryCoordinates;

    if (pCoords?.lat && pCoords?.lng && dCoords?.lat && dCoords?.lng) {
      let isCancelled = false;
      getRoadRoute(pCoords, dCoords).then(coords => {
        if (!isCancelled && coords.length > 0) {
          setDeliveryRoadRoute(coords);
        }
      });
      return () => { isCancelled = true; };
    } else {
      setDeliveryRoadRoute([]);
    }
  }, [order?.pickupCoordinates?.lat, order?.pickupCoordinates?.lng, order?.deliveryCoordinates?.lat, order?.deliveryCoordinates?.lng]);

  // 2. Tải lộ trình ĐƯỜNG BỘ của Tài xế theo thời gian thực (đường bộ uốn lượn theo phố)
  useEffect(() => {
    if (!order || !driverCoords?.lat || !driverCoords?.lng) {
      setDriverRoadRoute([]);
      return;
    }

    const isTracking = ['ACCEPTED', 'PICKED_UP', 'DELIVERING'].includes(order.status);
    if (!isTracking) {
      setDriverRoadRoute([]);
      return;
    }

    // Nếu tài xế mới ACCEPTED -> tài xế đang đi đến ĐIỂM LẤY HÀNG
    // Nếu tài xế đã PICKED_UP / DELIVERING -> tài xế đang đi đến ĐIỂM GIAO HÀNG
    const target = (order.status === 'ACCEPTED' || !order.deliveryCoordinates?.lat)
      ? order.pickupCoordinates
      : order.deliveryCoordinates;

    if (!target?.lat || !target?.lng) return;

    let isCancelled = false;
    getRoadRoute(driverCoords, target).then(coords => {
      if (!isCancelled && coords.length > 0) {
        setDriverRoadRoute(coords);
      }
    });

    return () => { isCancelled = true; };
  }, [driverCoords?.lat, driverCoords?.lng, order?.status, order?.pickupCoordinates?.lat, order?.deliveryCoordinates?.lat]);

  // Thao tác hủy đơn
  const handleCancelOrder = async () => {
    const reason = window.prompt('Hủy đơn hàng này? Vui lòng nhập lý do ngắn gọn:');
    if (reason === null) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/orders/${id}/cancel`, { reason });
      if (res.data.success) {
        showToast('Đã hủy đơn thành công', 'success');
        fetchDetail();
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Không thể hủy đơn', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Thao tác của Cửa Hàng: Nhận đơn AloFood
  const handleShopAcceptOrder = async () => {
    try {
      setActionLoading(true);
      const res = await api.put(`/merchant/orders/${id}/accept`);
      if (res.data.success) {
        showToast('Quán đã nhận đơn thành công! Đang điều phối tài xế.', 'success');
        fetchDetail();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi nhận đơn', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Thao tác của Cửa Hàng: Từ chối / Hủy đơn AloFood
  const handleShopRejectOrder = async () => {
    const reason = window.prompt('Nhập lý do quán từ chối / hủy đơn:');
    if (reason === null) return;
    if (!reason.trim()) {
      showToast('Vui lòng nhập lý do hủy đơn', 'warning');
      return;
    }
    try {
      setActionLoading(true);
      const res = await api.put(`/merchant/orders/${id}/reject`, { cancelReason: reason.trim() });
      if (res.data.success) {
        showToast('Đã từ chối đơn hàng thành công', 'success');
        fetchDetail();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi từ chối đơn', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Thao tác của Cửa Hàng: Bàn giao món cho tài xế
  const handleShopHandoverOrder = async () => {
    try {
      setActionLoading(true);
      const res = await api.put(`/merchant/orders/${id}/handover`);
      if (res.data.success) {
        showToast('Đã xác nhận bàn giao món cho tài xế!', 'success');
        fetchDetail();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi bàn giao', 'error');
    } finally {
      setActionLoading(false);
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

  // Stepper trạng thái chuẩn xác cho cả Khách hàng & Cửa hàng
  const baseSteps = order?.serviceType === 'DAT_XE' ? [
    { key: 'PENDING', label: 'Đang Tìm Tài Xế' },
    { key: 'ACCEPTED', label: 'Tài Xế Đang Đến Đón' },
    { key: 'PICKED_UP', label: 'Đang Trong Chuyến Đi' },
    { key: 'COMPLETED', label: 'Hoàn Tất Chuyến Đi' }
  ] : order?.serviceType === 'ALOFOOD' ? [
    { key: 'WAITING_SHOP', label: 'Chờ Quán Xác Nhận' },
    { key: 'PENDING', label: 'Đang Tìm Tài Xế' },
    { key: 'ACCEPTED', label: 'Tài Xế Đang Đến Quán' },
    { key: 'PICKED_UP', label: 'Đã Lấy Món - Đang Giao' },
    { key: 'COMPLETED', label: 'Hoàn Tất Đơn Hàng' }
  ] : [
    { key: 'PENDING', label: 'Đang Tìm Tài Xế' },
    { key: 'ACCEPTED', label: 'Tài Xế Đã Nhận Đơn' },
    { key: 'PICKED_UP', label: order?.serviceType === 'MUA_HO' ? 'Đã Mua Hàng - Đang Giao' : 'Đã Lấy Hàng - Đang Giao' },
    { key: 'COMPLETED', label: 'Hoàn Tất Đơn Hàng' }
  ];

  const STEPS = order.status === 'DRAFT'
    ? [{ key: 'DRAFT', label: 'Chờ Báo Giá / Xác Nhận Cước' }, ...baseSteps]
    : baseSteps;

  let currentIndex = 0;
  if (order.status === 'DRAFT') {
    currentIndex = 0;
  } else if (order.status === 'WAITING_SHOP') {
    currentIndex = 0;
  } else if (order.status === 'PENDING') {
    currentIndex = order?.serviceType === 'ALOFOOD' ? 1 : 0;
  } else if (order.status === 'ACCEPTED') {
    currentIndex = order?.serviceType === 'ALOFOOD' ? 2 : 1;
  } else if (order.status === 'PICKED_UP' || order.status === 'DELIVERING') {
    currentIndex = order?.serviceType === 'ALOFOOD' ? 3 : 2;
  } else if (order.status === 'COMPLETED') {
    currentIndex = order?.serviceType === 'ALOFOOD' ? 4 : 3;
  } else if (order.status === 'CANCELLED') {
    currentIndex = -1;
  }

  // Tọa độ các điểm ghim bản đồ
  const pickupPt = order.pickupCoordinates?.lat && order.pickupCoordinates?.lng
    ? [order.pickupCoordinates.lat, order.pickupCoordinates.lng]
    : null;
  const deliveryPt = order.deliveryCoordinates?.lat && order.deliveryCoordinates?.lng
    ? [order.deliveryCoordinates.lat, order.deliveryCoordinates.lng]
    : null;
  const batchedPts = (order.batchedDeliveries || [])
    .filter(d => d.deliveryCoordinates?.lat && d.deliveryCoordinates?.lng)
    .map(d => [d.deliveryCoordinates.lat, d.deliveryCoordinates.lng]);
  const isTrackingActive = ['ACCEPTED', 'PICKED_UP', 'DELIVERING'].includes(order.status);
  const driverPt = isTrackingActive && driverCoords?.lat && driverCoords?.lng
    ? [driverCoords.lat, driverCoords.lng]
    : null;

  const allMapPoints = [
    ...(pickupPt ? [pickupPt] : []),
    ...(deliveryPt ? [deliveryPt] : []),
    ...batchedPts,
    ...(driverPt ? [driverPt] : [])
  ];

  return (
    <div className="flex flex-col flex-1 w-full bg-slate-50 overflow-hidden font-sans">
      {/* Header */}
      <div className="shrink-0 bg-white px-4 py-3 safe-pt z-40 flex items-center gap-3 shadow-sm border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 active:scale-90 transition-transform">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-slate-800 text-lg">
            {isShopViewer ? 'Chi Tiết Đơn Hàng (Cửa Hàng)' : 'Chi Tiết Đơn Hàng'}
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            #{order.orderCode || order._id.slice(-8).toUpperCase()}
          </p>
        </div>
        <button onClick={fetchDetail} className="p-2 -mr-2 text-blue-600 active:rotate-180 transition-transform">
           <RefreshCcw size={20} />
        </button>
      </div>

      <div className="flex-1 min-h-0 w-full overflow-y-auto p-4">
        <div className="max-w-lg mx-auto space-y-4 pb-8">

        {/* BẢN ĐỒ THEO DÕI HÀNH TRÌNH ĐƯỜNG BỘ & VỊ TRÍ TÀI XẾ THỜI GIAN THỰC */}
        {allMapPoints.length > 0 && order.status !== 'CANCELLED' && (
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm relative">
            <div className="h-64 w-full relative z-0">
              <MapContainer
                center={driverPt || pickupPt || deliveryPt || [10.045162, 105.746854]}
                zoom={14}
                zoomControl={false}
                className="w-full h-full z-0"
              >
                <TileLayer
                  attribution="&copy; Google Maps"
                  url="https://mt0.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}"
                />
                
                {/* 1. ĐIỂM LẤY HÀNG */}
                {pickupPt && <Marker position={pickupPt} icon={pickupMarkerIcon} />}

                {/* 2. ĐIỂM GIAO HÀNG */}
                {deliveryPt && <Marker position={deliveryPt} icon={deliveryMarkerIcon} />}
                {batchedPts.map((pt, idx) => (
                  <Marker key={idx} position={pt} icon={deliveryMarkerIcon} />
                ))}

                {/* 3. TÀI XẾ DI CHUYỂN TRỰC TIẾP */}
                {driverPt && <Marker position={driverPt} icon={driverMarkerIcon} zIndexOffset={1000} />}

                {/* 4. ĐƯỜNG ĐI GIAO HÀNG (ĐƯỜNG BỘ UỐN LƯỢN THỰC TẾ) */}
                {deliveryRoadRoute.length > 1 && (
                  <Polyline 
                    positions={deliveryRoadRoute} 
                    color="#2563EB" 
                    weight={5} 
                    opacity={0.85} 
                  />
                )}

                {/* 5. ĐƯỜNG ĐI CỦA TÀI XẾ THEO ĐƯỜNG BỘ ĐẾN ĐÍCH (ĐƯỜNG BỘ THỜI GIAN THỰC) */}
                {driverRoadRoute.length > 1 && (
                  <Polyline 
                    positions={driverRoadRoute} 
                    color="#10B981" 
                    weight={6} 
                    opacity={0.95} 
                  />
                )}

                <TrackingMapController points={allMapPoints} driverCoords={driverCoords} followDriverTrigger={followTrigger} />
              </MapContainer>

              {/* Badge thông báo trạng thái bản đồ đường bộ */}
              <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md border border-slate-100 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${driverPt ? 'bg-emerald-500 animate-ping' : 'bg-blue-500'}`}></span>
                <span className="text-[11px] font-extrabold text-slate-700">
                  {driverPt ? 'GPS tài xế trực tiếp (Đường bộ)' : 'Lộ trình đường bộ thực tế'}
                </span>
              </div>

              {/* Chú thích màu đường */}
              <div className="absolute top-12 left-3 z-[400] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-xl shadow-sm border border-slate-100 text-[10px] font-bold text-slate-600 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-blue-600 rounded-full inline-block"></span> Lộ trình đơn
                </div>
                {driverPt && (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold">
                    <span className="w-3 h-1 bg-emerald-500 rounded-full inline-block"></span> Đường xế đang chạy
                  </div>
                )}
              </div>

              {driverPt && (
                <button
                  type="button"
                  onClick={() => setFollowTrigger(prev => prev + 1)}
                  className="absolute bottom-3 right-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-100 text-emerald-700 text-xs font-extrabold flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <LocateFixed size={14} /> Tâm tài xế
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Khối Trạng Thái Hoạt Động (Stepper) */}
        {!['CANCELLED'].includes(order.status) ? (
          <div className="bg-white p-5 rounded-3xl border border-slate-100 mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">TIẾN ĐỘ ĐƠN HÀNG</h3>
            <div className="relative flex flex-col gap-5 pl-4 before:absolute before:inset-y-2 before:left-[21px] before:w-[2px] before:bg-slate-100">
              {STEPS.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
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
                      {isCurrent && order.status === 'DRAFT' && (
                        <p className="text-[10px] text-amber-600 font-semibold">
                          {order.adminReviewed && order.deliveryFee > 0
                            ? 'Tổng đài đã báo giá! Vui lòng bấm Xác nhận bên dưới.'
                            : 'Đang chờ tổng đài kiểm tra và báo cước phí...'}
                        </p>
                      )}
                      {isCurrent && order.status === 'WAITING_SHOP' && (
                        <p className="text-[10px] text-amber-600 font-semibold">
                          {isShopViewer ? 'Đơn hàng mới! Vui lòng bấm "Nhận Đơn" bên dưới.' : 'Đang chờ quán ăn xác nhận...'}
                        </p>
                      )}
                      {isCurrent && order.status === 'ACCEPTED' && (
                        <p className="text-[10px] text-blue-600 font-semibold">Tài xế đã nhận đơn và đang di chuyển đến điểm lấy hàng.</p>
                      )}
                      {isCurrent && order.status === 'DELIVERING' && (
                        <p className="text-[10px] text-emerald-600 font-semibold">Tài xế đang trên đường di chuyển đến điểm giao...</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100 mb-2">
            <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">⚠️ ĐƠN BỊ HUỶ</h3>
            {order.cancelReason && <p className="text-xs text-red-500 mt-1">Lý do: {order.cancelReason}</p>}
          </div>
        )}

        {/* Khối Thông Tin Tài Xế (Bật khi có xế) - Hiển thị giống hệt nhau cho Khách & Shop */}
        {order.assignedTo && (
          <div className="bg-white p-4 rounded-3xl border border-slate-100 mb-2 flex flex-col gap-3">
            <div className="flex justify-between items-center">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Truck size={14}/> THÔNG TIN TÀI XẾ</h3>
               <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-lg">
                 {order.assignedTo.driverCode ? `Mã Xế: ${order.assignedTo.driverCode}` : 'Đã Có Xế'}
               </span>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
               <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 border-2 border-white shadow-sm">
                 {order.assignedTo.avatar ? (
                   <img
                     src={getFullImageUrl(order.assignedTo.avatar)}
                     alt={order.assignedTo.name}
                     className="w-full h-full object-cover"
                     onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                   />
                 ) : (
                   order.assignedTo.name?.charAt(0) || 'X'
                 )}
               </div>
               <div className="flex-1 min-w-0">
                 <p className="font-bold text-slate-800 truncate">{order.assignedTo.name}</p>
                 <p className="text-xs font-bold text-blue-600 uppercase mt-0.5">
                   {order.assignedTo.licensePlate || order.assignedTo.vehiclePlate || 'Đang cập nhật biển số'}
                 </p>
                 {driverPt && (
                   <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Đang trực tuyến
                   </p>
                 )}
               </div>
               <a href={`tel:${order.assignedTo.phone}`} className="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-200 transition-transform active:scale-95 shrink-0">
                 <PhoneCall size={18} />
               </a>
            </div>
          </div>
        )}

        {/* Khối Thông Tin Món Ăn (Chỉ dành cho ALOFOOD) */}
        {order.serviceType === 'ALOFOOD' && order.alofoodDetails && (
          <div className="bg-white p-5 rounded-3xl border border-slate-100 mb-2">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1"><Package size={14}/> THÔNG TIN ĐƠN HÀNG</h3>
             
             <div className="space-y-3">
               {order.alofoodDetails.cartItems?.map((item, idx) => (
                 <div key={idx} className="flex justify-between items-start bg-slate-50 p-3 rounded-2xl">
                   <div className="flex-1 pr-2">
                     <p className="text-sm font-bold text-slate-800"><span className="text-blue-600 mr-1">{item.quantity}x</span> {item.name}</p>
                     {item.note && <p className="text-[11px] text-orange-600 italic mt-1 font-semibold">Ghi chú: {item.note}</p>}
                   </div>
                   <p className="text-sm font-bold text-slate-600">{(item.price * item.quantity).toLocaleString()}đ</p>
                 </div>
               ))}
             </div>
             
             <div className="mt-3 flex justify-between items-center px-1 border-t border-dashed border-slate-200 pt-3">
               <span className="text-sm text-slate-500 font-medium">Tổng tiền món:</span>
               <span className="font-bold text-slate-800">{(order.alofoodDetails.foodTotal || 0).toLocaleString()}đ</span>
             </div>
          </div>
        )}

        {order.note && (
           <div className="bg-amber-50 p-4 rounded-xl mb-4 border border-amber-100 flex gap-3 items-start shadow-sm">
               <Info className="text-amber-500 mt-0.5" size={20} />
               <div className="flex-1">
                 <h4 className="text-amber-800 font-bold text-sm mb-1">Ghi chú đơn hàng</h4>
                 <p className="text-sm text-amber-700">{order.note}</p>
               </div>
           </div>
        )}

        {order.scheduledTime && (
           <div className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-100 flex gap-3 items-start shadow-sm">
               <Clock className="text-blue-500 mt-0.5" size={20} />
               <div className="flex-1">
                 <h4 className="text-blue-800 font-bold text-sm mb-1">Hẹn giờ nhận đơn</h4>
                 <p className="text-sm text-blue-700">{new Date(order.scheduledTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
               </div>
           </div>
        )}

        {/* Khối Hoá Đơn / Phí Dịch Vụ */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1"><DollarSign size={14}/> CHI TIẾT CƯỚC PHÍ</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                 <span className="text-sm text-slate-600 font-medium">Phí Dịch Vụ / Giao Hàng</span>
                 <div className="flex flex-col items-end">
                   <span className="font-black text-slate-800">
                     {order.deliveryFee > 0 ? `${((order.deliveryFee || 0) + (order.packageDetails?.bulkyFee || 0) + (order.rideDetails?.surcharge || 0) + (order.extraSurcharge || 0)).toLocaleString()}đ` : <span className="text-blue-500 text-xs italic">Đang cập nhật...</span>}
                   </span>
                   {order.serviceType !== 'DON_GHEP' && order.serviceType !== 'DAT_XE' && order.serviceType !== 'DIEU_PHOI' && order.deliveryFee > 0 && (
                      <span className="text-[10px] text-slate-500 font-bold mt-0.5">{order.feePaidBy === 'SENDER' ? '(Shop trả ship)' : '(Khách trả ship)'}</span>
                   )}
                   {order.serviceType === 'MUA_HO' && order.deliveryFee > 0 && (
                     <span className="text-[10px] text-emerald-700 font-bold mt-0.5">
                       ( đã cộng phí mua hộ: 5.000đ )
                     </span>
                   )}
                   {order.isRainSurchargeApplied && order.rainSurchargeAmount > 0 && (
                     <span className="text-[10px] text-amber-600 font-bold mt-0.5">
                       ( đã bao gồm phụ phí mưa: +{order.rainSurchargeAmount.toLocaleString()}đ )
                     </span>
                   )}
                   {order.packageDetails?.bulkyFee > 0 && (
                     <span className="text-[10px] text-orange-600 font-medium mt-0.5">
                       ( đã cộng phí cồng kềnh: {order.packageDetails.bulkyFee.toLocaleString()}đ )
                     </span>
                   )}
                   {order.rideDetails?.surcharge > 0 && (
                     <span className="text-[10px] text-purple-600 font-medium mt-0.5">
                       ( đã cộng phí phụ/lái hộ: {order.rideDetails.surcharge.toLocaleString()}đ )
                     </span>
                   )}
                   {order.extraSurcharge > 0 && (
                     <span className="text-[10px] text-red-600 font-medium mt-0.5">
                       ( đã cộng phụ thu thêm: {order.extraSurcharge.toLocaleString()}đ )
                     </span>
                   )}
                 </div>
              </div>

              {order.financialDetails?.surcharge > 0 && (
                <div className="flex justify-between items-center px-2">
                   <span className="text-sm text-slate-500">Phụ phí (Cồng kềnh, Mưa,...)</span>
                   <span className="font-medium text-slate-700">{order.financialDetails.surcharge.toLocaleString()}đ</span>
                </div>
              )}

              {order.serviceType !== 'ALOFOOD' && order.codAmount > 0 && (
                <div className="flex justify-between items-center bg-blue-50 p-3 rounded-2xl border border-blue-100">
                   <span className="text-sm text-blue-800 font-bold">Thu hộ tiền hàng (COD)</span>
                   <span className="font-black text-blue-600">{order.codAmount.toLocaleString()}đ</span>
                </div>
              )}

              <div className="border-t border-dashed border-slate-200 my-2"></div>
              
              {order.serviceType !== 'DON_GHEP' && (() => {
                const totalShipFee = (order.deliveryFee || 0) + (order.packageDetails?.bulkyFee || 0) + (order.financialDetails?.surcharge || 0) + (order.rideDetails?.surcharge || 0) + (order.extraSurcharge || 0);
                const shopAmount = order.feePaidBy === 'SENDER' ? ((order.codAmount || 0) - totalShipFee) : (order.codAmount || 0);
                const customerAmount = order.feePaidBy === 'SENDER' ? (order.codAmount || 0) : ((order.codAmount || 0) + totalShipFee);
                
                return (
                  <div className="flex flex-col gap-3">
                     {order.serviceType !== 'ALOFOOD' && (
                       <div className="flex justify-between items-center px-1">
                         <span className="text-[10px] text-slate-500 font-bold uppercase">
                           {shopAmount > 0 ? 'TÀI XẾ ỨNG CHO SHOP' : shopAmount < 0 ? 'TÀI XẾ THU TỪ SHOP' : 'TÀI XẾ KHÔNG CẦN ỨNG/THU Ở SHOP'}
                         </span>
                         <span className="font-black text-lg text-slate-700">
                           {shopAmount === 0 ? '0đ' : `${Math.abs(shopAmount).toLocaleString()}đ`}
                         </span>
                       </div>
                     )}

                     <div className="flex justify-between items-end px-1 bg-red-50 p-3 rounded-xl border border-red-100">
                       <div className="flex flex-col">
                         <span className="text-xs text-red-600 font-bold uppercase">TỔNG TÀI XẾ THU CỦA KHÁCH</span>
                         <span className="text-[10px] text-red-500 italic">({order.feePaidBy === 'SENDER' ? 'Chỉ thu COD vì Shop đã trả ship' : 'Đã bao gồm Tiền Ship + COD'})</span>
                       </div>
                       <span className="font-black text-2xl text-red-600">
                         {customerAmount.toLocaleString()}đ
                       </span>
                     </div>
                  </div>
                );
              })()}
            </div>
        </div>

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
               {order.serviceType !== 'DIEU_PHOI' && order.serviceType !== 'DON_GHEP' && (
                 <div className="relative">
                    <div className="absolute -left-[27px] top-1 w-3 h-3 bg-red-500 rounded-full ring-4 ring-red-50"></div>
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
        </div>
        
        {/* NÚT THAO TÁC CỦA CỬA HÀNG (SHOP ACTIONS) */}
        {isShopViewer && order.serviceType === 'ALOFOOD' && (
          <div className="mt-6 mb-2 space-y-2">
            {order.status === 'WAITING_SHOP' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleShopRejectOrder}
                  className="w-full bg-red-50 text-red-600 font-bold border border-red-200 py-3.5 rounded-2xl active:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <X size={18} /> Từ chối
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleShopAcceptOrder}
                  className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-2xl active:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 flex items-center justify-center gap-1.5"
                >
                  <Check size={18} /> Nhận đơn này
                </button>
              </div>
            )}

            {['ACCEPTED', 'PENDING'].includes(order.status) && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleShopHandoverOrder}
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-2xl active:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              >
                <Package size={20} /> BÀN GIAO MÓN CHO TÀI XẾ
              </button>
            )}
          </div>
        )}

        {/* NÚT THAO TÁC CỦA KHÁCH HÀNG (HOẶC SHOP VỚI ĐƠN TỰ TẠO) */}
        {(!isShopViewer || order.serviceType !== 'ALOFOOD') && ['WAITING_SHOP', 'PENDING', 'DRAFT'].includes(order.status) && (
          <div className="mt-6 mb-2">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleCancelOrder}
                disabled={actionLoading}
                className={`w-full bg-red-50 text-red-600 font-bold border border-red-200 py-3.5 rounded-2xl active:bg-red-100 transition-colors ${order.status === 'DRAFT' && order.deliveryFee > 0 && order.adminReviewed ? '' : 'col-span-2'}`}
              >
                HỦY ĐƠN HÀNG
              </button>
              
              {order.status === 'DRAFT' && order.deliveryFee > 0 && !order.adminReviewed && (
                <div className="w-full bg-orange-50 text-orange-600 font-bold border border-orange-200 py-3.5 rounded-2xl text-center col-span-2">
                  ĐANG CHỜ TỔNG ĐÀI XÉT DUYỆT...
                </div>
              )}

              {order.status === 'DRAFT' && order.deliveryFee > 0 && order.adminReviewed && (
                <button 
                  onClick={async () => {
                    if (window.confirm('Xác nhận đồng ý với mức cước phí này để hệ thống tìm tài xế?')) {
                      try {
                        setActionLoading(true);
                        const res = await api.post(`/orders/${id}/confirm`);
                        if (res.data.success) {
                          showToast('Đã xác nhận thành công, đang tìm tài xế!', 'success');
                          fetchDetail();
                        }
                      } catch (e) {
                        showToast(e.response?.data?.message || 'Không thể xác nhận đơn', 'error');
                        setActionLoading(false);
                      }
                    }
                  }}
                  disabled={actionLoading}
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-2xl active:bg-blue-700 transition-colors shadow-lg shadow-blue-200 col-span-2"
                >
                  {order.serviceType === 'DAT_XE'
                    ? 'XÁC NHẬN ĐẶT XE VỚI CƯỚC PHÍ NÀY'
                    : 'XÁC NHẬN ĐƠN VỚI CƯỚC PHÍ NÀY'}
                </button>
              )}
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-2">Bạn chỉ có thể hủy trước khi Tài xế nhận đơn.</p>
          </div>
        )}

        </div>
      </div>
    </div>
  );
}
