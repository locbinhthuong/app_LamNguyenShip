const Driver = require('../models/Driver');
const Order = require('../models/Order');
const { getHaversineDistance } = require('./distance');
const { checkDriverDebtBlock } = require('./debtUtils');

/**
 * Tìm tài xế Fulltime thỏa mãn điều kiện để gán đơn tự động
 * 1. Bắt buộc có tọa độ điểm lấy hợp lệ
 * 2. Nằm trong bán kính 1.0km (hoặc config)
 * 3. Loại hình làm việc là FULLTIME
 * 4. Đang Online, Active, không nợ ví, không bị khoá idle
 * 5. ĐANG RẢNH HOÀN TOÀN: activeOrdersCount === 0 (không gán nếu đang có đơn)
 * 6. Phân bổ đồng đều: Ưu tiên người có ít đơn nhất hôm nay, nếu bằng nhau thì Random
 * 
 * @param {Number} pickupLat
 * @param {Number} pickupLng
 * @param {Number} radiusKm (mặc định 1.0 km)
 * @param {Number} commissionRate
 * @param {Array<String>} excludeDriverIds Danh sách ID tài xế bỏ qua
 * @returns {Object|null} Tài xế Fulltime được gán hoặc null (nếu không có ai thỏa mãn)
 */
const findEligibleFulltimeDriver = async ({
  pickupLat,
  pickupLng,
  radiusKm = 1.0,
  commissionRate = null,
  excludeDriverIds = []
}) => {
  if (!pickupLat || !pickupLng) {
    console.log('[AutoAssign] Đơn không có tọa độ điểm lấy -> Không thể gán tự động');
    return null;
  }

  try {
    // 1. Lọc tài xế Fulltime đang online, active, có tọa độ
    let query = {
      isOnline: true,
      status: 'active',
      driverType: { $ne: 'PARTTIME' }, // Chỉ tài xế Fulltime
      'currentLocation.lat': { $ne: null },
      'currentLocation.lng': { $ne: null }
    };

    if (excludeDriverIds && excludeDriverIds.length > 0) {
      query._id = { $nin: excludeDriverIds };
    }

    if (commissionRate != null) {
      if (Number(commissionRate) === 15) {
        query.$or = [{ commissionRate: 15 }, { commissionRate: null }, { commissionRate: { $exists: false } }];
      } else {
        query.commissionRate = Number(commissionRate);
      }
    }

    const availableDrivers = await Driver.find(query).lean();
    if (!availableDrivers || availableDrivers.length === 0) {
      console.log('[AutoAssign] Không có tài xế Fulltime nào online');
      return null;
    }

    // 2. Lọc trong bán kính 1.0km (hoặc radiusKm)
    const driversInRadius = [];
    for (const driver of availableDrivers) {
      const dist = getHaversineDistance(
        pickupLat,
        pickupLng,
        driver.currentLocation.lat,
        driver.currentLocation.lng
      );
      if (dist <= radiusKm) {
        driversInRadius.push({ ...driver, distance: dist });
      }
    }

    if (driversInRadius.length === 0) {
      console.log(`[AutoAssign] Không có tài xế Fulltime nào trong bán kính ${radiusKm}km`);
      return null;
    }

    console.log(`[AutoAssign] Tìm thấy ${driversInRadius.length} tài xế Fulltime trong bán kính ${radiusKm}km`);

    // 3. Lọc kỹ: Không bị nợ + Không bị khoá idle + ĐANG RẢNH HOÀN TOÀN (0 đơn active)
    const now = new Date();
    const idleFulltimeCandidates = [];

    const DriverSchedule = require('../models/DriverSchedule');
    const { getWeekKey, getDayOfWeekVN, getDayKeyFromDayOfWeek } = require('./scheduleUtils');
    const currentWeekKey = getWeekKey();
    const dayOfWeek = getDayOfWeekVN();
    const currentDayKey = getDayKeyFromDayOfWeek(dayOfWeek);

    for (const driver of driversInRadius) {
      // Kiểm tra ca làm việc hôm nay (Thứ 2 - Thứ 6)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const scheduleDoc = await DriverSchedule.findOne({ driverId: driver._id, weekKey: currentWeekKey }).lean();
        if (scheduleDoc?.schedule?.[currentDayKey]) {
          const todayShift = scheduleDoc.schedule[currentDayKey];
          // Nếu ca hôm nay là PARTTIME, OFF hoặc đã bị HẠ Fulltime do offline quá 2 lần -> BỎ QUA
          if (todayShift.shift !== 'FULLTIME' || todayShift.isDowngraded) {
            console.log(`[AutoAssign] Bỏ qua ${driver.name} vì ca hôm nay là ${todayShift.shift} (isDowngraded: ${todayShift.isDowngraded})`);
            continue;
          }
        } else if (driver.driverType === 'PARTTIME') {
          continue;
        }
      }

      if (driver.idleLockedUntil && new Date(driver.idleLockedUntil) > now) {
        console.log(`[AutoAssign] Bỏ qua ${driver.name} do đang bị khoá idle`);
        continue;
      }

      // Kiểm tra công nợ
      const debtCheck = await checkDriverDebtBlock(driver._id);
      if (debtCheck.blocked) {
        console.log(`[AutoAssign] Bỏ qua ${driver.name} do bị chặn nợ`);
        continue;
      }

      // Kiểm tra số đơn đang chạy (PHẢI LÀ 0 ĐƠN)
      const activeOrdersCount = await Order.countDocuments({
        assignedTo: driver._id,
        status: { $in: ['ACCEPTED', 'PICKED_UP', 'DELIVERING'] }
      });

      if (activeOrdersCount > 0) {
        console.log(`[AutoAssign] Bỏ qua ${driver.name} vì đang có ${activeOrdersCount} đơn đang chạy`);
        continue;
      }

      idleFulltimeCandidates.push(driver);
    }

    if (idleFulltimeCandidates.length === 0) {
      console.log('[AutoAssign] Tất cả tài xế Fulltime trong bán kính đều đang bận đơn hoặc nợ ví');
      return null;
    }

    // 4. Nếu chỉ có 1 người thỏa mãn -> Chọn luôn
    if (idleFulltimeCandidates.length === 1) {
      console.log(`[AutoAssign] Chọn tài xế Fulltime duy nhất rảnh trong bán kính: ${idleFulltimeCandidates[0].name}`);
      return idleFulltimeCandidates[0];
    }

    // 5. Nếu có nhiều người -> Phân bổ đồng đều (Fair Distribution)
    // Tính số đơn đã hoàn thành trong ngày hôm nay của từng tài xế
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const candidatesWithCounts = await Promise.all(
      idleFulltimeCandidates.map(async (driver) => {
        const todayCount = await Order.countDocuments({
          assignedTo: driver._id,
          status: 'COMPLETED',
          createdAt: { $gte: startOfToday }
        });
        return { ...driver, todayCount };
      })
    );

    // Tìm số đơn thấp nhất trong ngày
    const minOrders = Math.min(...candidatesWithCounts.map(c => c.todayCount));
    const lowestGroup = candidatesWithCounts.filter(c => c.todayCount === minOrders);

    // Random ngẫu nhiên 1 người trong nhóm có số đơn thấp nhất
    const randomIndex = Math.floor(Math.random() * lowestGroup.length);
    const chosenDriver = lowestGroup[randomIndex];

    console.log(`[AutoAssign] Đã chọn tài xế ${chosenDriver.name} (Hôm nay đã chạy ${chosenDriver.todayCount} đơn, trong nhóm ${lowestGroup.length} người ít đơn nhất)`);
    return chosenDriver;
  } catch (error) {
    console.error('[AutoAssign] Lỗi tìm tài xế Fulltime:', error);
    return null;
  }
};

