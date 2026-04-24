import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Search, Clock, Bell, User } from 'lucide-react';
import { requestFirebaseToken, setupForegroundListener } from '../utils/firebase';
import { updateFcmToken } from '../services/api';

const CustomerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem('customerToken');

  useEffect(() => {
    const initFirebase = async () => {
      if (isAuthenticated) {
        const token = await requestFirebaseToken();
        if (token) {
          try {
            await updateFcmToken(token);
            console.log('Cập nhật FCM Token Customer thành công.');
          } catch (error) {
            console.error('Lỗi cập nhật FCM Token Customer:', error);
          }
        }
      }
    };

    initFirebase();

    const unsubscribe = setupForegroundListener((payload) => {
      const title = payload.notification?.title || 'Thông báo';
      const body = payload.notification?.body || '';
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/logoALOSHIPP.png' });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isAuthenticated]);

  const navItems = [
    { name: 'Trang chủ', path: '/', icon: <Search size={22} /> },
    { name: 'Hoạt động', path: '/customer/activity', icon: <Clock size={22} />, requiresAuth: true },
    { name: 'Thông báo', path: '/customer/notifications', icon: <Bell size={22} />, badge: true, requiresAuth: true },
    { name: 'Tài khoản', path: '/customer/profile', icon: <User size={22} />, requiresAuth: true }
  ];

  const handleNavClick = (item) => {
    if (item.requiresAuth && !isAuthenticated) {
      localStorage.setItem('intendedService', 'home');
      navigate('/login');
    } else {
      navigate(item.path);
    }
  };

  return (
    <div className="flex w-full h-[100dvh] bg-slate-100 font-sans overflow-hidden relative">
      
      {/* NỀN TRANG TRÍ DESKTOP (Chỉ hiện trên màn lớn) */}
      <div className="hidden md:block absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#3b82f6 2px, transparent 2px)', backgroundSize: '30px 30px' }}>
      </div>

      {/* DESKTOP SIDEBAR TRÁI */}
      <div className="hidden md:flex flex-col w-[280px] bg-white border-r border-gray-200 shadow-2xl z-50 h-[100dvh] relative">
        <div className="p-6 flex items-center justify-center border-b border-gray-100 bg-gradient-to-br from-blue-50/50 to-white">
          <img src="/logoALOSHIPP.png" alt="Logo" className="w-32 h-auto  scale-110 object-contain" />
          <span className="font-black text-2xl text-blue-600 tracking-tight hidden">AloShipp</span>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/customer');
            return (
              <button
                key={index}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                    : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <div className="relative">
                  {item.icon}
                  {item.badge && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                </div>
                <span className="text-[15px]">{item.name}</span>
              </button>
            )
          })}
        </div>
        
        <div className="p-6 text-center">
            <p className="text-xs font-semibold text-gray-400">© 2026 AloShipp Web App</p>
        </div>
      </div>

      {/* VÙNG CHỨA APP GIỮA MÀN HÌNH */}
      <div className="flex-1 h-[100dvh] relative flex overflow-hidden">
        
        {/* CONTAINER NỘI DUNG WEB FULL TỶ LỆ */}
        <div className="relative w-full h-full bg-white overflow-hidden flex flex-col z-10 transition-all">

          {/* VÙNG RENDER COMPONENT CON THỰC TẾ CỦA APP */}
          <div className="absolute top-0 left-0 right-0 bottom-[64px] md:bottom-0 pb-[env(safe-area-inset-bottom)] overflow-y-auto overflow-x-hidden flex flex-col z-0 bg-gray-50 scroll-smooth">
            <Outlet />
          </div>

          {/* THANH ĐIỀU HƯỚNG DƯỚI CÙNG (CHỈ XUẤT HIỆN Ở MOBILE) */}
          <div className="md:hidden absolute bottom-0 left-0 w-full bg-white border-t border-gray-100 flex justify-around items-center h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/customer');
              return (
                <button 
                  key={index}
                  onClick={() => handleNavClick(item)}
                  className={`flex flex-col items-center justify-center w-full h-full relative transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-400 hover:text-blue-500'
                  }`}
                >
                  <div className={`mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}>
                    {item.icon}
                  </div>
                  <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                    {item.name}
                  </span>
                  
                  {item.badge && (
                     <span className="absolute top-2 right-6 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>
              )
            })}
          </div>

        </div>
      </div>

    </div>
  );
};

export default CustomerLayout;
