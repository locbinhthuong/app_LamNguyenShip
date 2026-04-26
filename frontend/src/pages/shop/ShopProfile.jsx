import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, UserX, LogOut, Store, MapPin } from 'lucide-react';
import { api } from '../../services/api';
import LocationPicker from '../../components/LocationPicker';

export default function ShopProfile() {
  const navigate = useNavigate();
  const customerData = JSON.parse(localStorage.getItem('customerData') || '{}');
  
  const [shopName, setShopName] = useState(customerData.shopName || localStorage.getItem('shopName') || 'Cửa Hàng Của Bạn');
  const [shopPhone, setShopPhone] = useState(customerData.phone || localStorage.getItem('shopPhone') || 'Chưa cập nhật');
  const [shopAddress, setShopAddress] = useState(customerData.shopAddress || localStorage.getItem('shopAddress') || 'Chưa cập nhật');
  
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ shopName: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      localStorage.clear();
      navigate('/login');
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('CẢNH BÁO: Việc yêu cầu xoá tài khoản sẽ xoá vĩnh viễn mọi dữ liệu giao dịch của bạn trên hệ thống. Bạn có chắc chắn muốn yêu cầu xoá không?')) {
      try {
        setLoading(true);
        const res = await api.delete('/auth/customer/me');
        if (res.data.success) {
          alert('Tài khoản đã được vô hiệu hóa. Chuyển hướng về trang chủ.');
          localStorage.clear();
          navigate('/');
        }
      } catch (error) {
        alert('Có lỗi xảy ra khi xóa tài khoản.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.shopName || !editForm.phone) {
      return alert('Vui lòng nhập đầy đủ Tên cửa hàng và Số điện thoại');
    }
    try {
      setLoading(true);
      const res = await api.put('/auth/customer/me', {
        shopName: editForm.shopName,
        phone: editForm.phone
      });
      if (res.data.success) {
        const updatedUser = res.data.data;
        const currentData = JSON.parse(localStorage.getItem('customerData') || '{}');
        const newData = { ...currentData, ...updatedUser };
        localStorage.setItem('customerData', JSON.stringify(newData));
        localStorage.setItem('shopName', updatedUser.shopName);
        localStorage.setItem('shopPhone', updatedUser.phone);
        
        setShopName(updatedUser.shopName);
        setShopPhone(updatedUser.phone);
        setShowEditModal(false);
        alert('Cập nhật thông tin thành công!');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    setEditForm({ shopName, phone: shopPhone });
    setShowEditModal(true);
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
            <button onClick={openEditModal} disabled={loading} className="w-full p-4 flex items-center justify-between border-b border-slate-100 active:bg-slate-50 transition-colors">
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
      
      {/* Location Picker */}
      {showLocationPicker && (
        <LocationPicker
          isOpen={showLocationPicker}
          onSelect={handleLocationUpdate}
          onClose={() => setShowLocationPicker(false)}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center">
          <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl p-6 pb-10 sm:pb-6 animate-slideUp">
            <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">Cập nhật thông tin</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1 ml-1">Tên cửa hàng</label>
                <input
                  type="text"
                  value={editForm.shopName}
                  onChange={(e) => setEditForm({ ...editForm, shopName: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium"
                  placeholder="Vd: Tạp hóa Tâm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1 ml-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium font-mono"
                  placeholder="09..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold shadow-md shadow-blue-200 flex items-center justify-center gap-2"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
