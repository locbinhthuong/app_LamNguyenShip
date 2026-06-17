import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../services/api';
import DeliveryForm from '../../components/booking/DeliveryForm';
import PurchaseForm from '../../components/booking/PurchaseForm';
import BatchedDeliveryForm from '../../components/booking/BatchedDeliveryForm';

export default function ShopBookingFlow() {
  const navigate = useNavigate();
  const { serviceType } = useParams();
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = React.useRef(false);
  const [defaultLocation, setDefaultLocation] = useState(null);
  const [shopPhone, setShopPhone] = useState('');
  const [customerData, setCustomerData] = useState(null);

  useEffect(() => {
    // Tải dữ liệu Customer (Shop) từ LocalStorage
    const cData = JSON.parse(localStorage.getItem('customerData') || '{}');
    setCustomerData(cData);
    let loc = null;

    const savedLoc = localStorage.getItem('savedShopLocation');
    if (savedLoc) {
      loc = JSON.parse(savedLoc);
    } else if (cData.defaultLocation && cData.defaultLocation.lat) {
      loc = cData.defaultLocation;
    } else {
      const savedAddress = localStorage.getItem('shopAddress');
      if (savedAddress) {
        loc = { address: savedAddress, lat: null, lng: null };
      }
    }
    setDefaultLocation(loc);
    
    const phone = cData.phone || localStorage.getItem('shopPhone') || '';
    setShopPhone(phone);
  }, []);

  const handleBookingSubmit = async (payload) => {
    if (isSubmittingRef.current) return;
    
    // Tự động gán thông tin Mặc định của Cửa hàng nếu người dùng để trống
    const cData = JSON.parse(localStorage.getItem('customerData') || '{}');
    
    // Nếu là Giao Hàng hoặc Đơn Ghép, pickupAddress mặc định là Shop.
    // Nếu là Lấy Hàng (Mua hộ), điểm đến (deliveryAddress) mặc định là Shop.
    if (serviceType === 'delivery' || serviceType === 'batched') {
      if (!payload.senderPhone) {
        payload.senderPhone = shopPhone || cData.phone || '';
      }
      if (!payload.pickupAddress) {
        const savedLoc = localStorage.getItem('savedShopLocation');
        if (savedLoc) {
          const loc = JSON.parse(savedLoc);
          payload.pickupAddress = loc.address;
          if (loc.lat) payload.pickupCoordinates = { lat: loc.lat, lng: loc.lng };
        } else if (cData.defaultLocation && cData.defaultLocation.lat) {
          payload.pickupAddress = cData.defaultLocation.address;
          payload.pickupCoordinates = { lat: cData.defaultLocation.lat, lng: cData.defaultLocation.lng };
        } else {
          payload.pickupAddress = localStorage.getItem('shopAddress') || '';
        }
      }

      if (!payload.pickupAddress || !payload.senderPhone) {
        return alert('Vui lòng cung cấp Địa chỉ và SĐT lấy hàng hoặc Cài đặt định vị gốc trong trang Thông tin.');
      }
    } else if (serviceType === 'pickup') {
      // Logic cho Lấy hàng (Mua Hộ)
      if (!payload.deliveryAddress) {
        const savedLoc = localStorage.getItem('savedShopLocation');
        if (savedLoc) {
          const loc = JSON.parse(savedLoc);
          payload.deliveryAddress = loc.address;
          if (loc.lat) payload.deliveryCoordinates = { lat: loc.lat, lng: loc.lng };
        } else if (cData.defaultLocation && cData.defaultLocation.lat) {
          payload.deliveryAddress = cData.defaultLocation.address;
          payload.deliveryCoordinates = { lat: cData.defaultLocation.lat, lng: cData.defaultLocation.lng };
        }
      }
    }

    isSubmittingRef.current = true;
    setLoading(true);
    let isSuccess = false;
    
    try {
      // Ghi đè tên người gửi bằng tên Shop (Nếu là Giao Hàng hoặc Đơn Ghép)
      if (serviceType === 'delivery' || serviceType === 'batched') {
        payload.senderName = localStorage.getItem('shopName') || 'Cửa hàng';
      }

      // Xử lý nộp đơn
      const res = await api.post('/orders/customer', payload);
      if (res.data.success) {
        isSuccess = true;
        // Lưu lại làm mặc định nếu đây là lần đầu tiên tạo đơn
        if (serviceType === 'delivery') {
          if (!localStorage.getItem('shopAddress')) localStorage.setItem('shopAddress', payload.pickupAddress);
          if (!localStorage.getItem('shopPhone')) localStorage.setItem('shopPhone', payload.senderPhone);
        }
      }
      
      if (isSuccess) {
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

  const renderForm = () => {
    switch (serviceType) {
      case 'delivery':
        return (
          <DeliveryForm 
            onBooking={handleBookingSubmit} 
            loading={loading} 
            defaultLocation={defaultLocation} 
            defaultPhone={shopPhone} 
          />
        );
      case 'pickup':
        return (
          <PurchaseForm 
            onBooking={handleBookingSubmit} 
            loading={loading} 
            defaultLocation={defaultLocation} 
            defaultPhone={shopPhone} 
            customerData={customerData}
          />
        );
      case 'batched':
        return (
          <BatchedDeliveryForm 
            onBooking={handleBookingSubmit} 
            loading={loading} 
            defaultLocation={defaultLocation} 
            defaultPhone={shopPhone}
            shopName={localStorage.getItem('shopName') || 'Cửa hàng'}
          />
        );
      default:
        return <div className="p-4 text-center">Dịch vụ không hợp lệ.</div>;
    }
  };

  const getTitle = () => {
    switch (serviceType) {
      case 'delivery': return 'Giao Hàng (Shop)';
      case 'pickup': return 'Lấy Hàng (Mua Hộ)';
      case 'batched': return 'Tạo Đơn Ghép (Nhiều Điểm)';
      default: return 'Tạo Đơn';
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto bg-gray-50 font-sans overflow-hidden md:border-x border-gray-100 md:shadow-sm">
      {/* HEADER */}
      <div className="shrink-0 bg-white/90 backdrop-blur-md px-5 py-4 safe-pt z-40 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)] border-b border-gray-100/50">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 active:scale-90 transition-transform bg-gray-50 rounded-full hover:bg-gray-100">
          <ArrowLeft size={22} />
        </button>
        <span className="font-bold text-gray-800 flex-1 text-center pr-8 whitespace-nowrap overflow-hidden text-ellipsis text-lg">
          {getTitle()}
        </span>
      </div>

      {/* NỘI DUNG FORM */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto p-4 animate-fadeIn pb-24">
        {renderForm()}
      </div>
    </div>
  );
}
