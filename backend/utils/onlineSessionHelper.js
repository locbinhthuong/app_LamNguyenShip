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

module.exports = {
  startDriverOnlineSession,
  endDriverOnlineSession,
  getDriverOnlineSecondsInRange,
  formatOnlineDuration
};
