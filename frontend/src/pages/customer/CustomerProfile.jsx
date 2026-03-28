import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, LogOut, ShieldCheck, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';

const CustomerProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
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
    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
    // Reload mượt mà để lấy trạng thái Guest mới nhất
    window.location.reload();
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
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer active:scale-[0.98]">
           <span className="font-semibold text-gray-800">Cập nhật thông tin</span>
           <ChevronRight size={18} className="text-gray-400" />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer active:scale-[0.98]">
           <span className="font-semibold text-gray-800">Các Điều Khoản App</span>
           <ChevronRight size={18} className="text-gray-400" />
        </div>

        <button 
          onClick={handleLogout}
          className="w-full bg-white mt-5 p-4 rounded-2xl text-red-500 font-bold shadow-sm border border-red-50 flex items-center justify-center gap-2 active:bg-gray-50"
        >
          <LogOut size={20} />
          ĐĂNG XUẤT TÀI KHOẢN
        </button>
      </div>
    </div>
  );
};

export default CustomerProfile;
