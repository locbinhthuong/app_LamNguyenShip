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
  if (!messaging) return "LỖI_HỀ_THỐNG: Trình duyệt hoặc iOS chặn không cho khởi tạo Firebase Messaging. Hãy chắc chắn bạn đang dùng App từ Màn Hình Chính.";
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      try {
        const currentToken = await getToken(messaging, {
          vapidKey: "BJFyR5tb1wUHs920cM9Kj-AXcN1jnXJ8QaGC4wcboezCYW9pWbUytVMUum7r9VloT0eoMl_evcFhdIM-iOwMu-4"
        });
        if (currentToken) return currentToken;
        else return "LỖI_TOKEN: Firebase trả về rỗng không có cớ.";
      } catch (err) {
        return "LỖI_GET_TOKEN: " + err.message + " | Callstack: " + err.stack;
      }
    } else {
      return "LỖI_QUYỀN: Người dùng hoặc Máy từ chối quyền, trạng thái hiện tại là: " + permission;
    }
  } catch (error) {
    return 'LỖI_NGOẠI_LỆ: Mẻ catch request: ' + error.message;
  }
};

export const setupForegroundListener = (callback) => {
  if (!messaging) return null;
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};
