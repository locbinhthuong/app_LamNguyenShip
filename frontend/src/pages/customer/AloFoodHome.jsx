import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Star, Clock, MapPin } from 'lucide-react';
import { api, getFullImageUrl } from '../../services/api';

const AloFoodHome = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const categories = ['Tất cả', 'Trà Sữa', 'Cơm', 'Đồ Ăn Vặt', 'Đồ Uống', 'Bún/Phở'];

  useEffect(() => {
    fetchRestaurants();
  }, [search, activeCategory]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (activeCategory && activeCategory !== 'Tất cả') params.append('category', activeCategory);

      const res = await api.get(`/alofood/restaurants?${params.toString()}`);
      if (res.data.success) {
        setRestaurants(res.data.data);
      }
    } catch (error) {
      console.error('Lỗi lấy danh sách quán:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto bg-gray-50 font-sans overflow-hidden">
      {/* HEADER */}
      <div className="shrink-0 bg-red-500 px-5 py-4 safe-pt sticky top-0 z-40 flex items-center shadow-md">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white active:scale-[0.85] transition-transform duration-300">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 ml-2 bg-white/20 rounded-full flex items-center px-3 py-1.5 backdrop-blur-sm">
          <Search size={18} className="text-white opacity-80" />
          <input 
            type="text" 
            placeholder="Tìm quán ăn, món ăn..."
            className="bg-transparent border-none outline-none text-white placeholder-white/70 ml-2 w-full text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* CATEGORIES */}
      <div className="bg-white p-3 shadow-sm flex gap-2 overflow-x-auto no-scrollbar border-b border-gray-100">
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat === activeCategory ? '' : cat)}
            className={`px-4 py-1.5 rounded-full whitespace-nowrap text-sm font-bold transition-colors ${activeCategory === cat || (cat === 'Tất cả' && !activeCategory) ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* LIST RESTAURANTS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Đang tìm quán ngon...</div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 font-medium">Không tìm thấy quán ăn nào phù hợp</p>
          </div>
        ) : (
          restaurants.map(shop => (
            <div 
              key={shop._id} 
              onClick={() => navigate(`/alofood/restaurant/${shop._id}`)}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="h-36 bg-gray-200 relative">
                {shop.coverImage ? (
                  <img src={getFullImageUrl(shop.coverImage)} alt={shop.shopName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-red-400 to-orange-400 flex items-center justify-center text-white font-bold text-xl">
                    {shop.shopName}
                  </div>
                )}
                {!shop.isOpen && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-white text-gray-800 font-bold px-3 py-1 rounded-full text-sm">Đóng Cửa</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-bold text-gray-900 text-base line-clamp-1 mb-1">{shop.shopName}</h3>
                <div className="flex items-center text-xs text-gray-500 gap-3 mb-1">
                  <span className="flex items-center gap-1 text-yellow-500 font-bold">
                    <Star size={14} className="fill-yellow-500" /> {shop.rating?.toFixed(1) || '5.0'}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={14} /> {shop.shopAddress ? shop.shopAddress.split(',')[0] : 'Đang cập nhật'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AloFoodHome;
