import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Bell, User, Clock, Package, CarFront, ShoppingBag, Headset, ChevronRight, TicketPercent, Volume2, VolumeX } from 'lucide-react';
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

  // Tự động trượt Bảng Tin mỗi 5 giây
  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [announcements]);

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
    { id: 'GIAO_HANG', name: 'Giao hàng', icon: '📦', color: 'bg-blue-100 text-blue-600' },
    { id: 'DAT_XE', name: 'Đặt xe', icon: '🛵', color: 'bg-sky-100 text-sky-600' },
    { id: 'MUA_HO', name: 'Mua hộ', icon: '🛒', color: 'bg-indigo-100 text-indigo-600' },
    { id: 'DIEU_PHOI', name: 'Điều phối', icon: '🎧', color: 'bg-teal-100 text-teal-600' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20 relative font-sans w-full max-w-7xl mx-auto">
      
      {/* HEADER: Địa điểm của tôi */}
      <div 
        onClick={() => setShowLocationPicker(true)}
        className="bg-white px-4 py-3 sticky top-0 z-50 shadow-sm flex items-center justify-between cursor-pointer active:bg-gray-50"
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
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-3 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
          <div className="mt-0.5 text-orange-500 animate-bounce">
            <MapPin size={20} />
          </div>
          <div>
            <h4 className="text-[11px] font-extrabold text-orange-800 uppercase tracking-wide mb-0.5">Lưu ý trước khi Đặt Đơn</h4>
            <p className="text-[11px] text-orange-700 leading-relaxed font-medium">
              Vui lòng chạm vào thanh <strong>"📍 Kéo ghim"</strong> ở trên cùng để kiểm tra và định vị chính xác vị trí của bạn trên bản đồ giúp tài xế tìm đến nhanh hơn nhé!
            </p>
          </div>
        </div>
      </div>

      {/* DANH SÁCH DỊCH VỤ (GRID) */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-y-6 gap-x-2 md:gap-x-8 md:gap-y-8">
            {services.map((svc) => (
              <div 
                key={svc.id} 
                onClick={() => handleServiceClick(svc.id)}
                className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform group"
              >
                {/* Vòng tròn Icon */}
                <div className="w-[60px] h-[60px] md:w-[80px] md:h-[80px] rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-sm border-2 border-white ring-1 ring-gray-100 group-hover:ring-blue-200 transition-all ${svc.color}">
                  {svc.icon}
                </div>
                {/* Tên dịch vụ */}
                <span className="text-[11px] md:text-sm font-semibold text-gray-700 text-center leading-tight w-full mt-1 md:mt-2">
                  {svc.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
                className="w-48 md:w-64 bg-white rounded-2xl border border-red-100 flex-shrink-0 shadow-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-all active:scale-95"
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
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-4 px-4">
            {news.map((ann, idx) => (
              <div 
                key={ann._id} 
                onClick={() => setSelectedAnnouncement(ann)}
                className="w-40 md:w-56 bg-white rounded-2xl border border-blue-100 flex-shrink-0 shadow-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-all active:scale-95"
              >
                {ann.imageUrl ? (
                  <img src={`https://api.aloshipp.com${ann.imageUrl}`} className="w-full h-36 object-cover bg-gray-100" alt="Tin tức" />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-blue-500 to-indigo-600 p-3 flex flex-col justify-center text-white relative">
                    <span className="text-4xl absolute right-2 bottom-2 opacity-20">📰</span>
                    <h4 className="font-black text-sm line-clamp-2">{ann.title}</h4>
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
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1 block">
                  {selectedAnnouncement.type === 'PROMO' ? '🎁 Khuyến Mãi' : '📰 Tin Tức'} • {new Date(selectedAnnouncement.createdAt).toLocaleDateString('vi-VN')}
                </span>
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
