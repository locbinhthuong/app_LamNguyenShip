import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation, useOutlet, useNavigationType } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import AnimatedPage from './AnimatedPage';
import { Search, Clock, Bell, User } from 'lucide-react';
import { requestFirebaseToken, setupForegroundListener } from '../utils/firebase';
import { updateFcmToken } from '../services/api';

const CustomerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();
  const navType = useNavigationType();
  const direction = location.state?.direction || (navType === 'POP' ? -1 : 1);
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
    const currIndex = navItems.findIndex(n => n.path === location.pathname || (n.path === '/' && location.pathname === '/customer'));
    const targetIndex = navItems.findIndex(n => n.path === item.path);
    const direction = targetIndex > currIndex ? 1 : -1;

    if (item.requiresAuth && !isAuthenticated) {
      localStorage.setItem('intendedService', 'home');
      navigate('/login', { state: { direction: 1 } });
    } else {
      navigate(item.path, { state: { direction } });
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
          <img src="/logoALOSHIPP.png" alt="Logo" className="w-56 h-auto object-contain scale-125 origin-center" />
          <span className="font-black text-2xl text-blue-600 tracking-tight hidden">AloShipp</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/customer');
            return (
              <button
                key={index}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold ${isActive
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
          <div className="absolute top-0 left-0 right-0 bottom-0 pb-[calc(5rem+env(safe-area-inset-bottom)+1rem)] md:pb-0 overflow-x-hidden flex flex-col z-0 bg-gray-50">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <AnimatedPage key={location.pathname} direction={direction}>
                {outlet}
              </AnimatedPage>
            </AnimatePresence>
          </div>

          {/* THANH ĐIỀU HƯỚNG DƯỚI CÙNG (CHỈ XUẤT HIỆN Ở MOBILE) */}
          <div className="md:hidden absolute bottom-4 left-4 right-4 glass-panel rounded-3xl flex justify-around items-center h-[4.5rem] z-50 shadow-xl shadow-blue-900/5">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/customer');
              return (
                <button
                  key={index}
                  onClick={() => handleNavClick(item)}
                  className={`flex flex-col items-center justify-center w-full h-full relative transition-all duration-300 ${isActive ? 'text-blue-600 scale-105' : 'text-gray-400 hover:text-blue-500'
                    }`}
                >
                  <div className={`mb-1 transition-transform duration-300 ${isActive ? '-translate-y-1' : ''}`}>
                    {item.icon}
                  </div>
                  <span className={`text-[10px] transition-all duration-300 ${isActive ? 'font-bold opacity-100' : 'font-medium opacity-70'}`}>
                    {item.name}
                  </span>

                  {item.badge && (
                    <span className="absolute top-2 right-6 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                  )}
                  {isActive && (
                    <span className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full"></span>
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
