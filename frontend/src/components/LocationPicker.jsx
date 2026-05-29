import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, X, Target, Loader2, Search, Layers } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';

const formatPhotonAddress = (properties) => {
  if (!properties) return 'Vị trí không xác định';
  const parts = [];
  if (properties.name) parts.push(properties.name);
  if (properties.housenumber && properties.street) {
    parts.push(`${properties.housenumber} ${properties.street}`);
  } else if (properties.street) {
    parts.push(properties.street);
  }
  if (properties.suburb) parts.push(properties.suburb);
  else if (properties.locality) parts.push(properties.locality);
  if (properties.district) parts.push(properties.district);
  else if (properties.county) parts.push(properties.county);
  if (properties.city) parts.push(properties.city);
  else if (properties.state) parts.push(properties.state);
  const unique = [];
  parts.forEach(p => { if (!unique.includes(p)) unique.push(p); });
  return unique.join(', ') || 'Vị trí không xác định';
};

const MapController = ({ setMapCenter, setIsDragging }) => {
  const map = useMap();

  useEffect(() => {
    map.on('movestart', () => setIsDragging(true));
    map.on('moveend', () => {
      setIsDragging(false);
      const center = map.getCenter();
      setMapCenter([center.lat, center.lng]);
    });
    return () => {
      map.off('movestart');
      map.off('moveend');
    };
  }, [map, setMapCenter, setIsDragging]);

  return null;
};

const FlyToLocation = ({ targetPos }) => {
  const map = useMap();
  useEffect(() => {
    if (targetPos) {
      map.flyTo(targetPos, 16, { animate: true });
    }
  }, [targetPos, map]);
  return null;
};

