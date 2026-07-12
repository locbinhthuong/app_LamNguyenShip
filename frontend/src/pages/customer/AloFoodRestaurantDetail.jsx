import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Plus, Minus, ShoppingCart, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, getFullImageUrl } from '../../services/api';

const AloFoodRestaurantDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [cart, setCart] = useState({}); // { itemId: quantity }

  const [reviews, setReviews] = useState([]);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await api.get(`/alofood/restaurants/${id}/menu`);
        if (res.data.success) {
          const fetchedMenuItems = res.data.data.menuItems;
          setRestaurant(res.data.data.restaurant);
          setMenuItems(fetchedMenuItems);
          
          // Load and validate cart
          const savedCart = sessionStorage.getItem(`alofood_cart_${id}`);
          if (savedCart) {
            const parsedCart = JSON.parse(savedCart);
            const validCart = {};
            let changed = false;
            for (const key in parsedCart) {
              const item = fetchedMenuItems.find(i => i._id === key);
              if (item && item.isAvailable) {
                validCart[key] = parsedCart[key];
              } else {
                changed = true;
              }
            }
            setCart(validCart);
            if (changed) {
              sessionStorage.setItem(`alofood_cart_${id}`, JSON.stringify(validCart));
            }
          }
        }
        
        // Fetch reviews
        const reviewRes = await api.get(`/alofood/restaurants/${id}/reviews`);
        if (reviewRes.data.success) {
          setReviews(reviewRes.data.data);
        }
      } catch (error) {
        console.error('Lỗi lấy menu hoặc đánh giá:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
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
    navigate(`/alofood/checkout/${id}`);
  };

  const handleSubmitReview = async () => {
    if (!newReviewRating || newReviewRating < 1 || newReviewRating > 5) {
      alert('Vui lòng chọn từ 1 đến 5 sao!');
      return;
    }
    setSubmittingReview(true);
    try {
      const userProfileRaw = localStorage.getItem('user_profile');
      let customerName = 'Khách hàng';
      if (userProfileRaw) {
        const userProfile = JSON.parse(userProfileRaw);
        customerName = userProfile.name || 'Khách hàng';
      }

      const res = await api.post(`/alofood/restaurants/${id}/reviews`, {
        rating: newReviewRating,
        comment: newReviewComment,
        customerName
      });
      if (res.data.success) {
        setReviews([res.data.data, ...reviews].slice(0, 5));
        setNewReviewComment('');
        setNewReviewRating(5);
        alert('Gửi đánh giá thành công!');
      }
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || 'Không thể gửi đánh giá lúc này'));
    } finally {
      setSubmittingReview(false);
    }
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
        <div className="fixed top-0 left-0 md:left-[260px] right-0 z-50 bg-gray-900/90 text-white p-3 text-center font-bold text-sm">
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
                    <div 
                      key={item._id} 
                      className={`p-4 flex gap-3 relative transition-colors ${item.isAvailable ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : 'opacity-60 grayscale-[50%]'}`}
                      onClick={() => { if(item.isAvailable) { setSelectedItem(item); setCurrentImageIndex(0); } }}
                    >
                      {!item.isAvailable && (
                        <div className="absolute inset-0 bg-white/40 z-10 flex items-center justify-center backdrop-blur-[1px]">
                          <span className="bg-gray-600 text-white px-4 py-1.5 rounded-full font-bold text-sm shadow-md">Đã Hết Món</span>
                        </div>
                      )}
                      
                      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100 relative z-0">
                        {item.images && item.images.length > 0 ? (
                          <img src={getFullImageUrl(item.images[0])} alt={item.name} className="w-full h-full object-cover" />
                        ) : item.image ? (
                          <img src={getFullImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-200"></div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between relative z-0">
                        <div>
                          <h3 className="font-bold text-gray-800 leading-tight">{item.name}</h3>
                          {item.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.description}</p>}
                          <p className="font-bold text-blue-600 mt-1">{item.price.toLocaleString('vi-VN')}đ</p>
                        </div>
                        {restaurant.isOpen && (item.isAvailable || qty > 0) && (
                          <div className="flex justify-end items-center mt-2">
                            {qty > 0 ? (
                              <div className="flex items-center gap-3 relative z-20">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); updateCart(item._id, -1); }} 
                                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold border border-gray-200 active:scale-90 transition-transform"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="font-bold w-4 text-center">{qty}</span>
                                {item.isAvailable && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); updateCart(item._id, 1); }} 
                                    className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white font-bold shadow-sm active:scale-90 transition-transform"
                                  >
                                    <Plus size={14} />
                                  </button>
                                )}
                              </div>
                            ) : (
                              item.isAvailable && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); updateCart(item._id, 1); }}
                                  className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white font-bold shadow-sm active:scale-90 transition-transform relative z-20"
                                >
                                  <Plus size={16} />
                                </button>
                              )
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

      {/* REVIEWS SECTION */}
      <div className="bg-white mt-2 p-5 shadow-sm border-t border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Star className="text-yellow-400 fill-current" size={18} /> Đánh giá từ khách hàng
        </h3>
        
        {/* Review Form */}
        <div className="mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <p className="text-sm font-bold text-gray-700 mb-2">Đánh giá của bạn</p>
          <div className="flex gap-2 mb-3">
            {[1, 2, 3, 4, 5].map(star => (
              <Star 
                key={star} 
                size={24} 
                onClick={() => setNewReviewRating(star)}
                className={`cursor-pointer transition-colors ${star <= newReviewRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
              />
            ))}
          </div>
          <textarea 
            value={newReviewComment}
            onChange={(e) => setNewReviewComment(e.target.value)}
            placeholder="Chia sẻ cảm nhận của bạn về quán ăn..."
            className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-red-500 min-h-[80px] resize-none mb-3"
          ></textarea>
          <button 
            onClick={handleSubmitReview}
            disabled={submittingReview}
            className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-sm font-bold py-2.5 px-6 rounded-xl transition-colors"
          >
            {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <p className="text-gray-500 text-sm italic text-center py-4">Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá!</p>
          ) : (
            reviews.map((rv) => (
              <div key={rv._id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-bold text-gray-800 text-sm">{rv.customerName}</div>
                  <div className="text-xs text-gray-400">{new Date(rv.createdAt).toLocaleDateString('vi-VN')}</div>
                </div>
                <div className="flex gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                      key={star} 
                      size={12} 
                      className={star <= rv.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}
                    />
                  ))}
                </div>
                {rv.comment && <p className="text-gray-600 text-sm whitespace-pre-line">{rv.comment}</p>}
              </div>
            ))
          )}
        </div>
      </div>
      </div>

      {/* ITEM DETAIL MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedItem(null)}
          ></div>
          <div className="bg-white w-full sm:w-[400px] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[90vh] z-10 transform transition-all shadow-2xl">
            <div className="relative h-64 bg-gray-100 flex-shrink-0">
              {(() => {
                const images = selectedItem.images && selectedItem.images.length > 0 
                  ? selectedItem.images 
                  : (selectedItem.image ? [selectedItem.image] : []);
                
                if (images.length === 0) {
                  return <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">Chưa có ảnh</div>;
                }

                return (
                  <>
                    <img src={getFullImageUrl(images[currentImageIndex])} alt={selectedItem.name} className="w-full h-full object-cover transition-opacity duration-300" />
                    
                    {images.length > 1 && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1); }}
                          className="absolute top-1/2 left-2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 z-20"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1); }}
                          className="absolute top-1/2 right-2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 z-20"
                        >
                          <ChevronRight size={20} />
                        </button>
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20">
                          {images.map((_, idx) => (
                            <div key={idx} className={`h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
              
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent flex justify-end z-20">
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="flex justify-between items-start gap-4 mb-3">
                <h2 className="text-2xl font-bold text-gray-800 leading-tight">{selectedItem.name}</h2>
              </div>
              <p className="text-xl font-bold text-red-500 mb-6">{selectedItem.price.toLocaleString('vi-VN')}đ</p>
              
              {selectedItem.description && (
                <div className="mb-6">
                  <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <div className="w-1 h-4 bg-red-500 rounded-full"></div>
                    Chi tiết món ăn
                  </h3>
                  <p className="text-gray-600 text-[15px] whitespace-pre-line leading-relaxed">{selectedItem.description}</p>
                </div>
              )}
            </div>
            {restaurant.isOpen && selectedItem.isAvailable && (
              <div className="p-4 border-t border-gray-100 bg-white drop-shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
                <button 
                  onClick={() => {
                    updateCart(selectedItem._id, 1);
                    setSelectedItem(null);
                  }}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Plus size={20} /> Thêm vào giỏ ({selectedItem.price.toLocaleString('vi-VN')}đ)
                </button>
              </div>
            )}
            {restaurant.isOpen && !selectedItem.isAvailable && (
              <div className="p-4 border-t border-gray-100 bg-gray-100 text-center text-gray-500 font-bold">
                Món này hiện đang hết
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING CART SUMMARY */}
      {totalItems > 0 && restaurant.isOpen && (
        <div className="fixed bottom-24 md:bottom-0 left-0 md:left-[260px] right-0 max-w-5xl mx-auto p-4 z-40 bg-gradient-to-t from-white via-white to-transparent pb-6">
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
