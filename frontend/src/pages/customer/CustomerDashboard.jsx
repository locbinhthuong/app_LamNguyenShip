import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Package, CarFront, ShoppingBag, Headset, ChevronRight, Newspaper, Gift, Utensils, Truck, AlertCircle, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import LocationPicker from '../../components/LocationPicker';
import AccountVerificationModal from '../../components/AccountVerificationModal';
import { ShieldAlert } from 'lucide-react';
import { getActiveAnnouncements, getMyOrders, api, getFullImageUrl } from '../../services/api';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState('Đang tìm vị trí...');
  const [locationDetails, setLocationDetails] = useState(null); // {lat, lng, address}
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [listModalType, setListModalType] = useState(null); // 'PROMO' | 'NEWS' | null
  const [activeOrders, setActiveOrders] = useState([]);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [customerData, setCustomerData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('customerData') || '{}');
    } catch (e) {
      return {};
    }
  });
  const [customerName, setCustomerName] = useState(() => {
    try {
      const savedUser = JSON.parse(localStorage.getItem('customerData') || '{}');
      return savedUser.name || '';
    } catch (e) {
      return '';
    }
  });
  const isAuthenticated = !!localStorage.getItem('customerToken');

  const promotions = announcements.filter(a => a.type === 'PROMO');
  const news = announcements.filter(a => a.type === 'NEWS');
  const banners = announcements.filter(a => a.type === 'BANNER');

  useEffect(() => {
    // Ưu tiên đọc từ sessionStorage (vị trí tạm thời trong phiên làm việc)
    const saved = sessionStorage.getItem('savedLocation');
    if (saved) {
      try {
        const loc = JSON.parse(saved);
        if (loc && loc.lat && loc.lng) {
          setLocationDetails(loc);
          const shortAddress = (loc.address || '').split(',').slice(0, 3).join(', ');
          setAddress(shortAddress || 'Vị trí đã chọn');
          return;
        }
      } catch (e) {}
    }

    const detectLocation = async () => {
      try {
        let lat, lng;
        if (Capacitor.isNativePlatform()) {
          const perm = await Geolocation.checkPermissions();
          if (perm.location !== 'granted') {
            await Geolocation.requestPermissions();
          }
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 7000 });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } else if ('geolocation' in navigator) {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 6000,
              maximumAge: 30000
            });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } else {
          setAddress('Trình duyệt không hỗ trợ GPS');
          return;
        }

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
            const fallbackAddr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            setAddress('Vị trí hiện tại của bạn');
            const locData = { lat, lng, address: fallbackAddr };
            setLocationDetails(locData);
            sessionStorage.setItem('savedLocation', JSON.stringify(locData));
          }
        } catch (error) {
          const locData = { lat, lng, address: 'Vị trí hiện tại của bạn' };
          setAddress('Vị trí hiện tại của bạn');
          setLocationDetails(locData);
          sessionStorage.setItem('savedLocation', JSON.stringify(locData));
        }
      } catch (err) {
        setAddress('Chưa cấp quyền GPS. Bấm để chọn vị trí.');
      }
    };

    detectLocation();
  }, []);

  // Lấy đơn hàng đang diễn ra để hiển thị thanh theo dõi nhanh trên Trang chủ
  useEffect(() => {
    if (!isAuthenticated) {
      setActiveOrders([]);
      return;
    }

    const fetchOngoingOrders = async () => {
      try {
        const res = await getMyOrders();
        if (res && res.success && Array.isArray(res.data)) {
          const ongoing = res.data.filter(o =>
            ['DRAFT', 'WAITING_SHOP', 'PENDING', 'ACCEPTED', 'PICKED_UP', 'DELIVERING'].includes(o.status)
          );
          setActiveOrders(ongoing);
        }
      } catch (err) {
        console.error('Lỗi lấy đơn đang chạy:', err);
      }
    };

    fetchOngoingOrders();

    const handleRefreshOrders = () => fetchOngoingOrders();
    window.addEventListener('refresh_orders_data', handleRefreshOrders);
    window.addEventListener('order_deleted_event', handleRefreshOrders);
    return () => {
      window.removeEventListener('refresh_orders_data', handleRefreshOrders);
      window.removeEventListener('order_deleted_event', handleRefreshOrders);
    };
  }, [isAuthenticated]);

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
    const shortAddress = (loc.address || '').split(',').slice(0, 3).join(', ');
    setAddress(shortAddress || 'Vị trí đã chọn');
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (isAuthenticated) {
        try {
          const res = await api.get('/auth/customer/me');
          if (res.data && res.data.success) {
            setCustomerName(res.data.data.name);
            localStorage.setItem('customerData', JSON.stringify(res.data.data));
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
      return;
    }

    const currentCust = JSON.parse(localStorage.getItem('customerData') || '{}');
    if (currentCust.verificationStatus && currentCust.verificationStatus !== 'VERIFIED') {
      setShowVerificationModal(true);
      return;
    }

    if (serviceType === 'ALOFOOD') {
      navigate('/alofood');
    } else {
      navigate(`/customer/book/${serviceType}`);
    }
  };

  const getActiveOrderLabel = (order) => {
    if (order.status === 'DRAFT') {
      if (order.adminReviewed && order.deliveryFee > 0) {
        return {
          title: `💰 Đã có báo giá: ${order.deliveryFee.toLocaleString('vi-VN')}đ`,
          subtitle: 'Bấm vào đây để xác nhận đặt đơn ngay!',
          urgent: true
        };
      }
      return {
        title: '⏳ Tổng đài đang tính phí cho đơn của bạn',
        subtitle: `Mã đơn #${order.orderCode || order._id.slice(-6).toUpperCase()}`,
        urgent: false
      };
    }
    if (order.status === 'WAITING_SHOP') {
      return {
        title: '🍲 Đang chờ quán xác nhận đơn đồ ăn',
        subtitle: order.pickupAddress || 'AloFood',
        urgent: false
      };
    }
    if (order.status === 'PENDING') {
      return {
        title: '🔍 Hệ thống đang tìm tài xế gần bạn...',
        subtitle: order.deliveryAddress || order.pickupAddress,
        urgent: false
      };
    }
    if (order.status === 'ACCEPTED') {
      const driverName = order.assignedTo?.name || 'Tài xế';
      const plate = order.assignedTo?.licensePlate || order.assignedTo?.vehiclePlate || '';
      return {
        title: order.serviceType === 'DAT_XE' ? `🛵 ${driverName} đang đến đón bạn` : `🛵 ${driverName} đang đi lấy hàng`,
        subtitle: plate ? `Biển số: ${plate} • Bấm để xem bản đồ` : 'Bấm để theo dõi vị trí tài xế',
        urgent: false
      };
    }
    return {
      title: order.serviceType === 'DAT_XE' ? '🚀 Đang trong hành trình di chuyển' : '🚀 Tài xế đang giao hàng đến bạn',
      subtitle: order.assignedTo?.name ? `Tài xế: ${order.assignedTo.name} • Xem bản đồ trực tiếp` : 'Bấm để xem lộ trình trực tiếp',
      urgent: false
    };
  };

  const primaryActiveOrder = activeOrders[0] || null;
  const activeOrderInfo = primaryActiveOrder ? getActiveOrderLabel(primaryActiveOrder) : null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="pb-10 pt-4 px-4 md:px-8 max-w-7xl mx-auto bg-[#fafafa] relative"
    >
      {/* HEADER: Địa điểm của tôi */}
      <div 
        onClick={() => setShowLocationPicker(true)}
        className="bg-white/90 backdrop-blur-md p-4 safe-pt sticky top-0 z-50 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform duration-300 ease-out mb-4 rounded-xl shadow-sm border border-gray-100"
      >
        <div className="text-blue-500 bg-blue-50 p-2.5 rounded-full shadow-sm flex-shrink-0 animate-bounce">
          <MapPin size={22} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center gap-1 text-gray-500 mb-0.5">
            <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">Vị trí của bạn</span>
            <ChevronRight size={14} className="opacity-50 text-blue-600" />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[14px] font-bold text-gray-800 line-clamp-1 truncate block leading-tight">{address}</span>
          </div>
        </div>
      </div>

      {/* THANH NỔI ĐƠN HÀNG ĐANG DIỄN RA (LIVE ACTIVE ORDER BAR) */}
      <AnimatePresence>
        {primaryActiveOrder && activeOrderInfo && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            onClick={() => navigate(`/customer/order/${primaryActiveOrder._id}`)}
            className={`mb-5 p-4 rounded-2xl cursor-pointer shadow-md border transition-all active:scale-[0.99] flex items-center justify-between gap-3 ${
              activeOrderInfo.urgent
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400 animate-pulse'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                {activeOrderInfo.urgent ? <AlertCircle size={22} className="text-white" /> : <Truck size={22} className="text-white" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                    Đơn đang chạy {activeOrders.length > 1 ? `(+${activeOrders.length - 1})` : ''}
                  </span>
                </div>
                <h4 className="font-extrabold text-sm md:text-[15px] truncate mt-1">{activeOrderInfo.title}</h4>
                <p className="text-xs text-white/85 truncate mt-0.5">{activeOrderInfo.subtitle}</p>
              </div>
            </div>
            <div className="bg-white text-blue-600 px-3 py-2 rounded-xl text-xs font-extrabold shrink-0 flex items-center gap-1 shadow-sm">
              <span>Theo dõi</span>
              <ChevronRight size={14} />
            </div>
            {/* Modal Xác Minh Tài Khoản */}
      {showVerificationModal && (
        <AccountVerificationModal 
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          user={customerData}
          onVerifiedSuccess={(updated) => {
            setCustomerData(prev => ({ ...prev, ...updated }));
          }}
        />
      )}
    </motion.div>
        )}
      </AnimatePresence>

      {/* LỜI CHÀO GREETING */}
      <div className="mb-6 mt-1 px-1">
        <h2 className="text-lg md:text-xl font-medium text-gray-600 leading-tight">
          {getGreeting()}, <span className="font-bold text-blue-600">{customerName || 'Khách hàng'}</span>!
        </h2>
        <motion.div 
          className="text-[13px] md:text-[15px] font-extrabold mt-0.5 tracking-tight bg-gradient-to-r from-blue-600 via-orange-500 to-blue-600 bg-[length:200%_auto] text-transparent bg-clip-text drop-shadow-sm"
          animate={{ backgroundPosition: ['0% center', '200% center'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          Chúng tôi luôn sẵn sàng phục vụ bạn mọi lúc, mọi nơi 🚀
        </motion.div>
      </div>

      {/* BANNER CẢNH BÁO XÁC MINH TÀI KHOẢN (CHỐNG BOM HÀNG) */}
      {customerData.verificationStatus && customerData.verificationStatus !== 'VERIFIED' && (
        <div 
          onClick={() => setShowVerificationModal(true)}
          className={`mb-6 p-4 rounded-2xl cursor-pointer border flex items-center justify-between gap-3 transition-all active:scale-[0.99] ${
            customerData.verificationStatus === 'PENDING'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : customerData.verificationStatus === 'REJECTED'
              ? 'bg-red-50 border-red-300 text-red-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              customerData.verificationStatus === 'PENDING' ? 'bg-amber-500 text-white animate-pulse' : 'bg-blue-600 text-white'
            }`}>
              <ShieldAlert size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-extrabold text-sm truncate">
                {customerData.verificationStatus === 'PENDING' 
                  ? '⏳ Đang chờ Admin xác minh SĐT/Zalo'
                  : customerData.verificationStatus === 'REJECTED'
                  ? '⚠️ Yêu cầu xác minh bị từ chối'
                  : '🛡️ Tài khoản chưa xác minh SĐT'}
              </h4>
              <p className="text-xs opacity-85 truncate mt-0.5">
                {customerData.verificationStatus === 'PENDING'
                  ? 'Nhấn vào đây để xem chi tiết hoặc liên hệ Admin duyệt ngay'
                  : 'Bấm để xác nhận số chính chủ và mở khóa đặt đơn'}
              </p>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-white text-blue-600 rounded-xl text-xs font-extrabold shadow-sm shrink-0 border border-blue-200">
            Chi tiết
          </div>
        </div>
      )}

      {/* DỊCH VỤ NỔI BẬT */}
      <div className="mb-10">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">Dịch vụ nổi bật</h2>
        <div className="grid grid-cols-4 md:grid-cols-5 gap-3 md:gap-6 lg:gap-8 max-w-4xl mx-auto md:mx-0">
          
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

          {/* ALOFOOD */}
          <div 
            onClick={() => handleServiceClick('ALOFOOD')}
            className="bg-white rounded-[20px] py-4 px-2 flex flex-col items-center justify-center cursor-pointer shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-gray-100 hover:-translate-y-1 transition-transform relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded-bl-lg">HOT</div>
            <div className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-red-50 flex items-center justify-center mb-2.5 text-red-500">
              <Utensils size={22} className="md:w-7 md:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-[13px] md:text-[15px] font-bold text-gray-900 text-center">AloFood</h3>
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

      {/* SLIDER BANNER TỪ ADMIN */}
      {banners.length > 0 && (
        <div className="mb-14">
          <div className="relative w-full h-48 sm:h-[320px] md:h-[400px] lg:h-[460px] rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] bg-slate-50 group flex items-center justify-center">
            <div 
              className="flex w-full h-full transition-transform duration-500 ease-out items-center"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {banners.map(banner => (
                <div key={banner._id} className="w-full h-full flex-shrink-0 relative flex items-center justify-center p-0">
                  {banner.imageUrl && (
                    <img src={getFullImageUrl(banner.imageUrl)} alt="Banner" className="w-full h-full object-cover object-center" />
                  )}
                  {banner.videoUrl && (
                    <video src={getFullImageUrl(banner.videoUrl)} className="w-full h-full object-cover object-center" autoPlay muted loop playsInline />
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

      {/* KHUYẾN MÃI & TIN TỨC (SPLIT LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
        
        {/* CỘT KHUYẾN MÃI (Bên trái) */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Khuyến mãi</h2>
            {promotions.length > 0 && (
              <button
                onClick={() => setListModalType('PROMO')}
                className="text-xs md:text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-full"
              >
                Xem tất cả ({promotions.length}) ›
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 gap-5 lg:gap-6">
            {promotions.length > 0 ? promotions.slice(0, 2).map((promo, idx) => (
              <div key={idx} onClick={() => setSelectedAnnouncement(promo)} className="bg-gradient-to-br from-[#1a2b4c] to-[#0a192f] rounded-[20px] h-52 md:h-60 overflow-hidden relative shadow-[0_8px_20px_rgba(0,0,0,0.06)] group cursor-pointer">
                {promo.imageUrl ? (
                  <img src={getFullImageUrl(promo.imageUrl)} alt="Promo" className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 flex items-center justify-end pr-8 opacity-80">
                    <Gift size={96} className="text-white/10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-5 left-5 right-5">
                  <span className="inline-block bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded mb-2 uppercase">ƯU ĐÃI</span>
                  <h3 className="text-white font-bold text-lg leading-tight">{promo.title || 'Chương trình ưu đãi AloShipp'}</h3>
                </div>
              </div>
            )) : (
              <>
                <div className="bg-gradient-to-br from-[#3b4b6b] to-[#1e2a45] rounded-[20px] h-52 md:h-60 overflow-hidden relative shadow-[0_8px_20px_rgba(0,0,0,0.06)]">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a192f] to-transparent opacity-80"></div>
                  <div className="absolute bottom-5 left-5 right-5">
                    <span className="inline-block bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded mb-2 uppercase">ƯU ĐÃI</span>
                    <h3 className="text-white font-bold text-lg leading-tight">Đồng giá 15k nội thành</h3>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-[#2a3b5c] to-[#0a192f] rounded-[20px] h-52 md:h-60 overflow-hidden relative shadow-[0_8px_20px_rgba(0,0,0,0.06)]">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a192f] to-transparent opacity-80"></div>
                  <div className="absolute bottom-5 left-5 right-5">
                    <span className="inline-block bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded mb-2 uppercase">TIỆN ÍCH</span>
                    <h3 className="text-white font-bold text-lg leading-tight">Đặt món AloFood giao tận nơi siêu tốc</h3>
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
            {news.length > 0 && (
              <button
                onClick={() => setListModalType('NEWS')}
                className="text-xs md:text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-full"
              >
                Chi tiết ({news.length}) ›
              </button>
            )}
          </div>
          
          <div className="bg-white rounded-[20px] p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col gap-5 h-full justify-center">
            {news.length > 0 ? news.slice(0, 2).map((item, idx) => (
              <div key={idx} onClick={() => setSelectedAnnouncement(item)} className="flex gap-4 cursor-pointer group">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden bg-blue-50 flex-shrink-0 shadow-sm flex items-center justify-center text-blue-500">
                  {item.imageUrl ? (
                    <img src={getFullImageUrl(item.imageUrl)} alt="News" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <Newspaper size={32} />
                  )}
                </div>
                <div className="flex flex-col justify-center flex-1">
                  <h4 className="text-sm md:text-[15px] font-bold text-gray-800 mb-2 leading-tight group-hover:text-blue-600 transition-colors line-clamp-3">
                    {item.title}
                  </h4>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'Mới cập nhật'}
                  </span>
                </div>
              </div>
            )) : (
              <>
                <div className="flex gap-4">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-400 shadow-sm">
                    <Newspaper size={32} />
                  </div>
                  <div className="flex flex-col justify-center flex-1">
                    <h4 className="text-sm md:text-[15px] font-bold text-gray-800 mb-2 leading-tight line-clamp-3">Cập nhật tính năng theo dõi đơn hàng thời gian thực</h4>
                    <span className="text-[11px] text-gray-400 font-medium mt-1">Bản tin AloShipp</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-slate-800 flex-shrink-0 flex items-center justify-center text-white shadow-sm">
                    <Package size={32} />
                  </div>
                  <div className="flex flex-col justify-center flex-1">
                    <h4 className="text-sm md:text-[15px] font-bold text-gray-800 mb-2 leading-tight line-clamp-3">Đội ngũ tài xế AloShipp luôn sẵn sàng phục vụ</h4>
                    <span className="text-[11px] text-gray-400 font-medium mt-1">Bản tin AloShipp</span>
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
          initialLocation={locationDetails}
        />
      )}

      {/* MODAL DANH SÁCH KHUYẾN MÃI / TIN TỨC */}
      {listModalType && (
        <div className="fixed inset-0 z-[95] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={() => setListModalType(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                {listModalType === 'PROMO' ? <><Gift size={20} className="text-orange-500" /> Tất cả Khuyến mãi</> : <><Newspaper size={20} className="text-blue-600" /> Tất cả Tin tức</>}
              </h3>
              <button onClick={() => setListModalType(null)} className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-gray-50">
              {(listModalType === 'PROMO' ? promotions : news).map((item, idx) => (
                <div
                  key={item._id || idx}
                  onClick={() => {
                    setListModalType(null);
                    setSelectedAnnouncement(item);
                  }}
                  className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex gap-3.5 cursor-pointer hover:border-blue-200 active:scale-[0.99] transition-all"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-blue-50 shrink-0 flex items-center justify-center text-blue-500">
                    {item.imageUrl ? (
                      <img src={getFullImageUrl(item.imageUrl)} alt={item.title} className="w-full h-full object-cover" />
                    ) : listModalType === 'PROMO' ? (
                      <Gift size={28} className="text-orange-500" />
                    ) : (
                      <Newspaper size={28} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="font-bold text-gray-800 text-sm line-clamp-2">{item.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.content}</p>
                    <span className="text-[10px] text-gray-400 mt-1.5">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
                 <video src={getFullImageUrl(selectedAnnouncement.videoUrl)} className="w-full bg-black max-h-[300px]" controls playsInline autoPlay />
              ) : selectedAnnouncement.imageUrl ? (
                 <img src={getFullImageUrl(selectedAnnouncement.imageUrl)} className="w-full h-auto block" alt="Chi tiết" />
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
