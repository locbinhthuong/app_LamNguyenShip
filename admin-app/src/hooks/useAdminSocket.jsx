import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useToast } from '../context/ToastContext';

export const useAdminSocket = () => {
  const { showToast } = useToast();
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    const socket = io(SOCKET_URL, {
      auth: { token, role: 'admin' },
      transports: ['polling', 'websocket']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔗 Admin Socket Connected');
    });

    socket.on('new_order', (order) => {
      showToast(`Có đơn hàng mới: Mã ${order.orderCode || order._id?.slice(-8).toUpperCase() || ''}. Click vào Quản Lý Đơn để xem chi tiết!`, 'warning', 0);
      window.dispatchEvent(new CustomEvent('refresh_admin_orders'));
    });

    socket.on('order_accepted', (order) => {
      showToast(`Tài xế đã nhận đơn ${order.orderCode || ''}`, 'info', 4000);
      window.dispatchEvent(new CustomEvent('refresh_admin_orders'));
    });

    socket.on('order_updated', (order) => {
      // Logic cũ: Báo đỏ khi tài xế huỷ/từ chối (cũng kêu chuông)
      if (order.status === 'PENDING' && order.cancelReason) {
        showToast(`🚫 Tài xế từ chối đơn #${order.orderCode || order._id.slice(-8).toUpperCase()} - Lý do: ${order.cancelReason}`, 'error', 0);
      }
      window.dispatchEvent(new CustomEvent('refresh_admin_orders'));
    });

    socket.on('order_completed', (order) => {
      showToast(`Đơn ${order.orderCode || ''} giao thành công!`, 'success', 4000);
      window.dispatchEvent(new CustomEvent('refresh_admin_orders'));
    });

    return () => {
      socket.disconnect();
    };
  }, [showToast]);

  return socketRef.current;
};
