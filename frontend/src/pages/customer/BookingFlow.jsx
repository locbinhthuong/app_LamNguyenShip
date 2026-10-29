import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Bike, ShoppingBag, Navigation } from 'lucide-react';
import { getCustomerProfile, createOrder } from '../../services/api';
import { useToast } from '../../context/ToastContext';

import DeliveryForm from '../../components/booking/DeliveryForm';
import RideForm from '../../components/booking/RideForm';
import PurchaseForm from '../../components/booking/PurchaseForm';
import CoordinationForm from '../../components/booking/CoordinationForm';

export default function BookingFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
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
    const saved = sessionStorage.getItem('savedLocation');
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
        showToast('Tạo đơn thành công! Đang tìm tài xế gần nhất cho bạn.', 'success');
        const createdOrderId = res.data?._id;
        // Chuyển thẳng đến màn hình theo dõi đơn hàng vừa tạo
        navigate(createdOrderId ? `/customer/order/${createdOrderId}` : '/customer/activity');
      }
    } catch (error) {
      console.error(error);
      showToast('Lỗi tạo đơn: ' + (error.response?.data?.message || 'Vui lòng thử lại.'), 'error');
    } finally {
      if (!isSuccess) {
        isSubmittingRef.current = false;
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto bg-gray-50 font-sans overflow-hidden md:border-x border-gray-100 md:shadow-sm">
      {/* HEADER TỪ CHỐI VUỐT */}
      <div className="shrink-0 bg-white/90 backdrop-blur-md px-5 py-4 safe-pt z-40 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)] border-b border-gray-100/50">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 active:scale-[0.85] transition-transform duration-300 ease-out bg-gray-50 rounded-full hover:bg-gray-100">
          <ArrowLeft size={22} />
        </button>
        <span className="font-bold text-gray-800 flex-1 text-center pr-8 whitespace-nowrap overflow-hidden text-ellipsis text-lg">
          {activeTab === 'GIAO_HANG' && 'Giao Hàng Nhanh'}
          {activeTab === 'DAT_XE' && 'Đặt Xe & Lái Hộ'}
          {activeTab === 'MUA_HO' && 'Mua Hàng Hộ'}
          {activeTab === 'DIEU_PHOI' && 'Dịch Vụ Điều Phối'}
        </span>
      </div>

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
