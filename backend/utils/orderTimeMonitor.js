const Order = require('../models/Order');
const Driver = require('../models/Driver');
const { emitToDriver } = require('../sockets/index');
const { sendNotification } = require('./notification');

// Cấu hình mốc thời gian chuẩn
const PICKUP_LIMIT_MINUTES = 15;               // 15 phút từ lúc Nhận đơn -> Lấy hàng
const DELIVERY_LIMIT_MINUTES = 35;             // 35 phút từ lúc Đã lấy hàng -> Giao xong

const PICKUP_LIMIT_MS = PICKUP_LIMIT_MINUTES * 60 * 1000;
const DELIVERY_LIMIT_MS = DELIVERY_LIMIT_MINUTES * 60 * 1000;

// Tạm ẩn bắn chuông/popup cảnh báo về App Tài xế trong lúc chờ duyệt bản mới lên App Store
// (Hệ thống vẫn tự động ghi nhận đơn trễ và thống kê đầy đủ trên trang Admin)
// Khi bản mới đã lên App Store, đổi thành true (hoặc đặt ORDER_WARNING_PUSH_ENABLED=true trong .env)
const ORDER_WARNING_PUSH_ENABLED = process.env.ORDER_WARNING_PUSH_ENABLED === 'true';

const WARNING_SOUND_OPTIONS = {
  sound: 'chuong_canhbao',
  channelId: 'aloshipp_warning_channel_v1'
};

/**
 * Quét định kỳ các đơn hàng đang thực hiện để:
 * 1. Nhắc nhở tài xế lấy đơn nếu quá 15 phút kể từ lúc Nhận đơn (ACCEPTED)
 * 2. Cảnh báo giao trễ & yêu cầu chọn lý do nếu quá 35 phút kể từ lúc Đã lấy hàng (PICKED_UP / DELIVERING)
 */
const checkOrderTimeouts = async (io) => {
  try {
    const now = new Date();
    const pickupCutoff = new Date(now.getTime() - PICKUP_LIMIT_MS);
    const deliveryCutoff = new Date(now.getTime() - DELIVERY_LIMIT_MS);

    // =========================================================================
    // 1. KIỂM TRA MỐC 15 PHÚT LẤY HÀNG (ACCEPTED -> PICKED_UP)
    // =========================================================================
    const latePickupOrders = await Order.find({
      status: 'ACCEPTED',
      assignedTo: { $ne: null },
      acceptedAt: { $ne: null, $lte: pickupCutoff },
      pickupWarningSentAt: null
    }).populate('assignedTo', 'name phone driverCode fcmToken');

    for (const order of latePickupOrders) {
      order.pickupWarningSentAt = now;
      order.isLatePickup = true;
      order.pickupDurationMinutes = Math.floor((now.getTime() - new Date(order.acceptedAt).getTime()) / 60000);
      await order.save();

      const driver = order.assignedTo;
      const driverIdStr = driver?._id ? driver._id.toString() : order.assignedTo.toString();

      console.log(`[OrderTimeMonitor] Quá 15p chưa lấy hàng - Đơn ${order.orderCode} - Tài xế: ${driver?.name || driverIdStr}`);

      if (io) {
        const payload = typeof order.toObject === 'function' ? order.toObject({ virtuals: true }) : order;
        io.to('admins').emit('order_updated', payload);

        if (ORDER_WARNING_PUSH_ENABLED) {
          const title = '⚠️ NHẮC NHỞ LẤY ĐƠN (QUÁ 15 PHÚT)';
          const message = `Đơn ${order.orderCode || ''}: Bạn hãy nhanh chóng tới shop lấy đơn để đảm bảo thời gian giao hàng và chất lượng đơn hàng!`;

          emitToDriver(io, driverIdStr, 'driver_order_time_warning', {
            type: 'LATE_PICKUP',
            orderId: order._id,
            orderCode: order.orderCode,
            title,
            message,
            elapsedMinutes: order.pickupDurationMinutes,
            sentAt: now.toISOString()
          });

          if (driver?.fcmToken) {
            await sendNotification(
              driver.fcmToken,
              title,
              message,
              {
                type: 'ORDER_LATE_PICKUP',
                orderId: order._id.toString(),
                url: `/order/${order._id}`
              },
              WARNING_SOUND_OPTIONS
            );
          }
        }
      }
    }

    // =========================================================================
    // 2. KIỂM TRA MỐC 35 PHÚT GIAO HÀNG (PICKED_UP / DELIVERING -> COMPLETED)
    // =========================================================================
    const lateDeliveryOrders = await Order.find({
      status: { $in: ['PICKED_UP', 'DELIVERING'] },
      assignedTo: { $ne: null },
      pickedUpAt: { $ne: null, $lte: deliveryCutoff },
      deliveryWarningSentAt: null
    }).populate('assignedTo', 'name phone driverCode fcmToken');

    for (const order of lateDeliveryOrders) {
      order.deliveryWarningSentAt = now;
      order.isLateDelivery = true;
      order.deliveryDurationMinutes = Math.floor((now.getTime() - new Date(order.pickedUpAt).getTime()) / 60000);
      await order.save();

      const driver = order.assignedTo;
      const driverIdStr = driver?._id ? driver._id.toString() : order.assignedTo.toString();

      console.log(`[OrderTimeMonitor] Quá 35p chưa giao xong - Đơn ${order.orderCode} - Tài xế: ${driver?.name || driverIdStr}`);

      if (io) {
        const payload = typeof order.toObject === 'function' ? order.toObject({ virtuals: true }) : order;
        io.to('admins').emit('order_updated', payload);

        if (ORDER_WARNING_PUSH_ENABLED) {
          const title = '🚨 CẢNH BÁO GIAO ĐƠN TRỄ (QUÁ 35 PHÚT)';
          const message = `Đơn ${order.orderCode || ''}: Bạn hãy nhanh chóng giao hàng! Đã quá 35 phút kể từ lúc lấy hàng, vui lòng chọn lý do giao đơn trễ.`;

          emitToDriver(io, driverIdStr, 'driver_order_time_warning', {
            type: 'LATE_DELIVERY',
            orderId: order._id,
            orderCode: order.orderCode,
            title,
            message,
            elapsedMinutes: order.deliveryDurationMinutes,
            sentAt: now.toISOString()
          });

          if (driver?.fcmToken) {
            await sendNotification(
              driver.fcmToken,
              title,
              message,
              {
                type: 'ORDER_LATE_DELIVERY',
                orderId: order._id.toString(),
                url: `/order/${order._id}`
              },
              WARNING_SOUND_OPTIONS
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('[OrderTimeMonitor] Lỗi khi quét thời gian đi đơn:', error);
  }
};

module.exports = {
  PICKUP_LIMIT_MINUTES,
  DELIVERY_LIMIT_MINUTES,
  PICKUP_LIMIT_MS,
  DELIVERY_LIMIT_MS,
  ORDER_WARNING_PUSH_ENABLED,
  checkOrderTimeouts
};
