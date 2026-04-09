import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useToast } from '../context/ToastContext';

import { getOrders } from '../services/api';

// Hack AudioContext Global
let adminAudioCtx = null;
let adminAudioBuffer = null;
let adminFinanceBuffer = null;
let adminDraftPendingBuffer = null;
const initAdminAudio = async () => {
    try {
        if (!adminAudioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            adminAudioCtx = new AudioContext();
            
            fetch('/chuong.mp3').then(res => res.arrayBuffer()).then(arr => adminAudioCtx.decodeAudioData(arr)).then(buf => adminAudioBuffer = buf);
            fetch('/thanhtoantienchotaixe.mp3').then(res => res.arrayBuffer()).then(arr => adminAudioCtx.decodeAudioData(arr)).then(buf => adminFinanceBuffer = buf);
            fetch('/dontreo5phut_admin.mp3').then(res => res.arrayBuffer()).then(arr => adminAudioCtx.decodeAudioData(arr)).then(buf => adminDraftPendingBuffer = buf);
        }
        if (adminAudioCtx.state === 'suspended') adminAudioCtx.resume();
    } catch(e){}
};

// Preload Fallback Audios for Zero Delay
const fallbackChuong = new Audio('/chuong.mp3');
fallbackChuong.preload = 'auto';
const fallbackFinance = new Audio('/thanhtoantienchotaixe.mp3');
fallbackFinance.preload = 'auto';
const fallbackDraftPending = new Audio('/dontreo5phut_admin.mp3');
fallbackDraftPending.preload = 'auto';

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
    try { fallbackDraftPending.pause(); fallbackDraftPending.currentTime = 0; } catch(e){}
};

const playAdminAlarm = (type = 'NORMAL') => {
    try {
        window.stopAdminAlarm(); // Dừng chuông cũ trước khi kêu mới

        let targetBuffer = null;
        let targetFallback = null;

        if (type === 'FINANCE') { targetBuffer = adminFinanceBuffer; targetFallback = fallbackFinance; }
        else if (type === 'DRAFT_PENDING') { targetBuffer = adminDraftPendingBuffer; targetFallback = fallbackDraftPending; }
        else { targetBuffer = adminAudioBuffer; targetFallback = fallbackChuong; }

        if (adminAudioCtx && targetBuffer) {
            if (adminAudioCtx.state === 'suspended') adminAudioCtx.resume();
            const source = adminAudioCtx.createBufferSource();
            source.buffer = targetBuffer;
            source.connect(adminAudioCtx.destination);
            source.loop = type === 'NORMAL'; // Chỉ loop Ting Ting
            source.start(0);
            currentAdminSource = source;
            
            if (type === 'NORMAL') {
                adminAlarmTimer = setTimeout(() => {
                    if (currentAdminSource) {
                        try { currentAdminSource.stop(); } catch(e){}
                    }
                }, 10000); // Tắt chuông sau 10 giây
            }
        } else {
            // Chuông Fallback siêu tốc
            targetFallback.loop = type === 'NORMAL';
            targetFallback.currentTime = 0;
            targetFallback.play().catch(e => console.log('Autoplay blocked'));
            
            if (type === 'NORMAL') {
                setTimeout(() => {
                    try { targetFallback.pause(); targetFallback.currentTime = 0; } catch(e){}
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

    // Polling Đơn Bị Treo quá 5 phút
    const checkDraftOrders = async () => {
        try {
            const res = await getOrders({ status: 'DRAFT', limit: 50 });
            const list = res.orders || [];
            const now = Date.now();
            // Nếu có đơn nào tồn tại quá 5 phút
            const hasPendingTooLong = list.some(o => (now - new Date(o.createdAt).getTime()) > 5 * 60 * 1000);
            
            if (hasPendingTooLong) {
                playAdminAlarm('DRAFT_PENDING');
                showToast('⚠️ BÁO ĐỘNG: CÓ ĐƠN KHÁCH ĐẶT CHỜ BÁO GIÁ QUÁ 5 PHÚT CHƯA XỬ LÝ!', 'error', 15000);
            }
        } catch (err) {}
    };
    const pollInterval = setInterval(checkDraftOrders, 60 * 1000); // Quét mỗi phút

    socket.on('new_order', (order) => {
      // Chỉ khi Đơn này do Khách Đặt (createdBy = null), thì ADMIN mới Kêu Chuông. Admin tự tạo đơn thì im lìm.
      if (!order.createdBy) {
        showToast(`📲 KHÁCH ĐẶT MỚI: ${order.orderCode || order._id?.slice(-8).toUpperCase() || ''}. Click Quản Lý Đơn để mở!`, 'warning', 30000);
        playAdminAlarm('NORMAL'); // Play chuong.mp3
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

    socket.on('order_cancelled', (order) => {
      window.dispatchEvent(new CustomEvent('refresh_admin_orders'));
    });

    socket.on('order_deleted_event', (orderId) => {
      window.dispatchEvent(new CustomEvent('refresh_admin_orders'));
    });

    socket.on('debt_payment_request', (payload) => {
      playAdminAlarm('FINANCE'); // finance alarm

      showToast(`💸 BÁO CÁO NẠP TIỀN QUÉT MÃ QR CỦA TÀI XẾ ${payload.name.toUpperCase()} (Mã: ${payload.driverCode}). Chờ Sếp duyệt!`, 'error', 60000); // 60s
      
      window.dispatchEvent(new CustomEvent('show_debt_approval_modal', { detail: payload }));
    });

    socket.on('wallet_withdrawal_request', (payload) => {
      playAdminAlarm('FINANCE'); // finance alarm

      showToast(`💰 YÊU CẦU RÚT TIỀN TỪ TÀI XẾ ${payload.name.toUpperCase()} (Mã: ${payload.driverCode}). Số tiền: ${payload.amount.toLocaleString()}đ. Chờ Sếp duyệt!`, 'error', 60000); // 60s
    });

    socket.on('driver_location_update', (data) => {
      window.dispatchEvent(new CustomEvent('driver_location_update', { detail: data }));
    });

    socket.on('driver_status_change', (data) => {
      window.dispatchEvent(new CustomEvent('driver_status_change', { detail: data }));
    });

    return () => {
      clearInterval(pollInterval);
      socket.disconnect();
    };
  }, [showToast]);

  return socketRef.current;
};
