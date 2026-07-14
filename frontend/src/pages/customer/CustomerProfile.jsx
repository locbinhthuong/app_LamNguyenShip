import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { User, Phone, LogOut, ShieldCheck, ChevronRight, X, Loader2, Camera, Trash2, FileText, HelpCircle, QrCode, ScrollText, Inbox, Store } from 'lucide-react';
import { api, uploadCustomerAvatar, getFullImageUrl, deleteMyAccount, getActiveAnnouncements } from '../../services/api';

const CustomerProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const userRole = localStorage.getItem('customerRole');

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', password: '', avatar: '' });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showTermsContent, setShowTermsContent] = useState(false);
  const [termsData, setTermsData] = useState([]);
  const [termsTitle, setTermsTitle] = useState('');
  const [loadingTerms, setLoadingTerms] = useState(false);
  
  const [showContact, setShowContact] = useState(false); // Can be removed later

  const fetchTerms = async (type, title) => {
    try {
      setLoadingTerms(true);
      setShowTermsContent(true);
      setTermsTitle(title);
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

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/customer/me');
      if (res.data.success) {
        setProfile(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const executeLogout = () => {
    localStorage.clear();
    // navigate('/login') will be handled by Router redirect or just window location
    navigate('/login');
  };

  const handleSwitchToSeller = () => {
    localStorage.setItem('activeMode', 'SHOP');
    window.location.href = '/shop';
  };

  const openEditModal = () => {
    setEditForm({ name: profile?.name || '', phone: profile?.phone || '', password: '', avatar: profile?.avatar || '' });
    setAvatarPreview(profile?.avatar || null);
    setAvatarFile(null);
    setShowEdit(true);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      return alert('Tên và Số điện thoại không được để trống.');
    }
    setLoading(true);
    try {
       // 1. Nếu có avatar mới, upload trước
       let finalAvatarUrl = editForm.avatar;
       if (avatarFile) {
         try {
           const result = await uploadCustomerAvatar(avatarFile);
           if (result.data.success) {
             finalAvatarUrl = result.data.data.url;
           }
         } catch (uploadError) {
           console.error("Lỗi upload ảnh:", uploadError);
           alert("Lỗi upload ảnh, vui lòng thử lại sau!");
           setLoading(false);
           return;
         }
       }

       // 2. Gửi API update
       const payload = { ...editForm, avatar: finalAvatarUrl };
       const res = await api.put('/auth/customer/me', payload);
       if (res.data.success) {
         setProfile(res.data.data);
         setShowEdit(false);
         alert('Cập nhật thông tin thành công!');
       }
    } catch (err) {
       alert(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
       setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      const res = await deleteMyAccount();
      if (res.success) {
        alert('Tài khoản của bạn đã được xoá thành công.');
        handleLogout();
      }
    } catch (error) {
      console.error('Lỗi khi xoá tài khoản:', error);
      alert('Không thể thực hiện yêu cầu xoá tài khoản. Vui lòng thử lại sau.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden relative">
      {/* ẢNH BÌA & AVATAR MỚI - STYLE GỌN GÀNG */}
      <div className="bg-[#3b82f6] pt-12 pb-20 px-6 shrink-0 flex items-center gap-4">
        <div className="w-[72px] h-[72px] bg-white rounded-full flex items-center justify-center border-[3px] border-white shadow-md relative overflow-hidden shrink-0">
           {profile?.avatar ? (
              <img src={getFullImageUrl(profile.avatar)} alt="Avatar" className="w-full h-full object-cover" />
           ) : (
              <div className="bg-gray-100 w-full h-full flex items-center justify-center text-gray-400">
                  <User size={32} className="text-gray-400" />
              </div>
           )}
        </div>
        <div className="text-white">
          <h2 className="text-[19px] font-bold tracking-tight mb-1">{profile ? profile.name : 'Đang tải...'}</h2>
          <div className="flex items-center gap-1.5 opacity-90">
            <Phone size={13} />
            <span className="text-sm font-medium">{profile?.phone}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 space-y-4 pb-24 -mt-8 relative z-10">
        {/* Cập nhật thông tin card */}
        <div 
          onClick={openEditModal}
          className="bg-white rounded-[16px] p-4 border border-gray-100 flex items-center justify-between cursor-pointer active:scale-[0.98] shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-transform"
        >
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
               <User size={16} />
             </div>
             <span className="font-semibold text-gray-800 text-[15px]">Cập nhật thông tin</span>
           </div>
           <ChevronRight size={18} className="text-gray-400" />
        </div>

        {/* Hệ thống */}
        <div className="pt-2">
          <h3 className="font-bold text-gray-500 text-[11px] uppercase tracking-wider mb-3 px-1">Hệ thống</h3>
          <div className="bg-white rounded-[16px] border border-gray-100 overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div onClick={() => fetchTerms('TERMS_CUSTOMER_USAGE', 'Điều khoản sử dụng')} className="p-4 flex items-center justify-between border-b border-gray-100 cursor-pointer active:bg-gray-50 transition-colors">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500">
                   <ScrollText size={16} />
                 </div>
                 <span className="font-medium text-gray-800 text-[15px]">Điều khoản sử dụng</span>
               </div>
               <ChevronRight size={18} className="text-gray-400" />
            </div>

            <div onClick={() => fetchTerms('TERMS_CUSTOMER_PRIVACY', 'Chính sách bảo mật')} className="p-4 flex items-center justify-between border-b border-gray-100 cursor-pointer active:bg-gray-50 transition-colors">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500">
                   <ShieldCheck size={16} />
                 </div>
                 <span className="font-medium text-gray-800 text-[15px]">Chính sách bảo mật</span>
               </div>
               <ChevronRight size={18} className="text-gray-400" />
            </div>

            <div onClick={() => fetchTerms('SUPPORT_CONTACT', 'Trung Tâm Hỗ Trợ')} className="p-4 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500">
                   <HelpCircle size={16} />
                 </div>
                 <span className="font-medium text-gray-800 text-[15px]">Hỗ trợ / Liên hệ</span>
               </div>
               <ChevronRight size={18} className="text-gray-400" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 space-y-3">
          {userRole === 'SHOP' && (
            <button 
              onClick={handleSwitchToSeller}
              className="w-full bg-orange-500 p-3.5 rounded-[12px] text-white font-medium border flex items-center justify-center gap-2 active:bg-orange-600 transition-colors"
            >
              <Store size={18} />
              CHUYỂN SANG CHẾ ĐỘ BÁN HÀNG
            </button>
          )}

          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full bg-white p-3.5 rounded-[12px] text-[#ef4444] font-medium border border-[#fee2e2] flex items-center justify-center gap-2 active:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            ĐĂNG XUẤT TÀI KHOẢN
          </button>

          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full bg-white p-3.5 rounded-[12px] text-[#ef4444] font-medium border border-[#fee2e2] flex items-center justify-center gap-2 active:bg-red-50 transition-colors"
          >
            <Trash2 size={18} />
            YÊU CẦU XÓA TÀI KHOẢN
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/60 flex flex-col justify-end animate-fadeIn">
           {/* Nhấn ra ngoài để đóng modal */}
           <div className="flex-1" onClick={() => setShowEdit(false)}></div>
           
           <div className="w-full bg-white rounded-t-3xl shadow-2xl animate-slideUp relative flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
              <div className="pt-6 pb-2 px-5 shrink-0 bg-white z-10">
                 <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 rounded-full"></div>
                 <div className="flex justify-between items-center mb-2 mt-2">
                   <h3 className="text-lg font-bold text-gray-800">Cập nhật thông tin</h3>
                   <button onClick={() => setShowEdit(false)} className="bg-gray-100 p-2 rounded-full text-gray-600 active:scale-90 transition-transform"><X size={16} /></button>
                 </div>
              </div>
              
              <form id="editCustomerForm" onSubmit={handleUpdateProfile} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                 
                 {/* Upload Avatar Khu vực */}
                 <div className="flex flex-col items-center mb-6">
                    <div className="relative w-24 h-24 rounded-full border-4 border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden group">
                      {avatarPreview ? (
                        <img src={getFullImageUrl(avatarPreview)} alt="Preview" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                      ) : (
                        <User size={40} className="text-gray-300" />
                      )}
                      
                      <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        <Camera size={24} className="text-white mb-1" />
                        <span className="text-[10px] font-bold text-white uppercase">Đổi ảnh</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                      </label>
                      
                      {/* Biểu tượng camera luôn hiện nhỏ ở góc nếu chưa có avatar hoặc luôn hiện để biết có thể click */}
                      <div className="absolute bottom-1 right-1 bg-blue-600 p-1.5 rounded-full border-2 border-white md:hidden pointer-events-none">
                         <Camera size={12} className="text-white" />
                      </div>
                    </div>
                 </div>

                 <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Họ và Tên</label>
                    <input 
                      type="text"
                      className="w-full bg-gray-50 border border-gray-100 p-3.5 rounded-xl outline-none font-bold text-gray-800 focus:border-blue-300 focus:bg-white transition-colors"
                      value={editForm.name}
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Số Điện Thoại</label>
                    <input 
                      type="number"
                      className="w-full bg-gray-50 border border-gray-100 p-3.5 rounded-xl outline-none font-bold text-gray-800 focus:border-blue-300 focus:bg-white transition-colors"
                      value={editForm.phone}
                      onChange={e => setEditForm({...editForm, phone: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Mật khẩu mới (Tùy chọn)</label>
                    <input 
                      type="password"
                      placeholder="Để trống nếu không đổi mật khẩu"
                      className="w-full bg-gray-50 border border-gray-100 p-3.5 rounded-xl outline-none font-bold text-gray-800 focus:border-blue-300 focus:bg-white transition-colors placeholder:font-normal"
                      value={editForm.password}
                      onChange={e => setEditForm({...editForm, password: e.target.value})}
                    />
                 </div>
              </form>
              <div className="px-5 py-4 pb-safe shrink-0 bg-white border-t border-gray-100 z-10">
                <button 
                 form="editCustomerForm"
                 disabled={loading}
                 type="submit" 
                 className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:bg-blue-700 active:scale-[0.98] transition-all"
                >
                   {loading && <Loader2 size={18} className="animate-spin" />} LƯU LẠI
                </button>
              </div>
           </div>
        </div>,
        document.body
      )}

      {/* Confirm Logout Modal */}
      {showLogoutConfirm && createPortal(
        <div className="fixed inset-0 z-[999] bg-black/60 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-slideUp text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut size={32} className="text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Đăng xuất?</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={executeLogout}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Delete Account Modal */}
      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-[999] bg-black/60 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-slideUp text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Xóa tài khoản?</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa tài khoản? Hành động này sẽ vô hiệu hóa tài khoản của bạn, và bạn sẽ <b>KHÔNG THỂ</b> đăng nhập hoặc đặt đơn hàng mới được nữa.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Đồng ý Xóa'}
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
              <h2 className="font-bold text-lg flex items-center gap-2">
                {termsTitle === 'Chính sách bảo mật' ? <ShieldCheck size={20} /> : <ScrollText size={20} />} 
                {termsTitle}
              </h2>
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

      {/* Support is now handled by the dynamic terms modal */}
    </div>
  );
};

export default CustomerProfile;
