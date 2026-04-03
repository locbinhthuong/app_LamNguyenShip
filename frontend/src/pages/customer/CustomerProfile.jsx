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
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 pt-10 text-white rounded-b-[40px] shadow-lg relative overflow-hidden">
        <h1 className="text-xl font-bold mb-4">Hồ Sơ Cá Nhân</h1>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/50 backdrop-blur-sm">
            <User size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{profile ? profile.name : 'Đang tải...'}</h2>
            <div className="flex items-center gap-1.5 opacity-90 mt-1">
              <Phone size={14} />
              <span className="text-sm font-medium">{profile?.phone}</span>
            </div>
            <div className="inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 mt-2 rounded-full shadow-sm">
               <ShieldCheck size={12}/>
               <span className="text-[10px] font-bold uppercase tracking-wider">Khách Hàng</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 mt-2 space-y-3">
        <div 
          onClick={openEditModal}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer active:scale-[0.98]"
        >
           <span className="font-semibold text-gray-800">Cập nhật thông tin</span>
           <ChevronRight size={18} className="text-gray-400" />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer active:scale-[0.98]">
           <span className="font-semibold text-gray-800">Các Điều Khoản App</span>
           <ChevronRight size={18} className="text-gray-400" />
        </div>

        <button 
          onClick={handleLogout}
          className="w-full bg-white mt-5 p-4 rounded-2xl text-red-500 font-bold shadow-sm border border-red-50 flex items-center justify-center gap-2 active:bg-gray-50 transition-colors"
        >
          <LogOut size={20} />
          ĐĂNG XUẤT TÀI KHOẢN
        </button>
      </div>

      {showEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col justify-end">
           <div className="w-full bg-white rounded-t-3xl min-h-[50vh] p-4 animate-slideUp">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Cập nhật thông tin</h3>
                <button onClick={() => setShowEdit(false)} className="bg-gray-100 p-2 rounded-full text-gray-600"><X size={16} /></button>
              </div>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Họ và Tên</label>
                    <input 
                      type="text"
                      className="w-full mt-1 bg-gray-50 border p-3 rounded-xl outline-none font-semibold text-gray-800 focus:border-blue-300"
                      value={editForm.name}
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Số Điện Thoại</label>
                    <input 
                      type="number"
                      className="w-full mt-1 bg-gray-50 border p-3 rounded-xl outline-none font-bold text-gray-800 focus:border-blue-300"
                      value={editForm.phone}
                      onChange={e => setEditForm({...editForm, phone: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Mật khẩu mới (Tùy chọn)</label>
                    <input 
                      type="password"
                      placeholder="Để trống nếu không đổi mật khẩu"
                      className="w-full mt-1 bg-gray-50 border p-3 rounded-xl outline-none font-medium text-gray-800 focus:border-blue-300"
                      value={editForm.password}
                      onChange={e => setEditForm({...editForm, password: e.target.value})}
                    />
                 </div>
                 
                 <button 
                  disabled={loading}
                  type="submit" 
                  className="w-full mt-6 bg-blue-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
                 >
                    {loading && <Loader2 size={16} className="animate-spin" />} Cập Nhật
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;
