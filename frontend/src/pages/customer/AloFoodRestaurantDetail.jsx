import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Plus, Minus, ShoppingCart } from 'lucide-react';
import { api, getFullImageUrl } from '../../services/api';

const AloFoodRestaurantDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [cart, setCart] = useState({}); // { itemId: quantity }

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await api.get(`/alofood/restaurants/${id}/menu`);
        if (res.data.success) {
          setRestaurant(res.data.data.restaurant);
          setMenuItems(res.data.data.menuItems);
        }
      } catch (error) {
        console.error('Lỗi lấy menu quán:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
    
    // Load cart from session if exists for this shop
    const savedCart = sessionStorage.getItem(`alofood_cart_${id}`);
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, [id]);

  const updateCart = (itemId, change) => {
    setCart(prev => {
      const newCart = { ...prev };
      const current = newCart[itemId] || 0;
      const next = current + change;
      if (next <= 0) {
        delete newCart[itemId];
      } else {
        newCart[itemId] = next;
      }
      sessionStorage.setItem(`alofood_cart_${id}`, JSON.stringify(newCart));
      return newCart;
    });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = Object.entries(cart).reduce((sum, [itemId, qty]) => {
    const item = menuItems.find(i => i._id === itemId);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const handleCheckout = () => {
    if (totalItems === 0) return;
    navigate(`/alofood/checkout/${id}`);
  };

  if (loading) return <div className="p-10 text-center">Đang tải...</div>;
  if (!restaurant) return <div className="p-10 text-center">Không tìm thấy quán</div>;

  // Nhóm món ăn theo category
  const categorizedMenu = menuItems.reduce((acc, item) => {
    const cat = item.category || 'Khác';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto bg-gray-50 font-sans min-h-screen relative">
      {/* Cửa hàng bị đóng */}
      {!restaurant.isOpen && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900/90 text-white p-3 text-center font-bold text-sm">
          Quán ăn hiện đang đóng cửa. Bạn không thể đặt món lúc này.
        </div>
      )}

      {/* HEADER & COVER */}
      <div className="relative h-48 bg-gray-300">
        {restaurant.coverImage ? (
          <img src={getFullImageUrl(restaurant.coverImage)} alt={restaurant.shopName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-500 to-orange-400"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 z-10 w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white">
          <ArrowLeft size={22} />
        </button>

        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h1 className="font-bold text-2xl mb-1">{restaurant.shopName}</h1>
          <div className="flex items-center text-xs opacity-90 gap-3">
            <span className="flex items-center gap-1 text-yellow-400 font-bold">
              <Star size={14} className="fill-yellow-400" /> {restaurant.rating?.toFixed(1) || '5.0'}
            </span>
            <span className="flex items-center gap-1 line-clamp-1">
              <MapPin size={14} /> {restaurant.shopAddress || 'Chưa cập nhật địa chỉ'}
            </span>
          </div>
        </div>
      </div>

      {/* MENU LIST */}
      <div className="flex-1 overflow-y-auto pb-24">
        {Object.keys(categorizedMenu).length === 0 ? (
          <div className="p-10 text-center text-gray-500">Quán chưa cập nhật thực đơn</div>
        ) : (
          Object.entries(categorizedMenu).map(([category, items]) => (
            <div key={category} className="mb-2 bg-white">
              <div className="px-4 py-3 bg-gray-100 border-y border-gray-200 sticky top-0 z-10">
                <h2 className="font-bold text-gray-800 text-sm uppercase">{category}</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map(item => {
                  const qty = cart[item._id] || 0;
                  return (
                    <div key={item._id} className="p-4 flex gap-3">
                      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100">
                        {item.image ? (
                          <img src={getFullImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-200"></div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-gray-800 leading-tight">{item.name}</h3>
                          {item.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.description}</p>}
                          <p className="font-bold text-blue-600 mt-1">{item.price.toLocaleString('vi-VN')}đ</p>
                        </div>
                        {restaurant.isOpen && (
                          <div className="flex justify-end items-center mt-2">
                            {qty > 0 ? (
                              <div className="flex items-center gap-3">
                                <button onClick={() => updateCart(item._id, -1)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold border border-gray-200">
                                  <Minus size={14} />
                                </button>
                                <span className="font-bold w-4 text-center">{qty}</span>
                                <button onClick={() => updateCart(item._id, 1)} className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white font-bold shadow-sm">
                                  <Plus size={14} />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => updateCart(item._id, 1)}
                                className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white font-bold shadow-sm"
                              >
                                <Plus size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FLOATING CART SUMMARY */}
      {totalItems > 0 && restaurant.isOpen && (
        <div className="fixed bottom-0 left-0 right-0 max-w-5xl mx-auto p-4 z-40 bg-gradient-to-t from-white via-white to-transparent pb-6">
          <div 
            onClick={handleCheckout}
            className="bg-red-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-red-500/40 cursor-pointer active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart size={24} />
                <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-red-500">
                  {totalItems}
                </span>
              </div>
              <span className="font-bold text-lg">{totalPrice.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="font-bold text-sm bg-white/20 px-4 py-2 rounded-full">
              Thanh Toán
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AloFoodRestaurantDetail;
