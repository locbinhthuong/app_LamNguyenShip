import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';
import { api } from '../../services/api';
import DeliveryForm from '../../components/booking/DeliveryForm';

export default function ShopBookingFlow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = React.useRef(false);
  const [defaultLocation, setDefaultLocation] = useState(null);
  const [shopPhone, setShopPhone] = useState('');

  useEffect(() => {
    // Tải dữ liệu Customer (Shop) từ LocalStorage
    const customerData = JSON.parse(localStorage.getItem('customerData') || '{}');
    let loc = null;

    const savedLoc = localStorage.getItem('savedShopLocation');
    if (savedLoc) {
      loc = JSON.parse(savedLoc);
    } else if (customerData.defaultLocation && customerData.defaultLocation.lat) {
      loc = customerData.defaultLocation;
    } else {
      const savedAddress = localStorage.getItem('shopAddress');
      if (savedAddress) {
        loc = { address: savedAddress, lat: null, lng: null };
      }
    }
    setDefaultLocation(loc);
    
    const phone = customerData.phone || localStorage.getItem('shopPhone') || '';
    setShopPhone(phone);
  }, []);

  const handleBookingSubmit = async (payload) => {
    if (isSubmittingRef.current) return;
    
    // Tự động gán thông tin Mặc định của Cửa hàng nếu người dùng để trống
    const customerData = JSON.parse(localStorage.getItem('customerData') || '{}');
    if (!payload.senderPhone) {
      payload.senderPhone = shopPhone || customerData.phone || '';
    }
    if (!payload.pickupAddress) {
      const savedLoc = localStorage.getItem('savedShopLocation');
      if (savedLoc) {
        const loc = JSON.parse(savedLoc);
        payload.pickupAddress = loc.address;
        if (loc.lat) payload.pickupCoordinates = { lat: loc.lat, lng: loc.lng };
      } else if (customerData.defaultLocation && customerData.defaultLocation.lat) {
        payload.pickupAddress = customerData.defaultLocation.address;
        payload.pickupCoordinates = { lat: customerData.defaultLocation.lat, lng: customerData.defaultLocation.lng };
      } else {
        payload.pickupAddress = localStorage.getItem('shopAddress') || '';
      }
    }

    if (!payload.pickupAddress || !payload.senderPhone) {
      return alert('Vui lòng cung cấp Địa chỉ và SĐT lấy hàng hoặc Cài đặt định vị gốc trong trang Thông tin.');
    }

    if (!payload.receiverName || !payload.receiverPhone || !payload.deliveryAddress) {
      return alert('Vui lòng nhập đầy đủ Tên, SĐT Khách nhận và Địa chỉ giao hàng!');
    }

    isSubmittingRef.current = true;
    setLoading(true);
    let isSuccess = false;
    
    try {
      // Ghi đè tên người gửi bằng tên Shop
      payload.senderName = localStorage.getItem('shopName') || 'Cửa hàng';
      
      const res = await api.post('/orders/customer', payload);
      if (res.data.success) {
        isSuccess = true;
        
        // Lưu lại làm mặc định nếu đây là lần đầu tiên tạo đơn
        if (!localStorage.getItem('shopAddress')) localStorage.setItem('shopAddress', payload.pickupAddress);
        if (!localStorage.getItem('shopPhone')) localStorage.setItem('shopPhone', payload.senderPhone);
        
        alert('Tạo đơn hàng thành công! Đơn hàng đang được Tổng Đài báo giá phí giao và điều phối xe.');
        navigate('/shop');
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi tạo đơn: ' + (error.response?.data?.message || 'Vui lòng thử lại.'));
    } finally {
      if (!isSuccess) {
        isSubmittingRef.current = false;
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto bg-gray-50 font-sans overflow-hidden md:border-x border-gray-100 md:shadow-sm">
      {/* HEADER */}
      <div className="shrink-0 bg-white px-4 py-3 safe-pt z-40 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 active:scale-90 transition-transform">
          <ArrowLeft size={22} />
        </button>
        <span className="font-bold text-gray-800 flex-1 text-center pr-8 whitespace-nowrap overflow-hidden text-ellipsis text-lg">
          Tạo Đơn Giao Hàng
        </span>
      </div>

      {/* NỘI DUNG FORM */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto p-4 animate-fadeIn">
        <DeliveryForm 
          onBooking={handleBookingSubmit} 
          loading={loading} 
          defaultLocation={defaultLocation} 
          defaultPhone={shopPhone} 
        />
      </div>
    </div>
  );
}
