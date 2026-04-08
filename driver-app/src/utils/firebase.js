import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDKtfeIjHhYNJAbuw0G8sLQzRh83GDijMg",
  authDomain: "aloshipp.firebaseapp.com",
  projectId: "aloshipp",
  storageBucket: "aloshipp.firebasestorage.app",
  messagingSenderId: "479618310997",
  appId: "1:479618310997:web:f4a52cf8e55e0eb6ab05dc",
  measurementId: "G-6BWXCXWGPD"
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
  if (!messaging) {
    console.error("LỖI_HỀ_THỐNG: Trình duyệt chặn Firebase Messaging.");
    return null;
  }
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      try {
        const currentToken = await getToken(messaging, {
          vapidKey: "BJFyR5tb1wUHs920cM9Kj-AXcN1jnXJ8QaGC4wcboezCYW9pWbUytVMUum7r9VloT0eoMl_evcFhdIM-iOwMu-4"
        });
        if (currentToken) return currentToken;
        else {
          console.error("LỖI_TOKEN: Firebase trả về rỗng.");
          return null;
        }
      } catch (err) {
        console.error("LỖI_GET_TOKEN: " + err.message);
        return null;
      }
    } else {
      console.warn("LỖI_QUYỀN: Người dùng từ chối quyền push: " + permission);
      return null;
    }
  } catch (error) {
    console.error('LỖI_NGOẠI_LỆ: catch request: ' + error.message);
    return null;
  }
};

export const setupForegroundListener = (callback) => {
  if (!messaging) return null;
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};
