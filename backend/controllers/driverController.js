const bcrypt = require('bcryptjs');
const Driver = require('../models/Driver');
const DebtTransaction = require('../models/DebtTransaction');
const WalletTransaction = require('../models/WalletTransaction');
const { emitToDriver } = require('../sockets/index');
const { endDriverOnlineSession } = require('../utils/onlineSessionHelper');

const driverController = {
  // GET /api/drivers - Lấy danh sách tài xế (Admin)
  getAllDrivers: async (req, res) => {
    try {
      const { status, isOnline, search } = req.query;

      let query = {};
      const andConditions = [];

      if (status === 'banned') {
        andConditions.push({
          $or: [
            { status: 'banned' },
            { idleLockedUntil: { $gt: new Date() } },
            { idleWarningLevel: { $gt: 0 } }
          ]
        });
      } else if (status) {
        query.status = status;
      }

      if (isOnline !== undefined) {
        query.isOnline = isOnline === 'true';
      }

      if (search) {
        andConditions.push({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { driverCode: { $regex: search, $options: 'i' } }
          ]
        });
      }

      if (andConditions.length > 0) {
        query.$and = andConditions;
      }

      const limit = parseInt(req.query.limit) || 1000;
      const page = parseInt(req.query.page) || 1;
      const skip = (page - 1) * limit;

      const [drivers, total] = await Promise.all([
        Driver.find(query)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Driver.countDocuments(query)
      ]);

      // Aggregate today's orders (or a specific date)
      let filterDate = new Date();
      let startOfDay, endOfDay;
      if (req.query.date) {
        startOfDay = new Date(`${req.query.date}T00:00:00+07:00`);
        endOfDay = new Date(`${req.query.date}T23:59:59.999+07:00`);
        filterDate = startOfDay;
      } else {
        const vnTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
        const vnDate = new Date(vnTimeStr);
        const y = vnDate.getFullYear();
        const m = String(vnDate.getMonth() + 1).padStart(2, '0');
        const d = String(vnDate.getDate()).padStart(2, '0');
        startOfDay = new Date(`${y}-${m}-${d}T00:00:00+07:00`);
        endOfDay = new Date(`${y}-${m}-${d}T23:59:59.999+07:00`);
        filterDate = startOfDay;
      }
      const Order = require('../models/Order');

      const { getStartOfWeekVN, getCurrentWeekVN, getTierConfig, syncDriverWeeklyStats, reconcileUnpaid12PercentDebt } = require('../utils/weekHelper');
      await reconcileUnpaid12PercentDebt(req.io);
      const startOfThisWeek = getStartOfWeekVN();
      const currentWeekStr = getCurrentWeekVN();

      const [todayStats, thisWeekStats] = await Promise.all([
        Order.aggregate([
          {
            $match: {
              assignedTo: { $in: drivers.map(d => d._id) },
              status: 'COMPLETED',
              deliveredAt: { $gte: startOfDay, $lte: endOfDay }
            }
          },
          {
            $group: {
              _id: '$assignedTo',
              todayOrders: { $sum: 1 },
              todayDeliveryFee: { $sum: '$deliveryFee' },
              todayCodAmount: { $sum: '$codAmount' }
            }
          }
        ]),
        Order.aggregate([
          {
            $match: {
              assignedTo: { $in: drivers.map(d => d._id) },
              status: 'COMPLETED',
              $or: [
                { deliveredAt: { $gte: startOfThisWeek } },
                { updatedAt: { $gte: startOfThisWeek } },
                { createdAt: { $gte: startOfThisWeek } }
              ]
            }
          },
          {
            $group: {
              _id: '$assignedTo',
              weekOrders: { $sum: 1 }
            }
          }
        ])
      ]);

      const weekOrdersMap = {};
      thisWeekStats.forEach(w => {
        weekOrdersMap[w._id.toString()] = w.weekOrders;
      });

      const DebtTransaction = require('../models/DebtTransaction');
      const targetDateStr = filterDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      const todayDebtStats = await DebtTransaction.aggregate([
        {
          $match: {
            driverId: { $in: drivers.map(d => d._id) },
            status: 'SUCCESS',
            $or: [
              { targetDate: targetDateStr },
              { targetDate: { $exists: false }, createdAt: { $gte: startOfDay, $lte: endOfDay } }
            ]
          }
        },
        {
          $group: {
            _id: '$driverId',
            todayDebt: { $sum: '$amount' }
          }
        }
      ]);

      const statsMap = {};
      todayStats.forEach(stat => {
        statsMap[stat._id.toString()] = {
          todayOrders: stat.todayOrders,
          todayDeliveryFee: stat.todayDeliveryFee,
          todayCodAmount: stat.todayCodAmount || 0,
          todayDebt: 0
        };
      });

      todayDebtStats.forEach(stat => {
        if (!statsMap[stat._id.toString()]) {
          statsMap[stat._id.toString()] = { todayOrders: 0, todayDeliveryFee: 0, todayCodAmount: 0, todayDebt: 0 };
        }
        statsMap[stat._id.toString()].todayDebt = stat.todayDebt;
      });

      const bulkOps = [];
      const driversWithStats = drivers.map(drv => {
        const stat = statsMap[drv._id.toString()] || { todayOrders: 0, todayDeliveryFee: 0, todayCodAmount: 0, todayDebt: 0 };
        const actualWeekPoints = weekOrdersMap[drv._id.toString()] || 0;
        const tierCfg = getTierConfig(actualWeekPoints);
        const isLegacy12 = Number(drv.commissionRate) === 12;
        const isCustom = isLegacy12 ? false : Boolean(drv.isCustomCommission);
        const expectedRate = isCustom ? drv.commissionRate : tierCfg.commissionRate;

        if (
          drv.weeklyPoints !== actualWeekPoints ||
          drv.driverTier !== tierCfg.tier ||
          drv.commissionRate !== expectedRate ||
          drv.currentWeek !== currentWeekStr ||
          isLegacy12
        ) {
          bulkOps.push({
            updateOne: {
              filter: { _id: drv._id },
              update: {
                $set: {
                  weeklyPoints: actualWeekPoints,
                  driverTier: tierCfg.tier,
                  commissionRate: expectedRate,
                  isCustomCommission: isCustom,
                  currentWeek: currentWeekStr
                }
              }
            }
          });
        }

        return {
          ...drv,
          weeklyPoints: actualWeekPoints,
          driverTier: tierCfg.tier,
          commissionRate: expectedRate,
          isCustomCommission: isCustom,
          currentWeek: currentWeekStr,
          ...stat
        };
      });

      if (bulkOps.length > 0) {
        Driver.bulkWrite(bulkOps).catch(err => console.error('Error bulkWrite driver tiers:', err));
      }

      res.status(200).json({
        success: true,
        count: driversWithStats.length,
        data: driversWithStats,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total
        }
      });
    } catch (error) {
      console.error('Error getAllDrivers:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    }
  },

  // GET /api/drivers/:id - Lấy chi tiết tài xế (Admin)
  getDriverById: async (req, res) => {
    try {
      const { id } = req.params;

      const driverDoc = await Driver.findById(id).select('-password');

      if (!driverDoc) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài xế'
        });
      }

      const { syncDriverWeeklyStats } = require('../utils/weekHelper');
      await syncDriverWeeklyStats(driverDoc);
      await driverDoc.save();
      const driver = driverDoc.toObject();

      res.status(200).json({
        success: true,
        data: {
          ...driver,
          completionRate: driver.stats.totalOrders > 0
            ? Math.round((driver.stats.completedOrders / driver.stats.totalOrders) * 100)
            : 0
        }
      });
    } catch (error) {
      console.error('Error getDriverById:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    }
  },

  // POST /api/drivers - Tạo tài xế mới (Admin)
  createDriver: async (req, res) => {
    try {
      const { name, phone, password, vehicleType, licensePlate, commissionRate, isCustomCommission } = req.body;

      // Check phone exists
      const existing = await Driver.findOne({ phone });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại đã được đăng ký'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const driver = new Driver({
        name,
        phone,
        password: hashedPassword,
        vehicleType: vehicleType || 'motorcycle',
        licensePlate,
        commissionRate: commissionRate !== undefined ? Number(commissionRate) : 15,
        isCustomCommission: isCustomCommission !== undefined ? Boolean(isCustomCommission) : false,
        driverTier: 1,
        weeklyPoints: 0
      });

      await driver.save();

      res.status(201).json({
        success: true,
        message: 'Tạo tài xế thành công',
        data: {
          ...driver.toJSON(),
          completionRate: 0
        }
      });
    } catch (error) {
      console.error('Error createDriver:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo tài xế'
      });
    }
  },

  // PUT /api/drivers/:id - Cập nhật tài xế (Admin)
  updateDriver: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, vehicleType, licensePlate, status, avatar, commissionRate, cccd, gplx, isPriority5s, isCustomCommission, driverTier, weeklyPoints } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (vehicleType) updateData.vehicleType = vehicleType;
      if (licensePlate !== undefined) updateData.licensePlate = licensePlate;
      if (status) {
        updateData.status = status;
        if (status === 'active') {
          const currentDriver = await Driver.findById(id);
          updateData.idleLockedUntil = null;
          updateData.idleWarningLevel = 0;
          updateData.idleWarningSentAt = null;
          updateData.idleConfirmedAt = null;
          updateData.idleOfflineAt = null;
          updateData.idleAccumulatedMs = 0;
          updateData.idleSince = currentDriver?.isOnline ? new Date() : null;
          // Thay thế tất cả các chuỗi '(Đã xoá)' hoặc '(Đã xóa)' trong tên
          if (currentDriver && currentDriver.name) {
            updateData.name = currentDriver.name.replace(/\s*\(Đã (xoá|xóa)\)/gi, '');
          }
        } else {
          updateData.isOnline = false;
          updateData.currentLocation = null;
          updateData.currentOnlineSessionId = null;
          await endDriverOnlineSession(id, new Date(), 'ADMIN_FORCE');
        }
      }
      if (req.body.unlockIdle) {
        const currentDriver = await Driver.findById(id);
        updateData.idleLockedUntil = null;
        updateData.idleWarningLevel = 0;
        updateData.idleWarningSentAt = null;
        updateData.idleConfirmedAt = null;
        updateData.idleOfflineAt = null;
        updateData.idleAccumulatedMs = 0;
        updateData.idleSince = currentDriver?.isOnline ? new Date() : null;
      }
      if (avatar !== undefined) updateData.avatar = avatar;
      if (commissionRate !== undefined) updateData.commissionRate = Number(commissionRate);
      if (isCustomCommission !== undefined) updateData.isCustomCommission = Boolean(isCustomCommission);
      if (driverTier !== undefined) updateData.driverTier = Number(driverTier);
      if (weeklyPoints !== undefined) updateData.weeklyPoints = Number(weeklyPoints);
      if (cccd !== undefined) updateData.cccd = cccd;
      if (gplx !== undefined) updateData.gplx = gplx;
      if (isPriority5s !== undefined) updateData.isPriority5s = isPriority5s;

      const driver = await Driver.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      ).select('-password');

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài xế'
        });
      }

      if (req.io) {
        req.io.to(`driver_${driver._id}`).emit('driver_updated', driver);
        req.io.to('admins').emit('driver_status_change', {
          driverId: driver._id,
          isOnline: driver.isOnline,
          status: driver.status,
          idleWarningLevel: driver.idleWarningLevel || 0,
          idleLockedUntil: driver.idleLockedUntil || null
        });
      }

      res.status(200).json({
        success: true,
        message: 'Cập nhật tài xế thành công',
        data: driver
      });

      // Bắn socket cho tài xế nếu admin đổi status hoặc mở khóa
      if (req.io && (status || req.body.unlockIdle)) {
        emitToDriver(req.io, id, 'driver_status_updated', { status: driver.status, unlockIdle: !!req.body.unlockIdle });
        if (req.body.unlockIdle || status === 'active') {
          emitToDriver(req.io, id, 'driver_idle_unlocked', {
            idleWarningLevel: 0,
            idleLockedUntil: null,
            message: 'Admin đã mở khóa cảnh báo treo app cho bạn!'
          });
        }
      }
    } catch (error) {
      console.error('Error updateDriver:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật tài xế'
      });
    }
  },

  // PUT /api/drivers/:id/force-offline - Ép tài xế Offline (Admin)
  forceOffline: async (req, res) => {
    try {
      const { id } = req.params;
      const now = new Date();

      await endDriverOnlineSession(id, now, 'ADMIN_FORCE');
      
      const driver = await Driver.findByIdAndUpdate(
        id,
        {
          isOnline: false,
          currentLocation: null,
          currentOnlineSessionId: null,
          idleSince: null,
          idleWarningLevel: 0,
          idleWarningSentAt: null,
          idleConfirmedAt: null
        },
        { new: true }
      ).select('-password');

      if (!driver) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế' });
      }

      // Phát sự kiện Socket cho tất cả Admin cập nhật map/list và báo trực tiếp cho App Tài Xế
      if (req.io) {
        req.io.to('admins').emit('driver_status_change', {
          driverId: driver._id,
          isOnline: false,
          lat: null,
          lng: null,
          location: null
        });
        emitToDriver(req.io, driver._id.toString(), 'driver_forced_offline', {
          isOnline: false,
          message: 'Quản trị viên đã tắt trạng thái hoạt động (Offline) của bạn.'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Đã tắt trạng thái hoạt động của tài xế',
        data: driver
      });
    } catch (error) {
      console.error('Error forceOffline:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // PUT /api/drivers/:id/reset-password - Reset mật khẩu (Admin)
  resetPassword: async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu phải ít nhất 6 ký tự'
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await Driver.findByIdAndUpdate(id, { password: hashedPassword });

      res.status(200).json({
        success: true,
        message: 'Reset mật khẩu thành công'
      });
    } catch (error) {
      console.error('Error resetPassword:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi reset mật khẩu'
      });
    }
  },

  // PUT /api/drivers/:id/reset-balances - Reset Công Nợ & Ví Điện Tử về 0 (Admin)
  resetBalances: async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = req.admin._id;

      const driver = await Driver.findById(id);
      if (!driver) return res.status(404).json({ success: false, message: 'Tài xế không tồn tại' });

      // Reset Wallet
      const walletBalance = driver.walletBalance || 0;
      if (walletBalance !== 0) {
        const type = walletBalance > 0 ? 'ADMIN_ADJUST' : 'DEPOSIT'; 
        const amountToZero = -walletBalance;
        const wTx = new WalletTransaction({
          driverId: id,
          type: type,
          amount: amountToZero,
          status: 'SUCCESS',
          description: 'Xóa Sạch Ví Điện Tử / Reset Mốc 0',
          createdByAdminId: adminId
        });
        await wTx.save();
      }

      // Reset Debt
      const transactions = await DebtTransaction.find({ driverId: id, status: 'SUCCESS' }).lean();
      const netDebtByDate = {};
      
      transactions.forEach(tx => {
        const dateStr = tx.targetDate || new Date(tx.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
        if (!netDebtByDate[dateStr]) netDebtByDate[dateStr] = 0;
        netDebtByDate[dateStr] += tx.amount;
      });

      const txsToInsert = [];
      for (const [dateStr, amount] of Object.entries(netDebtByDate)) {
        const roundedAmount = Math.round(amount);
        if (roundedAmount !== 0) {
          txsToInsert.push({
            driverId: id,
            type: roundedAmount > 0 ? 'PAYMENT' : 'PENALTY',
            amount: -roundedAmount,
            targetDate: dateStr,
            description: 'Xóa Sạch Nợ Tự Động / Thủ công Reset Mốc 0',
            createdByAdminId: adminId,
            status: 'SUCCESS'
          });
        }
      }

      if (txsToInsert.length > 0) {
        await DebtTransaction.insertMany(txsToInsert);
      }

      // Update Driver
      const updatedDriver = await Driver.findByIdAndUpdate(
        id, 
        { walletBalance: 0, walletDebt: 0 }, 
        { new: true }
      ).select('-password');

      if (req.io) {
        emitToDriver(req.io, id, 'wallet_updated', { balance: 0 });
        emitToDriver(req.io, id, 'debt_updated', { debt: 0 });
      }

      res.status(200).json({
        success: true,
        message: 'Đã đưa Công Nợ và Ví Điện Tử về MỐC 0!',
        data: updatedDriver
      });
    } catch (error) {
      console.error('Error resetBalances:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi reset ví và nợ' });
    }
  },

  // DELETE /api/drivers/:id - Xóa tài xế (Admin)
  deleteDriver: async (req, res) => {
    try {
      const { id } = req.params;

      const driver = await Driver.findByIdAndDelete(id);

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài xế'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Xóa tài xế thành công'
      });

      if (req.io) {
        emitToDriver(req.io, id, 'driver_deleted', {});
      }
    } catch (error) {
      console.error('Error deleteDriver:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa tài xế'
      });
    }
  },

  // POST /api/drivers/report-rain - Tài xế bấm nút báo mưa
  reportRain: async (req, res) => {
    try {
      const driver = await Driver.findById(req.driver._id);
      if (!driver) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tài xế' });
      }

      const Config = require('../models/Config');
      const rainCfg = await Config.findOne({ key: 'RAIN_SURCHARGE_CONFIG' });
      const isAlreadyEnabled = Boolean(rainCfg?.value?.isEnabled);
      const currentAmount = Number(rainCfg?.value?.amount) || 5000;

      const payload = {
        driverId: driver._id,
        driverName: driver.name,
        driverPhone: driver.phone,
        driverCode: driver.driverCode || 'TX',
        avatar: driver.avatar || null,
        reportedAt: new Date(),
        isAlreadyEnabled,
        suggestedAmount: currentAmount
      };

      // 1. Phát sóng realtime tới Admins
      if (req.io) {
        req.io.to('admins').emit('driver_reported_rain', payload);
      }

      // 2. Gửi Push Notification tới toàn bộ Admin
      try {
        const Admin = require('../models/Admin');
        const { sendMultipleNotifications } = require('../utils/notification');
        const admins = await Admin.find({ fcmToken: { $exists: true, $ne: null } });
        const tokens = admins.map(a => a.fcmToken).filter(Boolean);
        if (tokens.length > 0) {
          await sendMultipleNotifications(
            tokens,
            '🌧️ TÀI XẾ BÁO TRỜI MƯA!',
            `Tài xế ${driver.name} (${driver.driverCode} - ${driver.phone}) vừa báo trời đang mưa. Bấm để xác nhận!`,
            { type: 'RAIN_REPORT', driverId: String(driver._id) }
          );
        }
      } catch (pushErr) {
        console.error('Lỗi gửi push báo mưa tới admin:', pushErr.message);
      }

      res.status(200).json({
        success: true,
        message: isAlreadyEnabled
          ? 'Chế độ mưa hiện đang BẬT trên toàn hệ thống!'
          : 'Đã gửi báo mưa tới Quản trị viên thành công. Đang chờ xác nhận!',
        data: payload
      });
    } catch (error) {
      console.error('Error reportRain:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi gửi báo mưa' });
    }
  }
};

module.exports = driverController;
