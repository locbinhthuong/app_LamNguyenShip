import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

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
  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Đăng ký nhận push từ HĐH
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      
      if (permStatus.receive !== 'granted') {
        console.warn("LỖI_QUYỀN NATIVE: Người dùng từ chối quyền push");
        return null;
      }
      return new Promise((resolve) => {
        // Lắng nghe sự kiện đăng ký thành công từ APNs
        PushNotifications.addListener('registration', async (apnsToken) => {
          try {
            // Khi APNs đã trả về token, AppDelegate đã map nó sang Firebase.
            // Đợi thêm 500ms cho chắc ăn rồi lấy FCM token
            await new Promise(r => setTimeout(r, 500));
            const { token } = await FirebaseMessaging.getToken();
            // alert('FCM Token OK: ' + token.substring(0, 10)); // DEBUG
            resolve(token);
          } catch (err) {
            console.error("Lỗi lấy FCM token sau khi có APNs:", err);
            alert('Lỗi Firebase: ' + JSON.stringify(err));
            resolve(null);
          }
        });

        // Lắng nghe lỗi APNs
        PushNotifications.addListener('registrationError', (error) => {
          console.error("Lỗi APNs:", error);
          alert('Lỗi APNs: ' + JSON.stringify(error));
          resolve(null);
        });

        // Xin Apple cấp Token
        PushNotifications.register();
        
        // Cầu chì an toàn: Nếu Apple không trả lời sau 10 giây thì bỏ qua để không treo App
        setTimeout(() => {
          // alert('Quá 10 giây không nhận được mã Apple!');
          resolve(null);
        }, 10000);
      });
      
    } catch (err) {
      console.error("LỖI NATIVE PUSH: ", err);
      alert('Lỗi Native Push: ' + JSON.stringify(err));
      return null;
    }
  } else {
    // ---- Môi trường WEB / PWA ----
    if (!messaging) {
      console.error("LỖI_HỆ_THỐNG: Trình duyệt chặn Firebase Messaging.");
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
  }
};

export const setupForegroundListener = (callback) => {
  if (Capacitor.isNativePlatform()) {
    const listener = FirebaseMessaging.addListener('notificationReceived', (event) => {
      const payload = {
        notification: {
          title: event.notification.title,
          body: event.notification.body
        },
        data: event.notification.data
      };
      callback(payload);
    });
    return () => {
      listener.then(l => l.remove());
    };
  } else {
    if (!messaging) return null;
    return onMessage(messaging, (payload) => {
      callback(payload);
    });
  }
};
