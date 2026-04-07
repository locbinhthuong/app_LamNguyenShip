import { useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { connectSocket, disconnectSocket } from '../services/api';

// Hack AudioContext Global
let customerAudioCtx = null;
let pricePingBuffer = null;
const initCustomerAudio = async () => {
    try {
        if (!customerAudioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            customerAudioCtx = new AudioContext();
            
            fetch('/thongbaogiatienkhachhang.mp3').then(res => res.arrayBuffer()).then(arr => customerAudioCtx.decodeAudioData(arr)).then(buf => pricePingBuffer = buf);
        }
        if (customerAudioCtx.state === 'suspended') customerAudioCtx.resume();
    } catch(e){}
};
window.addEventListener('click', initCustomerAudio, { once: true });
window.addEventListener('touchstart', initCustomerAudio, { once: true });

const playCustomerPing = () => {
    try {
        if (customerAudioCtx && pricePingBuffer) {
            if (customerAudioCtx.state === 'suspended') customerAudioCtx.resume();
            const source = customerAudioCtx.createBufferSource();
            source.buffer = pricePingBuffer;
            source.connect(customerAudioCtx.destination);
            source.start(0);
        } else {
            // Chuông Fallback
            new Audio('/thongbaogiatienkhachhang.mp3').play().catch(e => console.log('Autoplay blocked'));
        }
    } catch(err) {}
};

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
            playCustomerPing();
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
             playCustomerPing();
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
