import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const FlyToLocation = ({ targetPos }) => {
  const map = useMap();
  useEffect(() => {
    if (targetPos) {
      map.flyTo(targetPos, 16, { animate: true });
    }
  }, [targetPos, map]);
  return null;
};

export default function AddressAutocompleteInput({ 
  value, 
  onChangeText, 
  onSelectCoordinates, 
  placeholder, 
  onClickMapIcon,
  className 
}) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [mapCenter, setMapCenter] = useState([10.045162, 105.746854]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
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
    if (query === value || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=vn&accept-language=vi`);
        const data = await res.json();
        setSuggestions(data);
        
        // Auto-fly map to the first result and AUTO-CAPTURE coordinates
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          setMapCenter([lat, lon]);
          if (onSelectCoordinates) {
            onSelectCoordinates({ lat, lng: lon });
          }
        }
      } catch (err) {
        console.error('Lỗi tìm kiếm gợi ý:', err);
      } finally {
        setIsSearching(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [query, value]);

  const handleSelect = (item) => {
    const selectedText = item.display_name;
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    
    setQuery(selectedText);
    setIsFocused(false);
    setMapCenter([lat, lon]);
    
    if (onChangeText) onChangeText(selectedText);
    if (onSelectCoordinates) onSelectCoordinates({ lat, lng: lon });
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (onChangeText) onChangeText(e.target.value);
  };

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
            🗺️ BẢN ĐỒ
          </button>
        )}
      </div>

      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col animate-[slideDown_0.2s_ease-out]">
          
          {/* MAP TRƯỢT TỪ DƯỚI RA */}
          <div className="w-full h-40 bg-gray-100 relative">
            <MapContainer center={mapCenter} zoom={15} zoomControl={false} className="w-full h-full">
              <TileLayer url="https://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}" />
              <FlyToLocation targetPos={mapCenter} />
            </MapContainer>
            
            {/* PIN GIỮA BẢN ĐỒ */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full z-[400] pointer-events-none">
              <MapPin size={32} className="text-blue-600 drop-shadow-md" fill="white" />
            </div>

            {isSearching && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-[500] flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-blue-600" />
              </div>
            )}
          </div>

          {/* DANH SÁCH GỢI Ý NGAY BÊN DƯỚI BẢN ĐỒ */}
          {suggestions.length > 0 && (
            <div className="max-h-48 overflow-y-auto border-t border-slate-100 bg-white">
              {suggestions.map((item, idx) => (
                <div 
                  key={idx} 
                  className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0 flex gap-3 items-start transition-colors"
                  onClick={() => handleSelect(item)}
                >
                  <div className="mt-0.5 text-blue-400 shrink-0"><Search size={16} /></div>
                  <p className="text-xs text-slate-700 font-medium leading-snug">{item.display_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
