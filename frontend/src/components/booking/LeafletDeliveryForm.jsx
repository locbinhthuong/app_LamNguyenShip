import React, { useState, useEffect, useRef } from 'react';
import { Navigation, Package, DollarSign, MapPin as MapPinIcon, Check, Map as MapOutlineIcon, X, Layers } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
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
const MapUpdater = ({ pickup, delivery, routeLine, mapSelectMode }) => {
  const map = useMap();
  useEffect(() => {
    if (mapSelectMode) return; // Don't auto-fit bounds when user is manually selecting on map

    if (pickup && delivery) {
      const bounds = L.latLngBounds([pickup, delivery]);
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
  }, [pickup, delivery, routeLine, map, mapSelectMode]);
  return null;
};

// --- MAP PICKER LISTENER ---
const MapPickerListener = ({ mode, onLocationChange }) => {
  const map = useMapEvents({
    moveend: () => {
      if (mode) {
        const center = map.getCenter();
        onLocationChange({ lat: center.lat, lng: center.lng });
      }
    }
  });
  return null;
};

export default function DeliveryForm({ onBooking, loading, defaultLocation, defaultPhone, mode = 'delivery' }) {
  const [form, setForm] = useState({
    senderName: '',
    customerPhone: defaultPhone || '',
    senderPhone: mode === 'delivery' ? (defaultPhone || '') : '',
    pickupAddress: mode === 'delivery' ? (defaultLocation?.address || '') : '',
    pickupCoordinates: mode === 'delivery' ? (defaultLocation && defaultLocation.lat ? { lat: defaultLocation.lat, lng: defaultLocation.lng } : null) : null,
    
    receiverName: '',
    receiverPhone: mode === 'pickup' ? (defaultPhone || '') : '',
    receiverPhone2: '',
    deliveryAddress: mode === 'pickup' ? (defaultLocation?.address || '') : '',
    deliveryCoordinates: mode === 'pickup' ? (defaultLocation && defaultLocation.lat ? { lat: defaultLocation.lat, lng: defaultLocation.lng } : null) : null,

    note: '',
    codAmount: ''
  });

  const [estimatedFee, setEstimatedFee] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [routeLine, setRouteLine] = useState([]);

  // MAP SELECTION STATE
  const [mapSelectMode, setMapSelectMode] = useState(null); // 'pickup' | 'delivery' | null
  const [tempLocation, setTempLocation] = useState({ lat: null, lng: null, address: '' });
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [mapType, setMapType] = useState('m'); // m = roadmap, y = satellite
  const fetchAddressTimeout = useRef(null);

  useEffect(() => {
    if (defaultLocation?.address) {
      if (mode === 'delivery') {
        setForm(prev => ({ 
          ...prev, 
          pickupAddress: defaultLocation.address, 
          pickupCoordinates: defaultLocation.lat && defaultLocation.lng ? { lat: defaultLocation.lat, lng: defaultLocation.lng } : null 
        }));
      } else {
        setForm(prev => ({ 
          ...prev, 
          deliveryAddress: defaultLocation.address, 
          deliveryCoordinates: defaultLocation.lat && defaultLocation.lng ? { lat: defaultLocation.lat, lng: defaultLocation.lng } : null 
        }));
      }
    }
  }, [defaultLocation, mode]);

  useEffect(() => {
    const fetchEstimateAndRoute = async () => {
      if (form.pickupCoordinates && form.deliveryCoordinates && form.pickupCoordinates.lat && form.deliveryCoordinates.lat) {
        setEstimating(true);
        setRouteLine([]); // Xóa đường đi cũ ngay lập tức

        try {
          const res = await estimateFee({
            pickupCoordinates: form.pickupCoordinates,
            deliveryCoordinates: form.deliveryCoordinates,
            serviceType: 'GIAO_HANG'
          });
          if (res && res.data && res.data.deliveryFee !== null) {
            setEstimatedFee(res.data.deliveryFee);
            setDistanceKm(res.data.distanceKm);
            if (res.data.routeLine) {
              setRouteLine(res.data.routeLine);
            } else {
              setRouteLine([[form.pickupCoordinates.lat, form.pickupCoordinates.lng], [form.deliveryCoordinates.lat, form.deliveryCoordinates.lng]]);
            }
          } else {
            setEstimatedFee(null);
            setDistanceKm(null);
            setRouteLine([[form.pickupCoordinates.lat, form.pickupCoordinates.lng], [form.deliveryCoordinates.lat, form.deliveryCoordinates.lng]]);
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
    
    if (!mapSelectMode) {
      const timer = setTimeout(() => fetchEstimateAndRoute(), 800);
      return () => clearTimeout(timer);
    }
  }, [form.pickupCoordinates, form.deliveryCoordinates, mapSelectMode]);

  const handleBookingClick = (e) => {
    e.preventDefault();

    onBooking({
      serviceType: 'GIAO_HANG',
      senderName: form.senderName.trim(),
      customerPhone: defaultPhone || 'Khách Vãng Lai',
      senderPhone: form.senderPhone.trim(),
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

  const openMapSelect = (mode) => {
    setMapSelectMode(mode);
    let initialCoords = null;
    if (mode === 'pickup' && form.pickupCoordinates) initialCoords = form.pickupCoordinates;
    if (mode === 'delivery' && form.deliveryCoordinates) initialCoords = form.deliveryCoordinates;
    
    if (initialCoords) {
      setTempLocation({ ...initialCoords, address: mode === 'pickup' ? form.pickupAddress : form.deliveryAddress });
    } else {
      setTempLocation({ lat: 10.045162, lng: 105.746854, address: 'Đang tải...' }); // Mặc định Cần Thơ
    }
  };

  const handleMapLocationChange = (coords) => {
    setTempLocation(prev => ({ ...prev, lat: coords.lat, lng: coords.lng }));
    setIsFetchingAddress(true);
    
    if (fetchAddressTimeout.current) clearTimeout(fetchAddressTimeout.current);
    
    fetchAddressTimeout.current = setTimeout(async () => {
      try {
        let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        if (apiUrl && !apiUrl.endsWith('/api')) apiUrl += '/api';
        const res = await fetch(`${apiUrl}/maps/geocode?latlng=${coords.lat},${coords.lng}`);
        const data = await res.json();
        if (data && data.results && data.results.length > 0) {
          setTempLocation(prev => ({ ...prev, address: data.results[0].formatted_address }));
        } else {
          setTempLocation(prev => ({ ...prev, address: "Không xác định được địa chỉ" }));
        }
      } catch (e) {
        setTempLocation(prev => ({ ...prev, address: "Lỗi kết nối khi tải địa chỉ" }));
      }
      setIsFetchingAddress(false);
    }, 1200); // delay 1200ms to avoid spamming API on drag
  };

  const confirmMapSelection = () => {
    if (mapSelectMode === 'pickup') {
      setForm(prev => ({
        ...prev,
        pickupAddress: tempLocation.address,
        pickupCoordinates: { lat: tempLocation.lat, lng: tempLocation.lng }
      }));
    } else if (mapSelectMode === 'delivery') {
      setForm(prev => ({
        ...prev,
        deliveryAddress: tempLocation.address,
        deliveryCoordinates: { lat: tempLocation.lat, lng: tempLocation.lng }
      }));
    }
    setMapSelectMode(null);
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col bg-gray-50 relative -mx-4 -mt-4 md:-mx-0 min-h-full">
      
      {/* KHU VỰC BẢN ĐỒ INLINE (CỐ ĐỊNH PHÍA TRÊN) */}
      <div className={`sticky top-0 w-full z-0 shrink-0 ${mapSelectMode ? 'h-[100dvh]' : 'h-[70vh] md:h-[75vh]'}`}>
        <MapContainer 
          center={
            mapSelectMode ? [tempLocation.lat || 10.045162, tempLocation.lng || 105.746854] : 
            form.pickupCoordinates ? [form.pickupCoordinates.lat, form.pickupCoordinates.lng] : 
            [10.045162, 105.746854]
          } 
          zoom={15} 
          zoomControl={false} 
          className="w-full h-full z-0"
        >
          <TileLayer
            attribution='&copy; Google Maps'
            url={`https://mt0.google.com/vt/lyrs=${mapType}&hl=en&x={x}&y={y}&z={z}`}
          />
          
          {/* Markers when NOT in map select mode */}
          {!mapSelectMode && form.pickupCoordinates && <Marker position={[form.pickupCoordinates.lat, form.pickupCoordinates.lng]} icon={pickupIcon} />}
          {!mapSelectMode && form.deliveryCoordinates && <Marker position={[form.deliveryCoordinates.lat, form.deliveryCoordinates.lng]} icon={deliveryIcon} />}
          {!mapSelectMode && routeLine.length > 0 && <Polyline positions={routeLine} color="#2563EB" weight={5} opacity={0.8} className="animated-route-line" />}
          
          <MapUpdater 
            pickup={form.pickupCoordinates ? [form.pickupCoordinates.lat, form.pickupCoordinates.lng] : null}
            delivery={form.deliveryCoordinates ? [form.deliveryCoordinates.lat, form.deliveryCoordinates.lng] : null}
            routeLine={routeLine}
            mapSelectMode={mapSelectMode}
          />

          {mapSelectMode && <MapPickerListener mode={mapSelectMode} onLocationChange={handleMapLocationChange} />}
        </MapContainer>

        {/* NÚT CHUYỂN ĐỔI BẢN ĐỒ VỆ TINH */}
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setMapType(prev => prev === 'm' ? 'y' : 'm');
          }} 
          className="absolute top-1/2 right-4 -translate-y-1/2 z-[2000] bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg border border-gray-100 text-slate-700 active:scale-90 transition-transform flex items-center gap-2"
        >
          <Layers size={18} className={mapType === 'y' ? 'text-blue-600' : ''} />
          <span className="text-xs font-bold">{mapType === 'm' ? 'Vệ tinh' : 'Bản đồ'}</span>
        </button>

        {/* TRUNG TÂM BẢN ĐỒ (KHI CHỌN ĐIỂM) */}
        {mapSelectMode && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] pointer-events-none pb-10">
            <div className="relative flex flex-col items-center">
              <div className={`px-3 py-1.5 rounded-full text-[11px] font-bold text-white shadow-lg mb-2 whitespace-nowrap animate-bounce ${mapSelectMode === 'pickup' ? 'bg-blue-600' : 'bg-sky-500'}`}>
                {isFetchingAddress ? 'Đang tải...' : (mapSelectMode === 'pickup' ? 'Lấy hàng tại đây' : 'Giao hàng tại đây')}
              </div>
              <MapPinIcon size={42} className={`drop-shadow-xl ${mapSelectMode === 'pickup' ? 'fill-blue-600' : 'fill-sky-500'} text-white`} />
              <div className="w-2 h-1 bg-black/30 rounded-[100%] absolute bottom-1 mt-1 blur-[1px]"></div>
            </div>
          </div>
        )}

        {/* BẢNG CHỌN ĐIỂM TRÊN BẢN ĐỒ */}
        {mapSelectMode && (
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-[2000] p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-gray-800 flex items-center gap-2">
                <MapOutlineIcon size={20} className={mapSelectMode === 'pickup' ? 'text-blue-600' : 'text-sky-500'} />
                Chọn {mapSelectMode === 'pickup' ? 'Điểm Lấy Hàng' : 'Điểm Giao Hàng'}
              </h3>
              <button onClick={() => setMapSelectMode(null)} className="p-2 bg-gray-100 rounded-full text-gray-500 active:scale-90 transition-transform">
                <X size={18} />
              </button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-5">
              <p className="text-sm font-medium text-gray-700 line-clamp-2">
                {isFetchingAddress ? (
                  <span className="flex items-center gap-2 text-gray-400">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    Đang tải địa chỉ...
                  </span>
                ) : (
                  tempLocation.address || "Di chuyển bản đồ để chọn vị trí"
                )}
              </p>
            </div>

            <button 
              onClick={confirmMapSelection}
              disabled={isFetchingAddress || !tempLocation.address}
              className={`w-full py-4 rounded-2xl font-extrabold text-white flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]
                ${(isFetchingAddress || !tempLocation.address) ? 'bg-gray-300 shadow-none' : (mapSelectMode === 'pickup' ? 'bg-blue-600 shadow-blue-600/30' : 'bg-sky-500 shadow-sky-500/30')}
              `}
            >
              <Check size={20} /> XÁC NHẬN VỊ TRÍ NÀY
            </button>
          </div>
        )}

        {/* Ô NHẬP LIỆU NỔI BẬT NẰM TRÊN BẢN ĐỒ (ẨN KHI ĐANG CHỌN MAP) */}
        {!mapSelectMode && (
          <div className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none">
            <div className="bg-white/95 backdrop-blur-md rounded-[20px] p-3 shadow-xl border border-gray-100/50 pointer-events-auto relative">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-3.5 h-3.5 rounded-full bg-blue-100 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                  </div>
                  <div className="w-[1.5px] h-10 bg-gray-200 my-0.5 rounded-full"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-sky-100 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div>
                  </div>
                </div>

                <div className="flex-1 w-full flex flex-col justify-between space-y-1">
                  {/* Điểm lấy */}
                  <div className="flex flex-col justify-center">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                      ĐIỂM LẤY HÀNG
                    </label>
                    <AddressAutocompleteInput 
                      value={form.pickupAddress}
                      onChangeText={txt => setForm(prev => ({...prev, pickupAddress: txt}))}
                      onSelectCoordinates={coords => setForm(prev => ({...prev, pickupCoordinates: coords}))}
                      placeholder="Nhập địa chỉ lấy hàng..."
                      className="w-full text-[13px] font-bold text-gray-800 -ml-1.5 !w-[calc(100%+12px)]"
                      onClickMapIcon={() => openMapSelect('pickup')}
                    />
                  </div>

                  <div className="h-[1px] w-[calc(100%+12px)] bg-gray-100/80 -ml-3 my-0.5"></div>

                  {/* Điểm giao */}
                  <div className="flex flex-col justify-center mt-0.5">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                      ĐIỂM GIAO HÀNG
                    </label>
                    <AddressAutocompleteInput 
                      value={form.deliveryAddress}
                      onChangeText={txt => setForm(prev => ({...prev, deliveryAddress: txt}))}
                      onSelectCoordinates={coords => setForm(prev => ({...prev, deliveryCoordinates: coords}))}
                      placeholder="Nhập địa chỉ giao hoặc chừa trống..."
                      className="w-full text-[13px] font-bold text-gray-800 -ml-1.5 !w-[calc(100%+12px)]"
                      onClickMapIcon={() => openMapSelect('delivery')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KHU VỰC ĐIỀN THÔNG TIN BÊN DƯỚI (Ẩn khi đang chọn map) */}
      {!mapSelectMode && (
        <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.12)] relative z-[100] px-5 pt-6 pb-24 flex-1 flex flex-col -mt-6 mx-0 min-h-[60vh]">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>

          <div className="space-y-6">
            
            {/* CƯỚC TẠM TÍNH (ĐƯỢC ĐƯA LÊN TRÊN CÙNG) */}
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
            
            {/* COD Section */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">{mode === 'delivery' ? 'TIỀN THU HỘ (COD)' : 'TIỀN ỨNG (TÀI XẾ TRẢ TRƯỚC LÚC LẤY)'}</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <DollarSign size={18} />
                </div>
                <CurrencyInput 
                  value={form.codAmount}
                  onChange={val => setForm({...form, codAmount: val})}
                  placeholder={mode === 'delivery' ? "Nhập số tiền cần thu hộ (nếu có)..." : "Nhập số tiền tài xế cần ứng ra trả trước (nếu có)..."}
                  className="w-full text-base font-bold text-gray-800 outline-none p-3 pl-10 bg-gray-50 border border-gray-100 rounded-xl focus:border-blue-300 transition-colors"
                />
              </div>
            </div>

            {/* Thông tin lấy hàng */}
            <div className="flex-1 border-b border-gray-100 pb-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                {mode === 'delivery' ? 'LẤY HÀNG TẠI' : 'LẤY HÀNG Ở ĐÂU (ĐIỂM LẤY)'}
              </label>
              <div className="flex flex-col gap-2 relative">
                <AddressAutocompleteInput 
                  value={form.pickupAddress}
                  onChangeText={txt => setForm(prev => ({...prev, pickupAddress: txt}))}
                  onSelectCoordinates={coords => setForm(prev => ({...prev, pickupCoordinates: coords}))}
                  placeholder="Nhập địa chỉ lấy hàng..."
                  onClickMapIcon={(query) => openMapSelect('pickup')}
                  className="bg-white border text-sm font-semibold border-gray-100 rounded-xl focus-within:border-blue-300"
                />
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder={mode === 'delivery' ? "Tên người giao (không bắt buộc)" : "Tên người gửi (không bắt buộc)"}
                    className="w-1/2 text-xs outline-none p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-blue-300 transition-colors"
                    value={form.senderName}
                    onChange={e => setForm({...form, senderName: e.target.value})}
                  />
                  <input 
                    type="tel"
                    placeholder={mode === 'delivery' ? "SĐT Cửa hàng / Nơi lấy" : "SĐT Nơi lấy hàng (Bắt buộc)"}
                    className="w-1/2 text-xs font-semibold text-blue-600 outline-none p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-blue-300 transition-colors"
                    value={form.senderPhone}
                    onChange={e => setForm({...form, senderPhone: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Thông tin giao hàng */}
            <div className="flex-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                {mode === 'delivery' ? 'GIAO ĐẾN ĐÂU' : 'MANG VỀ CỬA HÀNG (ĐIỂM GIAO)'}
              </label>
              <div className="flex flex-col gap-2 relative mt-1">
                <AddressAutocompleteInput 
                  value={form.deliveryAddress}
                  onChangeText={txt => setForm(prev => ({...prev, deliveryAddress: txt}))}
                  onSelectCoordinates={coords => setForm(prev => ({...prev, deliveryCoordinates: coords}))}
                  placeholder="Nhập địa chỉ nhận..."
                  onClickMapIcon={(query) => openMapSelect('delivery')}
                  className="bg-white border text-sm font-semibold border-gray-100 rounded-xl focus-within:border-sky-300"
                />
                <div className="flex gap-2">
                  <input 
                    type="tel"
                    placeholder={mode === 'delivery' ? "SĐT Khách nhận" : "SĐT Cửa hàng"}
                    className="w-1/2 text-xs font-semibold text-blue-600 outline-none p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-blue-300 transition-colors"
                    value={form.receiverPhone}
                    onChange={e => setForm({...form, receiverPhone: e.target.value})}
                  />
                  <input 
                    type="text"
                    placeholder={mode === 'delivery' ? "Tên người nhận (không bắt buộc)" : "Tên người nhận tại Cửa hàng"}
                    className="w-1/2 text-xs outline-none p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-blue-300 transition-colors"
                    value={form.receiverName}
                    onChange={e => setForm({...form, receiverName: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Ghi chú */}
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

            {/* BUTTON TẠO ĐƠN */}
            <div className="mt-4">
              <button 
                onClick={handleBookingClick}
                disabled={loading}
                type="button"
                className="w-full bg-blue-600 active:bg-blue-700 text-white font-extrabold text-[15px] sm:text-base py-4 rounded-2xl shadow-[0_8px_20px_rgba(37,99,235,0.24)] active:scale-[0.98] transition-transform duration-300 ease-out disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>ĐANG TÌM TÀI XẾ...</span>
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    <span>{mode === 'delivery' ? 'TẠO ĐƠN GIAO HÀNG' : 'TẠO ĐƠN LẤY HÀNG (MANG VỀ)'}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </form>
  );
}
