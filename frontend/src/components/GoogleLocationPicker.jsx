import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { MapPin, X, Target, Loader2, Search, Layers, Clock } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';

const libraries = ['places'];

const LocationPicker = ({ isOpen, onClose, onSelect, initialPosition, initialSearchQuery }) => {
  const [mapCenter, setMapCenter] = useState(initialPosition ? { lat: initialPosition[0], lng: initialPosition[1] } : { lat: 10.045162, lng: 105.746854 });
  const [address, setAddress] = useState('Đang lấy vị trí...');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [mapType, setMapType] = useState('roadmap'); // roadmap or satellite
  const [recentSearches, setRecentSearches] = useState([]);
  
  const mapRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
    language: 'vi',
    region: 'VN'
  });

  const {
    ready,
    value: searchQuery,
    suggestions: { status, data },
    setValue: setSearchQuery,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      location: { lat: () => mapCenter.lat, lng: () => mapCenter.lng },
      radius: 50 * 1000,
    },
    debounce: 300,
    defaultValue: initialSearchQuery || '',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('aloshipp_recent_addresses');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (isOpen && !initialPosition && !initialSearchQuery) {
      locateMe();
    }
  }, [isOpen, initialPosition, initialSearchQuery]);

  const locateMe = async (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    try {
      let permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        permission = await Geolocation.requestPermissions();
      }
      if (permission.location === 'granted') {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 });
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMapCenter(newPos);
        mapRef.current?.panTo(newPos);
      }
    } catch (err) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setMapCenter(newPos);
            mapRef.current?.panTo(newPos);
          },
          (e) => console.log('HTML5 GPS fallback failed:', e)
        );
      }
    }
  };

  const handleSelectSuggestion = async (place) => {
    setSearchQuery(place.description, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address: place.description });
      const { lat, lng } = await getLatLng(results[0]);
      
      const newPos = { lat, lng };
      setMapCenter(newPos);
      mapRef.current?.panTo(newPos);
      
      try {
        const saved = JSON.parse(localStorage.getItem('aloshipp_recent_addresses') || '[]');
        const newHistory = saved.filter(h => h.description !== place.description);
        newHistory.unshift({ description: place.description, lat, lng });
        const limitedHistory = newHistory.slice(0, 5);
        localStorage.setItem('aloshipp_recent_addresses', JSON.stringify(limitedHistory));
        setRecentSearches(limitedHistory);
      } catch (e) {}
    } catch (error) {
      console.log('Error: ', error);
    }
  };

  const removeRecentSearch = (e, index) => {
    e.stopPropagation();
    const updated = [...recentSearches];
    updated.splice(index, 1);
    setRecentSearches(updated);
    localStorage.setItem('aloshipp_recent_addresses', JSON.stringify(updated));
  };

  const fetchAddressFromCoords = async (lat, lng) => {
    if (!window.google) return;
    setIsLoadingAddress(true);
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        setAddress(results[0].formatted_address);
      } else {
        setAddress('Vị trí không xác định');
      }
      setIsLoadingAddress(false);
    });
  };

  const onMapDragStart = () => {
    setIsDragging(true);
  };

  const onMapDragEnd = () => {
    setIsDragging(false);
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      const lat = center.lat();
      const lng = center.lng();
      setMapCenter({ lat, lng });
      fetchAddressFromCoords(lat, lng);
    }
  };

  const onLoad = useCallback(function callback(map) {
    mapRef.current = map;
    if (initialPosition) {
      fetchAddressFromCoords(initialPosition[0], initialPosition[1]);
    }
  }, [initialPosition]);

  const onUnmount = useCallback(function callback(map) {
    mapRef.current = null;
  }, []);

  const handleConfirm = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    onSelect({
      lat: mapCenter.lat,
      lng: mapCenter.lng,
      address: address
    });
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] bg-white flex flex-col font-sans">
      {/* MAP HEADER */}
      <div className="bg-white py-3 px-4 safe-pt relative z-[1000] border-b border-gray-100 flex items-center justify-between">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-600 active:scale-90 transition-transform">
          <X size={24} />
        </button>
        <span className="font-bold text-gray-800 flex-1 text-center pr-6">Chọn Vị Trí Bản Đồ</span>
      </div>

      {/* THANH TÌM KIẾM TỰ ĐỘNG BỒI ĐẮP (AUTOCOMPETE) MẶT TIỀN */}
      <div className="bg-white px-4 pb-3 relative z-[1001]">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={18} />
          </div>
          <input 
            type="text"
            placeholder="Tìm kiếm địa chỉ/đường/tòa nhà..."
            className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!ready}
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); clearSuggestions(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1 bg-gray-200 rounded-full"
            >
              <X size={12} />
            </button>
          )}
        </div>
        
        {/* DROPDOWN DANH SÁCH GỢI Ý ĐỊA CHỈ */}
        {status === 'OK' && (
          <div className="absolute left-4 right-4 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto z-[2000] divide-y divide-gray-50">
            {data.map((p, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 active:bg-blue-50 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleSelectSuggestion(p)}
              >
                <MapPin size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700 font-medium line-clamp-2 leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* LỊCH SỬ TÌM KIẾM */}
        {status !== 'OK' && searchQuery.trim().length < 2 && recentSearches.length > 0 && (
          <div className="absolute left-4 right-4 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto z-[2000] divide-y divide-gray-50">
            <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50">
              Tìm kiếm gần đây
            </div>
            {recentSearches.map((p, index) => (
              <div 
                key={`recent-${index}`} 
                className="flex items-center gap-3 p-3 active:bg-blue-50 hover:bg-gray-50 cursor-pointer group"
                onClick={() => handleSelectSuggestion(p)}
              >
                <Clock size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700 font-medium line-clamp-2 flex-1 leading-relaxed">{p.description}</p>
                <button 
                  onClick={(e) => removeRecentSearch(e, index)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BẢN ĐỒ CHIẾM HẾT MÀN HÌNH CÒN LẠI */}
      <div className="flex-1 relative">
        {loadError && <div>Không thể tải Google Maps</div>}
        {!isLoaded && <div className="w-full h-full flex justify-center items-center"><Loader2 className="animate-spin text-blue-500" /></div>}
        {isLoaded && (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={mapCenter}
            zoom={16}
            mapTypeId={mapType}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onDragStart={onMapDragStart}
            onDragEnd={onMapDragEnd}
            options={{
              disableDefaultUI: true,
              gestureHandling: 'greedy',
              maxZoom: 22
            }}
          >
            {/* NO MARKER RENDERED HERE CAUSE WE USE THE CENTER FIX PIN BELOW */}
          </GoogleMap>
        )}

        {/* GHIM CỐ ĐỊNH Ở GIỮA BẢN ĐỒ */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full z-[400] pointer-events-none flex flex-col items-center">
          <div className="bg-gray-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg mb-1 shadow-md whitespace-nowrap animate-bounce">
            Lấy hàng tại đây
          </div>
          <div className="relative">
            <svg 
              className={`w-10 h-10 ${isDragging ? 'text-blue-400 -translate-y-2' : 'text-blue-600'} transition-all duration-200 drop-shadow-xl`} 
              viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" />
            </svg>
            <div className="w-3 h-1 bg-black/30 rounded-full mx-auto mt-0.5"></div>
          </div>
        </div>

        {/* NÚT VỀ VỊ TRÍ CỦA TÔI */}
        <button 
          type="button"
          onClick={locateMe} 
          className="absolute bottom-16 right-4 z-[2000] bg-white p-3 rounded-full shadow-lg border border-gray-100 text-blue-600 active:scale-90 transition-transform"
        >
          <Target size={24} />
        </button>

        {/* NÚT CHUYỂN ĐỔI BẢN ĐỒ VỆ TINH */}
        <button 
          type="button"
          onClick={() => setMapType(prev => prev === 'roadmap' ? 'satellite' : 'roadmap')} 
          className="absolute top-1/2 right-4 -translate-y-1/2 z-[2000] bg-white px-3 py-2 rounded-xl shadow-lg border border-gray-100 flex items-center gap-2 hover:bg-blue-50 transition-colors"
        >
          <Layers size={18} className={mapType === 'satellite' ? 'text-blue-600' : ''} />
          <span className="text-xs font-bold">{mapType === 'roadmap' ? 'Vệ tinh' : 'Bản đồ'}</span>
        </button>
      </div>

      {/* FOOTER: XÁC NHẬN VỊ TRÍ */}
      <div className="bg-white p-5 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-[1000] sticky bottom-0 border-t border-gray-100">
        <div className="flex items-start gap-3 mb-5">
          <MapPin size={24} className="text-blue-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-gray-800 mb-1">Chi tiết địa chỉ</h4>
            {isLoadingAddress ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 size={12} className="animate-spin" /> Đang dịch tiếng đường...
              </div>
            ) : (
              <p className="text-sm text-gray-600 line-clamp-2 leading-snug">{address}</p>
            )}
          </div>
        </div>
        
        <button 
          type="button"
          onClick={handleConfirm}
          disabled={isLoadingAddress || !isLoaded}
          className={`w-full py-4 text-center rounded-2xl font-bold text-white shadow-xl transition-all ${
            isLoadingAddress || !isLoaded ? 'bg-blue-300' : 'bg-blue-600 active:bg-blue-700 active:scale-[0.98]'
          }`}
        >
          XÁC NHẬN ĐIỂM NÀY
        </button>
      </div>
    </div>,
    document.body
  );
};

export default LocationPicker;