/**
 * Giữ lại hàm tìm theo nhóm cũ để tương thích ngược nếu cần
 */
const findNearestAvailableDriversGroup = async (pickupLat, pickupLng, commissionRate = null, excludeDriverIds = [], limit = 9999, isVipOnly = false) => {
  if (!pickupLat || !pickupLng) return [];

  try {
    let query = {
      isOnline: true,
      status: 'active',
      'currentLocation.lat': { $ne: null },
      'currentLocation.lng': { $ne: null }
    };

    if (isVipOnly) query.isPriority5s = true;
    if (excludeDriverIds.length > 0) query._id = { $nin: excludeDriverIds };

    if (commissionRate != null) {
      if (Number(commissionRate) === 15) {
        query.$or = [{ commissionRate: 15 }, { commissionRate: null }, { commissionRate: { $exists: false } }];
      } else {
        query.commissionRate = Number(commissionRate);
      }
    }

    const availableDrivers = await Driver.find(query).lean();
    if (availableDrivers.length === 0) return [];

    const driversWithDistance = availableDrivers.reduce((acc, driver) => {
      const dist = getHaversineDistance(
        pickupLat,
        pickupLng,
        driver.currentLocation.lat,
        driver.currentLocation.lng
      );
      if (dist <= 1.0) { // Chuẩn hóa về 1.0km
        acc.push({ ...driver, distance: dist });
      }
      return acc;
    }, []).sort((a, b) => a.distance - b.distance);

    const eligibleGroup = [];
    for (const driver of driversWithDistance) {
      if (driver.idleLockedUntil && new Date(driver.idleLockedUntil) > new Date()) continue;
      const debtCheck = await checkDriverDebtBlock(driver._id);
      if (debtCheck.blocked) continue;

      const activeOrdersCount = await Order.countDocuments({
        assignedTo: driver._id,
        status: { $in: ['ACCEPTED', 'PICKED_UP', 'DELIVERING'] }
      });
      if (activeOrdersCount > 0) continue; // Chuẩn hóa: Chỉ người rảnh

      eligibleGroup.push(driver);
      if (eligibleGroup.length >= limit) break;
    }

    return eligibleGroup;
  } catch (error) {
    console.error('[DriverAssignment] Lỗi:', error.message);
    return [];
  }
};

module.exports = {
  findEligibleFulltimeDriver,
  findNearestAvailableDriversGroup
};
