import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, CheckCircle } from 'lucide-react';
import { api, getCustomerProfile } from '../../services/api';
import LocationPicker from '../../components/LocationPicker';

const AloFoodCheckout = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [restaurant, setRestaurant] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [deliveryAddress, setDeliveryAddress] = useState('Đang lấy vị trí...');
  const [deliveryCoordinates, setDeliveryCoordinates] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');

  // Dummy distance calculation since we don't have Mapbox setup here directly
  const [deliveryFee, setDeliveryFee] = useState(15000); // Base fee
  const foodTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalAmount = foodTotal + deliveryFee;

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // 1. Fetch user profile
      const userRes = await getCustomerProfile();
      if (userRes.data) {
        setCustomerName(userRes.data.name);
        setCustomerPhone(userRes.data.phone);
        
        // Try getting location from saved profile or browser
        if (userRes.data.defaultLocation?.lat) {
          setDeliveryCoordinates(userRes.data.defaultLocation);
          setDeliveryAddress(userRes.data.defaultLocation.address);
        } else {
           getLocationFromBrowser();
        }
      }

      // 2. Fetch Restaurant & Menu
      const res = await api.get(`/alofood/restaurants/${id}/menu`);
      if (res.data.success) {
        setRestaurant(res.data.data.restaurant);
        const menuItems = res.data.data.menuItems;
        
        // 3. Build cart from session
        const savedCart = JSON.parse(sessionStorage.getItem(`alofood_cart_${id}`) || '{}');
        const items = [];
        for (const [itemId, qty] of Object.entries(savedCart)) {
          const m = menuItems.find(x => x._id === itemId);
          if (m) {
            items.push({
              _id: m._id,
              name: m.name,
              price: m.price,
              quantity: qty,
              image: m.image
            });
          }
        }
        
        if (items.length === 0) {
          alert('Giỏ hàng trống!');
          navigate(-1);
          return;
        }
        setCartItems(items);
      }
    } catch (error) {
      console.error('Lỗi lấy thông tin:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocationFromBrowser = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (data && data.display_name) {
              setDeliveryCoordinates({ lat, lng, address: data.display_name });
              setDeliveryAddress(data.display_name);
            }
          } catch (err) {}
        },
        () => { setDeliveryAddress('Chưa xác định toạ độ. Bấm để chọn.'); },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setDeliveryAddress('Chưa xác định toạ độ. Bấm để chọn.');
    }
  };

  const handleLocationSelect = (loc) => {
    setDeliveryCoordinates(loc);
    setDeliveryAddress(loc.address);
    setShowLocationPicker(false);
  };

  const handlePlaceOrder = async () => {
    if (!deliveryCoordinates) {
      alert('Vui lòng chọn địa chỉ giao hàng!');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        shopId: id,
        cartItems,
        foodTotal,
        deliveryFee,
        totalAmount,
        deliveryAddress: deliveryCoordinates.address,
        deliveryCoordinates,
        customerName,
        customerPhone,
        note
      };

      const res = await api.post('/alofood/order', payload);
      if (res.data.success) {
        // Clear cart
        sessionStorage.removeItem(`alofood_cart_${id}`);
        alert('Đặt món thành công! Tài xế sẽ sớm đến nhận đồ.');
        navigate('/customer/activity');
      }
    } catch (error) {
      alert('Lỗi đặt đơn: ' + (error.response?.data?.message || 'Vui lòng thử lại sau.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Đang chuẩn bị...</div>;

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto bg-gray-50 font-sans min-h-screen">
      {/* HEADER */}
      <div className="shrink-0 bg-white px-5 py-4 safe-pt sticky top-0 z-40 flex items-center justify-between shadow-sm border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 active:scale-[0.85] transition-transform duration-300 bg-gray-50 rounded-full">
          <ArrowLeft size={22} />
        </button>
        <span className="font-bold text-gray-800 flex-1 text-center pr-8 text-lg">Xác Nhận Đơn</span>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Địa chỉ giao */}
        <div className="bg-white p-4 mb-2 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-sm font-bold text-gray-800">
            <MapPin size={18} className="text-blue-500" /> Giao đến
          </div>
          <div 
            onClick={() => setShowLocationPicker(true)}
            className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200 cursor-pointer"
          >
            <div className="flex-1 pr-3">
              <p className="font-bold text-gray-800 text-sm mb-1">{customerName} - {customerPhone}</p>
              <p className="text-gray-500 text-xs line-clamp-2">{deliveryAddress}</p>
            </div>
            <span className="text-blue-600 text-xs font-bold whitespace-nowrap">Thay đổi</span>
          </div>
        </div>

        {/* Danh sách món */}
        <div className="bg-white p-4 mb-2 shadow-sm">
          <div className="font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">{restaurant?.shopName}</div>
          <div className="space-y-3">
            {cartItems.map(item => (
              <div key={item._id} className="flex justify-between items-start">
                <div className="flex gap-2">
                  <div className="font-bold text-blue-600 text-sm">{item.quantity}x</div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{item.name}</p>
                  </div>
                </div>
                <div className="font-medium text-sm text-gray-800">
                  {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 border-dashed">
            <input 
              type="text" 
              placeholder="Ghi chú cho quán (Vd: ít đá, nhiều cay...)"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Tổng kết tiền */}
        <div className="bg-white p-4 mb-2 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">Chi tiết thanh toán</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Tổng tiền món</span>
              <span>{foodTotal.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Phí giao hàng (Tạm tính)</span>
              <span>{deliveryFee.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
              <span>Tổng thanh toán</span>
              <span className="text-red-500 text-lg">{totalAmount.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 flex items-start gap-3 bg-blue-50/50 m-4 rounded-xl border border-blue-100">
          <CheckCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
          <p className="text-xs text-blue-800 font-medium">
            Thanh toán tiền mặt cho tài xế khi nhận hàng (Bao gồm tiền món ăn và phí ship).
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 max-w-5xl mx-auto bg-white border-t border-gray-100 p-4 safe-pb z-40">
        <button 
          onClick={handlePlaceOrder}
          disabled={submitting}
          className="w-full bg-red-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-500/30 flex items-center justify-between px-5 disabled:opacity-50"
        >
          <span className="text-sm">Thanh toán tiền mặt</span>
          <span className="text-lg flex items-center gap-2">
            {totalAmount.toLocaleString('vi-VN')}đ
            <ArrowLeft className="rotate-180" size={18} />
          </span>
        </button>
      </div>

      {/* LOCATION MODAL */}
      {showLocationPicker && (
        <LocationPicker 
          isOpen={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSelect={handleLocationSelect}
          initialPosition={deliveryCoordinates}
        />
      )}
    </div>
  );
};

export default AloFoodCheckout;
