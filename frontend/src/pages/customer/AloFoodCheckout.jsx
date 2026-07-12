import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, CheckCircle, Loader2 } from 'lucide-react';
import { api, getCustomerProfile } from '../../services/api';
import LocationPicker from '../../components/LocationPicker';

const AloFoodCheckout = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [restaurant, setRestaurant] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFee, setLoadingFee] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [deliveryAddress, setDeliveryAddress] = useState('Đang lấy vị trí...');
  const [deliveryCoordinates, setDeliveryCoordinates] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');
  
  const [showEditInfo, setShowEditInfo] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [tempDeliveryAddress, setTempDeliveryAddress] = useState('');
  const [tempDeliveryCoordinates, setTempDeliveryCoordinates] = useState(null);
  
  const [scheduledTime, setScheduledTime] = useState('');

  const [distance, setDistance] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(15000); // Base fee
  const [extraSurcharge, setExtraSurcharge] = useState(0);
  const [surchargeNote, setSurchargeNote] = useState('');
  
  const foodTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalAmount = foodTotal + deliveryFee + extraSurcharge;

  const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  };

  useEffect(() => {
    const fetchDistanceAndFee = async () => {
      if (!restaurant?.defaultLocation || !deliveryCoordinates) return;
      
      setLoadingFee(true);
      try {
        const res = await api.post('/orders/estimate-fee', {
          pickupCoordinates: restaurant.defaultLocation,
          deliveryCoordinates: deliveryCoordinates,
          serviceType: 'GIAO_HANG',
          subServiceType: 'GIAO_DO_AN'
        });
        
        if (res.data?.success && res.data?.data) {
          setDistance(res.data.data.distanceKm || 0);
          setDeliveryFee(res.data.data.deliveryFee || 15000);
          setExtraSurcharge(res.data.data.extraSurcharge || 0);
          setSurchargeNote(res.data.data.surchargeNote || '');
        } else {
          setDeliveryFee(15000); // Fallback
          setExtraSurcharge(0);
          setSurchargeNote('');
        }
      } catch (err) {
        console.error('Lỗi tính phí ship:', err);
        setDeliveryFee(15000); // Fallback
        setExtraSurcharge(0);
        setSurchargeNote('');
      } finally {
        setLoadingFee(false);
      }
    };
    
    fetchDistanceAndFee();
  }, [restaurant, deliveryCoordinates]);

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

  const openEditInfo = () => {
    setTempName(customerName);
    setTempPhone(customerPhone);
    setTempDeliveryAddress(deliveryAddress);
    setTempDeliveryCoordinates(deliveryCoordinates);
    setShowEditInfo(true);
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
        distance: distance ? parseFloat(distance.toFixed(1)) : 0,
        totalAmount,
        deliveryAddress: deliveryCoordinates.address,
        deliveryCoordinates,
        customerName,
        customerPhone,
        note,
        scheduledTime: scheduledTime ? new Date(scheduledTime).toISOString() : null,
        extraSurcharge
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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <MapPin size={18} className="text-blue-500" /> Giao đến
            </div>
            <button 
              onClick={() => setShowLocationPicker(true)} 
              className="text-blue-600 font-bold text-xs flex items-center gap-1 active:scale-95 transition-transform bg-blue-50 px-2 py-1 rounded"
            >
              <MapPin size={14} /> Ghim bản đồ
            </button>
          </div>
          <div 
            onClick={openEditInfo}
            className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1 pr-3">
              <p className="font-bold text-gray-800 text-sm mb-1">{customerName} - {customerPhone}</p>
              <p className="text-gray-500 text-xs line-clamp-2">{deliveryAddress}</p>
            </div>
            <span className="text-blue-600 text-xs font-bold whitespace-nowrap">Thay đổi</span>
          </div>
        </div>

        {/* Hẹn giờ nhận đơn */}
        <div className="bg-white p-4 mb-2 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-sm font-bold text-gray-800">
             Hẹn giờ nhận đơn (Tùy chọn)
          </div>
          <input 
            type="datetime-local" 
            value={scheduledTime}
            onChange={e => setScheduledTime(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Bỏ trống nếu bạn muốn tài xế giao ngay bây giờ.</p>
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
              <span>
                Phí giao hàng 
                {distance > 0 && <span className="text-xs text-blue-600 ml-1">({distance.toFixed(1)} km)</span>}
              </span>
              <span>
                {loadingFee ? <Loader2 size={16} className="animate-spin text-gray-400" /> : `${deliveryFee.toLocaleString('vi-VN')}đ`}
              </span>
            </div>
            {extraSurcharge > 0 && (
              <div className="flex justify-between text-red-500 mt-1">
                <span className="text-xs">{surchargeNote}</span>
                <span className="text-sm font-bold">+{extraSurcharge.toLocaleString('vi-VN')}đ</span>
              </div>
            )}
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
          onSelect={(loc) => {
            if (showEditInfo) {
              setTempDeliveryCoordinates(loc);
              setTempDeliveryAddress(loc.address);
            } else {
              setDeliveryCoordinates(loc);
              setDeliveryAddress(loc.address);
            }
            setShowLocationPicker(false);
          }}
          initialPosition={showEditInfo ? tempDeliveryCoordinates : deliveryCoordinates}
        />
      )}

      {/* EDIT DELIVERY INFO MODAL */}
      {showEditInfo && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Thông tin nhận hàng</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Tên người nhận</label>
                <input 
                  type="text" 
                  value={tempName} 
                  onChange={e => setTempName(e.target.value)} 
                  className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-blue-500 bg-gray-50 text-sm" 
                  placeholder="Nhập tên người nhận"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Số điện thoại</label>
                <input 
                  type="tel" 
                  value={tempPhone} 
                  onChange={e => setTempPhone(e.target.value)} 
                  className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-blue-500 bg-gray-50 text-sm" 
                  placeholder="Nhập số điện thoại"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Địa chỉ giao hàng</label>
                <div 
                  onClick={() => setShowLocationPicker(true)} 
                  className="p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-600 cursor-pointer hover:bg-gray-100 flex justify-between items-center"
                >
                  <span className="line-clamp-2 flex-1 pr-2">{tempDeliveryAddress}</span>
                  <span className="text-blue-500 font-bold whitespace-nowrap text-xs">Sửa</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowEditInfo(false)} 
                className="flex-1 py-3 rounded-xl bg-gray-100 font-bold text-gray-700 active:scale-95 transition-transform"
              >
                Hủy
              </button>
              <button 
                onClick={() => { 
                  if (!tempName || !tempPhone) {
                    return alert('Vui lòng nhập tên và số điện thoại!');
                  }
                  setCustomerName(tempName); 
                  setCustomerPhone(tempPhone); 
                  if (tempDeliveryCoordinates) {
                    setDeliveryCoordinates(tempDeliveryCoordinates);
                    setDeliveryAddress(tempDeliveryAddress);
                  }
                  setShowEditInfo(false); 
                }} 
                className="flex-1 py-3 rounded-xl bg-blue-600 font-bold text-white active:scale-95 transition-transform shadow-lg shadow-blue-500/30"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AloFoodCheckout;
