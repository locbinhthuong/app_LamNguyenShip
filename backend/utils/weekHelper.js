/**
 * Tiện ích quản lý chu kỳ tuần và cấp bậc tài xế theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)
 */

// BẬT / TẮT CHẾ ĐỘ TEST
// Khi đang test: Cấp 1: <= 2 đơn | Cấp 2: 3-5 đơn | Cấp 3: >= 6 đơn
// Khi lên chính thức (Production): Cấp 1: <= 15 đơn | Cấp 2: 16-75 đơn | Cấp 3: > 75 đơn
const IS_TEST_TIER = true;

const TIER_THRESHOLDS = IS_TEST_TIER
  ? {
      TIER_1_MAX: 2, // 0 - 2 đơn: Cấp 1 (20%)
      TIER_2_MAX: 5, // 3 - 5 đơn: Cấp 2 (15%)
      TIER_3_MIN: 6  // >= 6 đơn: Cấp 3 (12%)
    }
  : {
      TIER_1_MAX: 15, // 0 - 15 đơn: Cấp 1 (20%)
      TIER_2_MAX: 75, // 16 - 75 đơn: Cấp 2 (15%)
      TIER_3_MIN: 76  // >= 76 đơn: Cấp 3 (12%)
    };

/**
 * Lấy mã định danh tuần hiện tại theo giờ Việt Nam
 * Ví dụ: "2026-W42"
 */
const getCurrentWeekVN = () => {
  const now = new Date();
  // Chuyển sang giờ Việt Nam (UTC+7)
  const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  
  // Tính số tuần theo chuẩn ISO
  const target = new Date(vnTime.valueOf());
  const dayNr = (vnTime.getDay() + 6) % 7; // 0 = Thứ Hai, 6 = Chủ Nhật
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
 * Tính số mili-giây còn lại đến 23:59:59 Chủ Nhật tuần này (giờ VN)
 */
const getWeekTimeRemainingVN = () => {
  const now = new Date();
  const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  
  const dayOfWeek = vnTime.getDay(); // 0 = Chủ Nhật, 1 = Thứ Hai...
  const daysUntilSunday = (7 - dayOfWeek) % 7;
  
  const endOfWeek = new Date(vnTime);
  endOfWeek.setDate(vnTime.getDate() + daysUntilSunday);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return Math.max(0, endOfWeek.getTime() - vnTime.getTime());
};

/**
 * Tính cấp bậc và chiết khấu tương ứng dựa trên số điểm tuần (số đơn)
 */
const getTierConfig = (weeklyPoints = 0) => {
  const points = Math.max(0, Number(weeklyPoints) || 0);

  if (points <= TIER_THRESHOLDS.TIER_1_MAX) {
    return {
      tier: 1,
      tierName: 'Cấp 1 - Đồng',
      commissionRate: 20,
      nextTierPoints: TIER_THRESHOLDS.TIER_1_MAX + 1,
      pointsToNextTier: Math.max(0, (TIER_THRESHOLDS.TIER_1_MAX + 1) - points),
      thresholds: TIER_THRESHOLDS
    };
  }

  if (points <= TIER_THRESHOLDS.TIER_2_MAX) {
    return {
      tier: 2,
      tierName: 'Cấp 2 - Bạc',
      commissionRate: 15,
      nextTierPoints: TIER_THRESHOLDS.TIER_2_MAX + 1,
      pointsToNextTier: Math.max(0, (TIER_THRESHOLDS.TIER_2_MAX + 1) - points),
      thresholds: TIER_THRESHOLDS
    };
  }

  return {
    tier: 3,
    tierName: 'Cấp 3 - Vàng',
    commissionRate: 12,
    nextTierPoints: null,
    pointsToNextTier: 0,
    thresholds: TIER_THRESHOLDS
  };
};

/**
 * Kiểm tra và tự động reset tuần cho tài xế nếu đã sang tuần mới (Lazy Check)
 * Trả về true nếu vừa thực hiện reset
 */
const checkAndResetDriverWeek = (driver) => {
  if (!driver) return false;
  
  const currentWeekStr = getCurrentWeekVN();
  
  // Nếu chưa có tuần hoặc tuần lưu trong DB khác tuần hiện tại -> Thực hiện Reset tuần
  if (!driver.currentWeek || driver.currentWeek !== currentWeekStr) {
    driver.lastWeekTier = driver.driverTier || 1;
    driver.lastWeekPoints = driver.weeklyPoints || 0;
    driver.currentWeek = currentWeekStr;
    driver.weeklyPoints = 0;
    driver.driverTier = 1;

    // Nếu không bị Admin khóa chiết khấu thủ công thì trả về 20%
    if (!driver.isCustomCommission) {
      driver.commissionRate = 20;
    }
    return true;
  }
  
  return false;
};

/**
 * Quét toàn bộ tài xế trong hệ thống và reset nếu đã sang tuần mới
 */
const checkAndResetAllDriversWeekly = async (io = null) => {
  try {
    const Driver = require('../models/Driver');
    const currentWeekStr = getCurrentWeekVN();
    
    // Tìm các tài xế chưa đồng bộ sang tuần mới
    const staleDrivers = await Driver.find({
      $or: [
        { currentWeek: { $ne: currentWeekStr } },
        { currentWeek: null },
        { currentWeek: { $exists: false } }
      ]
    });

    if (!staleDrivers || staleDrivers.length === 0) return 0;

    let resetCount = 0;
    for (const driver of staleDrivers) {
      driver.lastWeekTier = driver.driverTier || 1;
      driver.lastWeekPoints = driver.weeklyPoints || 0;
      driver.currentWeek = currentWeekStr;
      driver.weeklyPoints = 0;
      driver.driverTier = 1;

      if (!driver.isCustomCommission) {
        driver.commissionRate = 20;
      }

      await driver.save();
      resetCount++;

      if (io) {
        io.to(`driver_${driver._id}`).emit('driver_weekly_reset', {
          currentWeek: currentWeekStr,
          driverTier: 1,
          commissionRate: driver.commissionRate,
          lastWeekTier: driver.lastWeekTier,
          lastWeekPoints: driver.lastWeekPoints,
          message: 'Tuần mới đã bắt đầu! Điểm xếp hạng tuần đã được làm mới.'
        });
      }
    }

    if (io && resetCount > 0) {
      io.to('admins').emit('driver_weekly_reset_all', { resetCount, week: currentWeekStr });
    }

    console.log(`[WeeklyReset] Đã reset điểm và cấp bậc tuần cho ${resetCount} tài xế (Tuần: ${currentWeekStr})`);
    return resetCount;
  } catch (error) {
    console.error('[WeeklyReset] Lỗi checkAndResetAllDriversWeekly:', error);
    return 0;
  }
};

module.exports = {
  IS_TEST_TIER,
  TIER_THRESHOLDS,
  getCurrentWeekVN,
  getWeekTimeRemainingVN,
  getTierConfig,
  checkAndResetDriverWeek,
  checkAndResetAllDriversWeekly
};

