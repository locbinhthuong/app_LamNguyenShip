import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, UserX, LogOut, Store, MapPin, ShieldCheck, Camera, FileText, HelpCircle, QrCode, X, Loader2, ScrollText, Inbox } from 'lucide-react';
import { api, getFullImageUrl, uploadCustomerAvatar, getActiveAnnouncements } from '../../services/api';
import LocationPicker from '../../components/LocationPicker';

export default function ShopProfile() {
  const navigate = useNavigate();
  const customerData = JSON.parse(localStorage.getItem('customerData') || '{}');

  const [shopName, setShopName] = useState(customerData.shopName || localStorage.getItem('shopName') || 'Cửa Hàng Của Bạn');
  const [shopPhone, setShopPhone] = useState(customerData.phone || localStorage.getItem('shopPhone') || 'Chưa cập nhật');
  const [shopAddress, setShopAddress] = useState(customerData.shopAddress || localStorage.getItem('shopAddress') || 'Chưa cập nhật');
  const [shopAvatar, setShopAvatar] = useState(customerData.avatar || localStorage.getItem('shopAvatar') || '');

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ shopName: '', phone: '', avatar: '' });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showTermsContent, setShowTermsContent] = useState(false);
  const [termsData, setTermsData] = useState([]);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const fetchTerms = async (type) => {
    try {
      setLoadingTerms(true);
      setShowTermsContent(true);
      setTermsData([]);
      const res = await getActiveAnnouncements();
      if (res && res.success) {
        const terms = res.data.filter(a => a.type === type && a.isActive);
        setTermsData(terms);
      }
    } catch (err) {
       console.error(err);
    } finally {
      setLoadingTerms(false);
    }
  };

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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.shopName || !editForm.phone) {
      return alert('Vui lòng nhập đầy đủ Tên cửa hàng và Số điện thoại');
    }
    try {
      setLoading(true);
      let finalAvatarUrl = editForm.avatar;
      if (avatarFile) {
        try {
          const result = await uploadCustomerAvatar(avatarFile);
          if (result.data.success) {
            finalAvatarUrl = result.data.data.url;
          }
        } catch (err) {
          alert("Lỗi upload ảnh, vui lòng thử lại sau!");
          setLoading(false);
          return;
        }
      }

      const res = await api.put('/auth/customer/me', {
        shopName: editForm.shopName,
        phone: editForm.phone,
        avatar: finalAvatarUrl
      });
      if (res.data.success) {
        const updatedUser = res.data.data;
        const currentData = JSON.parse(localStorage.getItem('customerData') || '{}');
        const newData = { ...currentData, ...updatedUser };
        localStorage.setItem('customerData', JSON.stringify(newData));
        localStorage.setItem('shopName', updatedUser.shopName);
        localStorage.setItem('shopPhone', updatedUser.phone);
        if (updatedUser.avatar) {
          localStorage.setItem('shopAvatar', updatedUser.avatar);
        }

        setShopName(updatedUser.shopName);
        setShopPhone(updatedUser.phone);
        setShopAvatar(updatedUser.avatar || '');
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
    setEditForm({ shopName, phone: shopPhone, avatar: shopAvatar });
    setAvatarPreview(shopAvatar || null);
    setAvatarFile(null);
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
      <div className="shrink-0 bg-white px-4 py-3 safe-pt z-40 flex items-center justify-between shadow-sm border-b border-slate-100">
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
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 border-2 border-slate-100 overflow-hidden relative">
            {shopAvatar ? (
              <img src={getFullImageUrl(shopAvatar)} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Store size={32} />
            )}
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

            <button onClick={() => fetchTerms('TERMS_CUSTOMER')} className="w-full p-4 flex items-center justify-between border-b border-slate-100 active:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                  <ShieldCheck size={18} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">Chính sách & Điều khoản</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Quy định và điều khoản dùng App</p>
                </div>
              </div>
            </button>

            <button onClick={() => setShowContact(true)} className="w-full p-4 flex items-center justify-between border-b border-slate-100 active:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                  <HelpCircle size={18} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">Hỗ trợ / Liên hệ</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Liên hệ tổng đài hoặc hỗ trợ</p>
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
      {showEditModal && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 sm:items-center p-0">
          <div className="flex-1 w-full" onClick={() => setShowEditModal(false)}></div>
          <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl animate-slideUp flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
            <div className="pt-6 pb-2 px-6 shrink-0 bg-white z-10">
               <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4"></div>
               <h3 className="text-xl font-bold text-slate-800 text-center">Cập nhật thông tin</h3>
            </div>
            
            <form id="editShopForm" onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              
              <div className="flex flex-col items-center mb-4">
                 <div className="relative w-24 h-24 rounded-full border-4 border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden group">
                   {avatarPreview ? (
                     <img src={getFullImageUrl(avatarPreview)} alt="Preview" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                   ) : (
                     <Store size={40} className="text-gray-300" />
                   )}
                   
                   <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                     <Camera size={24} className="text-white mb-1" />
                     <span className="text-[10px] font-bold text-white uppercase">Đổi ảnh</span>
                     <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                   </label>
                   
                   <div className="absolute bottom-1 right-1 bg-blue-600 p-1.5 rounded-full border-2 border-white md:hidden pointer-events-none">
                      <Camera size={12} className="text-white" />
                   </div>
                 </div>
              </div>

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
              <div className="border-t border-slate-100 mt-2 pt-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1 ml-1">Mật khẩu mới (Tùy chọn)</label>
                <input
                  type="password"
                  value={editForm.password || ''}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium"
                  placeholder="Để trống nếu không muốn đổi"
                />
              </div>
            </form>
            <div className="flex gap-3 px-6 py-4 pb-safe shrink-0 bg-white border-t border-slate-100 z-10">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold active:scale-95 transition-transform"
              >
                Huỷ
              </button>
              <button
                form="editShopForm"
                type="submit"
                disabled={loading}
                className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold shadow-md shadow-blue-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Terms Content Modal */}
      {showTermsContent && createPortal(
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl h-[85vh] sm:h-[80vh] flex flex-col overflow-hidden animate-slideUp">
            <div className="bg-purple-600 p-4 shrink-0 flex justify-between items-center text-white relative">
              <h2 className="font-bold text-lg flex items-center gap-2"><ScrollText size={20} /> Quy định & Chính sách bảo mật</h2>
              <button onClick={() => setShowTermsContent(false)} className="rounded-full bg-black/10 hover:bg-black/20 p-2 border-0 w-8 h-8 flex items-center justify-center transition-colors">
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
              {loadingTerms ? (
                <div className="flex justify-center items-center h-full">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : termsData.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-full text-slate-400">
                  <span className="mb-3"><Inbox size={48} strokeWidth={1} /></span>
                  <p className="font-medium">Chưa có điều khoản nào được đăng.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {termsData.map(term => (
                    <div key={term._id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                      <h3 className="font-bold text-lg text-slate-800 mb-2">{term.title}</h3>
                      <div className="text-xs text-slate-400 mb-3 bg-slate-100 inline-block px-2 py-1 rounded">
                        Cập nhật: {new Date(term.updatedAt || term.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                      
                      {term.imageUrl && (
                        <img src={getFullImageUrl(term.imageUrl)} alt="Term Banner" className="w-full rounded-xl mb-3" />
                      )}
                      
                      {term.videoUrl && (
                        <video src={getFullImageUrl(term.videoUrl)} controls className="w-full rounded-xl mb-3" />
                      )}
                      
                      <div className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">
                        {term.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Contact/Support Modal */}
      {showContact && createPortal(
        <div className="fixed inset-0 z-[999] bg-black/60 flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative w-full max-w-[340px] animate-slideUp">
            {/* Nút đóng */}
            <button 
              onClick={() => setShowContact(false)} 
              className="absolute -top-12 right-0 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors z-10"
            >
              <X size={20} />
            </button>
            
            {/* Card chính */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-white/20">
              
              {/* Phần thông tin (Màu xanh) */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 relative overflow-hidden">
                {/* Patterns */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md p-2">
                        <img src="/logoALOSHIPP.png" alt="AloShipp" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-0.5">Điều Phối Alos</h3>
                        <p className="text-blue-100 font-mono text-lg font-bold">0765120777</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mã QR */}
                  <div className="w-24 h-24 bg-white p-2 rounded-2xl shadow-lg flex-shrink-0 flex items-center justify-center">
                    <img src="/zalo_qr.png" alt="Zalo QR" className="w-full h-full object-contain rounded-xl" onError={(e) => { e.target.onerror = null; e.target.src = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=tel:0765120777" }} />
                  </div>
                </div>
              </div>

              {/* Phần Nút bấm (Màu trắng) */}
              <div className="bg-white flex">
                <a 
                  href="tel:0765120777"
                  className="flex-1 py-5 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  Gọi Điện
                </a>
                <div className="w-[1px] bg-gray-200 my-4"></div>
                <a 
                  href="https://zalo.me/0765120777"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-5 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  Nhắn Tin
                </a>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
