import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, UserX, LogOut, Store, MapPin } from 'lucide-react';
import { api } from '../../services/api';
import LocationPicker from '../../components/LocationPicker';

export default function ShopProfile() {
  const navigate = useNavigate();
  const shopName = localStorage.getItem('shopName') || 'Cửa Hàng Của Bạn';
  const shopPhone = localStorage.getItem('shopPhone') || 'Chưa cập nhật';
  const [shopAddress, setShopAddress] = useState(localStorage.getItem('shopAddress') || 'Chưa cập nhật');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      localStorage.clear();
      navigate('/login');
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('CẢNH BÁO: Việc yêu cầu xoá tài khoản sẽ xoá vĩnh viễn mọi dữ liệu giao dịch của bạn trên hệ thống. Bạn có chắc chắn muốn yêu cầu xoá không?')) {
      alert('Yêu cầu xoá tài khoản đã được gửi đến ban quản trị. Tài khoản của bạn sẽ bị xoá vĩnh viễn trong vòng 7 ngày làm việc.');
    }
  };

  const handleLocationUpdate = async (loc) => {
    try {
      setLoading(true);
      const res = await api.put('/auth/customer/me', {
        defaultLocation: loc,
        shopAddress: loc.address
      });
      if (res.data.success) {
        localStorage.setItem('shopAddress', loc.address);
        
        // Update customerData in localStorage
        const customerData = JSON.parse(localStorage.getItem('customerData') || '{}');
        customerData.defaultLocation = loc;
        customerData.shopAddress = loc.address;
        localStorage.setItem('customerData', JSON.stringify(customerData));
        
        setShopAddress(loc.address);
        alert('Cập nhật định vị cửa hàng thành công!');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể cập nhật định vị. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setShowLocationPicker(false);
    }
  };

  return (
    <div className="w-full flex flex-col min-h-screen bg-slate-50 font-sans pb-24 shadow-sm overflow-x-hidden relative">
      
      {/* HEADER */}
      <div className="shrink-0 bg-white px-4 py-3 z-40 flex items-center justify-between shadow-sm border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 active:scale-90 transition-transform">
          <ArrowLeft size={22} />
        </button>
        <span className="font-bold text-slate-800 flex-1 text-center pr-8 whitespace-nowrap overflow-hidden text-ellipsis text-lg">
          Thông tin Cửa hàng
        </span>
      </div>

      {/* BODY CONTENT */}
      <div className="p-4 sm:p-6 space-y-6">
        
        {/* SHOP INFO CARD */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <Store size={32} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold text-slate-800 line-clamp-1">{shopName}</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">{shopPhone}</p>
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{shopAddress}</p>
          </div>
        </div>

        {/* CÀI ĐẶT TÀI KHOẢN */}
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider mb-3 px-1">Cài đặt Cửa hàng</h3>
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            <button onClick={() => alert('Tính năng Cập nhật thông tin đang được phát triển!')} className="w-full p-4 flex items-center justify-between border-b border-slate-100 active:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <User size={18} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">Cập nhật thông tin</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tên, Số điện thoại</p>
                </div>
              </div>
            </button>

            <button onClick={() => setShowLocationPicker(true)} disabled={loading} className="w-full p-4 flex items-center justify-between border-b border-slate-100 active:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <MapPin size={18} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">Cập nhật định vị gốc</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Dùng làm điểm lấy hàng mặc định</p>
                </div>
              </div>
            </button>
            
            <button onClick={handleDeleteAccount} className="w-full p-4 flex items-center justify-between border-b border-slate-100 active:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                  <UserX size={18} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-red-600 text-sm">Yêu cầu xoá tài khoản</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Xoá vĩnh viễn dữ liệu</p>
                </div>
              </div>
            </button>

            <button onClick={handleLogout} className="w-full p-4 flex items-center justify-between active:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <LogOut size={18} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">Đăng xuất</p>
                </div>
              </div>
            </button>
          </div>
        </div>

      </div>
      
      {showLocationPicker && (
        <LocationPicker
          onLocationSelect={handleLocationUpdate}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </div>
  );
}
