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
    <div className="flex w-full h-[100dvh] bg-slate-50 font-sans overflow-hidden">

      {/* DESKTOP SIDEBAR TRÁI */}
      <div className="hidden md:flex flex-col w-[260px] bg-white border-r border-gray-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-40 h-full relative">
        <div className="pt-8 pb-6 px-6 flex flex-col items-start justify-center">
          <img src="/logoALOSHIPP.png" alt="Logo" className="w-36 h-auto object-contain mix-blend-multiply" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/customer');
            return (
              <button
                key={index}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-semibold ${isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
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
      </div>

      {/* VÙNG CHỨA APP CHÍNH */}
      <div className="flex-1 h-[100dvh] relative flex flex-col overflow-hidden bg-slate-50">

        {/* CONTAINER NỘI DUNG WEB */}
        <div className="relative w-full h-full overflow-hidden flex flex-col z-10 transition-all">

          {/* VÙNG RENDER NỘI DUNG */}
          <div className="absolute top-0 left-0 right-0 bottom-0 pb-[calc(5rem+env(safe-area-inset-bottom)+1rem)] md:pb-0 overflow-y-auto overflow-x-hidden flex flex-col z-0">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <AnimatedPage key={location.pathname} direction={direction}>
                {outlet}
              </AnimatedPage>
            </AnimatePresence>
          </div>

          {/* THANH ĐIỀU HƯỚNG DƯỚI CÙNG (CHỈ MOBILE) */}
          <div className="md:hidden absolute bottom-4 left-4 right-4 glass-panel rounded-[2rem] flex justify-around items-center h-[4.5rem] z-50 shadow-xl shadow-blue-900/10 border border-white/60">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/customer');
              return (
                <button
                  key={index}
                  onClick={() => handleNavClick(item)}
                  className={`flex flex-col items-center justify-center w-full h-full relative transition-all duration-300 ${isActive ? 'text-blue-600 scale-110' : 'text-gray-400 hover:text-blue-500'
                    }`}
                >
                  <div className={`mb-1 transition-transform duration-300 ${isActive ? '-translate-y-1' : ''}`}>
                    {item.icon}
                  </div>
                  {isActive && (
                    <span className="absolute -bottom-1 w-1.5 h-1.5 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.6)]"></span>
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
