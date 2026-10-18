/**
 * Tiện ích quản lý chu kỳ tuần và cấp bậc tài xế theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)
 */

// BẬT HỆ THỐNG CẤP BẬC VÀ TỰ ĐỘNG THAY ĐỔI CHIẾT KHẤU TÀI XẾ (20% - 15% - 10%)
const ENABLE_TIER_SYSTEM = true;

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

  // Nếu tài xế đang bị dính mức 12% từ bản test cũ thì tự động gỡ khóa thủ công để cập nhật về đúng 20% / 15% / 10%
  if (Number(driver.commissionRate) === 12) {
    driver.isCustomCommission = false;
  }

  // Nếu tính năng Cấp Bậc được bật và không bị Admin khóa chiết khấu thủ công thì tự động cập nhật chiết khấu theo cấp
  if (ENABLE_TIER_SYSTEM && !driver.isCustomCommission) {
    driver.commissionRate = tierConfig.commissionRate;
  }

  return tierConfig;
};

/**
 * Tự động điều chỉnh lại các giao dịch công nợ bị tính nhầm 12% (từ bản test cũ)
 * - CHỈ điều chỉnh cho những ngày/tài xế CHƯA ĐÓNG công nợ.
 * - Những tài xế đã đóng công nợ ngày đó rồi (hoặc đang chờ duyệt thanh toán / hết nợ) sẽ được GIỮ NGUYÊN không đụng vào.
 */
const reconcileUnpaid12PercentDebt = async (io = null) => {
  try {
    const Driver = require('../models/Driver');
    const Order = require('../models/Order');
    const DebtTransaction = require('../models/DebtTransaction');

    // Tìm các giao dịch trừ phí đơn hàng đang ghi "Thu chiết khấu 12%"
    const legacy12Txs = await DebtTransaction.find({
      type: 'FEE_DEDUCTION',
      status: 'SUCCESS',
      description: { $regex: /Thu chiết khấu 12%/ }
    });

    if (!legacy12Txs || legacy12Txs.length === 0) return 0;

    // Nhóm theo driverId + targetDate
    const groups = {};
    for (const tx of legacy12Txs) {
      const dateStr = tx.targetDate || new Date(tx.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      const key = `${tx.driverId.toString()}__${dateStr}`;
      if (!groups[key]) {
        groups[key] = {
          driverId: tx.driverId.toString(),
          targetDate: dateStr,
          txs: []
        };
      }
      groups[key].txs.push(tx);
    }

    let adjustedTxCount = 0;

    for (const group of Object.values(groups)) {
      const { driverId, targetDate, txs } = group;
      const driver = await Driver.findById(driverId);
      if (!driver) continue;

      // Nếu tổng dư nợ hiện tại của tài xế <= 0 (đã đóng hết nợ) -> BỎ QUA
      if ((driver.walletDebt || 0) <= 0) {
        continue;
      }

      // Kiểm tra toàn bộ giao dịch trong ngày targetDate của tài xế này
      const allDriverTxs = await DebtTransaction.find({
        driverId,
        status: { $nin: ['REJECTED', 'DELETED'] }
      }).lean();

      const dayTxs = allDriverTxs.filter(t => {
        const dStr = t.targetDate || new Date(t.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
        return dStr === targetDate;
      });

      // Nếu trong ngày targetDate đã có giao dịch PAYMENT (đã đóng hoặc đang chờ duyệt thanh toán)
      // HOẶC tổng nợ ròng của ngày đó <= 0 -> tài xế đã đóng rồi -> BỎ QUA
      const hasPaidOrPendingForDay = dayTxs.some(t => t.type === 'PAYMENT');
      const netDayDebt = dayTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      if (hasPaidOrPendingForDay || netDayDebt <= 0) {
        continue;
      }

      // Lấy đúng mức chiết khấu theo cấp hạng hiện tại của tài xế (20% / 15% / 10%)
      const tierCfg = getTierConfig(driver.weeklyPoints || 0);
      const correctRate = (driver.isCustomCommission && Number(driver.commissionRate) !== 12)
        ? Number(driver.commissionRate)
        : tierCfg.commissionRate;

      if (correctRate === 12) continue;

      let totalDiff = 0;
      for (const tx of txs) {
        let deliveryFee = 0;
        if (tx.orderId) {
          const ord = await Order.findById(tx.orderId).select('deliveryFee').lean();
          if (ord && ord.deliveryFee) deliveryFee = Number(ord.deliveryFee);
        }
        if (!deliveryFee && tx.description) {
          const match = tx.description.match(/Phí ship:\s*([\d]+)/);
          if (match) deliveryFee = Number(match[1]);
        }
        if (!deliveryFee && tx.amount > 0) {
          deliveryFee = Math.round(tx.amount / 0.12);
        }

        if (deliveryFee > 0) {
          const newAmount = Math.round(deliveryFee * (correctRate / 100));
          const diff = newAmount - tx.amount;
          tx.amount = newAmount;
          tx.description = tx.description.replace(/Thu chiết khấu 12%/g, `Thu chiết khấu ${correctRate}%`);
          await tx.save();
          totalDiff += diff;
          adjustedTxCount++;
        }
      }

      if (totalDiff !== 0) {
        const updatedDriver = await Driver.findByIdAndUpdate(
          driverId,
          { $inc: { walletDebt: totalDiff } },
          { new: true }
        );
        console.log(`[DebtReconcile] Đã điều chỉnh công nợ ngày ${targetDate} cho tài xế ${driver.name} (${correctRate}%): chênh lệch ${totalDiff > 0 ? '+' : ''}${totalDiff}đ -> Nợ mới: ${updatedDriver.walletDebt}đ`);
        if (io) {
          io.to(`driver_${driverId}`).emit('debt_updated', { debt: updatedDriver.walletDebt });
          io.to(`driver_${driverId}`).emit('driver_updated', updatedDriver);
        }
      }
    }

    if (adjustedTxCount > 0) {
      console.log(`[DebtReconcile] Đã tự động cập nhật lại ${adjustedTxCount} giao dịch công nợ 12% chưa thanh toán về đúng cấp hạng.`);
    }
    return adjustedTxCount;
  } catch (error) {
    console.error('[DebtReconcile] Lỗi khi điều chỉnh công nợ 12%:', error);
    return 0;
  }
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

    // Tự động điều chỉnh lại công nợ 12% cho những tài xế chưa đóng tiền
    await reconcileUnpaid12PercentDebt(io);

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
  checkAndResetAllDriversWeekly,
  reconcileUnpaid12PercentDebt
};

