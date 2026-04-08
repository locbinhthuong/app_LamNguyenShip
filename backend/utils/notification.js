const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Khởi tạo Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin init error:', error);
}

/**
 * Gửi thông báo đến 1 thiết bị
 */
const sendNotification = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) return null;
  
  try {
    const message = {
      notification: { title, body },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        ...data
      },
      android: {
        priority: "high"
      },
      webpush: {
        headers: { Urgency: "high", TTL: "60" },
        notification: {
          title,
          body,
          icon: "/aloshipp.png",
          vibrate: [200, 100, 200, 100, 200, 100, 200],
          requireInteraction: true,
          click_action: data.url || "/"
        },
        fcmOptions: { link: data.url || "/" }
      },
      apns: {
        payload: {
          aps: { sound: "default", contentAvailable: true }
        }
      },
      token: fcmToken
    };
    
    const response = await admin.messaging().send(message);
    console.log(`[FCM] Gửi thông báo thành công: ${response}`);
    return response;
  } catch (error) {
    console.error(`[FCM] Lỗi gửi thông báo Firebase FCM:`, error);
    return null;
  }
};

/**
 * Gửi thông báo đến nhiều thiết bị cùng lúc (Phát sóng)
 */
const sendMultipleNotifications = async (tokens, title, body, data = {}) => {
  const validTokens = tokens.filter(t => t);
  if (validTokens.length === 0) return null;

  try {
    const message = {
      notification: { title, body },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        ...data
      },
      android: {
        priority: "high"
      },
      webpush: {
        headers: { Urgency: "high", TTL: "60" },
        notification: {
          title,
          body,
          icon: "/aloshipp.png",
          vibrate: [200, 100, 200, 100, 200, 100, 200],
          requireInteraction: true,
          click_action: data.url || "/"
        },
        fcmOptions: { link: data.url || "/" }
      },
      apns: {
        payload: {
          aps: { sound: "default", contentAvailable: true }
        }
      },
      tokens: validTokens
    };
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`[FCM] Đã gửi ${response.successCount} thành công, ${response.failureCount} thất bại`);
    return response;
  } catch (error) {
    console.error('[FCM] Lỗi gửi Multicast FCM:', error);
    return null;
  }
};

module.exports = {
  admin,
  sendNotification,
  sendMultipleNotifications
};
