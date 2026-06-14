const Driver = require('../models/Driver');
const Order = require('../models/Order');
const { getHaversineDistance } = require('./distance');
const { checkDriverDebtBlock } = require('./debtUtils');

/**
 * Tìm tài xế gần nhất thỏa mãn mọi điều kiện
 * @param {Number} pickupLat
 * @param {Number} pickupLng
 * @param {Number} commissionRate
 * @param {Array<String>} excludeDriverIds Danh sách ID tài xế bỏ qua (ví dụ người đã từ chối)
 * @returns {Object|null} Tài xế phù hợp nhất
 */
const findNearestAvailableDriver = async (pickupLat, pickupLng, commissionRate = null, excludeDriverIds = []) => {
  if (!pickupLat || !pickupLng) return null;

  try {
    // 1. Lọc tài xế đang online, active, có tọa độ hợp lệ
    let query = {
      isOnline: true,
      status: 'active',
      'currentLocation.lat': { $ne: null },
      'currentLocation.lng': { $ne: null }
    };

    if (excludeDriverIds.length > 0) {
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
    if (availableDrivers.length === 0) return null;

    // 2. Tính khoảng cách và sắp xếp từ gần đến xa
    const driversWithDistance = availableDrivers.map(driver => {
      const dist = getHaversineDistance(
        pickupLat,
        pickupLng,
        driver.currentLocation.lat,
        driver.currentLocation.lng
      );
      return { ...driver, distance: dist };
    }).sort((a, b) => a.distance - b.distance);

    // 3. Kiểm tra các điều kiện chuyên sâu theo thứ tự (Nợ, Số đơn đang chạy)
    for (const driver of driversWithDistance) {
      // 3.1 Kiểm tra nợ
      const debtCheck = await checkDriverDebtBlock(driver._id);
      if (debtCheck.blocked) {
        continue; // Bỏ qua người nợ
      }

      // 3.2 Kiểm tra số lượng đơn đang chạy
      const activeOrdersCount = await Order.countDocuments({
        assignedTo: driver._id,
        status: { $in: ['ACCEPTED', 'PICKED_UP', 'DELIVERING'] }
      });

      if (activeOrdersCount >= 3) {
        continue; // Bỏ qua người đang ôm >= 3 đơn
      }

      // Vượt qua mọi điều kiện -> Chọn người này
      return driver;
    }

    return null; // Không còn ai thoả điều kiện
  } catch (error) {
    console.error('[DriverAssignment] Lỗi tìm tài xế gần nhất:', error.message);
    return null;
  }
};

/**
 * Tìm một NHÓM tài xế gần nhất thỏa mãn mọi điều kiện (phát đơn đồng loạt)
 * @param {Number} pickupLat
 * @param {Number} pickupLng
 * @param {Number} commissionRate
 * @param {Array<String>} excludeDriverIds Danh sách ID tài xế bỏ qua
 * @param {Number} limit Số lượng tối đa tài xế trong nhóm (mặc định 5)
 * @returns {Array<Object>} Mảng các tài xế phù hợp nhất
 */
const findNearestAvailableDriversGroup = async (pickupLat, pickupLng, commissionRate = null, excludeDriverIds = [], limit = 5) => {
  if (!pickupLat || !pickupLng) return [];

  try {
    // 1. Lọc tài xế đang online, active, có tọa độ hợp lệ
    let query = {
      isOnline: true,
      status: 'active',
      'currentLocation.lat': { $ne: null },
      'currentLocation.lng': { $ne: null }
    };

    if (excludeDriverIds.length > 0) {
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
    if (availableDrivers.length === 0) return [];

    // 2. Tính khoảng cách và sắp xếp từ gần đến xa
    const driversWithDistance = availableDrivers.map(driver => {
      const dist = getHaversineDistance(
        pickupLat,
        pickupLng,
        driver.currentLocation.lat,
        driver.currentLocation.lng
      );
      return { ...driver, distance: dist };
    }).sort((a, b) => a.distance - b.distance);

    const eligibleGroup = [];

    // 3. Kiểm tra các điều kiện chuyên sâu theo thứ tự
    for (const driver of driversWithDistance) {
      if (eligibleGroup.length >= limit) break; // Đủ số lượng thì dừng

      // 3.1 Kiểm tra nợ
      const debtCheck = await checkDriverDebtBlock(driver._id);
      if (debtCheck.blocked) {
        continue;
      }

      // 3.2 Kiểm tra số lượng đơn đang chạy
      const activeOrdersCount = await Order.countDocuments({
        assignedTo: driver._id,
        status: { $in: ['ACCEPTED', 'PICKED_UP', 'DELIVERING'] }
      });

      if (activeOrdersCount >= 3) {
        continue;
      }

      // Đủ điều kiện -> Thêm vào nhóm
      eligibleGroup.push(driver);
    }

    return eligibleGroup;
  } catch (error) {
    console.error('[DriverAssignment] Lỗi tìm nhóm tài xế gần nhất:', error.message);
    return [];
  }
};

module.exports = {
  findNearestAvailableDriver,
  findNearestAvailableDriversGroup
};
