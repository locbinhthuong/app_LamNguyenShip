import React from 'react';
import { motion, useDragControls, useIsPresent } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

const CUSTOMER_TABS = ['/', '/customer/activity', '/customer/notifications', '/customer/profile'];
const SHOP_TABS = ['/shop', '/shop/activity', '/shop/notifications', '/shop/profile'];

const pageVariants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
  }),
  center: {
    x: 0,
  },
  exit: (direction) => ({
    x: direction > 0 ? '-100%' : '100%',
  })
};

export default function AnimatedPage({ children, direction = 1 }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dragControls = useDragControls();
  const isPresent = useIsPresent(); // Kiểm tra xem trang có đang bị hủy (exit) không
  
  // Chỉ cho phép kéo (drag) nếu đang ở các trang Tab chính
  const isTab = CUSTOMER_TABS.includes(location.pathname) || SHOP_TABS.includes(location.pathname);

  const handlePointerDown = (e) => {
    if (!isTab) return; // Khóa drag nếu không phải trang tab
    const target = e.target;
    // BỘ LỌC XUNG ĐỘT: Bỏ qua vùng bản đồ, các thanh trượt ngang, và các input/button
    if (
      target.closest('.overflow-x-auto') || 
      target.closest('.no-swipe') || 
      target.closest('#map') ||
      target.closest('.leaflet-container') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('a')
    ) {
      return;
    }
    dragControls.start(e);
  };

  const handleDragEnd = (event, info) => {
    const distanceX = info.offset.x;
    const velocityX = info.velocity.x;
    
    // Vuốt trái (Kéo qua trái) -> Sang trang kế tiếp
    if (distanceX < -80 || velocityX < -500) {
      navigateNext();
    } 
    // Vuốt phải (Kéo qua phải) -> Về trang trước
    else if (distanceX > 80 || velocityX > 500) {
      navigatePrev();
    }
  };

  const navigateNext = () => {
    let currentTabs = [];
    if (CUSTOMER_TABS.includes(location.pathname)) currentTabs = CUSTOMER_TABS;
    else if (SHOP_TABS.includes(location.pathname)) currentTabs = SHOP_TABS;

    if (currentTabs.length > 0) {
      const currentIndex = currentTabs.indexOf(location.pathname);
      if (currentIndex < currentTabs.length - 1) {
        navigate(currentTabs[currentIndex + 1], { state: { direction: 1 } });
      }
    }
  };

  const navigatePrev = () => {
    let currentTabs = [];
    if (CUSTOMER_TABS.includes(location.pathname)) currentTabs = CUSTOMER_TABS;
    else if (SHOP_TABS.includes(location.pathname)) currentTabs = SHOP_TABS;

    if (currentTabs.length > 0) {
      const currentIndex = currentTabs.indexOf(location.pathname);
      if (currentIndex > 0) {
        navigate(currentTabs[currentIndex - 1], { state: { direction: -1 } });
      }
    }
  };

  return (
    <motion.div
      className="absolute top-0 left-0 w-full h-full bg-gray-50 overflow-hidden"
      drag={isTab ? "x" : false}
      dragControls={dragControls}
      dragListener={false} 
      dragDirectionLock 
      dragElastic={0.2}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      custom={direction}
      variants={pageVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
      onPointerDown={handlePointerDown}
      style={{ touchAction: 'pan-y', pointerEvents: isPresent ? 'auto' : 'none' }}
    >
      <div className="w-full h-full overflow-y-auto no-scrollbar pb-24 bg-gray-50">
        {children}
      </div>
    </motion.div>
  );
}
