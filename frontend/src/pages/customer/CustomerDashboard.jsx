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

      {/* FOOTER */}
      <div className="mt-8 mb-6 p-6 rounded-[24px] bg-blue-50/50 text-center">
        <p className="text-sm font-medium text-gray-500 mb-4">Chúng tôi hân hạnh phục vụ quý khách tại:</p>
        <div className="flex justify-center items-center gap-6">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </div>
            <span className="text-[10px] font-semibold text-gray-500">Facebook</span>
          </a>
          <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-all shadow-sm">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
            </div>
            <span className="text-[10px] font-semibold text-gray-500">TikTok</span>
          </a>
          <a href="https://zalo.me" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all shadow-sm font-bold text-sm">
              Zalo
            </div>
            <span className="text-[10px] font-semibold text-gray-500">Zalo</span>
          </a>
          <a href="tel:1900xxxx" className="flex flex-col items-center gap-1 group">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all shadow-sm">
              <Phone size={18} />
            </div>
            <span className="text-[10px] font-semibold text-gray-500">Hotline</span>
          </a>
        </div>
      </div>
    </motion.div>
  );
};

export default CustomerDashboard;
