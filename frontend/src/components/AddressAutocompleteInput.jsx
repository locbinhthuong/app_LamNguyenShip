import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';

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
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  // Cập nhật query nếu ô bên ngoài thay đổi (VD: khi chọn từ BẢN ĐỒ)
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Click outside để đóng
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Gọi Nominatim
  useEffect(() => {
    if (query === value) {
      // Nếu query đang trùng khớp hoàn toàn với value (nghĩa là vừa chọn xong or load từ ngoài vào)
      setSuggestions([]);
      return;
    }

    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=vn`);
        const data = await res.json();
        setSuggestions(data);
        setShowDropdown(true);
      } catch (err) {
        console.error('Lỗi tìm kiếm gợi ý:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounce);
  }, [query, value]);

  const handleSelect = (item) => {
    const selectedText = item.display_name;
    setQuery(selectedText);
    setShowDropdown(false);
    
    // Báo ra ngoài tên đường
    if (onChangeText) onChangeText(selectedText);
    
    // Báo ra ngoài tọa độ (nếu có)
    if (onSelectCoordinates && item.lat && item.lon) {
      onSelectCoordinates({ lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
    }
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (onChangeText) onChangeText(e.target.value);
    // Khi người dùng tự gõ tay thì không có tọa độ chuẩn
    if (onSelectCoordinates) onSelectCoordinates(null);
  };

  return (
    <div className={`relative w-full ${className || ''}`} ref={wrapperRef}>
      <div className="flex w-full overflow-hidden items-center">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          placeholder={placeholder || "Nhập địa chỉ..."}
          className="w-full text-sm outline-none px-2 py-1 text-slate-700 bg-transparent flex-1"
        />
        
        {onClickMapIcon && (
          <button 
            type="button" 
            onClick={onClickMapIcon}
            className="flex shrink-0 items-center justify-center bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors hover:bg-blue-200 ml-2 shadow-sm"
          >
            🗺️ BẢN ĐỒ
          </button>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
          {suggestions.map((item, idx) => (
            <div 
              key={idx} 
              className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0 flex gap-3 items-start transition-colors"
              onClick={() => handleSelect(item)}
            >
              <div className="mt-0.5 text-slate-400 shrink-0"><Search size={14} /></div>
              <p className="text-sm text-slate-700 font-medium leading-snug">{item.display_name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
