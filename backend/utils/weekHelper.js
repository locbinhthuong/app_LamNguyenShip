/**
 * Tiện ích quản lý chu kỳ tuần và cấp bậc tài xế theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)
 */

// BẬT / TẮT HỆ THỐNG CẤP BẬC VÀ TỰ ĐỘNG THAY ĐỔI CHIẾT KHẤU TÀI XẾ
// Tạm tắt (false) trong lúc chờ cập nhật bản mới lên App Store / CH Play để không tự ý đổi chiết khấu của tài xế
// Khi App Store duyệt xong, chỉ cần đổi thành true (hoặc đặt TIER_SYSTEM_ENABLED=true trong .env)
const ENABLE_TIER_SYSTEM = process.env.TIER_SYSTEM_ENABLED === 'true';

// BẬT / TẮT CHẾ ĐỘ TEST
// Khi đang test: Cấp 1: <= 2 đơn | Cấp 2: 3-5 đơn | Cấp 3: >= 6 đơn
// Khi lên chính thức (Production): Cấp 1: 0-10 đơn (20%) | Cấp 2: 11-55 đơn (15%) | Cấp 3: > 55 đơn (10%)
const IS_TEST_TIER = false;

const TIER_THRESHOLDS = IS_TEST_TIER
  ? {
      TIER_1_MAX: 2, // 0 - 2 đơn: Cấp 1 (20%)
      TIER_2_MAX: 5, // 3 - 5 đơn: Cấp 2 (15%)
      TIER_3_MIN: 6  // >= 6 đơn: Cấp 3 (10%)
    }
  : {
      TIER_1_MAX: 10, // 0 - 10 đơn: Cấp 1 (20%)
      TIER_2_MAX: 55, // 11 - 55 đơn: Cấp 2 (15%)
      TIER_3_MIN: 56  // Trên 55 đơn (>= 56 đơn): Cấp 3 (10%)
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
    commissionRate: 10,
    nextTierPoints: null,
    pointsToNextTier: 0,
    thresholds: TIER_THRESHOLDS
  };
};

/**
 * Lấy mốc thời gian bắt đầu của tuần hiện tại (00:00:00 Thứ Hai giờ VN)
 */
