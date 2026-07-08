const admin = require('firebase-admin');

// Khởi tạo Firebase Admin
try {
  let serviceAccount = null;
  
  // Thử đọc từ biến môi trường trước (nếu có trên Vercel)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Nếu không có, thử đọc từ file local (trên VPS hoặc máy dev)
    try {
      serviceAccount = require('../serviceAccountKey.json');
    } catch (e) {
      console.log('⚠️ Không tìm thấy serviceAccountKey.json, Firebase Admin sẽ bị tắt (không ảnh hưởng Demo).');
    }
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized successfully');
  }
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
        ...data
      },
      android: {
        priority: "high",
        notification: {
          sound: "thongbaongoaiapp",
          channelId: "aloshipp_push_channel_v9",
          defaultSound: false,
          defaultVibrateTimings: true
        }
      },
      webpush: {
        headers: { Urgency: "high", TTL: "60" },
        notification: {
          title,
          body,
          icon: "/logoALOSHIPP.png",
          vibrate: [200, 100, 200, 100, 200, 100, 200],
          requireInteraction: true,
          click_action: data.url || "/"
        },
        fcmOptions: { link: data.url || "/" }
      },
      apns: {
        headers: {
          "apns-priority": "10"
        },
        payload: {
          aps: { 
            alert: { title, body },
            sound: "thongbaongoaiapp.mp3",
            badge: 1
          }
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
  // Lọc bỏ token rỗng và token trùng lặp
  const validTokens = [...new Set(tokens.filter(t => t))];
  if (validTokens.length === 0) return null;

  try {
    const message = {
      notification: { title, body },
      data: {
        ...data
      },
      android: {
        priority: "high",
        notification: {
          sound: "thongbaongoaiapp",
          channelId: "aloshipp_push_channel_v9",
          defaultSound: false,
          defaultVibrateTimings: true
        }
      },
      webpush: {
        headers: { Urgency: "high", TTL: "60" },
        notification: {
          title,
          body,
          icon: "/logoALOSHIPP.png",
          vibrate: [200, 100, 200, 100, 200, 100, 200],
          requireInteraction: true,
          click_action: data.url || "/"
        },
        fcmOptions: { link: data.url || "/" }
      },
      apns: {
        headers: {
          "apns-priority": "10"
        },
        payload: {
          aps: { 
            alert: { title, body },
            sound: "thongbaongoaiapp.mp3",
            badge: 1
          }
        }
      },
      tokens: validTokens
    };
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`[FCM] Đã gửi ${response.successCount} thành công, ${response.failureCount} thất bại`);
    
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`[FCM] Lỗi gửi token ${validTokens[idx]}:`, resp.error);
        }
      });
    }
    
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
