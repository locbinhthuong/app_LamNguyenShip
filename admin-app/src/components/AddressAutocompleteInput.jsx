import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Clock, X } from 'lucide-react';

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

export default function AddressAutocompleteInput({ 
  value, 
  onChangeText, 
  onSelectCoordinates, 
  placeholder = "Nhập địa chỉ...",
  className = "" 
}) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  
  // Load lịch sử từ localStorage khi mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_recent_addresses');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch (e) {}
  }, []);

  // Default mapCenter (HCM). Will be updated by GPS shortly after mount.
  const [mapCenter, setMapCenter] = useState([10.762622, 106.660172]);
  const wrapperRef = useRef(null);
  const isSelecting = useRef(false);
  const isTyping = useRef(false);
  const suggestionCache = useRef({});

  // Lấy toạ độ GPS thực tế của trình duyệt (Admin thường xài web)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMapCenter([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.log('Không lấy được GPS tự động', err),
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 }
      );
    }
  }, []);

  useEffect(() => {
    if (!isSelecting.current && value !== query) {
      isTyping.current = false;
      setQuery(value || '');
    }
  }, [value]);

  const latestSuggestions = useRef([]);
  useEffect(() => {
    latestSuggestions.current = suggestions;
  }, [suggestions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsFocused(false);
        if (isTyping.current && !isSelecting.current && latestSuggestions.current.length > 0) {
          handleSoftSelect(latestSuggestions.current[0]);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSelecting.current || !isTyping.current) return;
    
    if (query.trim().length < 4) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      
      const cacheKey = query.trim().toLowerCase();
      if (suggestionCache.current[cacheKey]) {
        setSuggestions(suggestionCache.current[cacheKey]);
        setIsSearching(false);
        return;
      }
      
      let apiUrl = import.meta.env.VITE_API_URL || 'https://api.aloshipp.com/api';
      if (apiUrl && !apiUrl.endsWith('/api')) apiUrl += '/api';
      let allResults = [];

      try {
        const res = await fetch(`${apiUrl}/maps/autocomplete?location=${mapCenter[0]},${mapCenter[1]}&input=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data && data.predictions) {
          allResults = data.predictions.map(item => ({
            display_name: item.description,
            place_id: item.place_id,
            source: 'goong'
          }));
        }
      } catch (err) {
        console.error("Lỗi lấy dữ liệu từ Backend Map API:", err);
      }

      // Fallback
      if (allResults.length === 0) {
        try {
          const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=7&lat=${mapCenter[0]}&lon=${mapCenter[1]}`);
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
      }

      const seen = new Set();
      const unique = allResults.filter(item => {
        const key = item.display_name.toLowerCase().replace(/\s+/g, ' ').trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      const finalSuggestions = unique.slice(0, 7);
      suggestionCache.current[cacheKey] = finalSuggestions;
      setSuggestions(finalSuggestions);
      setIsSearching(false);
    }, 1200);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleSelect = async (item) => {
    isSelecting.current = true;
    isTyping.current = false;
    const selectedText = item.display_name;
    
    setQuery(selectedText);
    setSuggestions([]);
    
    if (onChangeText) onChangeText(selectedText);
    
    let lon = item.lon;
    let lat = item.lat;
    let apiUrl = import.meta.env.VITE_API_URL || 'https://api.aloshipp.com/api';
    if (apiUrl && !apiUrl.endsWith('/api')) apiUrl += '/api';

    if (item.source === 'goong' && item.place_id && (!lat || !lon)) {
      try {
        const res = await fetch(`${apiUrl}/maps/place?place_id=${item.place_id}`);
        const data = await res.json();
        if (data && data.result && data.result.geometry) {
          lat = data.result.geometry.location.lat;
          lon = data.result.geometry.location.lng;
        }
      } catch (e) {
        console.error("Lỗi lấy chi tiết địa điểm từ Backend:", e);
      }
    }

    if (lat && lon && onSelectCoordinates) onSelectCoordinates({ lat, lng: lon });
    
    try {
      const saved = JSON.parse(localStorage.getItem('admin_recent_addresses') || '[]');
      const newHistory = saved.filter(h => h.display_name !== selectedText);
      newHistory.unshift({ display_name: selectedText, lat, lon, place_id: item.place_id, source: item.source });
      const limitedHistory = newHistory.slice(0, 5);
      localStorage.setItem('admin_recent_addresses', JSON.stringify(limitedHistory));
      setRecentSearches(limitedHistory);
    } catch (e) {}
    
    setTimeout(() => { isSelecting.current = false; setIsFocused(false); }, 200);
  };

  const handleSoftSelect = async (item) => {
    isSelecting.current = true;
    isTyping.current = false;
    
    let lon = item.lon;
    let lat = item.lat;
    let apiUrl = import.meta.env.VITE_API_URL || 'https://api.aloshipp.com/api';
    if (apiUrl && !apiUrl.endsWith('/api')) apiUrl += '/api';

    if (item.source === 'goong' && item.place_id && (!lat || !lon)) {
      try {
        const res = await fetch(`${apiUrl}/maps/place?place_id=${item.place_id}`);
        const data = await res.json();
        if (data && data.result && data.result.geometry) {
          lat = data.result.geometry.location.lat;
          lon = data.result.geometry.location.lng;
        }
      } catch (e) {
        console.error("Lỗi lấy chi tiết địa điểm từ Backend:", e);
      }
    }
    
    setSuggestions([]);
    
    if (lat && lon && onSelectCoordinates) onSelectCoordinates({ lat, lng: lon });
    
    setTimeout(() => { isSelecting.current = false; setIsFocused(false); }, 200);
  };

  const removeRecentSearch = (e, index) => {
    e.stopPropagation();
    const updated = [...recentSearches];
    updated.splice(index, 1);
    setRecentSearches(updated);
    localStorage.setItem('admin_recent_addresses', JSON.stringify(updated));
  };

  const handleInputChange = (e) => {
    isSelecting.current = false;
    isTyping.current = true;
    setQuery(e.target.value);
    if (onChangeText) onChangeText(e.target.value);
    if (onSelectCoordinates) onSelectCoordinates(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        handleSoftSelect(suggestions[0]);
      }
    }
  };

  return (
    <div className={`relative w-full ${className || ''}`} ref={wrapperRef}>
      <div className="flex w-full overflow-hidden items-center">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full text-sm font-medium outline-none text-slate-800 bg-transparent flex-1 placeholder-slate-400"
        />
      </div>

      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-[9999] flex flex-col animate-[slideDown_0.2s_ease-out]">
          
          {isSearching && (
            <div className="flex items-center justify-center p-3">
              <Loader2 size={16} className="animate-spin text-blue-600" />
            </div>
          )}

          {!isSearching && query.trim().length < 4 && recentSearches.length > 0 && (
            <div className="max-h-60 overflow-y-auto bg-white">
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                Tìm kiếm gần đây
              </div>
              {recentSearches.map((item, idx) => (
                <div 
                  key={`recent-${idx}`} 
                  className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-b-0 flex gap-3 items-center transition-colors group"
                  onClick={() => handleSelect(item)}
                >
                  <div className="text-slate-400 shrink-0"><Clock size={14} /></div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed flex-1 line-clamp-2">{item.display_name}</p>
                  <button 
                    onClick={(e) => removeRecentSearch(e, idx)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!isSearching && query.trim().length >= 4 && suggestions.length > 0 && (
            <div className="max-h-60 overflow-y-auto bg-white">
              {suggestions.map((item, idx) => (
                <div 
                  key={`sug-${idx}`} 
                  className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-b-0 flex gap-3 items-start transition-colors"
                  onClick={() => handleSelect(item)}
                >
                  <div className="mt-0.5 text-blue-400 shrink-0"><Search size={14} /></div>
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
