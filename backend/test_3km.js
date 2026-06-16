const mongoose = require('mongoose');
const Order = require('./models/Order');
const Driver = require('./models/Driver');
const Admin = require('./models/Admin');
const { createOrder } = require('./controllers/orderController');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aloshipp', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to DB');
    
    // 1. Create/Find a test driver
    let driver = await Driver.findOne({ phone: '0999999999' });
    if (!driver) {
      driver = new Driver({
        phone: '0999999999',
        name: 'Test Driver 3KM',
        password: 'hash',
        status: 'active',
        isOnline: true,
        currentLocation: {
          type: 'Point',
          coordinates: [105.746854, 10.045162] // Cần Thơ (lng, lat)
        },
        fcmToken: 'test_fcm_token_123',
        walletBalance: 100000,
        walletDebt: 0
      });
      await driver.save();
    } else {
      driver.status = 'active';
      driver.isOnline = true;
      driver.currentLocation = {
        type: 'Point',
        coordinates: [105.746854, 10.045162]
      };
      driver.fcmToken = 'test_fcm_token_123';
      await driver.save();
    }

    // 2. Mock Admin
    const admin = await Admin.findOne() || { _id: new mongoose.Types.ObjectId(), name: 'System Admin' };

    // 3. Mock Req and Res
    const req = {
      admin: admin,
      ip: '127.0.0.1',
      body: {
        customerPhone: '0888888888',
        pickupAddress: 'Ninh Kiều, Cần Thơ',
        deliveryAddress: 'Bình Thủy, Cần Thơ',
        pickupCoordinates: { lat: 10.046000, lng: 105.747000 }, // Rất gần driver (cách ~100m)
        serviceType: 'GIAO_HANG',
        autoAssignNearest: true, // Kích hoạt gán đơn 3km
        deliveryFee: 15000
      },
      io: {
        to: (room) => ({
          emit: (event, payload) => {
            console.log(`\n[SOCKET MOCK] Emit to room: ${room}`);
            console.log(`[SOCKET MOCK] Event: ${event}`);
            if (event === 'nearest_order_assignment') {
              console.log(`[SOCKET MOCK] Payload: Đơn hàng đón tại ${payload.pickupAddress}, cước ${payload.deliveryFee}đ`);
            }
          }
        })
      }
    };

    const res = {
      status: (code) => ({
        json: (data) => {
          console.log(`\n[RESPONSE MOCK] Status Code: ${code}`);
          console.log(`[RESPONSE MOCK] Message: ${data.message}`);
        }
      })
    };

    // 4. Override sendMultipleNotifications temporarily
    const notifUtil = require('./utils/notification');
    const originalSend = notifUtil.sendMultipleNotifications;
    notifUtil.sendMultipleNotifications = async (tokens, title, body, data) => {
      console.log(`\n[FCM MOCK] --- THÔNG BÁO PUSH ĐƯỢC GỬI ---`);
      console.log(`[FCM MOCK] Gửi đến FCM Tokens: ${tokens.join(', ')}`);
      console.log(`[FCM MOCK] Tiêu đề (Title): ${title}`);
      console.log(`[FCM MOCK] Nội dung (Body): \n${body}`);
      console.log(`[FCM MOCK] Payload đi kèm (Data):`, data);
      return { successCount: 1, failureCount: 0 };
    };

    // 5. Call controller
    console.log('\n--- BẮT ĐẦU TEST TẠO ĐƠN & GÁN CHO TÀI XẾ 3KM ---');
    await createOrder(req, res);

    // 6. Cleanup
    notifUtil.sendMultipleNotifications = originalSend;
    setTimeout(() => {
        process.exit(0);
    }, 1000);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