const LocationPicker = ({ isOpen, onClose, onSelect, initialPosition, initialSearchQuery }) => {
  const [mapCenter, setMapCenter] = useState(initialPosition || [10.045162, 105.746854]);
  const [address, setAddress] = useState('Đang lấy vị trí...');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [flyPos, setFlyPos] = useState(initialPosition);
  const [mapType, setMapType] = useState('m'); // 'm' for standard, 'y' for hybrid/satellite

  // Search State
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Khởi chạy tìm kiếm 1 lần duy nhất khi vừa mở LocationPicker nếu KHÔNG có initialPosition nhưng CÓ initialSearchQuery
  useEffect(() => {
    if (isOpen && !initialPosition && initialSearchQuery && initialSearchQuery.trim().length > 2) {
      const fetchInitialCoord = async () => {
        setIsSearching(true);
        try {
          const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(initialSearchQuery)}&limit=1`);
          if (!res.ok) throw new Error('Photon error');
          const data = await res.json();
          if (data && data.features && data.features.length > 0) {
            const lon = parseFloat(data.features[0].geometry.coordinates[0]);
            const lat = parseFloat(data.features[0].geometry.coordinates[1]);
            setMapCenter([lat, lon]);
            setFlyPos([lat, lon]);
          } else {
            throw new Error('No results');
          }
        } catch (err) {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(initialSearchQuery)}&limit=1&countrycodes=vn`);
            const data = await res.json();
            if (data && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lon = parseFloat(data[0].lon);
              setMapCenter([lat, lon]);
              setFlyPos([lat, lon]);
            } else {
              throw new Error('No results');
            }
          } catch (e) {
            // FALLBACK TO GPS IF TEXT SEARCH YIELDS NOTHING
            try {
              const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 });
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              setMapCenter([lat, lng]);
              setFlyPos([lat, lng]);
            } catch (err) {
              console.log('Không thể lấy GPS fallback:', err);
              // Fallback to HTML5 if Capacitor fails (e.g. on web)
              if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setMapCenter([pos.coords.latitude, pos.coords.longitude]);
                    setFlyPos([pos.coords.latitude, pos.coords.longitude]);
                  },
                  (e) => console.log('HTML5 GPS fallback failed:', e),
                  { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
              }
            }
          }
        } finally {
          setIsSearching(false);
        }
      };
      fetchInitialCoord();
    }
  }, [isOpen, initialPosition, initialSearchQuery]);

  // Cập nhật lại toạ độ đích mỗi khi mở lên nếu CÓ truyền initialPosition từ bên ngoài
  useEffect(() => {
    if (isOpen && initialPosition) {
      setMapCenter(initialPosition);
      setFlyPos(initialPosition);
    }
  }, [isOpen, initialPosition]);

  // Luôn luôn lấy lại vị trí GPS thực tế khi bản đồ vừa được mở (NẾU KHÔNG CÓ POS VÀ CŨNG KHÔNG CÓ QUERY TỪ FORM TRUYỀN VÀO)
  useEffect(() => {
    if (isOpen && !initialPosition && !initialSearchQuery) {
      const getInitialLocation = async () => {
        try {
          let permission = await Geolocation.checkPermissions();
          if (permission.location !== 'granted') {
            permission = await Geolocation.requestPermissions();
          }
          if (permission.location === 'granted') {
            const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 });
            setMapCenter([pos.coords.latitude, pos.coords.longitude]);
            setFlyPos([pos.coords.latitude, pos.coords.longitude]);
          } else {
            console.log('User denied GPS permission');
          }
        } catch (err) {
          console.log('Không thể lấy GPS tự động:', err);
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                setMapCenter([pos.coords.latitude, pos.coords.longitude]);
                setFlyPos([pos.coords.latitude, pos.coords.longitude]);
              },
              (e) => console.log('HTML5 GPS auto failed:', e),
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
          }
        }
      };
      getInitialLocation();
    }
  }, [isOpen, initialPosition, initialSearchQuery]);

  // Xử lý Gợi ý Địa chỉ (Autocomplete)
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      
      let data = [];
      let isPhoton = true;
      try {
        // Áp dụng Location Biasing: Quét ưu tiên quanh toạ độ mapCenter hiện tại
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=7&lat=${mapCenter[0]}&lon=${mapCenter[1]}&lang=vi`);
        if (!res.ok) throw new Error('Photon error');
        const photonData = await res.json();
        data = photonData.features || [];
      } catch (err) {
        isPhoton = false;
        try {
          const delta = 0.3;
          const viewbox = `${mapCenter[1]-delta},${mapCenter[0]+delta},${mapCenter[1]+delta},${mapCenter[0]-delta}`;
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=vn&accept-language=vi&viewbox=${viewbox}&bounded=0`);
          data = await res.json() || [];
        } catch (fallbackErr) {
          console.error('Cả hai hệ thống tìm kiếm đều lỗi:', fallbackErr);
        }
      }
      
      const normalizedSuggestions = data.map(item => {
        if (isPhoton) {
          return {
            display_name: formatPhotonAddress(item.properties),
            lat: parseFloat(item.geometry.coordinates[1]),
            lon: parseFloat(item.geometry.coordinates[0])
          };
        } else {
          return {
            display_name: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon)
          };
        }
      });
      
      setSuggestions(normalizedSuggestions);
      setIsSearching(false);
    }, 600);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSelectSuggestion = (place) => {
    const lon = place.lon;
    const lat = place.lat;
    setFlyPos([lat, lon]);
    setMapCenter([lat, lon]);
    setSearchQuery(''); // Ẩn suggestions menu đi
    setSuggestions([]);
  };

  // Xử lý Reverse Geocoding khi map dừng di chuyển
  useEffect(() => {
    if (isDragging) return;
    
    const fetchAddress = async () => {
      setIsLoadingAddress(true);
      let addr = 'Vị trí không xác định';
      try {
        const res = await fetch(
          `https://photon.komoot.io/reverse?lat=${mapCenter[0]}&lon=${mapCenter[1]}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data && data.features && data.features.length > 0) {
          addr = formatPhotonAddress(data.features[0].properties);
        } else {
          throw new Error();
        }
      } catch (error) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${mapCenter[0]}&lon=${mapCenter[1]}&accept-language=vi`
          );
          const data = await res.json();
          if (data && data.display_name) {
            addr = data.display_name;
          }
        } catch (e) {}
      }
      setAddress(addr);
      setIsLoadingAddress(false);
    };

    const delayDebounce = setTimeout(() => {
      fetchAddress();
    }, 500); // Đợi 0.5s sau khi thả tay mới gọi API tránh spam

    return () => clearTimeout(delayDebounce);
  }, [mapCenter, isDragging]);

  // Về vị trí GPS hiện tại
  const locateMe = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        const request = await Geolocation.requestPermissions();
        if (request.location !== 'granted') {
          alert('Vui lòng cấp quyền định vị GPS trong cài đặt để sử dụng tính năng này.');
          return;
        }
      }
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, maximumAge: 10000, timeout: 5000 });
      setFlyPos([pos.coords.latitude, pos.coords.longitude]);
    } catch (err) {
      console.log('Lỗi định vị:', err);
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setFlyPos([pos.coords.latitude, pos.coords.longitude]),
          (err) => alert('Không thể lấy vị trí GPS hiện tại.')
        );
      }
    }
  };

  const handleConfirm = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Trả về toạ độ và tên đường cho App
    onSelect({
      lat: mapCenter[0],
      lng: mapCenter[1],
      address: address
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
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
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); setSuggestions([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1 bg-gray-200 rounded-full"
            >
              <X size={12} />
            </button>
          )}
        </div>
        
        {/* DROPDOWN DANH SÁCH GỢI Ý ĐỊA CHỈ */}
        {suggestions.length > 0 && (
          <div className="absolute left-4 right-4 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto z-[2000] divide-y divide-gray-50">
            {suggestions.map((p, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 active:bg-blue-50 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleSelectSuggestion(p)}
              >
                <MapPin size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700 font-medium line-clamp-2 leading-relaxed">{p.display_name}</p>
              </div>
            ))}
          </div>
        )}
        
        {isSearching && suggestions.length === 0 && searchQuery.trim().length >= 2 && (
          <div className="absolute left-4 right-4 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 p-4 text-center z-[2000]">
            <Loader2 size={24} className="animate-spin text-blue-500 mx-auto mb-2" />
            <span className="text-xs text-gray-500">Đang tìm địa điểm qua hệ thống Vệ tinh...</span>
          </div>
        )}
      </div>

      {/* BẢN ĐỒ CHIẾM HẾT MÀN HÌNH CÒN LẠI */}
      <div className="flex-1 relative">
        <MapContainer 
          center={mapCenter} 
          zoom={16} 
          zoomControl={false} 
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; Google Maps'
            url={`https://mt0.google.com/vt/lyrs=${mapType}&hl=en&x={x}&y={y}&z={z}`}
          />
          <MapController setMapCenter={setMapCenter} setIsDragging={setIsDragging} />
          {flyPos && <FlyToLocation targetPos={flyPos} />}
        </MapContainer>

        {/* GHIM CỐ ĐỊNH Ở GIỮA BẢN ĐỒ (Như Grab/Gojek) */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full z-[400] pointer-events-none flex flex-col items-center">
          {/* Hộp thoại nổi (Tooltip) */}
          <div className="bg-gray-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg mb-1 shadow-md whitespace-nowrap animate-bounce">
            Lấy hàng tại đây
          </div>
          {/* Biểu tượng Pin (Dùng ảnh SVG hoặc biểu tượng từ Lucide) */}
          <div className="relative">
            <svg 
              className={`w-10 h-10 ${isDragging ? 'text-blue-400 -translate-y-2' : 'text-blue-600'} transition-all duration-200 drop-shadow-xl`} 
              viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" />
            </svg>
            {/* Chấm tròn dưới chân ghim */}
            <div className="w-3 h-1 bg-black/30 rounded-full mx-auto mt-0.5"></div>
          </div>
        </div>

        {/* NÚT VỀ VỊ TRÍ CỦA TÔI */}
          <button 
            type="button"
            onClick={(e) => {
              if (e) { e.preventDefault(); e.stopPropagation(); }
              locateMe(e);
            }} 
            className="absolute bottom-16 right-4 z-[2000] bg-white p-3 rounded-full shadow-lg border border-gray-100 text-blue-600 active:scale-90 transition-transform"
          >
          <Target size={24} />
        </button>

        {/* NÚT CHUYỂN ĐỔI BẢN ĐỒ VỆ TINH */}
        <button 
          type="button"
          onClick={(e) => {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            setMapType(prev => prev === 'm' ? 'y' : 'm');
          }} 
          className="absolute top-4 right-4 z-[2000] bg-white p-2.5 rounded-xl shadow-lg border border-gray-100 text-slate-700 active:scale-90 transition-transform"
        >
          <Layers size={22} className={mapType === 'y' ? 'text-blue-600' : ''} />
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
          disabled={isLoadingAddress}
          className={`w-full py-4 text-center rounded-2xl font-bold text-white shadow-xl transition-all ${
            isLoadingAddress ? 'bg-blue-300' : 'bg-blue-600 active:bg-blue-700 active:scale-[0.98]'
          }`}
        >
          XÁC NHẬN ĐIỂM NÀY
        </button>
      </div>
    </div>
  );
};

export default LocationPicker;
