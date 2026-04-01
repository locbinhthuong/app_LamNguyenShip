importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDKtfeIjHhYNJAbuw0G8sLQzRh83GDijMg",
  authDomain: "aloshipp.firebaseapp.com",
  projectId: "aloshipp",
  storageBucket: "aloshipp.firebasestorage.app",
  messagingSenderId: "479618310997",
  appId: "1:479618310997:web:f4a52cf8e55e0eb6ab05dc",
  measurementId: "G-6BWXCXWGPD"
};

// Cài đặt app bóng ma dưới nền
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // Trình duyệt tự động hiển thị Notification khi payload chứa webpush.notification
  // Ta không gọi showNotification() ở đây nữa để tránh bị dội bom (duplicate)
  console.log('[Firebase ServiceWorker] Nhận lệnh kích hoạt từ vũ trụ (Background):', payload);
});

// Chạm vào thông báo sẽ mở App
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  let urlToOpen = '/';
  if (event.notification.data && event.notification.data.url) {
    urlToOpen = event.notification.data.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Nếu có sẵn cửa sổ app, focus vào
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Nếu app đang tắt, mở web lên
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
