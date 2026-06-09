import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Search, Bell, User, Clock, Package, CarFront, ShoppingBag, Headset, ChevronRight, TicketPercent, Volume2, VolumeX, Bike, ShoppingCart, Newspaper, Gift, Phone } from 'lucide-react';
import LocationPicker from '../../components/LocationPicker';
import AnnouncementSlider from '../../components/AnnouncementSlider';
import { getActiveAnnouncements, api } from '../../services/api';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState('Đang tìm vị trí...');
  const [locationDetails, setLocationDetails] = useState(null); // {lat, lng, address}
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const isAuthenticated = !!localStorage.getItem('customerToken');

  const promotions = announcements.filter(a => a.type === 'PROMO');
  const news = announcements.filter(a => a.type === 'NEWS');
  const banners = announcements.filter(a => a.type === 'BANNER');

  useEffect(() => {
    const role = localStorage.getItem('customerRole');
    if (role === 'SHOP') {
      navigate('/shop', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    // Ưu tiên đọc từ sessionStorage (vị trí tạm thời trong phiên làm việc)
    const saved = sessionStorage.getItem('savedLocation');
    if (saved) {
      const loc = JSON.parse(saved);
      setLocationDetails(loc);
      const shortAddress = loc.address.split(',').slice(0, 3).join(', ');
      setAddress(shortAddress);
      return;
    }

    // Nếu chưa có, xin quyền vị trí và dịch ra tên đường
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`);
            const data = await res.json();
            if (data && data.display_name) {
              const shortAddress = data.display_name.split(',').slice(0, 3).join(', ');
              setAddress(shortAddress);
              const locData = { lat, lng, address: data.display_name };
              setLocationDetails(locData);
              sessionStorage.setItem('savedLocation', JSON.stringify(locData));
            } else {
              setAddress('Không thể xác định tên đường');
              setLocationDetails({ lat, lng, address: 'Không thể xác định tên đường' });
            }
          } catch (error) {
            setAddress('Vị trí của bạn (Lỗi mạng)');
            setLocationDetails({ lat, lng, address: 'Vị trí của bạn' });
          }
        },
        (err) => {
          setAddress('Chưa cấp quyền GPS. Bấm để chọn.');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setAddress('Trình duyệt không hỗ trợ GPS');
    }
  }, []);

  // Lấy Bảng Tin (Tin Tức & Khuyến Mãi) độc lập
  useEffect(() => {
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
    fetchAnnouncements();
    window.addEventListener('refresh_data', fetchAnnouncements);
    return () => window.removeEventListener('refresh_data', fetchAnnouncements);
  }, []);

  // Tự động trượt Slider mỗi 3 giây
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const handleLocationSelect = (loc) => {
    setLocationDetails(loc);
    sessionStorage.setItem('savedLocation', JSON.stringify(loc));
    // Cắt ngắn để hiển thị trên top bar
    const shortAddress = loc.address.split(',').slice(0, 3).join(', ');
    setAddress(shortAddress);
  };

  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (isAuthenticated) {
        try {
          const res = await api.get('/auth/customer/me');
          if (res.data && res.data.success) {
            setCustomerName(res.data.data.name);
          }
        } catch (error) {
          console.error(error);
        }
      }
    };
    fetchProfile();
  }, [isAuthenticated]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Chào buổi sáng';
    if (hour >= 12 && hour < 14) return 'Chào buổi trưa';
    if (hour >= 14 && hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const handleServiceClick = (serviceType) => {
    if (!isAuthenticated) {
      localStorage.setItem('intendedService', serviceType);
      navigate('/login');
    } else {
      navigate(`/customer/book/${serviceType}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="pb-24 pt-4 px-4 md:px-8 max-w-7xl mx-auto bg-[#fafafa] min-h-screen relative"
    >
      
      {/* HEADER: Địa điểm của tôi */}
      <div 
        onClick={() => setShowLocationPicker(true)}
        className="bg-white/90 backdrop-blur-md px-5 pb-4 pt-3 safe-pt sticky top-0 z-50 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform duration-300 ease-out mb-4 rounded-xl shadow-sm border border-gray-100"
      >
        <div className="flex flex-col flex-1 overflow-hidden mr-4">
          <div className="flex items-center gap-1 text-gray-500 mb-1">
            <span className="text-xs font-medium bg-gray-100/80 px-2.5 py-0.5 rounded-full text-gray-600">📍 Kéo ghim</span>
            <ChevronRight size={14} className="opacity-50" />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[13px] font-bold text-gray-800 line-clamp-1 truncate block leading-tight">{address}</span>
            <div className="bg-blue-100/80 text-blue-600 px-1.5 py-0.5 rounded shadow-sm">
              <span className="text-[10px] uppercase font-bold tracking-wider">Chọn</span>
            </div>
          </div>
        </div>
      </div>

      {/* LỜI CHÀO GREETING & THÔNG BÁO - DESKTOP CHIA CỘT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 mt-2 items-center">
        <div className="px-1">
          <h2 className="text-xl md:text-2xl font-medium text-gray-600">
            {getGreeting()}, <span className="font-bold text-blue-600">{customerName || 'Khách hàng'}</span>!
          </h2>
          <motion.h1 
            className="text-lg md:text-xl font-bold mt-2 tracking-tight text-blue-600"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            Chúng tôi luôn sẵn sàng phục vụ bạn mọi lúc, mọi nơi
          </motion.h1>
        </div>

        <div>
          <div className="bg-blue-50/80 border border-blue-100/50 rounded-xl p-3 flex items-center gap-3 relative overflow-hidden shadow-sm backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-blue-500 rounded-l-full"></div>
            <div className="text-blue-500 bg-white p-1.5 rounded-full shadow-sm flex-shrink-0 animate-bounce">
              <MapPin size={16} />
            </div>
            <div>
              <h4 className="text-[11px] md:text-xs font-extrabold text-blue-800 uppercase tracking-wider mb-0.5">Lưu ý khi đặt đơn</h4>
              <p className="text-[10px] md:text-[11px] text-blue-700/90 leading-snug font-medium">
                Chạm thanh <strong className="bg-blue-100 px-1 py-0.5 rounded">📍 Kéo ghim</strong> ở trên để định vị chính xác vị trí của bạn!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SLIDER BANNER TỪ ADMIN */}
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

      {/* DỊCH VỤ NỔI BẬT (Như mẫu) */}
      <div className="mb-14">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">Dịch vụ nổi bật</h2>
        <div className="grid grid-cols-4 gap-3 md:gap-6 lg:gap-8 max-w-4xl mx-auto md:mx-0">
          
          {/* GIAO HÀNG */}
          <div 
            onClick={() => handleServiceClick('GIAO_HANG')}
            className="bg-white rounded-[20px] py-4 px-2 flex flex-col items-center justify-center cursor-pointer shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-gray-100 hover:-translate-y-1 transition-transform"
          >
            <div className="w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center mb-2.5 text-slate-700">
              <Package size={22} strokeWidth={1.5} />
            </div>
            <h3 className="text-[13px] font-bold text-gray-900 text-center">Giao hàng</h3>
          </div>

          {/* ĐẶT XE */}
          <div 
            onClick={() => handleServiceClick('DAT_XE')}
            className="bg-white rounded-[20px] py-4 px-2 flex flex-col items-center justify-center cursor-pointer shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-gray-100 hover:-translate-y-1 transition-transform"
          >
            <div className="w-11 h-11 rounded-full bg-orange-50 flex items-center justify-center mb-2.5 text-orange-600">
              <CarFront size={22} strokeWidth={1.5} />
            </div>
            <h3 className="text-[13px] font-bold text-gray-900 text-center">Đặt xe</h3>
          </div>

          {/* MUA HỘ */}
          <div 
            onClick={() => handleServiceClick('MUA_HO')}
            className="bg-white rounded-[20px] py-4 px-2 flex flex-col items-center justify-center cursor-pointer shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-gray-100 hover:-translate-y-1 transition-transform"
          >
            <div className="w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center mb-2.5 text-slate-700">
              <ShoppingBag size={22} strokeWidth={1.5} />
            </div>
            <h3 className="text-[13px] font-bold text-gray-900 text-center">Mua hộ</h3>
          </div>

          {/* ĐIỀU PHỐI */}
          <div 
            onClick={() => handleServiceClick('DIEU_PHOI')}
            className="bg-white rounded-[20px] py-4 px-2 flex flex-col items-center justify-center cursor-pointer shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-gray-100 hover:-translate-y-1 transition-transform"
          >
            <div className="w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center mb-2.5 text-slate-700">
              <Headset size={22} strokeWidth={1.5} />
            </div>
            <h3 className="text-[13px] font-bold text-gray-900 text-center">Điều phối</h3>
          </div>

        </div>
      </div>

      {/* KHUYẾN MÃI & TIN TỨC (SPLIT LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        
        {/* CỘT KHUYẾN MÃI (Bên trái, rộng hơn) */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Khuyến mãi</h2>
            <button className="text-xs md:text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-full">Xem tất cả ›</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
            {promotions.length > 0 ? promotions.slice(0, 2).map((promo, idx) => (
              <div key={idx} onClick={() => setSelectedAnnouncement(promo)} className="bg-gradient-to-br from-[#1a2b4c] to-[#0a192f] rounded-[20px] h-48 overflow-hidden relative shadow-[0_8px_20px_rgba(0,0,0,0.06)] group cursor-pointer">
                <img src={promo.imageUrl ? `https://api.aloshipp.com${promo.imageUrl}` : '/default_promo.png'} alt="Promo" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-5 left-5 right-5">
                  <span className="inline-block bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded mb-2 uppercase">GIẢM 50%</span>
                  <h3 className="text-white font-bold text-lg leading-tight">{promo.title || 'Đồng giá 15k nội thành'}</h3>
                </div>
              </div>
            )) : (
              // Mẫu mặc định nếu không có từ API
              <>
                <div className="bg-gradient-to-br from-[#3b4b6b] to-[#1e2a45] rounded-[20px] h-48 overflow-hidden relative shadow-[0_8px_20px_rgba(0,0,0,0.06)] group cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a192f] to-transparent opacity-80"></div>
                  <div className="absolute bottom-5 left-5 right-5">
                    <span className="inline-block bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded mb-2 uppercase">GIẢM 50%</span>
                    <h3 className="text-white font-bold text-lg leading-tight">Đồng giá 15k nội thành</h3>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-[#2a3b5c] to-[#0a192f] rounded-[20px] h-48 overflow-hidden relative shadow-[0_8px_20px_rgba(0,0,0,0.06)] group cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a192f] to-transparent opacity-80"></div>
                  <div className="absolute bottom-5 left-5 right-5">
                    <span className="inline-block bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded mb-2 uppercase">HOÀN TIỀN</span>
                    <h3 className="text-white font-bold text-lg leading-tight">Thanh toán qua ví AloPay</h3>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* CỘT TIN TỨC (Bên phải) */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Tin tức</h2>
            <button className="text-xs md:text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-full">Chi tiết ›</button>
          </div>
          
          <div className="bg-white rounded-[20px] p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col gap-6 h-[calc(100%-4rem)] justify-center">
            {news.length > 0 ? news.slice(0, 3).map((item, idx) => (
              <div key={idx} onClick={() => setSelectedAnnouncement(item)} className="flex gap-4 cursor-pointer group">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={item.imageUrl ? `https://api.aloshipp.com${item.imageUrl}` : '/default_news.png'} alt="News" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex flex-col justify-center">
                  <h4 className="text-[13px] font-bold text-gray-800 mb-1 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-gray-400 font-medium">2 giờ trước</span>
                </div>
              </div>
            )) : (
              // Mẫu mặc định nếu API rỗng
              <>
                <div className="flex gap-4 cursor-pointer group">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-400">
                    <Newspaper size={20} />
                  </div>
                  <div className="flex flex-col justify-center">
                    <h4 className="text-[13px] font-bold text-gray-800 mb-1 leading-tight group-hover:text-blue-600 transition-colors">Cập nhật tính năng theo dõi đơn hàng thời gian thực</h4>
                    <span className="text-[10px] text-gray-400 font-medium mt-1">2 giờ trước</span>
                  </div>
                </div>
                <div className="flex gap-4 cursor-pointer group">
                  <div className="w-14 h-14 rounded-xl bg-slate-800 flex-shrink-0 flex items-center justify-center text-white">
                    <Package size={20} />
                  </div>
                  <div className="flex flex-col justify-center">
                    <h4 className="text-[13px] font-bold text-gray-800 mb-1 leading-tight group-hover:text-blue-600 transition-colors">Mở rộng mạng lưới phủ sóng thêm 15 tỉnh thành mới</h4>
                    <span className="text-[10px] text-gray-400 font-medium mt-1">Hôm qua</span>
                  </div>
                </div>
                <div className="flex gap-4 cursor-pointer group">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-400">
                    <Bell size={20} />
                  </div>
                  <div className="flex flex-col justify-center">
                    <h4 className="text-[13px] font-bold text-gray-800 mb-1 leading-tight group-hover:text-blue-600 transition-colors">Thông báo bảo trì hệ thống định kỳ vào cuối tuần</h4>
                    <span className="text-[10px] text-gray-400 font-medium mt-1">3 ngày trước</span>
                  </div>
                </div>
              </>
            )}
          </div>
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
            {/* Modal Header */}
            <div className="absolute top-3 right-3 z-10 bg-white/50 backdrop-blur rounded-full p-2 cursor-pointer shadow" onClick={() => setSelectedAnnouncement(null)}>
               ✕
            </div>
            {/* Modal Content Scrollable */}
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
            {/* Modal Footer / Action */}
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

export default CustomerDashboard;
