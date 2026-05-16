import React, { useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const CUSTOMER_TABS = ['/', '/customer/activity', '/customer/notifications', '/customer/profile'];
const SHOP_TABS = ['/shop', '/shop/activity', '/shop/notifications', '/shop/profile'];

export default function SwipeWrapper({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const isSwiping = useRef(false);

  const handleTouchStart = (e) => {
    // Bỏ qua nếu chạm vào phần tử có cuộn ngang hoặc phần tử không cho phép vuốt (bản đồ, danh sách cuộn...)
    const target = e.target;
    if (target.closest('.overflow-x-auto') || target.closest('.no-swipe') || target.closest('#map')) {
      isSwiping.current = false;
      return;
    }
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchEndX.current = touchStartX.current;
    touchEndY.current = touchStartY.current;
    isSwiping.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isSwiping.current) return;
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!isSwiping.current) return;
    
    const distanceX = touchStartX.current - touchEndX.current;
    const distanceY = touchStartY.current - touchEndY.current;

    // Xác định tập hợp tab hiện tại
    let currentTabs = [];
    if (CUSTOMER_TABS.includes(location.pathname)) currentTabs = CUSTOMER_TABS;
    else if (SHOP_TABS.includes(location.pathname)) currentTabs = SHOP_TABS;

    // 1. Kiểm tra vuốt ngang (chuyển trang/tab)
    if (Math.abs(distanceX) > 80 && Math.abs(distanceX) > Math.abs(distanceY)) {
      if (currentTabs.length > 0) {
        const currentIndex = currentTabs.indexOf(location.pathname);
        if (distanceX > 0) { 
          // Vuốt sang trái -> Chuyển sang Tab tiếp theo
          if (currentIndex < currentTabs.length - 1) {
            navigate(currentTabs[currentIndex + 1]);
          }
        } else { 
          // Vuốt sang phải -> Chuyển về Tab trước đó
          if (currentIndex > 0) {
            navigate(currentTabs[currentIndex - 1]);
          }
        }
      } else {
        // Nếu đang ở màn hình chi tiết (không phải màn hình chính) -> Vuốt từ cạnh trái để quay lại
        if (distanceX < 0 && touchStartX.current < 40) {
          navigate(-1);
        }
      }
    }
    
    // 2. Kiểm tra vuốt dọc xuống (Pull to Refresh)
    // distanceY âm nghĩa là ngón tay di chuyển từ trên xuống dưới
    if (distanceY < -100 && Math.abs(distanceY) > Math.abs(distanceX)) {
      // Chỉ reload khi màn hình đang ở vị trí trên cùng
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollableElement = document.querySelector('.overflow-y-auto') || document.querySelector('.h-full');
      const innerScrollTop = scrollableElement ? scrollableElement.scrollTop : 0;
      
      if (scrollTop === 0 && innerScrollTop === 0) {
        window.dispatchEvent(new CustomEvent('refresh_data'));
      }
    }

    isSwiping.current = false;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full h-full"
    >
      {children}
    </div>
  );
}
