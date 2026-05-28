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

const MapController = ({ setMapCenter, onMapMoveEnd }) => {
  const map = useMap();
  useEffect(() => {
    const handleMoveEnd = () => {
      const center = map.getCenter();
      setMapCenter([center.lat, center.lng]);
      if (onMapMoveEnd) onMapMoveEnd(center.lat, center.lng);
    };
    map.on('moveend', handleMoveEnd);
    return () => map.off('moveend', handleMoveEnd);
  }, [map, setMapCenter, onMapMoveEnd]);
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
  const isSelecting = useRef(false);

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
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=vn&accept-language=vi`);
        const data = await res.json();
        setSuggestions(data);
        
        // Auto-fly map to the first result but DO NOT auto-capture coordinates yet
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          setMapCenter([lat, lon]);
        }
      } catch (err) {
        console.error('Lỗi tìm kiếm gợi ý:', err);
      } finally {
        setIsSearching(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleSelect = (item) => {
    isSelecting.current = true;
    const selectedText = item.display_name;
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    
    setQuery(selectedText);
    setMapCenter([lat, lon]);
    setSuggestions([]);
    
    if (onChangeText) onChangeText(selectedText);
    if (onSelectCoordinates) onSelectCoordinates({ lat, lng: lon });
    
    setTimeout(() => { isSelecting.current = false; }, 200);
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

      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-[9999] flex flex-col animate-[slideDown_0.2s_ease-out]">
          
          {/* MAP TRƯỢT TỪ DƯỚI RA */}
          <div className="w-full h-48 bg-gray-100 relative">
            <MapContainer center={mapCenter} zoom={15} zoomControl={false} className="w-full h-full z-10">
              <TileLayer url="https://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}" />
              <FlyToLocation targetPos={mapCenter} />
              <MapController setMapCenter={setMapCenter} />
            </MapContainer>
            
            {/* PIN GIỮA BẢN ĐỒ */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full z-[400] pointer-events-none drop-shadow-xl">
              <MapPin size={32} className="text-blue-600" fill="white" />
              <div className="w-2 h-1 bg-black/30 rounded-full mx-auto mt-0.5"></div>
            </div>

            {isSearching && (
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-2 z-[500] shadow-md flex items-center justify-center">
                <Loader2 size={16} className="animate-spin text-blue-600" />
              </div>
            )}
          </div>

          {/* DANH SÁCH GỢI Ý */}
          {suggestions.length > 0 && (
            <div className="max-h-40 overflow-y-auto border-t border-slate-100 bg-white">
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

          {/* NÚT XÁC NHẬN */}
          <div className="p-3 bg-gray-50 border-t border-gray-200">
             <button 
                type="button"
                onClick={() => {
                  setIsFocused(false);
                  if (onSelectCoordinates) {
                    onSelectCoordinates({ lat: mapCenter[0], lng: mapCenter[1] });
                  }
                }}
                className="w-full py-3 bg-blue-600 active:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
             >
                XÁC NHẬN ĐỊA CHỈ NÀY
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
