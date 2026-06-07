import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, useOutlet, useNavigationType } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import AnimatedPage from './AnimatedPage';
import { Search, Clock, Bell, User, MapPin, LogOut, HelpCircle, LayoutDashboard, Search as SearchIcon } from 'lucide-react';
import { requestFirebaseToken, setupForegroundListener } from '../utils/firebase';
import { updateFcmToken } from '../services/api';

const CustomerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();
  const navType = useNavigationType();
  const direction = location.state?.direction || (navType === 'POP' ? -1 : 1);
  const isAuthenticated = !!localStorage.getItem('customerToken');
  const [address, setAddress] = useState('Đang tải...');

  useEffect(() => {
    const initFirebase = async () => {
      if (isAuthenticated) {
        const token = await requestFirebaseToken();
        if (token) {
          try {
            await updateFcmToken(token);
          } catch (error) {
            console.error('Lỗi cập nhật FCM Token Customer:', error);
          }
        }
      }
    };

    initFirebase();

    const saved = sessionStorage.getItem('savedLocation');
    if (saved) {
      const loc = JSON.parse(saved);
      const shortAddress = loc.address.split(',').slice(0, 2).join(', ');
      setAddress(shortAddress);
    }

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
    { name: 'Bảng điều khiển', path: '/', icon: <LayoutDashboard size={20} strokeWidth={1.5} /> },
    { name: 'Đơn hàng', path: '/customer/activity', icon: <Clock size={20} strokeWidth={1.5} />, requiresAuth: true },
    { name: 'Thông báo', path: '/customer/notifications', icon: <Bell size={20} strokeWidth={1.5} />, badge: true, requiresAuth: true },
    { name: 'Tài khoản', path: '/customer/profile', icon: <User size={20} strokeWidth={1.5} />, requiresAuth: true }
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

  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerData');
    navigate('/login');
  };

  return (
    <div className="flex w-full h-[100dvh] bg-[#f8fafc] font-sans overflow-hidden">

      {/* DESKTOP SIDEBAR TRÁI */}
      <div className="hidden md:flex flex-col w-[260px] bg-white border-r border-gray-100/60 shadow-[4px_0_24px_rgba(0,0,0,0.01)] z-40 h-full relative">
        <div className="pt-8 pb-8 px-8 flex flex-col items-start justify-center">
          <img src="/logoALOSHIPP.png" alt="Logo" className="w-36 h-auto object-contain mix-blend-multiply -ml-2" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mt-1 pl-2">Logistics Platform</span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-1">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/customer');
            return (
              <button
                key={index}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-medium ${isActive
                  ? 'bg-gray-100 text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                  }`}
              >
                <div className="relative">
                  {item.icon}
                  {item.badge && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                </div>
                <span className="text-[14px]">{item.name}</span>
              </button>
            )
          })}
        </div>
        
        {/* SIDEBAR BOTTOM OPTIONS */}
        <div className="p-5 flex flex-col gap-2 border-t border-gray-100/60">
          <button className="w-full bg-[#0a192f] text-white py-3.5 rounded-xl font-semibold text-sm shadow-md hover:bg-[#112240] transition-colors">
            Đặt đơn mới
          </button>
          
          <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 mt-2">
            <HelpCircle size={20} strokeWidth={1.5} />
            <span className="text-[14px]">Trợ giúp</span>
          </button>
          
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-gray-500 hover:bg-gray-50 hover:text-red-500">
            <LogOut size={20} strokeWidth={1.5} />
            <span className="text-[14px]">Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* VÙNG CHỨA APP CHÍNH */}
      <div className="flex-1 h-[100dvh] relative flex flex-col overflow-hidden bg-[#f8fafc]">
        
        {/* DESKTOP TOP HEADER (Bắt chước ảnh mẫu) */}
        <div className="hidden md:flex h-[72px] bg-white/60 backdrop-blur-md border-b border-gray-100/50 px-8 items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-8">
            <button className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Tra cứu</button>
            <button className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Bưu cục</button>
            <button className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Khuyến mãi</button>
          </div>
          
          <div className="flex items-center gap-5">
            <button className="text-gray-500 hover:text-gray-900 transition-colors relative">
              <Bell size={20} strokeWidth={1.5} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <button className="text-gray-500 hover:text-gray-900 transition-colors">
              <MapPin size={20} strokeWidth={1.5} />
            </button>
            <button className="flex items-center gap-2 bg-gray-100/80 hover:bg-gray-200 pl-3 pr-1 py-1 rounded-full transition-colors ml-2">
              <span className="text-xs font-semibold text-gray-700">Tài khoản</span>
              <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
                <User size={14} />
              </div>
            </button>
          </div>
        </div>

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
