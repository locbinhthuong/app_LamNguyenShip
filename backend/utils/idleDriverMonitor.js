const Driver = require('../models/Driver');
const Order = require('../models/Order');
const { emitToDriver, emitDriverStatusChange } = require('../sockets/index');
const { sendNotification } = require('./notification');
const { endDriverOnlineSession } = require('./onlineSessionHelper');

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;        // 2 tiếng
const ONE_HOUR_MS = 60 * 60 * 1000;             // 1 tiếng (Offline trên 1 tiếng ở Mức 0 mới tính lại từ đầu 2 tiếng)
const FORTY_FIVE_MINS_MS = 45 * 60 * 1000;      // 45 phút
const LOCK_15_MINS_MS = 15 * 60 * 1000;         // Khóa 15 phút (Lần 2)
const LOCK_12_HOURS_MS = 12 * 60 * 60 * 1000;   // Khóa 12 tiếng (Lần 3)

// BẬT GIÁM SÁT & CẢNH BÁO TÀI XẾ TREO APP TRÊN PRODUCTION
const IDLE_MONITOR_ENABLED = true;
let didCleanupTestLocks = false;

const WARNING_SOUND_OPTIONS = {
  sound: 'chuong_canhbao',
  channelId: 'aloshipp_warning_channel_v1'
};

/**
 * Quét định kỳ các tài xế đang Online nhưng không nhận đơn (treo app)
 * - Lần 1 (sau 2 tiếng): Cảnh báo hỏi "Bạn còn đang hoạt động không? Hãy xác nhận nếu còn đang hoạt động" (2 nút: Xác nhận / Offline)
 * - Lần 2 (sau 45 phút tiếp theo vẫn treo không nhận đơn): Cảnh báo lần 2 + Tự động Offline + Khóa app 15 phút
 * - Lần 3 (sau 15 phút khóa, mở lại Online mà treo 45 phút không nhận đơn): Cảnh báo lần 3 + Tự động Offline + Khóa app 12 tiếng
 */
