import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Bell, User, Clock, Package, CarFront, ShoppingBag, Headset, ChevronRight, TicketPercent, Volume2, VolumeX, Bike, ShoppingCart, Newspaper, Gift } from 'lucide-react';
import LocationPicker from '../../components/LocationPicker';
import { getActiveAnnouncements } from '../../services/api';

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

  const handleServiceClick = (serviceType) => {
    if (!isAuthenticated) {
      localStorage.setItem('intendedService', serviceType);
      navigate('/login');
    } else {
      navigate(`/customer/book/${serviceType}`);
    }
  };

  const services = [
    { id: 'GIAO_HANG', name: 'Giao hàng', icon: <Package size={32} className="text-slate-600" strokeWidth={1.5} />, color: 'bg-white border border-slate-200' },
    { id: 'DAT_XE', name: 'Đặt xe', icon: <Bike size={32} className="text-slate-600" strokeWidth={1.5} />, color: 'bg-white border border-slate-200' },
    { id: 'MUA_HO', name: 'Mua hộ', icon: <ShoppingCart size={32} className="text-slate-600" strokeWidth={1.5} />, color: 'bg-white border border-slate-200' },
    { id: 'DIEU_PHOI', name: 'Điều phối', icon: <Headset size={32} className="text-slate-600" strokeWidth={1.5} />, color: 'bg-white border border-slate-200' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20 relative font-sans w-full max-w-7xl mx-auto">
      
      {/* HEADER: Địa điểm của tôi */}
      <div 
        onClick={() => setShowLocationPicker(true)}
        className="bg-white px-4 py-3 sticky top-0 z-50 flex items-center justify-between cursor-pointer active:bg-gray-50"
      >
        <div className="flex flex-col flex-1 overflow-hidden mr-4">
          <div className="flex items-center gap-1 text-gray-500 mb-0.5">
            <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-600">📍 Kéo ghim</span>
            <ChevronRight size={14} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-gray-800 line-clamp-1 truncate block">{address}</span>
            <div className="bg-blue-100 text-blue-600 p-1 rounded">
              <span className="text-[10px] uppercase font-bold tracking-wider">Chọn</span>
            </div>
          </div>
        </div>
      </div>



      {/* THÔNG BÁO CẬP NHẬT ĐỊNH VỊ */}
      <div className="px-4 pb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
          <div className="mt-0.5 text-blue-500 animate-bounce">
            <MapPin size={20} />
          </div>
          <div>
            <h4 className="text-[11px] font-extrabold text-blue-800 uppercase tracking-wide mb-0.5">Lưu ý trước khi Đặt Đơn</h4>
            <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
              Vui lòng chạm vào thanh <strong>"📍 Kéo ghim"</strong> ở trên cùng để kiểm tra và định vị chính xác vị trí của bạn trên bản đồ giúp tài xế tìm đến nhanh hơn nhé!
            </p>
          </div>
        </div>
      </div>

      {/* DANH SÁCH DỊCH VỤ (GRID) */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {services.map((svc) => (
            <div 
              key={svc.id} 
              onClick={() => handleServiceClick(svc.id)}
              className={`flex flex-col items-center justify-center gap-3 py-5 rounded-2xl cursor-pointer active:scale-95 transition-all shadow-sm hover:shadow-md ${svc.color}`}
            >
              <div className="text-slate-600">
                {svc.icon}
              </div>
              <span className="text-[13px] font-bold text-slate-700">{svc.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SLIDER BANNER TỪ ADMIN */}
      {banners.length > 0 && (
        <div className="px-4 mb-6">
          <div className="relative w-full h-36 sm:h-44 rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-slate-50 group flex items-center justify-center">
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
        </div>
      )}

      {/* SECTION KHUYẾN MÃI */}
      {promotions.length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
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
                  <div className="w-full h-40 bg-gradient-to-br from-red-500 to-orange-500 p-4 flex flex-col justify-center text-white">
                    <TicketPercent size={32} className="opacity-50 absolute right-2 top-2" />
                    <h4 className="font-black text-base line-clamp-2">{ann.title}</h4>
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
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-lg">Tin Tức</h3>
            <span className="text-blue-600 text-sm font-medium cursor-pointer">Xem tất cả</span>
          </div>
          <div className="flex flex-col gap-3">
            {news.map((ann, idx) => (
              <div 
                key={ann._id} 
                onClick={() => setSelectedAnnouncement(ann)}
                className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                  {ann.imageUrl ? (
                    <img src={`https://api.aloshipp.com${ann.imageUrl}`} className="w-full h-full object-cover" alt="Tin tức" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Newspaper size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-4 relative">
                  <p className="font-bold text-slate-800 text-sm line-clamp-2 leading-relaxed group-hover:text-slate-600 transition-colors">
                    {ann.title}
                  </p>
                  <span className="absolute right-2 bottom-2 opacity-10 text-slate-400">
                    <Newspaper size={40} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      
    </div>
  );
};

export default CustomerDashboard;
