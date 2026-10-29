import { useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { connectSocket, disconnectSocket } from '../services/api';
import { Capacitor } from '@capacitor/core';
import { NativeAudio } from '@capacitor-community/native-audio';

// Hack AudioContext Global
let customerAudioCtx = null;
let pricePingBuffer = null;
const initCustomerAudio = async () => {
    if (Capacitor.isNativePlatform()) {
        try {
            await NativeAudio.preload({
                assetId: 'ting_ting',
                assetPath: 'thongbaogiatienkhachhang.mp3',
                audioChannelNum: 1,
                isUrl: false
            });
        } catch(e) {
            console.log('NativeAudio preload error:', e);
        }
    } else {
        try {
            if (!customerAudioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                customerAudioCtx = new AudioContext();
                
                fetch('/thongbaogiatienkhachhang.mp3').then(res => res.arrayBuffer()).then(arr => customerAudioCtx.decodeAudioData(arr)).then(buf => pricePingBuffer = buf);
            }
            if (customerAudioCtx.state === 'suspended') customerAudioCtx.resume();
        } catch(e){}
    }
};

if (!Capacitor.isNativePlatform()) {
    window.addEventListener('click', initCustomerAudio, { once: true });
    window.addEventListener('touchstart', initCustomerAudio, { once: true });
} else {
    initCustomerAudio();
}

const playCustomerPing = () => {
    try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([200, 100, 200]); // Rung máy (Mobile) hỗ trợ fallback cho loa
        }
        
        if (Capacitor.isNativePlatform()) {
            NativeAudio.play({ assetId: 'ting_ting' }).catch(e => console.log('NativeAudio play blocked:', e));
        } else {
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
        }
    } catch(err) {}
};

export const useAuthSocket = () => {
  const { showToast } = useToast();

  useEffect(() => {
    const setupSocket = () => {
      const token = localStorage.getItem('customerToken') || localStorage.getItem('shopToken');
      const activeMode = localStorage.getItem('activeMode') || localStorage.getItem('customerRole') || 'CUSTOMER';
      const role = activeMode.toLowerCase();

      if (!token) {
        disconnectSocket();
        return;
      }

      const socket = connectSocket(token, role);

      if (socket) {
        socket.off('order_updated');
        socket.off('order_deleted_event');
        socket.off('driver_location_update');

        socket.on('order_updated', (order) => {
          let message = `Đơn hàng ${order.orderCode || ''} đã được cập nhật trạng thái.`;
          let type = 'info';

          if (order.status === 'WAITING_SHOP') {
            message = `Đơn đồ ăn ${order.orderCode || ''} đang chờ quán xác nhận!`;
            type = 'info';
            playCustomerPing();
          } else if (order.status === 'PENDING') {
            message = `Đơn hàng ${order.orderCode || ''} đang được hệ thống tìm tài xế!`;
            type = 'info';
            playCustomerPing();
          } else if (order.status === 'ACCEPTED') {
            if (order.serviceType === 'DAT_XE') {
              message = `Tài xế ${order.assignedTo?.name || ''} đã nhận chuyến và đang đến đón bạn!`;
            } else {
              message = `Tài xế ${order.assignedTo?.name || ''} đã nhận đơn và đang đi lấy hàng!`;
            }
            type = 'success';
            playCustomerPing();
          } else if (order.status === 'PICKED_UP' || order.status === 'DELIVERING') {
            if (order.serviceType === 'DAT_XE') {
              message = `Tài xế đã đón bạn thành công! Đang trong hành trình di chuyển...`;
            } else {
              message = `Tài xế đã lấy hàng và đang trên đường giao!`;
            }
            type = 'warning';
            playCustomerPing();
          } else if (order.status === 'COMPLETED') {
            if (order.serviceType === 'DAT_XE') {
              message = `Chuyến đi ${order.orderCode || ''} đã hoàn thành. Cảm ơn quý khách đã tin dùng!`;
            } else {
              message = `Đơn hàng ${order.orderCode || ''} đã giao thành công. Cảm ơn quý khách!`;
            }
            type = 'success';
            playCustomerPing();
          } else if (order.status === 'CANCELLED') {
            message = `Đơn hàng ${order.orderCode || ''} đã bị hủy${order.cancelReason ? `: ${order.cancelReason}` : '.'}`;
            type = 'error';
            playCustomerPing();
          } else if (order.status === 'DRAFT') {
            if (order.adminReviewed && order.deliveryFee > 0) {
              message = `💰 Đơn hàng ${order.orderCode || ''} đã có báo giá cước (${order.deliveryFee.toLocaleString('vi-VN')}đ). Vui lòng xác nhận!`;
            } else {
              message = `Thông tin đơn hàng ${order.orderCode || ''} vừa được Tổng đài cập nhật.`;
            }
            type = 'info';
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

        socket.on('driver_location_update', (locData) => {
          window.dispatchEvent(new CustomEvent('driver_location_update', { detail: locData }));
        });

        // Lắng nghe realtime khi Admin xác minh tài khoản
        socket.on('user_verification_updated', (data) => {
          try {
            const saved = JSON.parse(localStorage.getItem('customerData') || '{}');
            saved.verificationStatus = data.verificationStatus;
            saved.rejectReason = data.rejectReason;
            localStorage.setItem('customerData', JSON.stringify(saved));
          } catch (e) {}

          if (data.verificationStatus === 'VERIFIED') {
            showToast('🎉 Chúc mừng! Tài khoản của bạn đã được xác minh. Bạn có thể sử dụng tất cả dịch vụ ngay!', 'success', 8000);
            playCustomerPing();
          } else if (data.verificationStatus === 'REJECTED') {
            showToast(`⚠️ Yêu cầu xác minh tài khoản bị từ chối: ${data.rejectReason || ''}`, 'error', 8000);
          }

          window.dispatchEvent(new CustomEvent('user_verification_updated_event', { detail: data }));
        });
      }
    };

    setupSocket();

    const handleAuthChange = () => {
      setupSocket();
    };

    window.addEventListener('auth_change', handleAuthChange);
    window.addEventListener('api_unauthorized', handleAuthChange);

    return () => {
      window.removeEventListener('auth_change', handleAuthChange);
      window.removeEventListener('api_unauthorized', handleAuthChange);
    };
  }, [showToast]);
};
