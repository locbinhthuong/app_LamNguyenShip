import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageX, DollarSign, PackageCheck, PlusCircle, LogOut, Clock, Navigation, MapPin, ChevronRight, UserX, User, ChevronRight as ChevronRightIcon, Bike, ShoppingCart, Headset, Newspaper, Gift } from 'lucide-react';
import { api, getActiveAnnouncements } from '../../services/api';
import LocationPicker from '../../components/LocationPicker';

const ShopDashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    delivering: 0,
    completedToday: 0,
    codCollectedToday: 0
  });

  const [address, setAddress] = useState('Đang lấy vị trí...');
  const [locationDetails, setLocationDetails] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
  // Banner & Tin tức
  const [currentSlide, setCurrentSlide] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const promotions = announcements.filter(a => a.type === 'PROMO');
  const news = announcements.filter(a => a.type === 'NEWS');
  const banners = announcements.filter(a => a.type === 'BANNER');

  const shopName = localStorage.getItem('shopName') || 'Cửa Hàng Của Bạn';
  
  // Lấy định vị gốc của Shop từ customerData
  const customerData = JSON.parse(localStorage.getItem('customerData') || '{}');
  const defaultLocation = customerData.defaultLocation;



  const calculateStatsAndSet = (newOrders) => {
    const today = new Date().toDateString();
    let p = 0, d = 0, c = 0, cod = 0;
    newOrders.forEach(o => {
      if (o.status === 'PENDING') p++;
      if (['ACCEPTED', 'PICKED_UP', 'DELIVERING'].includes(o.status)) d++;
      
      if (o.status === 'COMPLETED' && new Date(o.createdAt).toDateString() === today) {
        c++;
        cod += (o.codAmount || 0);
      }
    });
    setStats({ pending: p, delivering: d, completedToday: c, codCollectedToday: cod });
  };

  useEffect(() => {
    fetchOrders();
    fetchAnnouncements();

    const handleRefresh = (e) => {
      const updatedOrder = e.detail;
      if (updatedOrder && updatedOrder._id) {
        setOrders(prev => {
          let exists = false;
          const newList = prev.map(o => {
            if (o._id === updatedOrder._id) {
              exists = true;
              return updatedOrder;
            }
            return o;
          });
          if (!exists) newList.unshift(updatedOrder);
          calculateStatsAndSet(newList);
          return newList;
        });
      } else {
        fetchOrders();
      }
    };

    const handleDeleted = (e) => {
      if (typeof e.detail === 'string') {
        setOrders(prev => {
           const newList = prev.filter(o => o._id !== e.detail);
           calculateStatsAndSet(newList);
           return newList;
        });
      }
    };

    window.addEventListener('refresh_orders_data', handleRefresh);
    window.addEventListener('order_deleted_event', handleDeleted);
    
    const slideInterval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % (banners.length || 1));
    }, 3000);

    return () => {
      window.removeEventListener('refresh_orders_data', handleRefresh);
      window.removeEventListener('order_deleted_event', handleDeleted);
      clearInterval(slideInterval);
    };
  }, [banners.length]);

  useEffect(() => {
    const saved = localStorage.getItem('savedShopLocation');
    if (saved) {
      const loc = JSON.parse(saved);
      setLocationDetails(loc);
      const shortAddress = loc.address.split(',').slice(0, 3).join(', ');
      setAddress(shortAddress);
    } else if (defaultLocation && defaultLocation.lat) {
      setLocationDetails(defaultLocation);
      const shortAddress = defaultLocation.address.split(',').slice(0, 3).join(', ');
      setAddress(shortAddress);
    } else {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
              const data = await res.json();
              if (data && data.display_name) {
                const locData = { lat, lng, address: data.display_name };
                setLocationDetails(locData);
                const shortAddress = data.display_name.split(',').slice(0, 3).join(', ');
                setAddress(shortAddress);
              }
            } catch (err) {}
          },
          (err) => { setAddress('Chưa xác định toạ độ'); }, { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        setAddress('Chưa xác định toạ độ');
      }
    }
  }, []); // Bỏ dependency defaultLocation để tránh loop, defaultLocation chỉ lấy lúc mount

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/customer/my');
      if (res.data.success) {
        const allOrders = res.data.data;
        setOrders(allOrders);
        calculateStatsAndSet(allOrders);
      }
    } catch (error) {
      console.error('Lỗi lấy đơn shop', error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await getActiveAnnouncements();
      if (res.success) {
        setAnnouncements(res.data || []);
      }
    } catch (err) {
      console.error('Lỗi lấy bảng tin', err);
    }
  };

  const handleLocationSelect = (loc) => {
    setLocationDetails(loc);
    localStorage.setItem('savedShopLocation', JSON.stringify(loc));
    const shortAddress = loc.address.split(',').slice(0, 3).join(', ');
    setAddress(shortAddress);
  };

  const handleResetLocation = (e) => {
    e.stopPropagation();
    localStorage.removeItem('savedShopLocation');
    if (defaultLocation && defaultLocation.lat) {
      setLocationDetails(defaultLocation);
      const shortAddress = defaultLocation.address.split(',').slice(0, 3).join(', ');
      setAddress(shortAddress);
    } else {
      alert('Bạn chưa cài đặt Định vị gốc trong mục Tài khoản!');
    }
  };

  return (
    <div className="w-full flex flex-col min-h-screen bg-slate-50 font-sans pb-24 relative overflow-x-hidden max-w-xl mx-auto border-x border-slate-200 shadow-sm">
      
      {/* HEADER: Kéo ghim toạ độ Shop */}
      <div 
        onClick={() => setShowLocationPicker(true)}
        className="bg-white px-4 py-3 sticky top-0 z-50 flex items-center justify-between cursor-pointer active:bg-gray-50 border-b border-slate-100"
      >
        <div className="flex flex-col flex-1 overflow-hidden mr-4">
          <div className="flex items-center gap-1 text-slate-500 mb-0.5">
            <span className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600 flex items-center gap-1"><MapPin size={12} /> Toạ độ cửa hàng</span>
            <ChevronRight size={14} className="text-slate-400" />
            {localStorage.getItem('savedShopLocation') && (
               <button 
                 onClick={handleResetLocation}
                 className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold active:scale-95 transition-transform"
               >
                 Khôi phục gốc
               </button>
            )}
          </div>
          <p className="text-slate-800 font-bold text-[15px] truncate pr-2">
            {address}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
          <MapPin className="text-blue-600" size={20} />
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="px-4 sm:px-6 pt-6 relative z-20 space-y-6">

        {/* THÔNG BÁO CẬP NHẬT ĐỊNH VỊ (Gọn hơn) */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex items-center gap-2.5 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
          <div className="text-blue-500 animate-bounce">
            <MapPin size={18} />
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-blue-800 leading-snug font-medium">
              Vui lòng bấm vào <strong>"📍 Toạ độ cửa hàng"</strong> ở trên cùng để cập nhật định vị chuẩn xác trước khi lên đơn!
            </p>
          </div>
        </div>

        {/* NÚT TẠO ĐƠN SIÊU TỐC */}
        <button 
          onClick={() => navigate('/shop/book')}
          className="w-full bg-white text-blue-600 rounded-3xl p-4 flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-blue-50 active:scale-[0.98] transition-all group hover:shadow-[0_15px_40px_rgba(59,130,246,0.15)]"
        >
          <div className="bg-blue-50 p-2 rounded-full group-hover:bg-blue-100 group-hover:scale-110 transition-all">
            <PlusCircle size={24} className="text-blue-600" />
          </div>
          <span className="font-extrabold text-lg tracking-wide">TẠO ĐƠN NGAY</span>
        </button>



        {/* SLIDER BANNER TỪ ADMIN */}
        {banners.length > 0 && (
          <div className="relative w-full h-48 sm:h-60 rounded-3xl overflow-hidden shadow-sm border border-slate-100 bg-slate-50 group flex items-center justify-center">
            <div 
              className="flex w-full h-full transition-transform duration-500 ease-out items-center"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {banners.map(banner => (
                <div key={banner._id} className="w-full h-full flex-shrink-0 relative flex items-center justify-center p-0">
                  {banner.imageUrl && (
                    <img src={`https://api.aloshipp.com${banner.imageUrl}`} alt="Banner" className="w-full h-full object-cover object-center" />
                  )}
                  {banner.videoUrl && (
                    <video src={`https://api.aloshipp.com${banner.videoUrl}`} className="w-full h-full object-cover object-center" autoPlay muted loop playsInline />
                  )}
                </div>
              ))}
            </div>
            {/* Nút điều hướng Slider */}
            {banners.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
                {banners.map((_, index) => (
                  <button 
                    key={index} 
                    onClick={() => setCurrentSlide(index)}
                    className={`h-1.5 rounded-full transition-all ${currentSlide === index ? 'w-4 bg-white shadow' : 'w-1.5 bg-white/50'}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION KHUYẾN MÃI */}
        {promotions.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-bold text-gray-800 text-lg">Khuyến mãi</h3>
              <span className="text-blue-600 text-sm font-medium cursor-pointer">Xem tất cả</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-4 px-4">
              {promotions.map((ann, idx) => (
                <div 
                  key={ann._id} 
                  onClick={() => setSelectedAnnouncement(ann)}
                  className="w-48 md:w-64 bg-white rounded-2xl border border-red-100 flex-shrink-0 overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-all active:scale-95"
                >
                  {ann.imageUrl ? (
                    <img src={`https://api.aloshipp.com${ann.imageUrl}`} className="w-full h-40 object-cover bg-gray-100" alt="Khuyến mãi" />
                  ) : ann.videoUrl ? (
                    <video src={`https://api.aloshipp.com${ann.videoUrl}`} className="w-full h-40 object-cover bg-black" autoPlay muted loop playsInline />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-red-500 to-orange-500 p-4 flex flex-col justify-center text-white relative overflow-hidden">
                      <Gift size={32} className="opacity-30 absolute right-2 bottom-2" />
                      <h4 className="font-black text-base line-clamp-2 relative z-10">{ann.title}</h4>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-bold text-[13px] text-gray-800 line-clamp-2 leading-tight">{ann.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION TIN TỨC */}
        {news.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-bold text-gray-800 text-lg">Tin Tức</h3>
              <span className="text-blue-600 text-sm font-medium cursor-pointer">Xem tất cả</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-4 px-4">
              {news.map((ann, idx) => (
                <div 
                  key={ann._id} 
                  onClick={() => setSelectedAnnouncement(ann)}
                  className="w-48 md:w-64 bg-white rounded-2xl border border-blue-100 flex-shrink-0 overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-all active:scale-95"
                >
                  {ann.imageUrl ? (
                    <img src={`https://api.aloshipp.com${ann.imageUrl}`} className="w-full h-40 object-cover bg-gray-100" alt="Tin tức" />
                  ) : ann.videoUrl ? (
                    <video src={`https://api.aloshipp.com${ann.videoUrl}`} className="w-full h-40 object-cover bg-black" autoPlay muted loop playsInline />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-blue-500 to-indigo-500 p-4 flex flex-col justify-center text-white relative overflow-hidden">
                      <Newspaper size={32} className="opacity-30 absolute right-2 bottom-2" />
                      <h4 className="font-black text-base line-clamp-2 relative z-10">{ann.title}</h4>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-bold text-[13px] text-gray-800 line-clamp-2 leading-tight">{ann.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL XEM CHI TIẾT BẢNG TIN */}
        {selectedAnnouncement && (
          <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedAnnouncement(null)}>
            <div className="bg-white rounded-3xl w-full max-w-sm max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <div className="absolute top-3 right-3 z-10 bg-white/50 backdrop-blur rounded-full p-2 cursor-pointer shadow" onClick={() => setSelectedAnnouncement(null)}>
                 ✕
              </div>
              <div className="overflow-y-auto w-full flex-1">
                {selectedAnnouncement.videoUrl ? (
                   <video src={`https://api.aloshipp.com${selectedAnnouncement.videoUrl}`} className="w-full bg-black max-h-[300px]" controls playsInline autoPlay />
                ) : selectedAnnouncement.imageUrl ? (
                   <img src={`https://api.aloshipp.com${selectedAnnouncement.imageUrl}`} className="w-full object-cover max-h-[300px]" alt="Chi tiết" />
                ) : (
                   <div className="w-full h-40 bg-gradient-to-br from-indigo-500 to-purple-600"></div>
                )}
                <div className="p-5 pb-8">
                  <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {selectedAnnouncement.type === 'PROMO' ? (
                      <><Gift size={16} /> Khuyến Mãi</>
                    ) : (
                      <><Newspaper size={16} /> Tin Tức</>
                    )} 
                    • {new Date(selectedAnnouncement.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 leading-snug mb-3">
                    {selectedAnnouncement.title}
                  </h2>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selectedAnnouncement.content}
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button 
                  onClick={() => setSelectedAnnouncement(null)}
                  className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 active:scale-95 transition-transform"
                >
                  Đã Rõ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DANH SÁCH ĐƠN HÀNG GẦN ĐÂY */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-extrabold text-slate-800 text-lg">Lịch sử đơn hàng gần nhất</h3>
            <span 
              onClick={() => navigate('/shop/activity')}
              className="text-xs text-blue-600 font-bold active:scale-95 cursor-pointer bg-blue-50 px-3 py-1.5 rounded-full"
            >
              Xem tất cả
            </span>
          </div>

          <div className="space-y-3">
            {orders.slice(0, 5).map(order => (
              <div 
                key={order._id} 
                onClick={() => navigate(`/shop/order/${order._id}`)}
                className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-blue-200 transition-colors shadow-sm cursor-pointer active:scale-[0.98]"
              >
                <div className="flex-1 overflow-hidden pr-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold">{new Date(order.createdAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${order.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : order.status === 'PENDING' ? 'bg-blue-50 text-blue-600' : order.status === 'DRAFT' ? 'bg-purple-50 text-purple-600' : order.status === 'CANCELLED' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {order.status === 'DRAFT' ? 'Chờ Báo Giá' : order.status === 'PENDING' ? 'Chờ Xế' : order.status}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 line-clamp-1">{order.deliveryAddress || 'Chưa rõ điểm đến'}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Thu hộ: {order.codAmount ? order.codAmount.toLocaleString('vi-VN') + 'đ' : '0đ'}</p>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 border-dashed border-2">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <PackageX size={24} className="text-slate-300" />
                </div>
                <p className="text-slate-400 text-sm font-medium">Chưa có đơn hàng nào</p>
                <p className="text-slate-400 text-xs mt-1">Bấm "Tạo Đơn Ngay" để bắt đầu</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* OVERLAY CHỌN BẢN ĐỒ */}
      {showLocationPicker && (
        <LocationPicker 
          isOpen={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSelect={handleLocationSelect}
          initialPosition={null}
        />
      )}
    </div>
  );
};

export default ShopDashboard;
