import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SwipeWrapper({ children }) {
  const navigate = useNavigate();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const isEdgeSwipe = useRef(false);

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    // Bắt đầu vuốt từ mép trái màn hình (dưới 40px)
    isEdgeSwipe.current = touchStartX.current < 40;
  };

  const handleTouchMove = (e) => {
    if (!isEdgeSwipe.current) return;
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!isEdgeSwipe.current) return;
    if (!touchStartX.current || !touchEndX.current) return;

    const distanceX = touchStartX.current - touchEndX.current;
    const distanceY = Math.abs(touchStartY.current - touchEndY.current);

    // Nếu vuốt từ trái sang phải (distanceX âm) đủ dài và ít lệch dọc
    if (distanceX < -50 && distanceY < 50) {
      navigate(-1);
    }

    // Reset
    touchStartX.current = 0;
    touchEndX.current = 0;
    isEdgeSwipe.current = false;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full h-full flex flex-col overflow-hidden relative"
    >
      {children}
    </div>
  );
}
