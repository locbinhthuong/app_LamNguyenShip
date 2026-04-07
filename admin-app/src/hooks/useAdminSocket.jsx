import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useToast } from '../context/ToastContext';

// Hack AudioContext Global
let adminAudioCtx = null;
let adminAudioBuffer = null;
let adminFinanceBuffer = null;
const initAdminAudio = async () => {
    try {
        if (!adminAudioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            adminAudioCtx = new AudioContext();
            
            fetch('/chuong.mp3').then(res => res.arrayBuffer()).then(arr => adminAudioCtx.decodeAudioData(arr)).then(buf => adminAudioBuffer = buf);
            fetch('/thanhtoantienchotaixe.mp3').then(res => res.arrayBuffer()).then(arr => adminAudioCtx.decodeAudioData(arr)).then(buf => adminFinanceBuffer = buf);
        }
        if (adminAudioCtx.state === 'suspended') adminAudioCtx.resume();
    } catch(e){}
};

// Preload Fallback Audios for Zero Delay
const fallbackChuong = new Audio('/chuong.mp3');
fallbackChuong.preload = 'auto';
const fallbackFinance = new Audio('/thanhtoantienchotaixe.mp3');
fallbackFinance.preload = 'auto';

window.addEventListener('click', initAdminAudio, { once: true });
window.addEventListener('touchstart', initAdminAudio, { once: true });

let adminAlarmTimer = null;
let currentAdminSource = null;

// Expose a public function to stop the alarm immediately
window.stopAdminAlarm = () => {
    if (currentAdminSource) {
        try { currentAdminSource.stop(); } catch(e){}
        currentAdminSource = null;
    }
    if (adminAlarmTimer) {
        clearTimeout(adminAlarmTimer);
        adminAlarmTimer = null;
    }
    try { fallbackChuong.pause(); fallbackChuong.currentTime = 0; } catch(e){}
    try { fallbackFinance.pause(); fallbackFinance.currentTime = 0; } catch(e){}
};

const playAdminAlarm = (isFinance = false) => {
    try {
        window.stopAdminAlarm(); // Dừng chuông cũ trước khi kêu mới

        if (adminAudioCtx && (isFinance ? adminFinanceBuffer : adminAudioBuffer)) {
            if (adminAudioCtx.state === 'suspended') adminAudioCtx.resume();
            const source = adminAudioCtx.createBufferSource();
            source.buffer = isFinance ? adminFinanceBuffer : adminAudioBuffer;
            source.connect(adminAudioCtx.destination);
            source.loop = !isFinance; // Chỉ loop Ting Ting
            source.start(0);
            currentAdminSource = source;
            
            if (!isFinance) {
                adminAlarmTimer = setTimeout(() => {
                    if (currentAdminSource) {
                        try { currentAdminSource.stop(); } catch(e){}
                    }
                }, 10000); // Tắt chuông sau 10 giây
            }
        } else {
            // Chuông Fallback siêu tốc
            const audioToPlay = isFinance ? fallbackFinance : fallbackChuong;
            audioToPlay.loop = !isFinance;
            audioToPlay.currentTime = 0;
            audioToPlay.play().catch(e => console.log('Autoplay blocked'));
            
            if (!isFinance) {
                setTimeout(() => {
                    try { audioToPlay.pause(); audioToPlay.currentTime = 0; } catch(e){}
                }, 10000);
            }
        }
    } catch(err) {}
};

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
        playAdminAlarm(false); // Play chuong.mp3
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
      
      playAdminAlarm(true); // finance alarm

      showToast(`💸 BÁO CÁO NẠP TIỀN QUÉT MÃ QR CỦA TÀI XẾ ${payload.name.toUpperCase()} (Mã: ${payload.driverCode}). Chờ Sếp duyệt!`, 'error', 60000); // 60s
      
      // Kích hoạt một sự kiện để hiển thị Pop-up thao tác nhanh ở Dashboard
      window.dispatchEvent(new CustomEvent('show_debt_approval_modal', { detail: payload }));
    });

    socket.on('wallet_withdrawal_request', (payload) => {
      playAdminAlarm(true); // finance alarm

      showToast(`💰 YÊU CẦU RÚT TIỀN TỪ TÀI XẾ ${payload.name.toUpperCase()} (Mã: ${payload.driverCode}). Số tiền: ${payload.amount.toLocaleString()}đ. Chờ Sếp duyệt!`, 'error', 60000); // 60s
      
      // Kích hoạt một sự kiện nếu có (hiện tại chưa có modal popup cho rút tiền, chỉ vào Lịch sử ví)
    });

    return () => {
      socket.disconnect();
    };
  }, [showToast]);

  return socketRef.current;
};
