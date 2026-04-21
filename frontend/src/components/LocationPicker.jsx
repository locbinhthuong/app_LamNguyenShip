import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, X, Target, Loader2, Search } from 'lucide-react';

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
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(initialSearchQuery)}&limit=1&countrycodes=vn&accept-language=vi`);
          const data = await res.json();
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            setMapCenter([lat, lon]);
            setFlyPos([lat, lon]);
          } else {
            // FALLBACK TO GPS IF TEXT SEARCH YIELDS NOTHING
            if ('geolocation' in navigator) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const lat = pos.coords.latitude;
                  const lng = pos.coords.longitude;
                  setMapCenter([lat, lng]);
                  setFlyPos([lat, lng]);
                },
                (err) => console.log('Không thể lấy GPS fallback:', err),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
              );
            }
          }
        } catch (err) {
          console.error(err);
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
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setMapCenter([lat, lng]);
            setFlyPos([lat, lng]);
          },
          (err) => {
            console.log('Không thể lấy GPS tự động:', err);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
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
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=vn&accept-language=vi`);
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        console.error('Lỗi tìm kiếm:', err);
      } finally {
        setIsSearching(false);
      }
    }, 600);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSelectSuggestion = (place) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
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
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${mapCenter[0]}&lon=${mapCenter[1]}&accept-language=vi`
        );
        const data = await res.json();
        if (data && data.display_name) {
          setAddress(data.display_name);
        } else {
          setAddress('Vị trí không xác định');
        }
      } catch (error) {
        setAddress('Lỗi mạng khi lấy địa chỉ');
      } finally {
        setIsLoadingAddress(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchAddress();
    }, 500); // Đợi 0.5s sau khi thả tay mới gọi API tránh spam

    return () => clearTimeout(delayDebounce);
  }, [mapCenter, isDragging]);

  // Về vị trí GPS hiện tại
  const locateMe = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFlyPos([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => alert('Vui lòng cấp quyền định vị GPS.')
      );
    }
  };

  const handleConfirm = () => {
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
      <div className="h-14 bg-white shadow-sm flex items-center px-4 relative z-[1000] border-b border-gray-100">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-600 active:scale-90 transition-transform">
          <X size={24} />
        </button>
        <span className="font-bold text-gray-800 flex-1 text-center pr-6">Chọn Vị Trí Bản Đồ</span>
      </div>

      {/* THANH TÌM KIẾM TỰ ĐỘNG BỒI ĐẮP (AUTOCOMPETE) MẶT TIỀN */}
      <div className="bg-white px-4 pb-3 shadow-sm relative z-[1001]">
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
            url="https://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}"
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
              className={`w-10 h-10 ${isDragging ? 'text-orange-400 -translate-y-2' : 'text-orange-600'} transition-all duration-200 drop-shadow-xl`} 
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
          onClick={locateMe}
          className="absolute bottom-16 right-4 z-[2000] bg-white p-3 rounded-full shadow-lg border border-gray-100 text-blue-600 active:scale-90 transition-transform"
        >
          <Target size={24} />
        </button>
      </div>

      {/* FOOTER: XÁC NHẬN VỊ TRÍ */}
      <div className="bg-white p-5 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-[1000] sticky bottom-0 border-t border-gray-100">
        <div className="flex items-start gap-3 mb-5">
          <MapPin size={24} className="text-orange-600 mt-1 flex-shrink-0" />
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
          onClick={handleConfirm}
          disabled={isLoadingAddress}
          className={`w-full py-4 text-center rounded-2xl font-bold text-white shadow-xl transition-all ${
            isLoadingAddress ? 'bg-orange-300' : 'bg-orange-600 active:bg-orange-700 active:scale-[0.98]'
          }`}
        >
          XÁC NHẬN ĐIỂM NÀY
        </button>
      </div>
    </div>
  );
};

export default LocationPicker;
