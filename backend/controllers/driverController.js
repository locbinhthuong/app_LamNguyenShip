const bcrypt = require('bcryptjs');
const Driver = require('../models/Driver');
const DebtTransaction = require('../models/DebtTransaction');
const WalletTransaction = require('../models/WalletTransaction');
const { emitToDriver } = require('../sockets/index');

const driverController = {
  // GET /api/drivers - Lấy danh sách tài xế (Admin)
  getAllDrivers: async (req, res) => {
    try {
      const { status, isOnline, search } = req.query;

      let query = {};

      if (status) {
        query.status = status;
      }

      if (isOnline !== undefined) {
        query.isOnline = isOnline === 'true';
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { driverCode: { $regex: search, $options: 'i' } }
        ];
      }

      const drivers = await Driver.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({
        success: true,
        count: drivers.length,
        data: drivers
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

      const driver = await Driver.findById(id).select('-password').lean();

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài xế'
        });
      }

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
      const { name, phone, password, vehicleType, licensePlate, commissionRate } = req.body;

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
        commissionRate: commissionRate || 15
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
      const { name, vehicleType, licensePlate, status, avatar, commissionRate } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (vehicleType) updateData.vehicleType = vehicleType;
      if (licensePlate !== undefined) updateData.licensePlate = licensePlate;
      if (status) updateData.status = status;
      if (avatar !== undefined) updateData.avatar = avatar;
      if (commissionRate !== undefined) updateData.commissionRate = commissionRate;

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

      res.status(200).json({
        success: true,
        message: 'Cập nhật tài xế thành công',
        data: driver
      });
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
      
      const driver = await Driver.findByIdAndUpdate(
        id,
        { isOnline: false, location: null },
        { new: true }
      ).select('-password');

      if (!driver) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế' });
      }

      // Phát sự kiện Socket cho tất cả Admin cập nhật map/list
      if (req.io) {
        req.io.to('admins').emit('driver_status_change', {
          driverId: driver._id,
          isOnline: false,
          location: null
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
      const debtValue = driver.walletDebt || 0;
      if (debtValue !== 0) {
        const type = debtValue > 0 ? 'PAYMENT' : 'PENALTY';
        const dTx = new DebtTransaction({
          driverId: id,
          type: type,
          amount: -debtValue,
          description: 'Xóa Sạch Nợ Tự Động / Thủ công Reset Mốc 0',
          createdByAdminId: adminId
        });
        await dTx.save();
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
    } catch (error) {
      console.error('Error deleteDriver:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa tài xế'
      });
    }
  }
};

module.exports = driverController;
