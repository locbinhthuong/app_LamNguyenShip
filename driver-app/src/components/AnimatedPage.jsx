import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

const DRIVER_TABS = ['/', '/my-orders', '/earnings'];

const pageVariants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 1,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 1,
  })
};

export default function AnimatedPage({ children, direction = 1 }) {
  const location = useLocation();
  const navigate = useNavigate();
  const touchRef = useRef({ startX: null, startY: null, lockedAxis: null, ignore: false });

  // Trang chủ (/) tự quản lý bố cục cố định Header + khung cuộn riêng bên trong từng Tab
  const isHomePage = location.pathname === '/';
  // Chỉ chuyển tab bằng thao tác vuốt ở các trang tab phụ (/my-orders, /earnings); trang chủ (/) đã có bộ lướt 3 tab riêng
  const isSubTab = location.pathname === '/my-orders' || location.pathname === '/earnings';

  const handleTouchStart = (e) => {
    if (!isSubTab || e.touches.length !== 1) return;
    const target = e.target;
    if (
      target.closest('.overflow-x-auto') ||
      target.closest('.no-swipe') ||
      target.closest('#map') ||
      target.closest('.leaflet-container') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('button') ||
      target.closest('a')
    ) {
      touchRef.current.ignore = true;
      return;
    }
    touchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      lockedAxis: null,
      ignore: false
    };
  };

  const handleTouchMove = (e) => {
    if (!isSubTab || touchRef.current.ignore || touchRef.current.startX === null) return;
    const dx = e.touches[0].clientX - touchRef.current.startX;
    const dy = e.touches[0].clientY - touchRef.current.startY;

    if (!touchRef.current.lockedAxis) {
      if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) {
        touchRef.current.lockedAxis = 'y';
      } else if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        touchRef.current.lockedAxis = 'x';
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (!isSubTab || touchRef.current.ignore || touchRef.current.startX === null) return;
    const endX = e.changedTouches?.[0]?.clientX ?? touchRef.current.startX;
    const endY = e.changedTouches?.[0]?.clientY ?? touchRef.current.startY;
    const dx = endX - touchRef.current.startX;
    const dy = endY - touchRef.current.startY;
    const axis = touchRef.current.lockedAxis;

    touchRef.current = { startX: null, startY: null, lockedAxis: null, ignore: false };

    if (axis === 'x' && Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      const currentIndex = DRIVER_TABS.indexOf(location.pathname);
      if (dx < -75 && currentIndex >= 0 && currentIndex < DRIVER_TABS.length - 1) {
        navigate(DRIVER_TABS[currentIndex + 1], { state: { direction: 1 } });
      } else if (dx > 75 && currentIndex > 0) {
        navigate(DRIVER_TABS[currentIndex - 1], { state: { direction: -1 } });
      }
    }
  };

  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-slate-50 overflow-hidden"
      custom={direction}
      variants={pageVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.22 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{ pointerEvents: 'auto', willChange: 'transform' }}
    >
      {isHomePage ? (
        <div className="w-full h-full overflow-hidden bg-slate-50">
          {children}
        </div>
      ) : (
        <div
          id="animated-page-scroll-container"
          className="w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar pb-24 bg-slate-50"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', touchAction: 'pan-y' }}
        >
          {children}
        </div>
      )}
    </motion.div>
  );
}
