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
            
            // Phát âm thanh Ting Ting cho khách
            try {
              const audio = new Audio('/thongbaogiatienkhachhang.mp3');
              audio.play().catch(e => console.log('Autoplay bị chặn, cần tương tác:', e));
            } catch(err) {}

          } else if (order.status === 'ACCEPTED') {
            if (order.serviceType === 'DAT_XE') {
              message = `Tài xế ${order.assignedTo?.name || ''} đã nhận chuyến và đang đến đón bạn!`;
            } else {
              message = `Tài xế ${order.assignedTo?.name || ''} đã nhận đơn và trên đường lấy hàng!`;
            }
            type = 'success';
          } else if (order.status === 'PICKED_UP') {
            if (order.serviceType === 'DAT_XE') {
              message = `Tài xế đã đón bạn thành công! Bắt đầu di chuyển...`;
            } else {
              message = `Tài xế đã lấy hàng và bắt đầu giao!`;
            }
            type = 'warning';
          } else if (order.status === 'COMPLETED') {
            if (order.serviceType === 'DAT_XE') {
              message = `Chuyến đi ${order.orderCode} đã hoàn thành. Cảm ơn quý khách đã tin dùng!`;
            } else {
              message = `Đơn hàng ${order.orderCode} đã giao thành công. Cảm ơn quý khách!`;
            }
            type = 'success';
          } else if (order.status === 'DRAFT') {
             message = `Thông tin đơn hàng ${order.orderCode} vừa được Admin cập nhật.`;
             type = 'info';
             
             // Phát âm thanh Ting Ting cho khách khi update lại giá
             try {
               const audio = new Audio('/thongbaogiatienkhachhang.mp3');
               audio.play().catch(e => console.log('Autoplay bị chặn, cần tương tác:', e));
             } catch(err) {}
          }

          showToast(message, type, 6000);
          
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
