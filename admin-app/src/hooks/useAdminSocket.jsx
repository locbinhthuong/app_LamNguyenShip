import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useToast } from '../context/ToastContext';

export const useAdminSocket = () => {
  const { showToast } = useToast();
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'https://api.aloshipp.com';
    
    const socket = io(SOCKET_URL, {
      auth: { token, role: 'admin' },
      transports: ['polling', 'websocket']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔗 Admin Socket Connected');
    });

    socket.on('new_order', (order) => {
      // Chỉ khi Đơn này do Khách Đặt (createdBy = null), thì ADMIN mới Kêu Chuông. Admin tự tạo đơn thì im lìm.
      if (!order.createdBy) {
        showToast(`📲 KHÁCH ĐẶT MỚI: ${order.orderCode || order._id?.slice(-8).toUpperCase() || ''}. Click Quản Lý Đơn để mở!`, 'warning', 30000);
      }
      window.dispatchEvent(new CustomEvent('refresh_admin_orders'));
    });

    socket.on('order_accepted', (order) => {
      showToast(`Tài xế đã nhận đơn ${order.orderCode || ''}`, 'info', 4000);
      window.dispatchEvent(new CustomEvent('refresh_admin_orders'));
    });

    socket.on('order_updated', (order) => {
      // Đã Tắt Báo Động khi Tài xế từ chối Đơn hoặc Admin Treo Đơn. Giữ im lặng tuyệt đối.
      window.dispatchEvent(new CustomEvent('refresh_admin_orders'));
    });

    socket.on('order_completed', (order) => {
      showToast(`Đơn ${order.orderCode || ''} giao thành công!`, 'success', 4000);
      window.dispatchEvent(new CustomEvent('refresh_admin_orders'));
    });

    socket.on('debt_payment_request', (payload) => {
      // payload: { driverId, name, phone, driverCode, amount, timestamp }
      // Play a ringing sound if possible, then show a persistent full-screen capable alert
      showToast(`💸 BÁO CÁO NẠP TIỀN QUÉT MÃ QR CỦA TÀI XẾ ${payload.name.toUpperCase()} (Mã: ${payload.driverCode}). Chờ Sếp duyệt!`, 'error', 60000); // 60s
      
      // Kích hoạt một sự kiện để hiển thị Pop-up thao tác nhanh ở Dashboard
      window.dispatchEvent(new CustomEvent('show_debt_approval_modal', { detail: payload }));
    });

    return () => {
      socket.disconnect();
    };
  }, [showToast]);

  return socketRef.current;
};
