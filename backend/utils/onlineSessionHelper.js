const DriverOnlineSession = require('../models/DriverOnlineSession');
const Driver = require('../models/Driver');
const { getCurrentWeekVN } = require('./weekHelper');

/**
 * Bắt đầu một phiên Online mới cho tài xế
 */
const startDriverOnlineSession = async (driverId, time = new Date()) => {
  try {
    const todayVN = new Date(time).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const weekIdentifier = getCurrentWeekVN();

    // 1. Đóng bất kỳ phiên cũ nào còn mở (nếu có từ lần crash trước)
    const openSessions = await DriverOnlineSession.find({
      driverId,
      endTime: null
    });

    for (const oldSession of openSessions) {
      const durSec = Math.max(0, Math.round((time.getTime() - new Date(oldSession.startTime).getTime()) / 1000));
      oldSession.endTime = time;
      oldSession.durationSeconds = durSec;
      oldSession.durationMinutes = Math.round(durSec / 60);
      oldSession.endReason = 'SERVER_SHUTDOWN';
      await oldSession.save();
    }

    // 2. Tạo phiên mới
    const session = new DriverOnlineSession({
      driverId,
      startTime: time,
      date: todayVN,
      weekIdentifier,
      endReason: 'MANUAL'
    });
    await session.save();

    // 3. Cập nhật vào hồ sơ tài xế
    await Driver.findByIdAndUpdate(driverId, {
      currentOnlineSessionId: session._id,
      lastOnlineAt: time,
      isOnline: true
    });

    return session;
  } catch (error) {
    console.error(`[OnlineSession] Lỗi startDriverOnlineSession cho TX ${driverId}:`, error.message);
    return null;
  }
};

/**
 * Kết thúc phiên Online khi tài xế bấm Offline hoặc bị hệ thống tắt
 */
const endDriverOnlineSession = async (driverId, time = new Date(), reason = 'MANUAL') => {
  try {
    const session = await DriverOnlineSession.findOne({
      driverId,
      endTime: null
    }).sort({ startTime: -1 });

    if (session) {
      const durSec = Math.max(0, Math.round((time.getTime() - new Date(session.startTime).getTime()) / 1000));
      session.endTime = time;
      session.durationSeconds = durSec;
      session.durationMinutes = Math.round(durSec / 60);
      session.endReason = reason;
      await session.save();
    }

    await Driver.findByIdAndUpdate(driverId, {
      currentOnlineSessionId: null,
      isOnline: false
    });

    return session;
  } catch (error) {
    console.error(`[OnlineSession] Lỗi endDriverOnlineSession cho TX ${driverId}:`, error.message);
    return null;
  }
};

/**
 * Tính tổng số giây Online của một tài xế trong một khoảng thời gian (Tuần)
 */
const getDriverOnlineSecondsInRange = async (driverId, startRange, endRange) => {
  try {
    const sessions = await DriverOnlineSession.find({
      driverId,
      startTime: { $lte: endRange },
      $or: [
        { endTime: { $gte: startRange } },
        { endTime: null }
      ]
    }).lean();

    const now = new Date();
    let totalSeconds = 0;

    for (const s of sessions) {
      const sStart = new Date(s.startTime);
      // Nếu đang online thì tính đến min(now, endRange), nếu đã đóng thì lấy s.endTime
      const sEnd = s.endTime ? new Date(s.endTime) : (now < endRange ? now : endRange);

      const effectiveStart = Math.max(sStart.getTime(), startRange.getTime());
      const effectiveEnd = Math.min(sEnd.getTime(), endRange.getTime());

      if (effectiveEnd > effectiveStart) {
        totalSeconds += Math.round((effectiveEnd - effectiveStart) / 1000);
      }
    }

    return totalSeconds;
  } catch (error) {
    console.error(`[OnlineSession] Lỗi getDriverOnlineSecondsInRange cho TX ${driverId}:`, error.message);
    return 0;
  }
};

/**
 * Format số giây thành định dạng dễ đọc: "38g 15p" hoặc "45p"
 */
