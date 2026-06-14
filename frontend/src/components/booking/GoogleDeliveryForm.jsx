import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navigation, Package, DollarSign, MapPin as MapPinIcon, Check, Map as MapOutlineIcon, X, Loader2, Layers } from 'lucide-react';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF } from '@react-google-maps/api';
import CurrencyInput from '../CurrencyInput';
import AddressAutocompleteInput from '../AddressAutocompleteInput';
import { estimateFee } from '../../services/api';

const libraries = ['places'];

// Helper to convert Goong [lat, lng] to Google {lat, lng}
const toGooglePath = (routeLine) => {
  if (!routeLine) return [];
  return routeLine.map(coord => ({ lat: coord[0], lng: coord[1] }));
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

  // MAP SELECTION STATE
  const [mapSelectMode, setMapSelectMode] = useState(null); // 'pickup' | 'delivery' | null
  const [tempLocation, setTempLocation] = useState({ lat: null, lng: null, address: '' });
  const [mapType, setMapType] = useState('roadmap');
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const fetchAddressTimeout = useRef(null);
  
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
    language: 'vi',
    region: 'VN'
  });

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
        setRouteLine([]);

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

  useEffect(() => {
    if (mapRef.current && !mapSelectMode) {
      if (form.pickupCoordinates && form.deliveryCoordinates) {
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(form.pickupCoordinates);
        bounds.extend(form.deliveryCoordinates);
        mapRef.current.fitBounds(bounds, { top: 40, bottom: 120, left: 40, right: 40 });
      } else if (form.pickupCoordinates) {
        mapRef.current.panTo(form.pickupCoordinates);
        mapRef.current.setZoom(16);
      } else if (form.deliveryCoordinates) {
        mapRef.current.panTo(form.deliveryCoordinates);
        mapRef.current.setZoom(16);
      }
    }
  }, [form.pickupCoordinates, form.deliveryCoordinates, routeLine, mapSelectMode]);

  const handleBookingClick = (e) => {
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

  const fetchAddressFromCoords = async (lat, lng) => {
    if (!window.google) return;
    setIsFetchingAddress(true);
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        setTempLocation(prev => ({ ...prev, address: results[0].formatted_address }));
      } else {
        setTempLocation(prev => ({ ...prev, address: 'Vị trí không xác định' }));
      }
      setIsFetchingAddress(false);
    });
  };

  const onMapDragEnd = () => {
    if (mapSelectMode && mapRef.current) {
      const center = mapRef.current.getCenter();
      const lat = center.lat();
      const lng = center.lng();
      setTempLocation(prev => ({ ...prev, lat, lng }));
      
      if (fetchAddressTimeout.current) clearTimeout(fetchAddressTimeout.current);
      fetchAddressTimeout.current = setTimeout(() => {
        fetchAddressFromCoords(lat, lng);
      }, 500);
    }
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

  const onLoad = useCallback(function callback(map) {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(function callback() {
    mapRef.current = null;
  }, []);

  const mapCenter = mapSelectMode ? { lat: tempLocation.lat || 10.045162, lng: tempLocation.lng || 105.746854 } 
                  : (form.pickupCoordinates || { lat: 10.045162, lng: 105.746854 });

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col bg-gray-50 relative -mx-4 -mt-4 md:-mx-0 min-h-full">
      
      {/* KHU VỰC BẢN ĐỒ INLINE (CỐ ĐỊNH PHÍA TRÊN) */}
      <div className={`sticky top-0 w-full z-0 shrink-0 ${mapSelectMode ? 'h-[100dvh]' : 'h-[70vh] md:h-[75vh]'}`}>
        {!isLoaded ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={mapCenter}
            zoom={15}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onDragEnd={onMapDragEnd}
            options={{
              disableDefaultUI: true,
              mapTypeId: mapType,
              gestureHandling: 'greedy'
            }}
          >
            {/* Markers when NOT in map select mode */}
            {!mapSelectMode && form.pickupCoordinates && (
              <MarkerF 
                position={form.pickupCoordinates} 
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  fillColor: '#2563EB',
                  fillOpacity: 1,
                  strokeWeight: 3,
                  strokeColor: '#FFFFFF',
                  scale: 10
                }} 
              />
            )}
            {!mapSelectMode && form.deliveryCoordinates && (
              <MarkerF 
                position={form.deliveryCoordinates} 
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  fillColor: '#0EA5E9',
                  fillOpacity: 1,
                  strokeWeight: 3,
                  strokeColor: '#FFFFFF',
                  scale: 10
                }} 
              />
            )}
            {!mapSelectMode && routeLine.length > 0 && (
              <PolylineF 
                path={toGooglePath(routeLine)} 
                options={{ strokeColor: '#2563EB', strokeOpacity: 0.8, strokeWeight: 5 }} 
              />
            )}
          </GoogleMap>
        )}

        {/* NÚT VỀ VỊ TRÍ CỦA TÔI (Chỉ hiện khi chọn điểm trên bản đồ) */}
        {mapSelectMode && (
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                  setTempLocation(prev => ({ ...prev, lat: newPos.lat, lng: newPos.lng }));
                  mapRef.current?.panTo(newPos);
                });
              }
            }} 
            className="absolute bottom-16 right-4 z-[2000] bg-white p-3 rounded-full shadow-lg border border-gray-100 text-blue-600 active:scale-90 transition-transform"
          >
            <Target size={24} />
          </button>
        )}

        {/* NÚT CHUYỂN ĐỔI BẢN ĐỒ VỆ TINH */}
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setMapType(prev => prev === 'roadmap' ? 'satellite' : 'roadmap');
          }} 
          className="absolute top-4 right-4 z-[2000] bg-white/90 backdrop-blur-sm p-2.5 rounded-xl shadow-lg border border-gray-100 text-slate-700 active:scale-90 transition-transform"
        >
          <Layers size={22} className={mapType === 'satellite' ? 'text-blue-600' : ''} />
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
      )}
    </form>
  );
}
