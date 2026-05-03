import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { User, Phone, LogOut, ShieldCheck, ChevronRight, X, Loader2, Camera, Trash2, FileText, HelpCircle, QrCode } from 'lucide-react';
import { api, uploadCustomerAvatar, getFullImageUrl, deleteMyAccount, getActiveAnnouncements } from '../../services/api';

const CustomerProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', password: '', avatar: '' });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showTermsOptions, setShowTermsOptions] = useState(false);
  const [showTermsContent, setShowTermsContent] = useState(false);
  const [termsData, setTermsData] = useState(null);
  const [loadingTerms, setLoadingTerms] = useState(false);
  
  const [showContact, setShowContact] = useState(false);

  const fetchTerms = async (type) => {
    try {
      setShowTermsOptions(false);
      setLoadingTerms(true);
      setShowTermsContent(true);
      setTermsData(null);
      const res = await getActiveAnnouncements();
      if (res && res.success) {
        const terms = res.data.find(a => a.type === type && a.isActive);
        if (terms) {
          setTermsData(terms);
        } else {
          setTermsData({ title: 'Chưa có dữ liệu', content: 'Nội dung điều khoản đang được cập nhật.' });
        }
      }
    } catch (err) {
       setTermsData({ title: 'Lỗi', content: 'Không thể tải điều khoản.' });
    } finally {
      setLoadingTerms(false);
    }
  };

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

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
    // Reload mượt mà để lấy trạng thái Guest mới nhất
    window.location.reload();
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
      {/* ẢNH BÌA & AVATAR */}
      <div className="relative h-[250px] shrink-0">
        {/* Ảnh bìa */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-800 shadow-lg rounded-b-[40px] overflow-hidden">
           {/* Pattern trang trí cho giống cover xịn */}
           <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.4) 0%, transparent 40%)' }}></div>
        </div>

        <h1 className="absolute left-6 text-xl font-bold mb-4 text-white" style={{ top: 'max(env(safe-area-inset-top), 24px)' }}>Hồ sơ khách hàng</h1>
        
        {/* Thông tin phía dưới ảnh bìa */}
        <div className="absolute bottom-4 left-6 right-6 flex items-end gap-4 z-10">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-md relative overflow-hidden">
             {profile?.avatar ? (
                <img src={getFullImageUrl(profile.avatar)} alt="Avatar" className="w-full h-full object-cover" />
             ) : (
                <div className="bg-gray-100 w-full h-full flex items-center justify-center text-gray-400">
                    <User size={36} className="text-gray-400" />
                </div>
             )}
          </div>
          <div className="pb-1 text-white text-shadow-sm ">
            <h2 className="text-2xl font-bold tracking-tight">{profile ? profile.name : 'Đang tải...'}</h2>
            <div className="flex items-center gap-1.5 mt-1 font-medium text-blue-50 opacity-90">
              <Phone size={14} />
              <span className="text-sm">{profile?.phone}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        <div 
          onClick={openEditModal}
          className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
        >
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
               <User size={20} />
             </div>
             <span className="font-semibold text-gray-800">Cập nhật thông tin</span>
           </div>
           <ChevronRight size={18} className="text-gray-400" />
        </div>

        <div>
          <h3 className="font-extrabold text-gray-400 text-[11px] uppercase tracking-wider mb-2 px-1 mt-4">Hệ thống</h3>
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div onClick={() => setShowTermsOptions(true)} className="p-4 flex items-center justify-between border-b border-gray-100 cursor-pointer active:bg-gray-50 transition-colors">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                   <ShieldCheck size={20} />
                 </div>
                 <span className="font-semibold text-gray-800">Chính sách & Điều khoản</span>
               </div>
               <ChevronRight size={18} className="text-gray-400" />
            </div>

            <div onClick={() => setShowContact(true)} className="p-4 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                   <HelpCircle size={20} />
                 </div>
                 <span className="font-semibold text-gray-800">Hỗ trợ / Liên hệ</span>
               </div>
               <ChevronRight size={18} className="text-gray-400" />
            </div>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full bg-white mt-8 p-4 rounded-2xl text-red-500 font-bold border border-red-50 flex items-center justify-center gap-2 active:bg-red-50 transition-colors"
        >
          <LogOut size={20} />
          ĐĂNG XUẤT TÀI KHOẢN
        </button>

        <button 
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full bg-white mt-3 p-4 rounded-2xl text-red-600 font-bold border border-red-100 flex items-center justify-center gap-2 active:bg-red-50 transition-colors"
        >
          <Trash2 size={20} />
          YÊU CẦU XÓA TÀI KHOẢN
        </button>
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

      {/* Confirm Delete Account Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fadeIn">
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
        </div>
      )}

      {/* Terms Options Modal */}
      {showTermsOptions && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slideUp">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Chọn điều khoản</h3>
              <button onClick={() => setShowTermsOptions(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="space-y-3">
              <button onClick={() => fetchTerms('TERMS_DRIVER')} className="w-full py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2">
                <FileText size={18} /> Dành cho Tài xế
              </button>
              <button onClick={() => fetchTerms('TERMS_CUSTOMER')} className="w-full py-4 bg-blue-50 border border-blue-200 rounded-2xl font-bold text-blue-700 hover:bg-blue-100 flex items-center justify-center gap-2">
                <ShieldCheck size={18} /> Dành cho Khách hàng & Cửa hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms Content Modal */}
      {showTermsContent && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-slideUp">
          <div className="shrink-0 bg-white px-4 py-3 safe-pt z-40 flex items-center shadow-sm border-b border-gray-100">
            <h3 className="font-bold text-gray-800 flex-1 text-center pl-8 whitespace-nowrap overflow-hidden text-ellipsis text-lg">
              {loadingTerms ? 'Đang tải...' : termsData?.title || 'Chính sách & Điều khoản'}
            </h3>
            <button onClick={() => setShowTermsContent(false)} className="p-2 bg-gray-100 rounded-full text-gray-600 active:scale-90 transition-transform">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
            {loadingTerms ? (
               <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
            ) : (
               <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 whitespace-pre-wrap leading-relaxed text-gray-700">
                 {termsData?.content}
               </div>
            )}
          </div>
        </div>
      )}

      {/* Contact/Support Modal */}
      {showContact && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-slideUp text-center relative overflow-hidden">
            <button onClick={() => setShowContact(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1"><X size={20} /></button>
            
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500 mt-2">
              <HelpCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Hỗ trợ / Liên hệ</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Quét mã QR qua Zalo hoặc gọi vào số điện thoại dưới đây để được dịch vụ điều phối hỗ trợ lấy hàng.
            </p>
            
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6 flex flex-col items-center justify-center">
              <div className="w-40 h-40 bg-white border border-gray-200 p-2 rounded-xl shadow-sm flex items-center justify-center mb-4">
                 <QrCode size={120} className="text-gray-800" strokeWidth={1} />
              </div>
              <p className="font-extrabold text-2xl text-blue-600 tracking-wider font-mono">090.XXXX.XXX</p>
              <p className="text-xs text-gray-400 mt-1">Hotline điều phối lấy hàng</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;