const formatOnlineDuration = (totalSeconds = 0) => {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}g ${String(minutes).padStart(2, '0')}p`;
  }
  return `${minutes}p`;
};

/**
 * Lấy mã tuần ISO cho bất kỳ ngày nào theo giờ VN
 */
const getWeekIdentifierForDate = (date) => {
  const d = new Date(date);
  const vnTime = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const target = new Date(vnTime.valueOf());
  const dayNr = (vnTime.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target) / 604800000);
  const year = vnTime.getFullYear();
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
};

/**
 * Đảm bảo các tài xế đang isOnline: true có phiên hoạt động
 */
const ensureActiveDriversHaveSession = async () => {
  try {
    const Driver = require('../models/Driver');
    const onlineDrivers = await Driver.find({ isOnline: true, status: 'active' });
    const now = new Date();
    for (const d of onlineDrivers) {
      if (!d.currentOnlineSessionId) {
        await startDriverOnlineSession(d._id, now);
      }
    }
  } catch (e) {
    console.error('[OnlineSession] Lỗi ensureActiveDriversHaveSession:', e.message);
  }
};

/**
 * Tự động tạo dữ liệu phiên Online cho một tuần dựa trên các đơn hàng đã hoàn thành
 * (Dùng để khởi tạo dữ liệu quá khứ cho tuần này hoặc các tuần trước khi nâng cấp hệ thống)
 */
const backfillWeeklyOnlineSessionsFromOrders = async (startOfWeek, endOfWeek) => {
  try {
    const Order = require('../models/Order');
    const DriverOnlineSession = require('../models/DriverOnlineSession');

    // Lấy tất cả đơn hoàn thành trong khoảng thời gian này
    const completedOrders = await Order.find({
      status: 'COMPLETED',
      assignedTo: { $ne: null },
      $or: [
        { deliveredAt: { $gte: startOfWeek, $lte: endOfWeek } },
        { deliveredAt: null, updatedAt: { $gte: startOfWeek, $lte: endOfWeek } },
        { deliveredAt: null, createdAt: { $gte: startOfWeek, $lte: endOfWeek } }
      ]
    }).select('assignedTo createdAt acceptedAt deliveredAt updatedAt').lean();

    if (!completedOrders || completedOrders.length === 0) return 0;

    // Gom nhóm đơn hàng theo [driverId][dateString]
    const driverDayMap = {};

    for (const order of completedOrders) {
      const driverId = order.assignedTo?.toString();
      if (!driverId) continue;

      const orderTime = order.deliveredAt || order.updatedAt || order.createdAt;
      const dateStr = new Date(orderTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      const groupKey = `${driverId}_${dateStr}`;

      const tStart = new Date(order.acceptedAt || order.createdAt || orderTime).getTime();
      const tEnd = new Date(order.deliveredAt || order.updatedAt || orderTime).getTime();

      if (!driverDayMap[groupKey]) {
        driverDayMap[groupKey] = {
          driverId,
          dateStr,
          minTime: tStart,
          maxTime: tEnd,
          sampleDate: orderTime
        };
      } else {
        driverDayMap[groupKey].minTime = Math.min(driverDayMap[groupKey].minTime, tStart);
        driverDayMap[groupKey].maxTime = Math.max(driverDayMap[groupKey].maxTime, tEnd);
      }
    }

    let createdCount = 0;
    const now = new Date();

    for (const item of Object.values(driverDayMap)) {
      // Kiểm tra xem ngày đó tài xế đã có session nào chưa
      const existing = await DriverOnlineSession.findOne({
        driverId: item.driverId,
        date: item.dateStr
      });

      if (!existing) {
        // Thêm buffer 15 phút trước đơn đầu và sau đơn cuối để thể hiện thời gian chuẩn bị/nhận đơn
        const bufferedStart = new Date(item.minTime - 15 * 60 * 1000);
        const rawEnd = new Date(item.maxTime + 15 * 60 * 1000);
        const bufferedEnd = rawEnd > now ? now : rawEnd;

        const durSec = Math.max(300, Math.round((bufferedEnd.getTime() - bufferedStart.getTime()) / 1000));

        const session = new DriverOnlineSession({
          driverId: item.driverId,
          startTime: bufferedStart,
          endTime: bufferedEnd,
          durationSeconds: durSec,
          durationMinutes: Math.round(durSec / 60),
          date: item.dateStr,
          weekIdentifier: getWeekIdentifierForDate(item.sampleDate),
          endReason: 'MANUAL'
        });
        await session.save();
        createdCount++;
      }
    }

    if (createdCount > 0) {
      console.log(`[OnlineSession] Đã tái tạo thành công ${createdCount} phiên Online từ đơn hàng.`);
    }
    return createdCount;
  } catch (err) {
    console.error('[OnlineSession] Lỗi backfillWeeklyOnlineSessionsFromOrders:', err.message);
    return 0;
  }
};

module.exports = {
  startDriverOnlineSession,
  endDriverOnlineSession,
  getDriverOnlineSecondsInRange,
  formatOnlineDuration,
  ensureActiveDriversHaveSession,
  backfillWeeklyOnlineSessionsFromOrders
};
