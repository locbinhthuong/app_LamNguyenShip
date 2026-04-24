import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageX, DollarSign, PackageCheck, PlusCircle, LogOut, Clock, Navigation, MapPin, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';
import ShopCreateOrderModal from '../../components/ShopCreateOrderModal';
import LocationPicker from '../../components/LocationPicker';

const ShopDashboard = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    delivering: 0,
    completedToday: 0,
    codCollectedToday: 0
  });

  const [address, setAddress] = useState('Chưa xác định toạ độ shop');
  const [locationDetails, setLocationDetails] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const shopName = localStorage.getItem('shopName') || 'Cửa Hàng Của Bạn';

  const calculateStatsAndSet = (newOrders) => {
    const today = new Date().toDateString();
    let p = 0, d = 0, c = 0, cod = 0;
    newOrders.forEach(o => {
      if (o.status === 'PENDING') p++;
      if (['ACCEPTED', 'PICKED_UP', 'DELIVERING'].includes(o.status)) d++;
      
      if (o.status === 'COMPLETED' && new Date(o.createdAt).toDateString() === today) {
        c++;
        cod += (o.codAmount || 0);
      }
    });
    setStats({ pending: p, delivering: d, completedToday: c, codCollectedToday: cod });
  };

  useEffect(() => {
    fetchOrders();

    const handleRefresh = (e) => {
      const updatedOrder = e.detail;
      if (updatedOrder && updatedOrder._id) {
        setOrders(prev => {
          let exists = false;
          const newList = prev.map(o => {
            if (o._id === updatedOrder._id) {
              exists = true;
              return updatedOrder;
            }
            return o;
          });
          if (!exists) newList.unshift(updatedOrder);
          calculateStatsAndSet(newList);
          return newList;
        });
      } else {
        fetchOrders();
      }
    };

    const handleDeleted = (e) => {
      if (typeof e.detail === 'string') {
        setOrders(prev => {
           const newList = prev.filter(o => o._id !== e.detail);
           calculateStatsAndSet(newList);
           return newList;
        });
      }
    };

    window.addEventListener('refresh_orders_data', handleRefresh);
    window.addEventListener('order_deleted_event', handleDeleted);
    return () => {
      window.removeEventListener('refresh_orders_data', handleRefresh);
      window.removeEventListener('order_deleted_event', handleDeleted);
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('savedShopLocation');
    if (saved) {
      const loc = JSON.parse(saved);
      setLocationDetails(loc);
      const shortAddress = loc.address.split(',').slice(0, 3).join(', ');
      setAddress(shortAddress);
    } else {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
              const data = await res.json();
              if (data && data.display_name) {
                const locData = { lat, lng, address: data.display_name };
                setLocationDetails(locData);
                localStorage.setItem('savedShopLocation', JSON.stringify(locData));
                const shortAddress = data.display_name.split(',').slice(0, 3).join(', ');
                setAddress(shortAddress);
              }
            } catch (err) {}
          },
          (err) => {}, { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    }
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/customer/my');
      if (res.data.success) {
        const allOrders = res.data.data;
        setOrders(allOrders);
        calculateStatsAndSet(allOrders);
      }
    } catch (error) {
      console.error('Lỗi lấy đơn shop', error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleLocationSelect = (loc) => {
    setLocationDetails(loc);
    localStorage.setItem('savedShopLocation', JSON.stringify(loc));
    const shortAddress = loc.address.split(',').slice(0, 3).join(', ');
    setAddress(shortAddress);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans pb-24 relative">
      
      {/* HEADER: Kéo ghim toạ độ Shop */}
      <div 
        onClick={() => setShowLocationPicker(true)}
        className="bg-white px-4 py-3 sticky top-0 z-50 flex items-center justify-between cursor-pointer active:bg-gray-50"
      >
        <div className="flex flex-col flex-1 overflow-hidden mr-4">
          <div className="flex items-center gap-1 text-slate-500 mb-0.5">
            <span className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">📍 Toạ độ cửa hàng</span>
            <ChevronRight size={14} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-slate-800 line-clamp-1 truncate block">{address}</span>
            <div className="bg-blue-100 text-blue-600 p-1 rounded">
              <span className="text-[10px] uppercase font-bold tracking-wider">Chọn</span>
            </div>
          </div>
        </div>
      </div>

      {/* HEADER TỔNG QUAN */}
      <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-sky-600 rounded-b-[40px] px-6 pt-10 pb-12 text-white shadow-[0_10px_30px_rgba(59,130,246,0.3)] relative overflow-hidden">
        {/* Decorator bubbles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 -left-10 w-32 h-32 bg-sky-400/20 rounded-full blur-2xl"></div>

        <div className="flex justify-between items-center mb-8 relative z-10">
          <div>
            <p className="text-blue-100 text-sm font-medium tracking-wide uppercase mb-1">Bảng điều khiển</p>
            <h1 className="text-2xl font-extrabold line-clamp-1">{shopName}</h1>
          </div>
          <button onClick={handleLogout} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full active:scale-95 transition-all outline-none">
            <LogOut size={20} />
          </button>
        </div>

        {/* THẺ TỔNG COD */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 flex items-center justify-between relative z-10 shadow-inner">
          <div>
            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1.5 opacity-90">Tiền COD Thu Hôm Nay</p>
            <h2 className="text-3xl font-black tracking-tight">{stats.codCollectedToday.toLocaleString('vi-VN')} đ</h2>
          </div>
          <div className="w-14 h-14 bg-gradient-to-tr from-sky-400 to-blue-400 rounded-full flex items-center justify-center shadow-lg border border-white/20">
            <DollarSign size={28} className="text-white" />
          </div>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="px-6 -mt-8 relative z-20">
        
        {/* THÔNG BÁO CẬP NHẬT ĐỊNH VỊ */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3 relative overflow-hidden mb-6">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
          <div className="mt-0.5 text-blue-500 animate-bounce">
            <MapPin size={20} />
          </div>
          <div>
            <h4 className="text-[11px] font-extrabold text-blue-800 uppercase tracking-wide mb-0.5">Lưu ý trước khi Đặt Đơn</h4>
            <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
              Shop vui lòng bấm vào thanh <strong>"📍 Toạ độ cửa hàng"</strong> ở trên cùng để cập nhật định vị chính xác trước khi lên đơn nhé!
            </p>
          </div>
        </div>

        {/* NÚT TẠO ĐƠN SIÊU TỐC */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-white text-blue-600 rounded-3xl p-4 flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-blue-50 active:scale-[0.98] transition-all group mb-6 hover:shadow-[0_15px_40px_rgba(59,130,246,0.15)]"
        >
          <div className="bg-blue-50 p-2 rounded-full group-hover:bg-blue-100 group-hover:scale-110 transition-all">
            <PlusCircle size={24} className="text-blue-600" />
          </div>
          <span className="font-extrabold text-lg tracking-wide">TẠO ĐƠN NGAY</span>
        </button>

        {/* THỐNG KÊ ĐƠN */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 grid grid-cols-3 gap-4 mb-6 relative overflow-hidden">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-2"><Clock size={20} /></div>
            <p className="text-xl font-black text-slate-800 leading-none">{stats.pending}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Chờ Xế</p>
          </div>
          <div className="flex flex-col items-center text-center relative">
            <div className="absolute left-0 top-2 bottom-2 w-px bg-slate-100"></div>
            <div className="absolute right-0 top-2 bottom-2 w-px bg-slate-100"></div>
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-2"><Navigation size={20} /></div>
            <p className="text-xl font-black text-slate-800 leading-none">{stats.delivering}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Đang Giao</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 mb-2"><PackageCheck size={20} /></div>
            <p className="text-xl font-black text-slate-800 leading-none">{stats.completedToday}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Hoàn Thành</p>
          </div>
        </div>

        {/* DANH SÁCH ĐƠN HÀNG GẦN ĐÂY */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-extrabold text-slate-800 text-lg">Đơn hàng mới nhất</h3>
            <span className="text-xs text-blue-600 font-bold active:scale-95 cursor-pointer bg-blue-50 px-3 py-1.5 rounded-full">Xem tất cả</span>
          </div>

          <div className="space-y-3">
            {orders.slice(0, 5).map(order => (
              <div key={order._id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-blue-200 transition-colors">
                <div className="flex-1 overflow-hidden pr-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold">{new Date(order.createdAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${order.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : order.status === 'PENDING' ? 'bg-blue-50 text-blue-600' : order.status === 'DRAFT' ? 'bg-purple-50 text-purple-600' : order.status === 'CANCELLED' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {order.status === 'DRAFT' ? 'Chờ Báo Giá' : order.status === 'PENDING' ? 'Chờ Xế' : order.status}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 line-clamp-1">{order.deliveryAddress || 'Chưa rõ điểm đến'}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Thu hộ: {order.codAmount ? order.codAmount.toLocaleString('vi-VN') + 'đ' : '0đ'}</p>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 border-dashed border-2">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <PackageX size={24} className="text-slate-300" />
                </div>
                <p className="text-slate-400 text-sm font-medium">Chưa có đơn hàng nào</p>
                <p className="text-slate-400 text-xs mt-1">Bấm "Tạo Đơn Giao Hàng" để bắt đầu</p>
              </div>
            )}
          </div>
        </div>

      </div>
      
      {/* MODAL TẠO ĐƠN SHOP */}
      <ShopCreateOrderModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchOrders}
      />

      {/* OVERLAY CHỌN BẢN ĐỒ */}
      {showLocationPicker && (
        <LocationPicker 
          isOpen={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSelect={handleLocationSelect}
          initialPosition={null}
        />
      )}
    </div>
  );
};

export default ShopDashboard;
