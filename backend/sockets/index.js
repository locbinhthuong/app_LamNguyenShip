const jwt = require('jsonwebtoken');
const { sendMultipleNotifications, sendNotification } = require('../utils/notification');

const setupSocket = (io) => {
  // Middleware: Authenticate socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Không có token'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Kiểm tra Single Session cho Driver
      if (decoded.role === 'driver') {
        const Driver = require('../models/Driver');
        const driver = await Driver.findById(decoded.id);
        if (driver && driver.sessionToken && driver.sessionToken !== token) {
          return next(new Error('Phiên đăng nhập không hợp lệ'));
        }
      }

      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Token không hợp lệ'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id} - Role: ${socket.user.role}`);

    // Join room theo role
    if (socket.user.role === 'driver') {
      socket.join(`driver_${socket.user.id}`);
      socket.join('drivers');
      console.log(`[Socket] Driver ${socket.user.id} joined driver room`);
    } else if (['admin', 'manager', 'staff'].includes(socket.user.role)) {
      socket.join('admins');
      console.log(`[Socket] Admin ${socket.user.id} joined admin room`);
    } else if (socket.user.role?.toLowerCase() === 'customer') {
      socket.join(`customer_${socket.user.id}`);
      console.log(`[Socket] Customer ${socket.user.id} joined customer room`);
    } else if (socket.user.role?.toLowerCase() === 'shop') {
      socket.join(`shop_${socket.user.id}`);
      console.log(`[Socket] Shop ${socket.user.id} joined shop room`);
    }

    // Ping/pong
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Cập nhật vị trí GPS từ tài xế
    socket.on('update_location', async (data) => {
      if (socket.user.role === 'driver') {
        const { lat, lng } = data;
        
        // Phát realtime tới Admin
        io.to('admins').emit('driver_location_update', {
          driverId: socket.user.id,
          name: socket.user.name,
          lat,
          lng,
          timestamp: Date.now()
        });

        // Tối ưu: Chỉ ghi thẳng DB (không đợi) để Admin F5 vẫn thấy
        try {
          const Driver = require('../models/Driver');
          await Driver.findByIdAndUpdate(socket.user.id, {
            currentLocation: { lat, lng, updatedAt: new Date() }
          });
        } catch (e) {
          console.error('[Socket] Lỗi lưu GPS:', e.message);
        }
      }
    });

    // Dừng phát GPS từ tài xế
    socket.on('stop_location', async () => {
      if (socket.user.role === 'driver') {
        try {
          const Driver = require('../models/Driver');
          const driver = await Driver.findByIdAndUpdate(socket.user.id, {
            currentLocation: null
          }, { new: true });
          if (driver) {
            io.to('admins').emit('driver_status_change', {
              driverId: driver._id,
              isOnline: driver.isOnline,
              lat: null,
              lng: null
            });
          }
        } catch (e) {
          console.error('[Socket] Lỗi stop GPS:', e.message);
        }
      }
    });

    socket.on('disconnect', async () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      // LƯU Ý: Không được tự tiện set isOnline = false hay xóa GPS ở đây, 
      // vì tài xế có thể chỉ đang chạy dưới nền (Background) hoặc rớt mạng 4G tạm thời.
    });
  });

  return io;
};

// Helper functions
const broadcastToCreator = (io, order, eventName) => {
  if (order.customerId) {
    const creatorId = order.customerId._id || order.customerId;
    io.to(`customer_${creatorId.toString()}`).emit(eventName, order);
    io.to(`shop_${creatorId.toString()}`).emit(eventName, order);

    // Luôn bắn kèm order_updated để Frontend chỉ cần lắng nghe 1 cục duy nhất cho mọi thay đổi
    if (eventName !== 'order_updated') {
      io.to(`customer_${creatorId.toString()}`).emit('order_updated', order);
      io.to(`shop_${creatorId.toString()}`).emit('order_updated', order);
    }
  }
};

const emitNewOrder = async (io, order) => {
  if (order.status !== 'DRAFT') {
    io.to('drivers').emit('new_order', order);
    
    // Bắn Push Firebase
    try {
      const Driver = require('../models/Driver');
      const drivers = await Driver.find({ isOnline: true, status: 'active', fcmToken: { $ne: '' } });
      const tokens = drivers.map(d => d.fcmToken);
      
      console.log(`[FCM-DEBUG] Phát nổ Đơn mới: TÌM THẤY ${tokens.length} TÀI XẾ hợp lệ để Gửi Push.`);
      
      if (tokens.length > 0) {
        const feeResponse = order.deliveryFee ? `${order.deliveryFee.toLocaleString('vi-VN')}đ` : 'Thỏa thuận';
        let msgBody = `📍 Đi: ${order.pickupAddress} ⏭️ Đến: ${order.deliveryAddress || 'Chưa cập nhật'} 💵 Phí: ${feeResponse}`;
        await sendMultipleNotifications(tokens, '📱 CÓ ĐƠN HÀNG MỚI!', msgBody, { url: `/order/${order._id}` });
      }
    } catch (e) {
      console.log('[FCM-DEBUG] Lời nổ Push emitNewOrder bị lỗi thảm hại:', e.message);
    }
  }
  io.to('admins').emit('new_order', order);
  broadcastToCreator(io, order, 'new_order');
};

const emitOrderAccepted = (io, order) => {
  io.to('drivers').emit('order_accepted', order);
  io.to('admins').emit('order_accepted', order);
  broadcastToCreator(io, order, 'order_accepted');
};

const emitOrderPickedUp = (io, order) => {
  io.to('drivers').emit('order_picked_up', order);
  io.to('admins').emit('order_picked_up', order);
  broadcastToCreator(io, order, 'order_picked_up');
};

const emitOrderDelivering = (io, order) => {
  io.to('drivers').emit('order_delivering', order);
  io.to('admins').emit('order_delivering', order);
  broadcastToCreator(io, order, 'order_delivering');
};

const emitOrderCompleted = (io, order) => {
  io.to('drivers').emit('order_completed', order);
  io.to('admins').emit('order_completed', order);
  broadcastToCreator(io, order, 'order_completed');
};

const emitOrderCancelled = (io, order) => {
  io.to('drivers').emit('order_cancelled', order);
  io.to('admins').emit('order_cancelled', order);
  broadcastToCreator(io, order, 'order_cancelled');
};

const emitDriverStatusChange = (io, driverData) => {
  io.to('admins').emit('driver_status_change', driverData);
};

const emitToDriver = (io, driverId, event, data) => {
  io.to(`driver_${driverId}`).emit(event, data);
};

module.exports = {
  setupSocket,
  emitNewOrder,
  emitOrderAccepted,
  emitOrderPickedUp,
  emitOrderDelivering,
  emitOrderCompleted,
  emitOrderCancelled,
  emitDriverStatusChange,
  emitToDriver
};
