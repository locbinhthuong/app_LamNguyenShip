import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDktfeiJHhYNJAbuw0G8sLQzRh83GDijMg",
  authDomain: "aloshipp.firebaseapp.com",
  projectId: "aloshipp",
  storageBucket: "aloshipp.firebasestorage.app",
  messagingSenderId: "479618310997",
  appId: "1:479618310997:web:f4a52cf8e55e0eb6ab05dc"
};

// Khởi tạo app Firebase gốc
const app = initializeApp(firebaseConfig);

// Lấy module Messaging
let messaging = null;

// Kiểm tra xem trình duyệt có hỗ trợ API không
if (typeof window !== 'undefined' && 'Notification' in window) {
  messaging = getMessaging(app);
}

export const requestFirebaseToken = async () => {
  if (!messaging) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, {
        vapidKey: "BJFyR5tb1wUHs92OcM9Kj-AXcN1jnXJ8QaGC4wcboezCYW9pWbUytVMUum7r9VloTOeoMl_evcFhdIM-iOwMu-4"
      });
      return currentToken;
    } else {
      console.log('Người dùng từ chối cấp quyền thông báo Push');
      return null;
    }
  } catch (error) {
    console.error('Lỗi khi lấy mã FCM Token:', error);
    return null;
  }
};

export const setupForegroundListener = (callback) => {
  if (!messaging) return null;
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};
