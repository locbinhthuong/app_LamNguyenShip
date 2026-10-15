const admin = require('firebase-admin');

// Khởi tạo Firebase Admin
try {
  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin init error (serviceAccountKey.json may be missing):', error.message);
}

/**
 * Gửi thông báo đến 1 thiết bị
 */
const sendNotification = async (fcmToken, title, body, data = {}, options = {}) => {
  if (!fcmToken) return null;
  
  try {
    const androidSound = options.sound || data.sound || "thongbaongoaiapp";
    const androidChannelId = options.channelId || data.channelId || "aloshipp_push_channel_v9";
    const iosSound = androidSound.endsWith('.mp3') ? androidSound : `${androidSound}.mp3`;

    // Firebase Admin yêu cầu mọi giá trị trong data phải là String
    const stringData = {};
    for (const [k, v] of Object.entries(data || {})) {
      if (v !== undefined && v !== null) {
        stringData[k] = String(v);
      }
    }

    const message = {
      notification: { title, body },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          sound: androidSound,
          channelId: androidChannelId,
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
            sound: iosSound,
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
const sendMultipleNotifications = async (tokens, title, body, data = {}, options = {}) => {
  // Lọc bỏ token rỗng và token trùng lặp
  const validTokens = [...new Set(tokens.filter(t => t))];
  if (validTokens.length === 0) return null;

  try {
    const androidSound = options.sound || data.sound || "thongbaongoaiapp";
    const androidChannelId = options.channelId || data.channelId || "aloshipp_push_channel_v9";
    const iosSound = androidSound.endsWith('.mp3') ? androidSound : `${androidSound}.mp3`;

    const stringData = {};
    for (const [k, v] of Object.entries(data || {})) {
      if (v !== undefined && v !== null) {
        stringData[k] = String(v);
      }
    }

    const message = {
      notification: { title, body },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          sound: androidSound,
          channelId: androidChannelId,
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
            sound: iosSound,
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
