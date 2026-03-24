const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');
const Admin = require('../models/Admin');

const authController = {
  // ==================== DRIVER ====================

  // POST /api/auth/driver/register - Đăng ký tài xế
  registerDriver: async (req, res) => {
    try {
      const { name, phone, password, vehicleType, licensePlate } = req.body;

      // Check phone exists
      const existingDriver = await Driver.findOne({ phone });
      if (existingDriver) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại đã được đăng ký'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create driver
      const driver = new Driver({
        name,
        phone,
        password: hashedPassword,
        vehicleType: vehicleType || 'motorcycle',
        licensePlate
      });

      await driver.save();

      // Generate token
      const token = jwt.sign(
        { id: driver._id, role: 'driver', phone: driver.phone },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        success: true,
        message: 'Đăng ký tài xế thành công',
        data: {
          token,
          driver: {
            id: driver._id,
            name: driver.name,
            phone: driver.phone,
            vehicleType: driver.vehicleType,
            licensePlate: driver.licensePlate,
            status: driver.status,
            driverCode: driver.driverCode,
            stats: driver.stats
          }
        }
      });
    } catch (error) {
      console.error('Error registerDriver:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi đăng ký',
        error: error.message
      });
    }
  },

  // POST /api/auth/driver/login - Đăng nhập tài xế
  loginDriver: async (req, res) => {
    try {
      const { phone, password } = req.body;

      // Find driver
      const driver = await Driver.findOne({ phone });
      if (!driver) {
        return res.status(401).json({
          success: false,
          message: 'Số điện thoại hoặc mật khẩu không đúng'
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, driver.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Số điện thoại hoặc mật khẩu không đúng'
        });
      }

      // Check status
      if (driver.status === 'banned') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị khóa. Liên hệ admin.'
        });
      }

      // Update last active
      driver.lastActive = new Date();
      await driver.save();

      // Generate token
      const token = jwt.sign(
        { id: driver._id, role: 'driver', phone: driver.phone },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          token,
          driver: {
            id: driver._id,
            name: driver.name,
            phone: driver.phone,
            vehicleType: driver.vehicleType,
            licensePlate: driver.licensePlate,
            status: driver.status,
            driverCode: driver.driverCode,
            stats: driver.stats,
            isOnline: driver.isOnline,
            completionRate: driver.completionRate
          }
        }
      });
    } catch (error) {
      console.error('Error loginDriver:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi đăng nhập',
        error: error.message
      });
    }
  },

  // GET /api/auth/driver/me - Lấy thông tin tài xế
  getDriverProfile: async (req, res) => {
    try {
      const driver = await Driver.findById(req.driver._id).select('-password');

      res.status(200).json({
        success: true,
        data: {
          ...driver.toJSON(),
          completionRate: driver.completionRate
        }
      });
    } catch (error) {
      console.error('Error getDriverProfile:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    }
  },

  // PUT /api/auth/driver/status - Cập nhật trạng thái online/offline
  updateDriverStatus: async (req, res) => {
    try {
      const { isOnline, lat, lng } = req.body;

      const updateData = {
        isOnline: isOnline !== undefined ? isOnline : req.driver.isOnline
      };

      if (lat !== undefined && lng !== undefined) {
        updateData.currentLocation = {
          lat,
          lng,
          updatedAt: new Date()
        };
      }

      const driver = await Driver.findByIdAndUpdate(
        req.driver._id,
        updateData,
        { new: true }
      ).select('-password');

      res.status(200).json({
        success: true,
        message: isOnline ? 'Đang online' : 'Đã offline',
        data: driver
      });
    } catch (error) {
      console.error('Error updateDriverStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    }
  },

  // ==================== ADMIN ====================

  // POST /api/auth/admin/login - Đăng nhập admin
  loginAdmin: async (req, res) => {
    try {
      const { phone, password } = req.body;

      // Find admin
      const admin = await Admin.findOne({ phone });
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Số điện thoại hoặc mật khẩu không đúng'
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Số điện thoại hoặc mật khẩu không đúng'
        });
      }

      // Check status
      if (admin.status === 'inactive') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị vô hiệu hóa'
        });
      }

      // Update last login
      admin.lastLogin = new Date();
      await admin.save();

      // Generate token
      const token = jwt.sign(
        { id: admin._id, role: admin.role, phone: admin.phone },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          token,
          admin: {
            id: admin._id,
            name: admin.name,
            phone: admin.phone,
            role: admin.role,
            status: admin.status
          }
        }
      });
    } catch (error) {
      console.error('Error loginAdmin:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi đăng nhập',
        error: error.message
      });
    }
  },

  // GET /api/auth/admin/me - Lấy thông tin admin
  getAdminProfile: async (req, res) => {
    try {
      res.status(200).json({
        success: true,
        data: req.admin
      });
    } catch (error) {
      console.error('Error getAdminProfile:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    }
  }
};

module.exports = authController;