const getStartOfWeekVN = () => {
  const now = new Date();
  const vnNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const currentDay = vnNow.getDay() || 7; // 1 = Thứ Hai ... 7 = Chủ Nhật
  const diffToMonday = currentDay - 1;
  const mondayDate = new Date(vnNow);
  mondayDate.setDate(vnNow.getDate() - diffToMonday);
  
  const yyyy = mondayDate.getFullYear();
  const mm = String(mondayDate.getMonth() + 1).padStart(2, '0');
  const dd = String(mondayDate.getDate()).padStart(2, '0');
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000+07:00`);
};

/**
 * Lấy khoảng thời gian của tuần trước (Thứ Hai 00:00:00 đến Chủ Nhật 23:59:59.999 giờ VN)
 */
const getLastWeekRangeVN = () => {
  const startOfThisWeek = getStartOfWeekVN();
  const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
  const endOfLastWeek = new Date(startOfThisWeek.getTime() - 1);
  return { startOfLastWeek, endOfLastWeek };
};

/**
 * Đồng bộ dữ liệu điểm tuần và cấp bậc của tài xế từ các đơn hàng thực tế
 */
const syncDriverWeeklyStats = async (driver) => {
  if (!driver) return null;
  const Order = require('../models/Order');

  const currentWeekStr = getCurrentWeekVN();
  const startOfThisWeek = getStartOfWeekVN();
  const { startOfLastWeek, endOfLastWeek } = getLastWeekRangeVN();

  // Đếm số đơn hoàn thành thực tế trong tuần này
  // Phù hợp với cách tính của MyOrders (deliveredAt hoặc updatedAt hoặc createdAt)
  const thisWeekOrdersCount = await Order.countDocuments({
    assignedTo: driver._id,
    status: 'COMPLETED',
    $or: [
      { deliveredAt: { $gte: startOfThisWeek } },
      { updatedAt: { $gte: startOfThisWeek } },
      { createdAt: { $gte: startOfThisWeek } }
    ]
  });

  // Nếu sang tuần mới hoặc chưa từng lưu tuần
  if (!driver.currentWeek || driver.currentWeek !== currentWeekStr) {
    const lastWeekOrdersCount = await Order.countDocuments({
      assignedTo: driver._id,
      status: 'COMPLETED',
      $or: [
        { deliveredAt: { $gte: startOfLastWeek, $lte: endOfLastWeek } },
        { updatedAt: { $gte: startOfLastWeek, $lte: endOfLastWeek } },
        { createdAt: { $gte: startOfLastWeek, $lte: endOfLastWeek } }
      ]
    });
    driver.lastWeekPoints = lastWeekOrdersCount;
    driver.lastWeekTier = getTierConfig(lastWeekOrdersCount).tier;
    driver.currentWeek = currentWeekStr;
  } else if (driver.lastWeekPoints === undefined || driver.lastWeekPoints === null || (driver.lastWeekPoints === 0 && driver.lastWeekTier === 1)) {
    // Nếu tuần trước chưa tính
    const lastWeekOrdersCount = await Order.countDocuments({
      assignedTo: driver._id,
      status: 'COMPLETED',
      $or: [
        { deliveredAt: { $gte: startOfLastWeek, $lte: endOfLastWeek } },
        { updatedAt: { $gte: startOfLastWeek, $lte: endOfLastWeek } },
        { createdAt: { $gte: startOfLastWeek, $lte: endOfLastWeek } }
      ]
    });
    if (lastWeekOrdersCount > 0) {
      driver.lastWeekPoints = lastWeekOrdersCount;
      driver.lastWeekTier = getTierConfig(lastWeekOrdersCount).tier;
    }
  }

  // Số điểm tuần = Số đơn đã hoàn thành trong tuần này
  driver.weeklyPoints = thisWeekOrdersCount;

  // Cập nhật Cấp bậc và Chiết khấu
  const tierConfig = getTierConfig(driver.weeklyPoints);
  driver.driverTier = tierConfig.tier;

  // Nếu tính năng Cấp Bậc được bật và không bị Admin khóa chiết khấu thủ công thì tự động cập nhật chiết khấu theo cấp
  if (ENABLE_TIER_SYSTEM && !driver.isCustomCommission) {
    driver.commissionRate = tierConfig.commissionRate;
  }

  return tierConfig;
};

/**
 * Quét toàn bộ tài xế trong hệ thống và đồng bộ số đơn tuần từ dữ liệu thực tế
 */
const checkAndResetAllDriversWeekly = async (io = null) => {
  try {
    const Driver = require('../models/Driver');
    const drivers = await Driver.find({ status: { $ne: 'deleted' } });
    if (!drivers || drivers.length === 0) return 0;

    let updatedCount = 0;
    for (const driver of drivers) {
      const oldTier = driver.driverTier || 1;
      const oldRate = driver.commissionRate;
      await syncDriverWeeklyStats(driver);
      await driver.save();
      updatedCount++;

      if (ENABLE_TIER_SYSTEM && io && (driver.driverTier !== oldTier || driver.commissionRate !== oldRate)) {
        io.to(`driver_${driver._id}`).emit('driver_updated', driver);
      }
    }

    console.log(`[WeeklySync] Đã đồng bộ điểm tuần từ đơn hàng thực tế cho ${updatedCount} tài xế`);
    return updatedCount;
  } catch (error) {
    console.error('[WeeklySync] Lỗi checkAndResetAllDriversWeekly:', error);
    return 0;
  }
};

const checkAndResetDriverWeek = syncDriverWeeklyStats;

module.exports = {
  ENABLE_TIER_SYSTEM,
  IS_TEST_TIER,
  TIER_THRESHOLDS,
  getCurrentWeekVN,
  getWeekTimeRemainingVN,
  getStartOfWeekVN,
  getLastWeekRangeVN,
  getTierConfig,
  syncDriverWeeklyStats,
  checkAndResetDriverWeek,
  checkAndResetAllDriversWeekly
};

