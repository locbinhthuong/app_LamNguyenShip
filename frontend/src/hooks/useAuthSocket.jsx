import { useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { connectSocket, disconnectSocket } from '../services/api';

export const useAuthSocket = () => {
  const { showToast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('customerToken') || localStorage.getItem('shopToken');
    const role = localStorage.getItem('customerRole')?.toLowerCase() || 'customer';
    
    if (token) {
      const socket = connectSocket(token, role);
      
      if (socket) {
        socket.on('order_updated', (order) => {
          let message = `Đơn hàng ${order.orderCode || ''} đã được cập nhật trạng thái.`;
          let type = 'info';

          if (order.status === 'PENDING') {
            message = `Đơn hàng ${order.orderCode} đã được Tổng đài lên phí ship. Khách hàng/Cửa hàng có thể xem lại!`;
            type = 'info';
          } else if (order.status === 'ACCEPTED') {
            message = `Tài xế ${order.assignedTo?.name || ''} đã nhận đơn và đang đến điểm đón!`;
            type = 'success';
          } else if (order.status === 'PICKED_UP') {
            message = `Tài xế đã lấy hàng và bắt đầu di chuyển!`;
            type = 'warning';
          } else if (order.status === 'COMPLETED') {
            message = `Đơn hàng ${order.orderCode} đã hoàn thành. Cảm ơn quý khách!`;
            type = 'success';
          } else if (order.status === 'DRAFT') {
             message = `Thông tin đơn hàng ${order.orderCode} vừa được Admin cập nhật hoặc đang chờ xác nhận báo giá.`;
             type = 'info';
          }

          showToast(message, type, 5000);
          
          // Phát một custom event truyền kèm cục data order mới nhất
          window.dispatchEvent(new CustomEvent('refresh_orders_data', { detail: order }));
        });

        socket.on('order_deleted_event', (orderId) => {
          showToast('Đơn hàng của bạn đã bị xoá khỏi hệ thống bởi Admin.', 'error', 5000);
          window.dispatchEvent(new CustomEvent('order_deleted_event', { detail: orderId }));
        });
      }
    }

    return () => {
      // Chúng ta không gọi disconnectSocket() ở đây vì nếu chuyển Page nó sẽ bị ngắt
      // Sẽ handle ngắt khi Logout
    };
  }, [showToast]);
};
