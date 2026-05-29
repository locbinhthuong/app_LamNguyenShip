import React from 'react';
import { motion, useDragControls } from 'framer-motion';
import { useNavigate, useLocation, useNavigationType } from 'react-router-dom';

const CUSTOMER_TABS = ['/', '/customer/activity', '/customer/notifications', '/customer/profile'];
const SHOP_TABS = ['/shop', '/shop/activity', '/shop/notifications', '/shop/profile'];

export default function AnimatedPage({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const dragControls = useDragControls();
  
  // Xác định hướng vuốt (Mặc định vuốt sang phải/Next là 1, vuốt trái/Back là -1)
  let direction = location.state?.direction || (navType === 'POP' ? -1 : 1);

  const handlePointerDown = (e) => {
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
    } else {
      navigate(-1, { state: { direction: -1 } });
    }
  };

  return (
    <motion.div
      className="absolute top-0 left-0 w-full h-full bg-gray-50 overflow-hidden"
      drag="x"
      dragControls={dragControls}
      dragListener={false} 
      dragDirectionLock 
      dragElastic={0.2}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ x: direction > 0 ? '100%' : '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: direction > 0 ? '-100%' : '100%' }}
      transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
      onPointerDown={handlePointerDown}
      style={{ touchAction: 'pan-y' }}
    >
      <div className="w-full h-full overflow-y-auto no-scrollbar pb-24 bg-gray-50">
        {children}
      </div>
    </motion.div>
  );
}