const checkIdleDrivers = async (io) => {
  try {
    if (!IDLE_MONITOR_ENABLED) {
      if (!didCleanupTestLocks) {
        didCleanupTestLocks = true;
        await Driver.updateMany(
          {
            $or: [
              { idleWarningLevel: { $gt: 0 } },
              { idleLockedUntil: { $ne: null } },
              { idleAccumulatedMs: { $gt: 0 } }
            ]
          },
          {
            $set: {
              idleWarningLevel: 0,
              idleWarningSentAt: null,
              idleConfirmedAt: null,
              idleLockedUntil: null,
              idleOfflineAt: null,
              idleAccumulatedMs: 0
            }
          }
        );
      }
      return;
    }

    const now = new Date();

    // 1. Tự động gỡ trạng thái khóa cho những tài xế đã hết thời gian phạt
    const expiredLockedDrivers = await Driver.find({
      idleLockedUntil: { $ne: null, $lte: now }
    });

    for (const lockedDrv of expiredLockedDrivers) {
      const prevLevel = lockedDrv.idleWarningLevel || 0;
      lockedDrv.idleLockedUntil = null;
      // Nếu đã hết hạn khóa 12 tiếng (Lần 3), reset toàn bộ mức cảnh báo về 0
      // Nếu vừa hết hạn khóa 15 phút (Lần 2), giữ nguyên idleWarningLevel = 2 để theo dõi tiếp 45p nếu bật Online lại
      if (prevLevel >= 3) {
        lockedDrv.idleWarningLevel = 0;
        lockedDrv.idleWarningSentAt = null;
        lockedDrv.idleConfirmedAt = null;
        lockedDrv.idleSince = null;
        lockedDrv.idleOfflineAt = null;
        lockedDrv.idleAccumulatedMs = 0;
      }
      await lockedDrv.save();

      if (io) {
        emitToDriver(io, lockedDrv._id.toString(), 'driver_idle_unlocked', {
          idleWarningLevel: lockedDrv.idleWarningLevel,
          idleLockedUntil: null
        });
      }
    }

    // 1b. Tự động reset khi tài xế đã chủ động Offline đủ thời gian quy định:
    // - Trước Cảnh báo lần 1 (Mức 0): Phải Offline trên 1 tiếng mới reset lại 2 tiếng từ đầu
    // - Đang ở Cảnh báo lần 1 (Mức 1): Phải Offline đủ 45 phút mới reset lại từ đầu
    const offlineResetLevel0Cutoff = new Date(now.getTime() - ONE_HOUR_MS);
    const offlineResetLevel1Cutoff = new Date(now.getTime() - FORTY_FIVE_MINS_MS);
    await Driver.updateMany(
      {
        isOnline: false,
        $or: [
          {
            idleWarningLevel: 0,
            idleAccumulatedMs: { $gt: 0 },
            idleOfflineAt: { $ne: null, $lte: offlineResetLevel0Cutoff }
          },
          {
            idleWarningLevel: 1,
            idleOfflineAt: { $ne: null, $lte: offlineResetLevel1Cutoff }
          }
        ]
      },
      {
        $set: {
          idleWarningLevel: 0,
          idleWarningSentAt: null,
          idleConfirmedAt: null,
          idleOfflineAt: null,
          idleAccumulatedMs: 0,
          idleSince: null
        }
      }
    );

    // 2. Lấy danh sách các tài xế đang Online và hoạt động
    const onlineDrivers = await Driver.find({
      isOnline: true,
      status: 'active'
    });

    if (onlineDrivers.length === 0) return;

    const onlineDriverIds = onlineDrivers.map(d => d._id);

    // 3. Kiểm tra những tài xế nào đang thực hiện đơn hàng (ACCEPTED, PICKED_UP, DELIVERING)
    const busyDriverIdsRaw = await Order.distinct('assignedTo', {
      assignedTo: { $in: onlineDriverIds },
      status: { $in: ['ACCEPTED', 'PICKED_UP', 'DELIVERING'] }
    });
    const busyDriverIdSet = new Set(busyDriverIdsRaw.map(id => id.toString()));

    for (const driver of onlineDrivers) {
      const driverIdStr = driver._id.toString();

      // Nếu tài xế đang giao đơn -> Không phải treo app, cập nhật mốc idleSince mới nhất
      if (busyDriverIdSet.has(driverIdStr)) {
        if (driver.idleWarningLevel !== 0 || !driver.idleSince || (now - new Date(driver.idleSince).getTime() > 60000)) {
          driver.idleSince = now;
          driver.idleWarningLevel = 0;
          driver.idleWarningSentAt = null;
          driver.idleConfirmedAt = null;
          driver.idleLockedUntil = null;
          driver.idleOfflineAt = null;
          driver.idleAccumulatedMs = 0;
          await driver.save();
        }
        continue;
      }

      // Đảm bảo tài xế đang Online có mốc bắt đầu tính thời gian rảnh (idleSince)
      if (!driver.idleSince) {
        driver.idleSince = now;
        await driver.save();
        continue;
      }

      const level = driver.idleWarningLevel || 0;

      // ==================== MỨC 0 -> CẢNH BÁO LẦN 1 (SAU 2 TIẾNG) ====================
      if (level === 0) {
        const elapsedMs = now.getTime() - new Date(driver.idleSince).getTime();
        if (elapsedMs >= TWO_HOURS_MS) {
          driver.idleWarningLevel = 1;
          driver.idleWarningSentAt = now;
          driver.idleConfirmedAt = null;
          driver.idleOfflineAt = null;
          driver.idleAccumulatedMs = 0;
          await driver.save();

          const title = '⚠️ CẢNH BÁO TREO APP (LẦN 1)';
          const message = 'Bạn còn đang hoạt động không? Hãy xác nhận nếu còn đang hoạt động (Bạn đã online 2 tiếng mà chưa nhận đơn).';

          console.log(`[IdleMonitor] Cảnh báo lần 1 cho tài xế ${driver.name} (${driver.phone})`);

          if (io) {
            emitToDriver(io, driverIdStr, 'driver_idle_warning', {
              level: 1,
              title,
              message,
              sentAt: now.toISOString(),
              idleWarningLevel: 1,
              idleWarningSentAt: now.toISOString(),
              idleConfirmedAt: null
            });
          }

          if (driver.fcmToken) {
            await sendNotification(
              driver.fcmToken,
              title,
              message,
              {
                type: 'IDLE_WARNING',
                level: '1',
                url: '/'
              },
              WARNING_SOUND_OPTIONS
            );
          }
        }
      }
      // ==================== MỨC 1 -> CẢNH BÁO LẦN 2 & KHÓA 15 PHÚT (SAU 45 PHÚT) ====================
      else if (level === 1) {
        const refTime = driver.idleConfirmedAt || driver.idleWarningSentAt || driver.idleSince;
        const elapsedAfterWarning1Ms = now.getTime() - new Date(refTime).getTime();

        if (elapsedAfterWarning1Ms >= FORTY_FIVE_MINS_MS) {
          const lockedUntil = new Date(now.getTime() + LOCK_15_MINS_MS);

          driver.isOnline = false;
          driver.currentLocation = null;
          driver.currentOnlineSessionId = null;
          driver.idleWarningLevel = 2;
          driver.idleWarningSentAt = now;
          driver.idleConfirmedAt = null;
          driver.idleLockedUntil = lockedUntil;
          driver.idleSince = null;
          driver.idleOfflineAt = null;
          driver.idleAccumulatedMs = 0;
          await driver.save();
          await endDriverOnlineSession(driver._id, now, 'IDLE_TIMEOUT');

          const title = '🔒 CẢNH BÁO LẦN 2 - KHÓA APP 15 PHÚT';
          const message = 'Sau 45 phút kể từ cảnh báo lần 1 bạn vẫn treo app không nhận đơn. Hệ thống tạm khóa app 15 phút và chuyển sang Offline!';

          console.log(`[IdleMonitor] Cảnh báo lần 2 & Khóa 15p tài xế ${driver.name} (${driver.phone})`);

          if (io) {
            emitDriverStatusChange(io, {
              driverId: driver._id,
              isOnline: false,
              lat: null,
              lng: null,
              idleWarningLevel: 2,
              idleLockedUntil: lockedUntil
            });

            emitToDriver(io, driverIdStr, 'driver_idle_warning', {
              level: 2,
              title,
              message,
              lockedUntil: lockedUntil.toISOString(),
              sentAt: now.toISOString(),
              idleWarningLevel: 2,
              idleLockedUntil: lockedUntil.toISOString(),
              isOnline: false
            });
          }

          if (driver.fcmToken) {
            await sendNotification(
              driver.fcmToken,
              title,
              message,
              {
                type: 'IDLE_WARNING',
                level: '2',
                lockedUntil: lockedUntil.toISOString(),
                url: '/'
              },
              WARNING_SOUND_OPTIONS
            );
          }
        }
      }
      // ==================== MỨC 2 -> CẢNH BÁO LẦN 3 & KHÓA 12 TIẾNG (SAU 45 PHÚT MỞ LẠI) ====================
      else if (level >= 2) {
        const refTime = driver.idleSince;
        const elapsedAfterReopenMs = now.getTime() - new Date(refTime).getTime();

        if (elapsedAfterReopenMs >= FORTY_FIVE_MINS_MS) {
          const lockedUntil = new Date(now.getTime() + LOCK_12_HOURS_MS);

          driver.isOnline = false;
          driver.currentLocation = null;
          driver.currentOnlineSessionId = null;
          driver.idleWarningLevel = 3;
          driver.idleWarningSentAt = now;
          driver.idleConfirmedAt = null;
          driver.idleLockedUntil = lockedUntil;
          driver.idleSince = null;
          driver.idleOfflineAt = null;
          driver.idleAccumulatedMs = 0;
          await driver.save();
          await endDriverOnlineSession(driver._id, now, 'IDLE_TIMEOUT');

          const title = '🚫 CẢNH BÁO LẦN 3 - KHÓA APP 12 TIẾNG';
          const message = 'Sau 15 phút khóa app, bạn vẫn mở lên treo 45 phút không nhận đơn. Hệ thống tạm khóa app của bạn trong 12 tiếng!';

          console.log(`[IdleMonitor] Cảnh báo lần 3 & Khóa 12h tài xế ${driver.name} (${driver.phone})`);

          if (io) {
            emitDriverStatusChange(io, {
              driverId: driver._id,
              isOnline: false,
              lat: null,
              lng: null,
              idleWarningLevel: 3,
              idleLockedUntil: lockedUntil
            });

            emitToDriver(io, driverIdStr, 'driver_idle_warning', {
              level: 3,
              title,
              message,
              lockedUntil: lockedUntil.toISOString(),
              sentAt: now.toISOString(),
              idleWarningLevel: 3,
              idleLockedUntil: lockedUntil.toISOString(),
              isOnline: false
            });
          }

          if (driver.fcmToken) {
            await sendNotification(
              driver.fcmToken,
              title,
              message,
              {
                type: 'IDLE_WARNING',
                level: '3',
                lockedUntil: lockedUntil.toISOString(),
                url: '/'
              },
              WARNING_SOUND_OPTIONS
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('[IdleMonitor] Lỗi khi quét tài xế treo app:', error);
  }
};

module.exports = {
  checkIdleDrivers,
  IDLE_MONITOR_ENABLED,
  TWO_HOURS_MS,
  ONE_HOUR_MS,
  FORTY_FIVE_MINS_MS,
  LOCK_15_MINS_MS,
  LOCK_12_HOURS_MS
};
