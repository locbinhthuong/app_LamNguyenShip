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
    <div className="flex items-center justify-center w-full h-[100dvh] mesh-bg font-sans overflow-hidden relative">

      {/* FLOATING SIDEBAR (Chỉ hiện trên Desktop) */}
      <div className="hidden md:flex flex-col items-center justify-center absolute left-[10%] xl:left-[15%] z-50 pointer-events-none">
        <img src="/logoALOSHIPP.png" alt="Logo" className="w-40 h-auto object-contain mb-8 filter drop-shadow-xl pointer-events-auto" />
        
        <div className="glass-pill rounded-[2rem] p-4 flex flex-col gap-4 pointer-events-auto">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/customer');
            return (
              <button
                key={index}
                onClick={() => handleNavClick(item)}
                className={`w-14 h-14 flex items-center justify-center rounded-[1.2rem] transition-all duration-300 relative group ${
                  isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 scale-110'
                  : 'bg-white/50 text-gray-500 hover:bg-white hover:text-blue-600 hover:scale-105'
                }`}
              >
                {item.icon}
                {item.badge && <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white/50"></span>}
                
                {/* Tooltip on hover */}
                <div className="absolute left-[calc(100%+1rem)] bg-gray-900 text-white text-sm font-semibold px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                  {item.name}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* DEVICE FRAME CỦA APP */}
      <div className="w-full h-full md:w-[480px] md:h-[90dvh] md:max-h-[900px] md:rounded-[2.5rem] relative overflow-hidden bg-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] md:border-[8px] border-white/40 flex flex-col z-10 transition-all duration-500 transform-gpu md:hover:scale-[1.01]">
        
        {/* VÙNG RENDER NỘI DUNG */}
        <div className="absolute top-0 left-0 right-0 bottom-0 pb-[calc(5rem+env(safe-area-inset-bottom)+1rem)] md:pb-0 overflow-x-hidden flex flex-col z-0 bg-gray-50/50">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <AnimatedPage key={location.pathname} direction={direction}>
              {outlet}
            </AnimatedPage>
          </AnimatePresence>
        </div>

        {/* THANH ĐIỀU HƯỚNG DƯỚI CÙNG (Mobile chỉ) */}
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
  );
};

export default CustomerLayout;
