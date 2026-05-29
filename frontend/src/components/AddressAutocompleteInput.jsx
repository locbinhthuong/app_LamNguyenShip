import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';

const formatPhotonAddress = (properties) => {
  if (!properties) return 'Vị trí không xác định';
  const parts = [];
  if (properties.name) parts.push(properties.name);
  if (properties.housenumber && properties.street) {
    parts.push(`${properties.housenumber} ${properties.street}`);
  } else if (properties.street) {
    parts.push(properties.street);
  }
  // Phường/Xã
  if (properties.suburb) parts.push(properties.suburb);
  else if (properties.locality) parts.push(properties.locality);
  // Quận/Huyện
  if (properties.district) parts.push(properties.district);
  else if (properties.county) parts.push(properties.county);
  // Thành phố
  if (properties.city) parts.push(properties.city);
  else if (properties.state) parts.push(properties.state);
  // Loại bỏ phần trùng (VD: "Cần Thơ, Cần Thơ")
  const unique = [];
  parts.forEach(p => { if (!unique.includes(p)) unique.push(p); });
  return unique.join(', ') || 'Vị trí không xác định';
};

// Tính khoảng cách (km) giữa 2 tọa độ (Haversine)
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export default function AddressAutocompleteInput({ 
  value, 
  onChangeText, 
  onSelectCoordinates, 
  placeholder = "Nhập điểm đón...",
  onClickMapIcon,
  className = "" 
}) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  // Default mapCenter (Cần Thơ). Will be updated by GPS shortly after mount.
  const [mapCenter, setMapCenter] = useState([10.045162, 105.746854]);
  const wrapperRef = useRef(null);
  const isSelecting = useRef(false);

  // Lấy toạ độ GPS thực tế của thiết bị ngay khi Component được tải
  useEffect(() => {
    import('@capacitor/geolocation').then(({ Geolocation }) => {
      Geolocation.getCurrentPosition({ enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 })
        .then(pos => {
          setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        })
        .catch(err => console.log('Không lấy được GPS tự động', err));
    });
  }, []);

  useEffect(() => {
    if (!isSelecting.current && value !== query) {
      setQuery(value || '');
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSelecting.current) return;
    
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      
      // Gộp kết quả từ cả Photon + Nominatim rồi sắp xếp theo khoảng cách GPS
      let allResults = [];

      // 1. Photon (tiếng Việt + GPS bias)
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=7&lat=${mapCenter[0]}&lon=${mapCenter[1]}&lang=vi`);
        if (res.ok) {
          const photonData = await res.json();
          (photonData.features || []).forEach(item => {
            allResults.push({
              display_name: formatPhotonAddress(item.properties),
              lat: parseFloat(item.geometry.coordinates[1]),
              lon: parseFloat(item.geometry.coordinates[0]),
              source: 'photon'
            });
          });
        }
      } catch (err) {}

      // 2. Nominatim fallback/bổ sung (viewbox GPS bias + tiếng Việt)
      if (allResults.length < 3) {
        try {
          // Tạo viewbox ~30km xung quanh GPS hiện tại
          const delta = 0.3; // ~30km
          const viewbox = `${mapCenter[1]-delta},${mapCenter[0]+delta},${mapCenter[1]+delta},${mapCenter[0]-delta}`;
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=vn&accept-language=vi&viewbox=${viewbox}&bounded=0`);
          const nomData = await res.json() || [];
          nomData.forEach(item => {
            allResults.push({
              display_name: item.display_name,
              lat: parseFloat(item.lat),
              lon: parseFloat(item.lon),
              source: 'nominatim'
            });
          });
        } catch (e) {}
      }

      // 3. Loại bỏ trùng lặp (cùng tên hoặc cùng tọa độ gần nhau)
      const seen = new Set();
      const unique = allResults.filter(item => {
        const key = item.display_name.toLowerCase().replace(/\s+/g, ' ').trim();
        const coordKey = `${item.lat.toFixed(4)},${item.lon.toFixed(4)}`;
        if (seen.has(key) || seen.has(coordKey)) return false;
        seen.add(key);
        seen.add(coordKey);
        return true;
      });

      // 4. Sắp xếp theo khoảng cách từ GPS (gần nhất lên trước)
      unique.sort((a, b) => {
        const distA = haversineKm(mapCenter[0], mapCenter[1], a.lat, a.lon);
        const distB = haversineKm(mapCenter[0], mapCenter[1], b.lat, b.lon);
        return distA - distB;
      });
      
      setSuggestions(unique.slice(0, 7));
      setIsSearching(false);
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleSelect = (item) => {
    isSelecting.current = true;
    const selectedText = item.display_name;
    const lon = item.lon;
    const lat = item.lat;
    
    setQuery(selectedText);
    setSuggestions([]);
    
    if (onChangeText) onChangeText(selectedText);
    if (onSelectCoordinates) onSelectCoordinates({ lat, lng: lon });
    
    setTimeout(() => { isSelecting.current = false; setIsFocused(false); }, 200);
  };

  const handleInputChange = (e) => {
    isSelecting.current = false;
    setQuery(e.target.value);
    if (onChangeText) onChangeText(e.target.value);
    // Clear parent coordinates when user modifies text (fee will hide until confirmed)
    if (onSelectCoordinates) onSelectCoordinates(null);
  };

  // Remove handleMapMoveEnd since we don't want to auto-capture on map drag either

  return (
    <div className={`relative w-full ${className || ''}`} ref={wrapperRef}>
      <div className="flex w-full overflow-hidden items-center">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder || "Nhập địa chỉ..."}
          className="w-full text-sm font-medium outline-none px-2 py-1 text-slate-800 bg-transparent flex-1"
        />
        
        {onClickMapIcon && (
          <button 
            type="button" 
            onClick={(e) => {
              e.preventDefault();
              onClickMapIcon(query);
            }}
            className="flex shrink-0 items-center justify-center bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors hover:bg-blue-200 ml-2"
          >
            🗺️ MỞ TO
          </button>
        )}
      </div>

      {isFocused && (suggestions.length > 0 || isSearching) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-[9999] flex flex-col animate-[slideDown_0.2s_ease-out]">
          
          {isSearching && (
            <div className="flex items-center justify-center p-4">
              <Loader2 size={20} className="animate-spin text-blue-600" />
            </div>
          )}

          {/* DANH SÁCH GỢI Ý */}
          {!isSearching && suggestions.length > 0 && (
            <div className="max-h-60 overflow-y-auto bg-white">
              {suggestions.map((item, idx) => (
                <div 
                  key={idx} 
                  className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-b-0 flex gap-3 items-start transition-colors"
                  onClick={() => handleSelect(item)}
                >
                  <div className="mt-0.5 text-blue-400 shrink-0"><Search size={16} /></div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{item.display_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
