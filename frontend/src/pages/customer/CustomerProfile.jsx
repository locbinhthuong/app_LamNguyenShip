import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, LogOut, ShieldCheck, ChevronRight, X, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

const CustomerProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);

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
    setEditForm({ name: profile?.name || '', phone: profile?.phone || '', password: '' });
    setShowEdit(true);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      return alert('Tên và Số điện thoại không được để trống.');
    }
    setLoading(true);
    try {
       const res = await api.put('/auth/customer/me', editForm);
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

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden relative">
      {/* ẢNH BÌA & AVATAR */}
      <div className="relative h-[250px] shrink-0">
        {/* Ảnh bìa */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-800 border-b border-gray-200">
           {/* Pattern trang trí cho giống cover xịn */}
           <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.4) 0%, transparent 40%)' }}></div>
        </div>

        {/* Thông tin phía dưới ảnh bìa */}
        <div className="absolute bottom-4 left-6 right-6 flex items-end gap-4 z-10">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-md relative overflow-hidden">
             {profile?.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
             ) : (
                <div className="bg-gray-100 w-full h-full flex items-center justify-center text-gray-400">
                    <User size={36} className="text-gray-400" />
                </div>
             )}
          </div>
          <div className="pb-1 text-white text-shadow-sm drop-shadow-md">
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
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
        >
           <span className="font-semibold text-gray-800">Cập nhật thông tin</span>
           <ChevronRight size={18} className="text-gray-400" />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform">
           <span className="font-semibold text-gray-800">Các Điều Khoản App</span>
           <ChevronRight size={18} className="text-gray-400" />
        </div>

        <button 
          onClick={handleLogout}
          className="w-full bg-white mt-8 p-4 rounded-2xl text-red-500 font-bold shadow-sm border border-red-50 flex items-center justify-center gap-2 active:bg-red-50 transition-colors"
        >
          <LogOut size={20} />
          ĐĂNG XUẤT TÀI KHOẢN
        </button>
      </div>

      {showEdit && (
        <div className="absolute inset-0 z-50 bg-black/60 flex flex-col justify-end animate-fadeIn">
           {/* Nhấn ra ngoài để đóng modal */}
           <div className="flex-1" onClick={() => setShowEdit(false)}></div>
           
           <div className="w-full bg-white rounded-t-3xl p-5 shadow-2xl animate-slideUp relative flex flex-col max-h-[85%]">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 rounded-full"></div>
              
              <div className="flex justify-between items-center mb-6 mt-4 shrink-0">
                <h3 className="text-lg font-bold text-gray-800">Cập nhật thông tin</h3>
                <button onClick={() => setShowEdit(false)} className="bg-gray-100 p-2 rounded-full text-gray-600 active:scale-90 transition-transform"><X size={16} /></button>
              </div>
              
              <form onSubmit={handleUpdateProfile} className="space-y-5 overflow-y-auto pb-4">
                 <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl mb-4">
                    <p className="text-xs text-blue-700 italic">Tính năng cập nhật ảnh bìa và ảnh đại diện đang được update ở phiên bản sau.</p>
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
                 
                 <div className="pt-2">
                   <button 
                    disabled={loading}
                    type="submit" 
                    className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:bg-blue-700 active:scale-[0.98] transition-all"
                   >
                      {loading && <Loader2 size={18} className="animate-spin" />} LƯU LẠI
                   </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;
