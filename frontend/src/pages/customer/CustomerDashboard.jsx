import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Bell, User, Clock, Package, CarFront, ShoppingBag, Headset, ChevronRight, TicketPercent } from 'lucide-react';
import LocationPicker from '../../components/LocationPicker';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState('Đang tìm vị trí...');
  const [locationDetails, setLocationDetails] = useState(null); // {lat, lng, address}
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const isAuthenticated = !!localStorage.getItem('customerToken');

  useEffect(() => {
    // Ưu tiên đọc từ LocalStorage
    const saved = localStorage.getItem('savedLocation');
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
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (data && data.display_name) {
              const shortAddress = data.display_name.split(',').slice(0, 3).join(', ');
              setAddress(shortAddress);
              const locData = { lat, lng, address: data.display_name };
              setLocationDetails(locData);
              localStorage.setItem('savedLocation', JSON.stringify(locData));
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

  const handleLocationSelect = (loc) => {
    setLocationDetails(loc);
    localStorage.setItem('savedLocation', JSON.stringify(loc));
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
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20 relative font-sans">
      
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

      {/* BANNER KHUYẾN MÃI / QUẢNG CÁO */}
      <div className="px-4 py-4">
        <div className="w-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden h-36 flex flex-col justify-center">
          <div className="absolute -right-4 -bottom-4 opacity-20 transform rotate-12">
            <Package size={120} />
          </div>
          <h2 className="text-xl font-extrabold mb-1 relative z-10 w-2/3">Giao Hỏa Tốc<br/>Mọi Nẻo Đường</h2>
          <p className="text-xs opacity-90 relative z-10">AloShipp - Nhanh chóng & An toàn</p>
          <button className="mt-3 bg-white text-blue-600 text-xs font-bold px-4 py-1.5 rounded-full w-max shadow-sm relative z-10">
            Xem ngay
          </button>
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
          <div className="grid grid-cols-4 gap-y-6 gap-x-2">
            {services.map((svc) => (
              <div 
                key={svc.id} 
                onClick={() => handleServiceClick(svc.id)}
                className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform group"
              >
                {/* Vòng tròn Icon */}
                <div className={`w-[60px] h-[60px] rounded-full flex items-center justify-center text-3xl shadow-sm border-2 border-white ring-1 ring-gray-100 group-hover:ring-blue-200 ${svc.color}`}>
                  {svc.icon}
                </div>
                {/* Tên dịch vụ */}
                <span className="text-[11px] font-semibold text-gray-700 text-center leading-tight w-full">
                  {svc.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION KHUYẾN MÃI */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 text-lg">Khuyến mãi</h3>
          <span className="text-blue-600 text-sm font-medium">Xem tất cả</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
          {/* Mockup Card 1 */}
          <div className="min-w-[140px] bg-red-50 rounded-xl p-3 border border-red-100 flex-shrink-0">
            <div className="text-red-600 mb-1"><TicketPercent size={24}/></div>
            <p className="font-bold text-sm text-red-800">Giảm 20K</p>
            <p className="text-xs text-red-600 mt-1">Cho đơn đầu tiên</p>
          </div>
          {/* Mockup Card 2 */}
          <div className="min-w-[140px] bg-green-50 rounded-xl p-3 border border-green-100 flex-shrink-0">
            <div className="text-green-600 mb-1"><TicketPercent size={24}/></div>
            <p className="font-bold text-sm text-green-800">Freeship 5km</p>
            <p className="text-xs text-green-600 mt-1">Dịch vụ Đi Chợ</p>
          </div>
        </div>
      </div>

      {/* FULLSCREEN MAP LOCATION PICKER OVERLAY */}
      {showLocationPicker && (
        <LocationPicker 
          isOpen={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSelect={handleLocationSelect}
          initialPosition={locationDetails ? [locationDetails.lat, locationDetails.lng] : null}
        />
      )}
      
    </div>
  );
};

export default CustomerDashboard;
