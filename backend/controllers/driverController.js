const bcrypt = require('bcryptjs');
const Driver = require('../models/Driver');

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
      const { name, phone, password, vehicleType, licensePlate } = req.body;

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
        licensePlate
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
      const { name, vehicleType, licensePlate, status } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (vehicleType) updateData.vehicleType = vehicleType;
      if (licensePlate !== undefined) updateData.licensePlate = licensePlate;
      if (status) updateData.status = status;

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
