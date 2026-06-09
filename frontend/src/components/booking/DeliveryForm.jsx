import React, { useState, useEffect } from 'react';
import { Navigation, Package, DollarSign, MapPin as MapPinIcon, Check } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import CurrencyInput from '../CurrencyInput';
import AddressAutocompleteInput from '../AddressAutocompleteInput';
import { estimateFee } from '../../services/api';

// --- CUSTOM ICONS ---
const pickupIcon = L.divIcon({
  html: `<div class="w-7 h-7 bg-blue-600 rounded-full border-[3px] border-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] flex items-center justify-center"><div class="w-2 h-2 bg-white rounded-full"></div></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const deliveryIcon = L.divIcon({
  html: `<div class="w-7 h-7 bg-sky-500 rounded-full border-[3px] border-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] flex items-center justify-center"><div class="w-2 h-2 bg-white rounded-full"></div></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// --- MAP HELPER COMPONENT ---
const MapUpdater = ({ pickup, delivery, routeLine }) => {
  const map = useMap();
  useEffect(() => {
    if (pickup && delivery) {
      const bounds = L.latLngBounds([pickup, delivery]);
      // Zoom out slightly more by increasing bottom padding to ensure route is centered in the visible area
      map.fitBounds(bounds, { 
        paddingTopLeft: [40, 180], 
        paddingBottomRight: [40, 120], 
        animate: true, 
        duration: 1.2 
      });
    } else if (pickup) {
      map.flyTo(pickup, 16, { animate: true, duration: 1 });
    } else if (delivery) {
      map.flyTo(delivery, 16, { animate: true, duration: 1 });
    }
  }, [pickup, delivery, routeLine, map]);
  return null;
};

export default function DeliveryForm({ onBooking, loading, defaultLocation, defaultPhone }) {
  const [form, setForm] = useState({
    senderName: '',
    customerPhone: defaultPhone || '',
    senderPhone: defaultPhone || '',
    pickupAddress: defaultLocation?.address || '',
    pickupCoordinates: defaultLocation && defaultLocation.lat ? { lat: defaultLocation.lat, lng: defaultLocation.lng } : null,
    
    receiverName: '',
    receiverPhone: '',
    receiverPhone2: '',
    deliveryAddress: '',
    deliveryCoordinates: null,

    note: '',
    codAmount: ''
  });

  const [estimatedFee, setEstimatedFee] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [routeLine, setRouteLine] = useState([]);

  useEffect(() => {
    if (defaultLocation?.address) {
      setForm(prev => ({ 
        ...prev, 
        pickupAddress: defaultLocation.address, 
        pickupCoordinates: defaultLocation.lat && defaultLocation.lng ? { lat: defaultLocation.lat, lng: defaultLocation.lng } : null 
      }));
    }
  }, [defaultLocation]);

  useEffect(() => {
    const fetchEstimateAndRoute = async () => {
      if (form.pickupCoordinates && form.deliveryCoordinates && form.pickupCoordinates.lat && form.deliveryCoordinates.lat) {
        setEstimating(true);
        try {
          try {
            const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${form.pickupCoordinates.lng},${form.pickupCoordinates.lat};${form.deliveryCoordinates.lng},${form.deliveryCoordinates.lat}?overview=full&geometries=geojson`);
            const routeData = await routeRes.json();
            if (routeData.routes && routeData.routes[0]) {
              const coordinates = routeData.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
              setRouteLine(coordinates);
            }
          } catch (routeErr) {
            setRouteLine([[form.pickupCoordinates.lat, form.pickupCoordinates.lng], [form.deliveryCoordinates.lat, form.deliveryCoordinates.lng]]);
          }

          const res = await estimateFee({
            pickupCoordinates: form.pickupCoordinates,
            deliveryCoordinates: form.deliveryCoordinates,
            serviceType: 'GIAO_HANG'
          });
          if (res && res.data && res.data.deliveryFee !== null) {
            setEstimatedFee(res.data.deliveryFee);
            setDistanceKm(res.data.distanceKm);
          } else {
            setEstimatedFee(null);
            setDistanceKm(null);
          }
        } catch (error) {
          setEstimatedFee(null);
          setDistanceKm(null);
        } finally {
          setEstimating(false);
        }
      } else {
        setEstimatedFee(null);
        setDistanceKm(null);
        setRouteLine([]);
      }
    };
    
    const timer = setTimeout(() => {
      fetchEstimateAndRoute();
    }, 800);
    
    return () => clearTimeout(timer);
  }, [form.pickupCoordinates, form.deliveryCoordinates]);

  const handleSubmit = (e) => {
    e.preventDefault();

    onBooking({
      serviceType: 'GIAO_HANG',
      senderName: form.senderName.trim() || 'Khách đặt qua App',
      customerPhone: defaultPhone || 'Khách Vãng Lai',
      senderPhone: form.senderPhone.trim() || defaultPhone,
      receiverName: form.receiverName.trim(),
      receiverPhone: form.receiverPhone.trim(),
      receiverPhone2: form.receiverPhone2.trim(),
      pickupAddress: form.pickupAddress.trim(),
      pickupCoordinates: form.pickupCoordinates || null,
      deliveryAddress: form.deliveryAddress.trim(),
      deliveryCoordinates: form.deliveryCoordinates || null,
      note: form.note.trim(),
      codAmount: form.codAmount ? parseInt(form.codAmount) : 0,
      deliveryFee: estimatedFee || 0,
      packageDetails: {
        description: 'Giao hàng hóa/tài liệu',
        weight: '',
        isFragile: false,
        bulkyFee: 0
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col bg-gray-50 relative -mx-4 -mt-4 md:-mx-0 min-h-full">
      
      {/* KHU VỰC BẢN ĐỒ INLINE (CỐ ĐỊNH PHÍA TRÊN) */}
      <div className="sticky top-0 w-full h-[70vh] md:h-[75vh] z-0 shrink-0">
        <MapContainer 
          center={form.pickupCoordinates ? [form.pickupCoordinates.lat, form.pickupCoordinates.lng] : [10.045162, 105.746854]} 
          zoom={14} 
          zoomControl={false} 
          className="w-full h-full z-0"
        >
          <TileLayer
            attribution='&copy; Google Maps'
            url={`https://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}`}
          />
          {form.pickupCoordinates && <Marker position={[form.pickupCoordinates.lat, form.pickupCoordinates.lng]} icon={pickupIcon} />}
          {form.deliveryCoordinates && <Marker position={[form.deliveryCoordinates.lat, form.deliveryCoordinates.lng]} icon={deliveryIcon} />}
          {routeLine.length > 0 && <Polyline positions={routeLine} color="#2563EB" weight={5} opacity={0.8} />}
          <MapUpdater 
            pickup={form.pickupCoordinates ? [form.pickupCoordinates.lat, form.pickupCoordinates.lng] : null}
            delivery={form.deliveryCoordinates ? [form.deliveryCoordinates.lat, form.deliveryCoordinates.lng] : null}
            routeLine={routeLine}
          />
        </MapContainer>

        {/* Ô NHẬP LIỆU NỔI BẬT NẰM TRÊN BẢN ĐỒ */}
        <div className="absolute top-4 left-4 right-4 z-[1000] space-y-3 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-gray-100/50 pointer-events-auto space-y-0 relative">
            
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center mt-1.5 shrink-0">
                <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                </div>
                <div className="w-[2px] h-14 bg-gray-200 mt-1 mb-1 rounded-full"></div>
                <div className="w-4 h-4 rounded-full bg-sky-100 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div>
                </div>
              </div>

              <div className="flex-1 w-full flex flex-col justify-between">
                {/* Điểm lấy */}
                <div className="h-[60px]">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                    ĐIỂM LẤY HÀNG (NGƯỜI GỬI)
                  </label>
                  <AddressAutocompleteInput 
                    value={form.pickupAddress}
                    onChangeText={txt => setForm(prev => ({...prev, pickupAddress: txt}))}
                    onSelectCoordinates={coords => setForm(prev => ({...prev, pickupCoordinates: coords}))}
                    placeholder="Nhập địa chỉ lấy hàng..."
                    className="w-full text-[14px] font-bold text-gray-800 -ml-2 !w-[calc(100%+16px)]"
                  />
                </div>

                <div className="h-[1px] w-[calc(100%+16px)] bg-gray-100/80 -ml-4 my-1"></div>

                {/* Điểm giao */}
                <div className="h-[60px] flex flex-col justify-end">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                    ĐIỂM GIAO HÀNG
                  </label>
                  <AddressAutocompleteInput 
                    value={form.deliveryAddress}
                    onChangeText={txt => setForm(prev => ({...prev, deliveryAddress: txt}))}
                    onSelectCoordinates={coords => setForm(prev => ({...prev, deliveryCoordinates: coords}))}
                    placeholder="Nhập địa chỉ nhận hoặc chừa trống..."
                    className="w-full text-[14px] font-bold text-gray-800 -ml-2 !w-[calc(100%+16px)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KHU VỰC ĐIỀN THÔNG TIN BÊN DƯỚI (Cuộn trượt lên đè bản đồ) */}
      <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.12)] relative z-[100] px-5 pt-6 pb-24 flex-1 flex flex-col -mt-6 mx-0 min-h-[60vh]">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>

        <div className="space-y-6">
          
          {/* Thông tin liên hệ */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-extrabold text-gray-800 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <MapPinIcon size={14} className="text-gray-400" /> THÔNG TIN LIÊN LẠC
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input 
                  type="tel"
                  placeholder="SĐT Lấy Hàng"
                  className="w-full text-[13px] font-bold text-blue-600 p-3.5 bg-gray-50/80 border border-gray-100 rounded-2xl outline-none focus:border-blue-400 focus:bg-white transition-colors"
                  value={form.senderPhone} onChange={e => setForm({...form, senderPhone: e.target.value})}
                />
              </div>
              <div>
                <input 
                  type="tel"
                  placeholder="SĐT Giao Hàng"
                  className="w-full text-[13px] font-bold text-sky-600 p-3.5 bg-gray-50/80 border border-gray-100 rounded-2xl outline-none focus:border-sky-400 focus:bg-white transition-colors"
                  value={form.receiverPhone} onChange={e => setForm({...form, receiverPhone: e.target.value})}
                />
              </div>
            </div>

            <div>
              <input 
                type="text" 
                placeholder="Tên người nhận (Tùy chọn)"
                className="w-full text-[13px] bg-gray-50/80 border border-gray-100 p-3.5 rounded-2xl outline-none font-bold text-slate-800 focus:border-sky-400 focus:bg-white transition-colors"
                value={form.receiverName} onChange={e => setForm({...form, receiverName: e.target.value})}
              />
            </div>
          </div>

          {/* Thu hộ và Ghi chú */}
          <div className="bg-white p-4 md:p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100/50 space-y-5">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
                <DollarSign size={14} className="text-yellow-500" /> THU HỘ TIỀN HÀNG (COD)
              </label>
              <CurrencyInput 
                name="codAmount"
                placeholder="Ví dụ: 250.000"
                className="w-full text-[14px] font-bold text-gray-800 bg-gray-50/50 border border-gray-100 p-3.5 rounded-2xl outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100/50 focus:bg-white transition-all duration-300"
                value={form.codAmount}
                onChange={e => setForm({...form, codAmount: e.target.value})}
              />
              <p className="text-[10px] text-gray-400 mt-1.5 ml-1">Nhập 0 hoặc bỏ trống nếu không cần thu hộ.</p>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
                <Package size={14} className="text-blue-500" /> GHI CHÚ ĐƠN HÀNG
              </label>
              <textarea 
                rows="2"
                placeholder="Lưu ý cho tài xế (mặt hàng dễ vỡ, giao hẻm...)"
                className="w-full text-[13px] text-gray-800 bg-gray-50/50 border border-gray-100 p-3.5 rounded-2xl outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100/50 focus:bg-white transition-all duration-300 resize-none font-medium"
                value={form.note}
                onChange={e => setForm({...form, note: e.target.value})}
              ></textarea>
            </div>
          </div>

          {/* KHUYẾN CÁO GIÁ & BUTTON TẠO ĐƠN */}
          <div className="mt-4 space-y-4">
            <div className={`border p-4 rounded-[20px] flex items-start gap-3 transition-colors duration-300 ${estimatedFee !== null ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
              <div className={`mt-0.5 ${estimatedFee !== null ? 'text-blue-500' : 'text-gray-400'}`}>
                <Navigation size={20} />
              </div>
              <div className="flex-1">
                <p className={`text-[13px] leading-relaxed font-bold ${estimatedFee !== null ? 'text-blue-800' : 'text-gray-500'}`}>
                  {estimatedFee !== null ? (
                    <>Cước tạm tính: <strong className="text-lg text-blue-600 block sm:inline sm:ml-1 mt-1 sm:mt-0">{estimatedFee.toLocaleString('vi-VN')}đ</strong> {distanceKm ? <span className="text-blue-500 font-bold opacity-80 ml-1">({distanceKm.toFixed(1)}km)</span> : ''}</>
                  ) : (
                    'Vui lòng chọn đầy đủ cả điểm lấy và điểm giao để xem giá.'
                  )}
                </p>
                {estimatedFee !== null && (
                  <p className="text-[10px] font-semibold text-blue-500/80 mt-1">Tổng đài có thể phụ thu phí cồng kềnh (nếu có).</p>
                )}
              </div>
            </div>

            <button 
              disabled={loading}
              type="submit"
              className="w-full bg-blue-600 active:bg-blue-700 text-white font-extrabold text-[15px] sm:text-base py-4 rounded-2xl shadow-[0_8px_20px_rgba(37,99,235,0.24)] active:scale-[0.98] transition-transform duration-300 ease-out disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>ĐANG XỬ LÝ...</span>
                </>
              ) : (
                <>
                  <Check size={20} />
                  <span>XÁC NHẬN TẠO ĐƠN</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </form>
  );
}
