import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Search, Clock, Bell, User } from 'lucide-react';

const CustomerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem('customerToken');

  const navItems = [
    { name: 'Trang chủ', path: '/', icon: <Search size={22} /> },
    { name: 'Hoạt động', path: '/customer/activity', icon: <Clock size={22} />, requiresAuth: true },
    { name: 'Thông báo', path: '/customer/notifications', icon: <Bell size={22} />, badge: true },
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
    <div className="flex flex-col h-[100dvh] bg-gray-50 font-sans relative overflow-hidden">
      
      {/* KHU VỰC HIỂN THỊ CÁC COMPONENT CON */}
      <div className="absolute top-0 left-0 right-0 bottom-[64px] pb-[env(safe-area-inset-bottom)] overflow-y-auto overflow-x-hidden flex flex-col z-0">
        <Outlet />
      </div>

      {/* THANH ĐIỀU HƯỚNG DƯỚI CÙNG */}
      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-100 flex justify-around items-center h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
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
              
              {/* Badge Đỏ góc phải icon */}
              {item.badge && (
                 <span className="absolute top-2 right-6 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  );
};

export default CustomerLayout;
