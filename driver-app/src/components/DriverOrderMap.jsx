import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, RefreshCw, X, Package, ShoppingCart, Bike, ArrowRight, ShieldAlert, CheckCircle } from 'lucide-react';

function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  if (dist < 1) {
    return `${Math.round(dist * 1000)}m`;
  }
  return `${dist.toFixed(1)}km`;
}

export default function DriverOrderMap({ 
  orders = [], 
  driverCoords = null, 
  onAcceptOrder = null, 
  onRefresh = null,
  onClose = null 
}) {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const driverMarkerRef = useRef(null);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);

  // Lọc chỉ những đơn có toạ độ điểm lấy hợp lệ
  const validOrders = orders.filter(
    o => o?.pickupCoordinates?.lat != null && o?.pickupCoordinates?.lng != null
  );

  // Tạo marker vị trí của tài xế
  const updateDriverMarker = useCallback((coords) => {
    if (!mapInstance.current || !coords?.lat || !coords?.lng) return;

    const latLng = [coords.lat, coords.lng];

    if (!driverMarkerRef.current) {
      const driverHtml = `
        <div style="position: relative; width: 44px; height: 44px; display: flex; items-center; justify-content: center;">
          <div style="position: absolute; inset: 0; background: rgba(59, 130, 246, 0.35); border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 34px; height: 34px; background: #2563eb; border: 3px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
            <span style="font-size: 16px;">🛵</span>
          </div>
          <div style="position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); background: #1e293b; color: white; font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.25);">
            Bạn ở đây
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'driver-location-marker',
        html: driverHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      driverMarkerRef.current = L.marker(latLng, { icon, zIndexOffset: 1000 }).addTo(mapInstance.current);
    } else {
      driverMarkerRef.current.setLatLng(latLng);
    }
  }, []);

  // Cập nhật các pins đơn hàng trên bản đồ
  const updateOrderMarkers = useCallback(() => {
    if (!mapInstance.current) return;

    // Xoá các marker cũ không còn trong danh sách
    const currentOrderIds = new Set(validOrders.map(o => o._id));
    Object.keys(markersRef.current).forEach(id => {
      if (!currentOrderIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Vẽ hoặc cập nhật marker cho từng đơn
    validOrders.forEach(order => {
      const lat = order.pickupCoordinates.lat;
      const lng = order.pickupCoordinates.lng;
      const isSelected = selectedOrder?._id === order._id;

      // Xác định icon & màu sắc theo dịch vụ
      let serviceBg = '#2563eb'; // Xanh giao hàng
      let serviceIcon = '📦';
      if (order.serviceType === 'ALOFOOD') {
        serviceBg = '#d97706'; // Cam Alofood
        serviceIcon = '🍲';
      } else if (order.serviceType === 'MUA_HO') {
        serviceBg = '#059669'; // Xanh lá mua hộ
        serviceIcon = '🛒';
      } else if (order.serviceType === 'DAT_XE') {
        serviceBg = '#7c3aed'; // Tím chở khách
        serviceIcon = '🛵';
      }

      const fee = order.deliveryFee ? `${Math.round(order.deliveryFee / 1000)}k` : 'Ship';

      const pinHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
          <div style="background: ${serviceBg}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 900; border: 2px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; gap: 4px; white-space: nowrap; ${isSelected ? 'outline: 3px solid #facc15; transform: scale(1.1);' : ''}">
            <span>${serviceIcon}</span>
            <span>${fee}</span>
          </div>
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid ${serviceBg}; margin-top: -1px;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: `order-pin-${order._id}`,
        html: pinHtml,
        iconSize: [60, 36],
        iconAnchor: [30, 36]
      });

      if (!markersRef.current[order._id]) {
        const marker = L.marker([lat, lng], { icon: customIcon, zIndexOffset: isSelected ? 500 : 100 })
          .addTo(mapInstance.current)
          .on('click', () => {
            setSelectedOrder(order);
            if (mapInstance.current) {
              mapInstance.current.panTo([lat, lng], { animate: true, duration: 0.5 });
            }
          });
        markersRef.current[order._id] = marker;
      } else {
        markersRef.current[order._id].setIcon(customIcon);
        markersRef.current[order._id].setLatLng([lat, lng]);
        markersRef.current[order._id].setZIndexOffset(isSelected ? 500 : 100);
      }
    });
  }, [validOrders, selectedOrder]);

  // Khởi tạo Leaflet Map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Chọn toạ độ khởi đầu
    const defaultLat = driverCoords?.lat || (validOrders[0]?.pickupCoordinates?.lat) || 10.762622;
    const defaultLng = driverCoords?.lng || (validOrders[0]?.pickupCoordinates?.lng) || 106.660172;

    const map = L.map(mapRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 15,
      zoomControl: false,
      preferCanvas: true
    });

    // Google Maps Tile Layer
    const subdomains = ['mt0', 'mt1', 'mt2', 'mt3'];
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}', {
      subdomains,
      attribution: '&copy; Google Maps',
      maxZoom: 21,
      maxNativeZoom: 20
    }).addTo(map);

    // Zoom control ở góc trên bên phải
    L.control.zoom({ position: 'topright' }).addTo(map);

    mapInstance.current = map;

    // Resize observer để map không bị xé ô
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Cập nhật marker khi dữ liệu thay đổi
  useEffect(() => {
    if (driverCoords) {
      updateDriverMarker(driverCoords);
    }
    updateOrderMarkers();
  }, [driverCoords, validOrders, updateDriverMarker, updateOrderMarkers]);

  // Nút về vị trí của tôi
  const handlePanToDriver = () => {
    if (mapInstance.current && driverCoords?.lat && driverCoords?.lng) {
      mapInstance.current.setView([driverCoords.lat, driverCoords.lng], 16, { animate: true });
    }
  };

  // Nhận đơn ngay từ Mini Card
  const handleAcceptMini = async (orderId) => {
    if (acceptingId) return;
    setAcceptingId(orderId);
    try {
      if (onAcceptOrder) {
        await onAcceptOrder(orderId);
      }
      setSelectedOrder(null);
    } catch (e) {
      console.error(e);
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-100">
      {/* HEADER BẢN ĐỒ */}
      <div className="absolute top-2 left-2 right-2 z-[400] flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white text-slate-700 p-2.5 shadow-lg border border-slate-200 hover:bg-slate-50 active:scale-95 transition"
              title="Quay lại danh sách"
            >
              <X size={18} />
            </button>
          )}
          <div className="rounded-2xl bg-white/95 backdrop-blur-md px-3.5 py-2 shadow-lg border border-slate-200 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black text-slate-800">
              {validOrders.length} ĐƠN QUANH BẠN
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-full bg-white text-slate-700 p-2.5 shadow-lg border border-slate-200 hover:bg-slate-50 active:scale-95 transition"
              title="Làm mới đơn"
            >
              <RefreshCw size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={handlePanToDriver}
            disabled={!driverCoords}
            className={`rounded-full p-2.5 shadow-lg border transition active:scale-95 ${
              driverCoords 
                ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700' 
                : 'bg-white text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
            title="Vị trí của tôi"
          >
            <Navigation size={18} />
          </button>
        </div>
      </div>

      {/* CONTAINER BẢN ĐỒ LEAFLET */}
      <div ref={mapRef} className="w-full h-full z-0" />

      {/* MINI CARD CHI TIẾT ĐƠN HÀNG KHI CLICK VÀO PIN */}
      {selectedOrder && (
        <div className="absolute bottom-3 left-3 right-3 z-[500] max-w-md mx-auto animate-in slide-in-from-bottom duration-200">
          <div className="bg-white rounded-3xl p-4 shadow-2xl border border-slate-200/90 space-y-3 relative">
            {/* Nút đóng mini card */}
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition"
            >
              ✕
            </button>

            {/* Dòng 1: Tag Dịch vụ & Mã đơn */}
            <div className="flex items-center gap-2 pr-8">
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase text-white shadow-xs ${
                selectedOrder.serviceType === 'ALOFOOD' ? 'bg-amber-600' :
                selectedOrder.serviceType === 'MUA_HO' ? 'bg-emerald-600' :
                selectedOrder.serviceType === 'DAT_XE' ? 'bg-purple-600' : 'bg-blue-600'
              }`}>
                {selectedOrder.serviceType === 'ALOFOOD' ? '🍜 AloFood' :
                 selectedOrder.serviceType === 'MUA_HO' ? '🛒 Mua Hộ' :
                 selectedOrder.serviceType === 'DAT_XE' ? '🛵 Đặt Xe' : '📦 Giao Hàng'}
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                #{selectedOrder.orderCode || selectedOrder._id?.slice(-6).toUpperCase()}
              </span>
            </div>

            {/* Dòng 2: ĐIỂM LẤY HÀNG (CHỈ HIỂN THỊ ĐIỂM LẤY - KHÔNG HIỂN THỊ ĐIỂM GIAO) */}
            <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-base">📍</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                      ĐIỂM LẤY HÀNG
                    </span>
                    {driverCoords && selectedOrder.pickupCoordinates && (
                      <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded-md border border-slate-200">
                        {getDistanceKm(
                          driverCoords.lat, driverCoords.lng,
                          selectedOrder.pickupCoordinates.lat, selectedOrder.pickupCoordinates.lng
                        )} từ bạn
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-800 line-clamp-2 mt-0.5">
                    {selectedOrder.pickupAddress}
                  </p>
                </div>
              </div>

              {/* Thông báo bảo mật: Điểm giao không hiển thị trước */}
              <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-400 font-medium">
                <ShieldAlert size={12} className="text-slate-400 shrink-0" />
                <span>Điểm giao sẽ mở chi tiết sau khi bạn nhận đơn</span>
              </div>
            </div>

            {/* Dòng 3: Cước Ship & COD */}
            <div className="flex items-center justify-between pt-1 px-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Thu hộ (COD)</span>
                <span className="text-xs font-black text-slate-700">
                  {selectedOrder.codAmount > 0 
                    ? `${selectedOrder.codAmount.toLocaleString('vi-VN')}đ` 
                    : 'Không thu'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tiền ship nhận</span>
                <span className="text-base font-black text-emerald-600">
                  {selectedOrder.deliveryFee > 0 
                    ? `${selectedOrder.deliveryFee.toLocaleString('vi-VN')}đ` 
                    : 'Thỏa thuận'}
                </span>
              </div>
            </div>

            {/* Dòng 4: Các nút hành động */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => navigate(`/order/${selectedOrder._id}`)}
                className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 py-2.5 text-xs font-bold text-slate-700 transition active:scale-95"
              >
                Chi tiết
              </button>
              <button
                type="button"
                disabled={acceptingId === selectedOrder._id}
                onClick={() => handleAcceptMini(selectedOrder._id)}
                className="flex-[2] rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/30 transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                {acceptingId === selectedOrder._id ? 'Đang nhận...' : '✅ NHẬN ĐƠN NGAY'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
