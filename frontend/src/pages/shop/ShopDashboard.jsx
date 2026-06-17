import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  PackageX, DollarSign, PackageCheck, PlusCircle, LogOut, Clock, Navigation, 
  MapPin, ChevronRight, UserX, User, ChevronRight as ChevronRightIcon, Bike, 
  ShoppingCart, Headset, Newspaper, Gift, Package, ShoppingBag, Layers, History 
} from 'lucide-react';
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
      fetchOrders();
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
    
    return () => {
      window.removeEventListener('refresh_orders_data', handleRefresh);
      window.removeEventListener('order_deleted_event', handleDeleted);
    };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const slideInterval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(slideInterval);
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
  }, []);

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Chào buổi sáng';
    if (hour >= 12 && hour < 14) return 'Chào buổi trưa';
    if (hour >= 14 && hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="pb-6 pt-4 px-4 md:px-8 max-w-7xl mx-auto bg-[#fafafa] relative min-h-screen"
    >
      
      {/* HEADER: Địa điểm của Shop */}
      <div 
        onClick={() => setShowLocationPicker(true)}
        className="bg-white/90 backdrop-blur-md p-4 safe-pt sticky top-0 z-50 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform duration-300 ease-out mb-4 rounded-xl shadow-sm border border-gray-100"
      >
        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          <div className="text-blue-500 bg-blue-50 p-2.5 rounded-full shadow-sm flex-shrink-0 animate-bounce">
            <MapPin size={22} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center gap-1 text-gray-500 mb-0.5">
              <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">Toạ độ cửa hàng</span>
              <ChevronRight size={14} className="opacity-50 text-blue-600" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[14px] font-bold text-gray-800 line-clamp-1 truncate block leading-tight">{address}</span>
            </div>
          </div>
        </div>
        
        {localStorage.getItem('savedShopLocation') && (
          <button 
            onClick={handleResetLocation}
            className="ml-2 text-[11px] bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-bold active:scale-95 transition-transform whitespace-nowrap"
          >
            Khôi phục gốc
          </button>
        )}
      </div>

      {/* LỜI CHÀO GREETING */}
      <div className="mb-6 mt-1 px-1">
        <h2 className="text-lg md:text-xl font-medium text-gray-600 leading-tight">
          {getGreeting()}, <span className="font-bold text-blue-600">{shopName}</span>!
        </h2>
        <motion.div 
          className="text-[13px] md:text-[15px] font-extrabold mt-0.5 tracking-tight bg-gradient-to-r from-blue-600 via-orange-500 to-blue-600 bg-[length:200%_auto] text-transparent bg-clip-text drop-shadow-sm"
          animate={{ backgroundPosition: ['0% center', '200% center'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          Doanh thu tăng cao, giao hàng siêu tốc cùng AloShipp 🚀
        </motion.div>
      </div>

      {/* THÔNG BÁO CẬP NHẬT ĐỊNH VỊ (Chỉ hiện nếu đang dùng địa chỉ mặc định hoặc lỗi) */}
      {!localStorage.getItem('savedShopLocation') && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3 relative overflow-hidden shadow-sm mb-6 max-w-4xl">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
          <div className="text-blue-500 animate-bounce">
            <MapPin size={20} />
          </div>
          <div className="flex-1">
            <p className="text-[12px] md:text-sm text-blue-800 leading-snug font-medium">
              Vui lòng bấm vào <strong>"📍 Toạ độ cửa hàng"</strong> ở trên cùng để cập nhật định vị chuẩn xác trước khi lên đơn!
            </p>
          </div>
        </div>
      )}

      {/* SLIDER BANNER */}
      {banners.length > 0 && (
        <div className="mb-10">
          <div className="relative w-full h-48 sm:h-[320px] md:h-[400px] lg:h-[460px] rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] bg-slate-50 group flex items-center justify-center">
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
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                {banners.map((_, index) => (
                  <button 
                    key={index} 
                    onClick={() => setCurrentSlide(index)}
                    className={`h-2 rounded-full transition-all ${currentSlide === index ? 'w-6 bg-white shadow' : 'w-2 bg-white/50'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DỊCH VỤ NỔI BẬT */}
      <div className="mb-14">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">Dịch vụ nổi bật</h2>
        <div className="grid grid-cols-4 gap-3 md:gap-6 lg:gap-8 max-w-4xl mx-auto md:mx-0">
          
          {/* GIAO HÀNG */}
          <div 
            onClick={() => navigate('/shop/book/delivery')}
            className="bg-white rounded-[20px] py-4 px-2 flex flex-col items-center justify-center cursor-pointer shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-gray-100 hover:-translate-y-1 transition-transform"
          >
            <div className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-blue-50 flex items-center justify-center mb-2.5 text-blue-600">
              <Package size={22} className="md:w-7 md:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-[13px] md:text-[15px] font-bold text-gray-900 text-center">Giao hàng</h3>
          </div>

          {/* LẤY HÀNG (GIỐNG MUA HỘ) */}
          <div 
            onClick={() => navigate('/shop/book/pickup')}
            className="bg-white rounded-[20px] py-4 px-2 flex flex-col items-center justify-center cursor-pointer shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-gray-100 hover:-translate-y-1 transition-transform"
          >
            <div className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-slate-50 flex items-center justify-center mb-2.5 text-slate-700">
              <ShoppingBag size={22} className="md:w-7 md:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-[13px] md:text-[15px] font-bold text-gray-900 text-center">Lấy hàng</h3>
          </div>

          {/* ĐƠN GHÉP */}
          <div 
            onClick={() => navigate('/shop/book/batched')}
            className="bg-white rounded-[20px] py-4 px-2 flex flex-col items-center justify-center cursor-pointer shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-gray-100 hover:-translate-y-1 transition-transform relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 bg-orange-500 text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded-bl-lg">MỚI</div>
            <div className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-orange-50 flex items-center justify-center mb-2.5 text-orange-600">
              <Layers size={22} className="md:w-7 md:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-[13px] md:text-[15px] font-bold text-gray-900 text-center">Đơn ghép</h3>
          </div>

          {/* LỊCH SỬ ĐƠN */}
          <div 
            onClick={() => navigate('/shop/activity')}
            className="bg-white rounded-[20px] py-4 px-2 flex flex-col items-center justify-center cursor-pointer shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-gray-100 hover:-translate-y-1 transition-transform"
          >
            <div className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-2.5 text-emerald-600">
              <History size={22} className="md:w-7 md:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-[13px] md:text-[15px] font-bold text-gray-900 text-center">Lịch sử đơn</h3>
          </div>

        </div>
      </div>

      {/* KHUYẾN MÃI & TIN TỨC (SPLIT LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-14">
        
        {/* CỘT KHUYẾN MÃI (Bên trái) */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Khuyến mãi</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-5 lg:gap-6">
            {promotions.length > 0 ? promotions.slice(0, 2).map((promo, idx) => (
              <div key={idx} onClick={() => setSelectedAnnouncement(promo)} className="bg-gradient-to-br from-[#1a2b4c] to-[#0a192f] rounded-[20px] h-52 md:h-60 overflow-hidden relative shadow-[0_8px_20px_rgba(0,0,0,0.06)] group cursor-pointer">
                <img src={promo.imageUrl ? `https://api.aloshipp.com${promo.imageUrl}` : '/default_promo.png'} alt="Promo" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-5 left-5 right-5">
                  <span className="inline-block bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded mb-2 uppercase">CHƯƠNG TRÌNH</span>
                  <h3 className="text-white font-bold text-lg leading-tight">{promo.title || 'Chiết khấu hấp dẫn'}</h3>
                </div>
              </div>
            )) : (
              // Mẫu mặc định nếu không có từ API
              <>
                <div className="bg-gradient-to-br from-[#3b4b6b] to-[#1e2a45] rounded-[20px] h-52 md:h-60 overflow-hidden relative shadow-[0_8px_20px_rgba(0,0,0,0.06)] group cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a192f] to-transparent opacity-80"></div>
                  <div className="absolute bottom-5 left-5 right-5">
                    <span className="inline-block bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded mb-2 uppercase">GIẢM 50%</span>
                    <h3 className="text-white font-bold text-lg leading-tight">Đồng giá 15k nội thành cho Shop</h3>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* CỘT TIN TỨC (Bên phải) */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Tin tức Cửa hàng</h2>
          </div>
          
          <div className="bg-white rounded-[20px] p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col gap-5 h-full justify-start">
            {news.length > 0 ? news.slice(0, 3).map((item, idx) => (
              <div key={idx} onClick={() => setSelectedAnnouncement(item)} className="flex gap-4 cursor-pointer group">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm">
                  <img src={item.imageUrl ? `https://api.aloshipp.com${item.imageUrl}` : '/default_news.png'} alt="News" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="flex flex-col justify-center flex-1">
                  <h4 className="text-sm md:text-[15px] font-bold text-gray-800 mb-2 leading-tight group-hover:text-blue-600 transition-colors line-clamp-3">
                    {item.title}
                  </h4>
                  <span className="text-[11px] text-gray-400 font-medium">Bản tin AloShipp</span>
                </div>
              </div>
            )) : (
              // Mẫu mặc định nếu API rỗng
              <>
                <div className="flex gap-4 cursor-pointer group">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-400 shadow-sm">
                    <Newspaper size={32} />
                  </div>
                  <div className="flex flex-col justify-center flex-1">
                    <h4 className="text-sm md:text-[15px] font-bold text-gray-800 mb-2 leading-tight group-hover:text-blue-600 transition-colors line-clamp-3">Chính sách đồng giá giao hàng mới nhất cho Shop</h4>
                    <span className="text-[11px] text-gray-400 font-medium mt-1">Hệ thống AloShipp</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* DANH SÁCH ĐƠN HÀNG GẦN ĐÂY */}
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Đơn hàng gần đây</h2>
          <button 
            onClick={() => navigate('/shop/activity')}
            className="text-xs md:text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-full"
          >
            Xem tất cả ›
          </button>
        </div>

        <div className="space-y-4">
          {orders.slice(0, 5).map(order => (
            <div 
              key={order._id} 
              onClick={() => navigate(`/shop/order/${order._id}`)}
              className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between hover:shadow-md transition-all shadow-sm cursor-pointer group"
            >
              <div className="flex-1 overflow-hidden pr-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-bold">{new Date(order.createdAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${order.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : order.status === 'PENDING' ? 'bg-blue-50 text-blue-600' : order.status === 'DRAFT' ? 'bg-purple-50 text-purple-600' : order.status === 'CANCELLED' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                    {order.status === 'DRAFT' ? 'Chờ Báo Giá' : order.status === 'PENDING' ? 'Chờ Xế' : order.status === 'DELIVERING' ? 'Đang Giao' : order.status}
                  </span>
                </div>
                <p className="text-[15px] md:text-base font-bold text-gray-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{order.deliveryAddress || 'Chưa rõ điểm đến'}</p>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-[13px] font-semibold text-gray-500">Phí: {order.deliveryFee ? order.deliveryFee.toLocaleString('vi-VN') + 'đ' : 'Chưa có'}</p>
                  <p className="text-[13px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">COD: {order.codAmount ? order.codAmount.toLocaleString('vi-VN') + 'đ' : '0đ'}</p>
                </div>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-blue-500 transition-colors" />
            </div>
          ))}
          {orders.length === 0 && (
            <div className="text-center py-12 bg-white rounded-[20px] border border-gray-100 border-dashed border-2">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <PackageX size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-500 text-base font-medium">Chưa có đơn hàng nào gần đây</p>
              <button 
                onClick={() => navigate('/shop/book/delivery')}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform"
              >
                Tạo Đơn Ngay
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FULLSCREEN MAP LOCATION PICKER OVERLAY */}
      {showLocationPicker && (
        <LocationPicker 
          isOpen={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSelect={handleLocationSelect}
          initialPosition={null}
        />
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
                 <div className="w-full h-40 bg-gradient-to-br from-blue-500 to-indigo-600"></div>
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

    </motion.div>
  );
};

export default ShopDashboard;
