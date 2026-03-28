const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const Driver = require('../models/Driver');
const Admin = require('../models/Admin');
const User = require('../models/User'); // Thêm model User
const { emitDriverStatusChange } = require('../sockets/index');

// Helper: Lấy thông tin user từ Zalo OAuth code
const exchangeZaloCode = async (code) => {
  try {
    const ZALO_APP_ID = process.env.ZALO_APP_ID;
    const ZALO_APP_SECRET = process.env.ZALO_APP_SECRET;

    if (!ZALO_APP_ID || !ZALO_APP_SECRET) {
      throw new Error('Thiếu cấu hình ZALO_APP_ID hoặc ZALO_APP_SECRET');
    }

    // Exchange code lấy access token
    const tokenRes = await axios.post(
      'https://oauth.zaloapp.com/v4/oauth/token',
      new URLSearchParams({
        app_id: ZALO_APP_ID,
        app_secret: ZALO_APP_SECRET,
        code,
        grant_type: 'authorization_code'
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token } = tokenRes.data;

    if (!access_token) {
      throw new Error('Không lấy được access_token từ Zalo');
    }

    // Lấy thông tin user từ access token
    const userRes = await axios.get('https://graph.zalo.me/v2/me', {
      params: { access_token, fields: 'id,name,picture' }
    });

    return {
      zaloId: String(userRes.data.id),
      name: userRes.data.name,
      avatar: userRes.data.picture?.data?.url || null
    };
  } catch (error) {
    console.error('Zalo exchange error:', error.response?.data || error.message);
    throw new Error('Không lấy được thông tin từ Zalo');
  }
};

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

      driver.sessionToken = token;
      await driver.save();

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

      // Generate token
      const token = jwt.sign(
        { id: driver._id, role: 'driver', phone: driver.phone },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      // Bắn tia kích văng người dùng CŨ trước khi cấp vé cho người sửa MỚI
      if (req.io) {
        req.io.to(`driver_${driver._id}`).emit('force_logout', { 
          message: 'Tài khoản của bạn đã được đăng nhập ở thiết bị khác!' 
        });
      }

      // Update sessionToken & last active
      driver.sessionToken = token;
      driver.lastActive = new Date();
      await driver.save();

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
            completionRate: driver.completionRate,
            avatar: driver.avatar
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

  // PUT /api/auth/driver/me - Cập nhật thông tin tài xế
  updateOwnProfile: async (req, res) => {
    try {
      const { name, vehicleType, licensePlate, avatar } = req.body;
      const updateData = {};
      if (name) updateData.name = name;
      if (vehicleType) updateData.vehicleType = vehicleType;
      if (licensePlate !== undefined) updateData.licensePlate = licensePlate;
      if (avatar !== undefined) updateData.avatar = avatar;

      const driver = await Driver.findByIdAndUpdate(
        req.driver._id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin thành công',
        data: {
          ...driver.toJSON(),
          completionRate: driver.completionRate
        }
      });
    } catch (error) {
      console.error('Error updateOwnProfile:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật thông tin'
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

      if (req.io) {
        emitDriverStatusChange(req.io, {
          driverId: driver._id,
          isOnline: driver.isOnline,
          lat: driver.currentLocation?.lat,
          lng: driver.currentLocation?.lng,
          updatedAt: driver.currentLocation?.updatedAt || new Date()
        });
      }

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

  // ==================== ZALO LOGIN ====================

  // POST /api/auth/zalo/login - Đăng nhập / đăng ký bằng Zalo
  zaloLogin: async (req, res) => {
    try {
      const { authCode } = req.body;

      if (!authCode) {
        return res.status(400).json({
          success: false,
          message: 'Mã xác thực Zalo là bắt buộc'
        });
      }

      // Lấy thông tin user từ Zalo
      const zaloUser = await exchangeZaloCode(authCode);
      const { zaloId, name, avatar } = zaloUser;

      // Tìm driver theo zaloId
      let driver = await Driver.findOne({ zaloId });
      let isNewUser = false;

      if (!driver) {
        // Tạo tài khoản mới nếu chưa có
        isNewUser = true;
        driver = new Driver({
          name: name || 'Tài Xế Zalo',
          phone: zaloId, // tạm dùng zaloId làm phone
          password: await bcrypt.hash(zaloId, 10), // mật khẩu ngẫu nhiên
          zaloId,
          avatar: avatar || null,
          status: 'active'
        });
        await driver.save();
      }

      // Cập nhật lastActive
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
        message: isNewUser ? 'Đăng ký tài xế thành công' : 'Đăng nhập thành công',
        data: {
          token,
          driver: {
            id: driver._id,
            name: driver.name,
            phone: driver.phone,
            avatar: driver.avatar,
            vehicleType: driver.vehicleType,
            licensePlate: driver.licensePlate,
            status: driver.status,
            driverCode: driver.driverCode,
            stats: driver.stats,
            isOnline: driver.isOnline,
            completionRate: driver.completionRate,
            isNewUser
          }
        }
      });
    } catch (error) {
      console.error('Error zaloLogin:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi đăng nhập Zalo',
        error: error.message
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
  },

  // ==================== CUSTOMER / SHOP ====================

  // POST /api/auth/customer/register
  registerCustomer: async (req, res) => {
    try {
      const { name, phone, password, role, shopName, shopAddress } = req.body;

      // Check phone exists
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại đã được đăng ký'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const userRole = (role === 'SHOP') ? 'SHOP' : 'CUSTOMER';

      // Create user
      const user = new User({
        name,
        phone,
        password: hashedPassword,
        role: userRole,
        shopName: userRole === 'SHOP' ? shopName : null,
        shopAddress: userRole === 'SHOP' ? shopAddress : null
      });

      await user.save();

      // Generate token
      const token = jwt.sign(
        { id: user._id, role: user.role, phone: user.phone },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        success: true,
        message: 'Đăng ký thành công',
        data: {
          token,
          user: {
            id: user._id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            shopName: user.shopName,
            shopAddress: user.shopAddress
          }
        }
      });
    } catch (error) {
      console.error('Error registerCustomer:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi đăng ký',
        error: error.message
      });
    }
  },

  // POST /api/auth/customer/login
  loginCustomer: async (req, res) => {
    try {
      const { phone, password } = req.body;

      // Find user
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Số điện thoại hoặc mật khẩu không đúng'
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Số điện thoại hoặc mật khẩu không đúng'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị vô hiệu hóa'
        });
      }

      // Generate token
      const token = jwt.sign(
        { id: user._id, role: user.role, phone: user.phone },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          token,
          user: {
            id: user._id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            shopName: user.shopName,
            shopAddress: user.shopAddress
          }
        }
      });
    } catch (error) {
      console.error('Error loginCustomer:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi đăng nhập',
        error: error.message
      });
    }
  },

  // GET /api/auth/customer/me
  getCustomerProfile: async (req, res) => {
    try {
      res.status(200).json({
        success: true,
        data: req.customer
      });
    } catch (error) {
      console.error('Error getCustomerProfile:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    }
  }
};

module.exports = authController;
