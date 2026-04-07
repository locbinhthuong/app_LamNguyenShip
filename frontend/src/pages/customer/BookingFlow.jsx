import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Bike, ShoppingBag, Navigation } from 'lucide-react';
import { getCustomerProfile, createOrder } from '../../services/api';

import DeliveryForm from '../../components/booking/DeliveryForm';
import RideForm from '../../components/booking/RideForm';
import PurchaseForm from '../../components/booking/PurchaseForm';
import CoordinationForm from '../../components/booking/CoordinationForm';

export default function BookingFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('GIAO_HANG');
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = React.useRef(false);
  const [defaultLocation, setDefaultLocation] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const { serviceType } = useParams();

  useEffect(() => {
    // Determine active tab from URL params (e.g. /customer/book/DAT_XE)
    if (serviceType && ['GIAO_HANG', 'DAT_XE', 'MUA_HO', 'DIEU_PHOI'].includes(serviceType.toUpperCase())) {
      setActiveTab(serviceType.toUpperCase());
    }

    // Load user data
    const loadProfile = async () => {
      try {
        const res = await getCustomerProfile();
        setCustomerData(res.data);
      } catch (err) {
        console.error('Lỗi lấy hồ sơ KH:', err);
      }
    };
    loadProfile();

    // Load saved pinned location
    const saved = localStorage.getItem('savedLocation');
    if (saved) {
      setDefaultLocation(JSON.parse(saved));
    }
  }, [serviceType]);

  const handleBookingSubmit = async (payload) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setLoading(true);
    let isSuccess = false;
    
    try {
      const res = await createOrder(payload);
      if (res.success) {
        isSuccess = true;
        alert('Tạo đơn thành công! Tổng đài sẽ báo cước Phí Ship/Phí Dịch vụ (Nếu có). Đơn đang chờ xử lý.');
        // Chuyển trang nhưng KHÔNG reset state loading để ngăn khách bấm đúp nút khi mạng lag
        navigate('/customer/activity');
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

  const tabs = [
    { id: 'GIAO_HANG', label: 'Giao Hàng', icon: Package },
    { id: 'DAT_XE', label: 'Gọi Xe', icon: Bike },
    { id: 'MUA_HO', label: 'Mua Hộ', icon: ShoppingBag },
    { id: 'DIEU_PHOI', label: 'Điều Phối', icon: Navigation }
  ];

  return (
    <div className="flex flex-col flex-1 w-full bg-gray-50 font-sans overflow-hidden">
      {/* HEADER TỪ CHỐI VUỐT */}
      <div className="shrink-0 bg-white px-4 py-3 shadow-sm z-40 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 active:scale-90 transition-transform">
          <ArrowLeft size={22} />
        </button>
        <span className="font-bold text-gray-800 flex-1 text-center pr-8 whitespace-nowrap overflow-hidden text-ellipsis text-lg">
          {activeTab === 'GIAO_HANG' && 'Giao Hàng Nhanh'}
          {activeTab === 'DAT_XE' && 'Đặt Xe & Lái Hộ'}
          {activeTab === 'MUA_HO' && 'Mua Hàng Hộ'}
          {activeTab === 'DIEU_PHOI' && 'Dịch Vụ Điều Phối'}
        </span>
      </div>

      {/* ĐÃ XÓA TABS SWITCHER ĐỂ CHỈ TẬP TRUNG VÀO 1 DỊCH VỤ DUY NHẤT TRANH NHẦM LẪN */}

      {/* NỘI DUNG FORM */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto p-4 animate-fadeIn">
        {activeTab === 'GIAO_HANG' && (
          <DeliveryForm 
            onBooking={handleBookingSubmit} 
            loading={loading} 
            defaultLocation={defaultLocation} 
            defaultPhone={customerData?.phone} 
          />
        )}
        
        {activeTab === 'DAT_XE' && (
          <RideForm 
            onBooking={handleBookingSubmit} 
            loading={loading} 
            defaultLocation={defaultLocation} 
            defaultPhone={customerData?.phone} 
            customerData={customerData} 
          />
        )}
        
        {activeTab === 'MUA_HO' && (
          <PurchaseForm 
            onBooking={handleBookingSubmit} 
            loading={loading} 
            defaultLocation={defaultLocation} 
            defaultPhone={customerData?.phone} 
            customerData={customerData} 
          />
        )}
        
        {activeTab === 'DIEU_PHOI' && (
          <CoordinationForm 
            onBooking={handleBookingSubmit} 
            loading={loading} 
            defaultLocation={defaultLocation} 
            defaultPhone={customerData?.phone} 
            customerData={customerData} 
          />
        )}
      </div>
    </div>
  );
}
