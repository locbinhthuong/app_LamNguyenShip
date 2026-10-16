const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const Driver = require('../models/Driver');
const Admin = require('../models/Admin');
const User = require('../models/User'); // Thêm model User
const { emitDriverStatusChange } = require('../sockets/index');
const { startDriverOnlineSession, endDriverOnlineSession } = require('../utils/onlineSessionHelper');

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
          message: 'Sai tài khoản hoặc mật khẩu'
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, driver.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Sai tài khoản hoặc mật khẩu'
        });
      }

      if (driver.status === 'banned') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị xóa. Liên hệ admin.'
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
      if (req.headers['x-app-version']) driver.appVersion = req.headers['x-app-version'];
      if (req.headers['x-device-platform']) driver.devicePlatform = req.headers['x-device-platform'];
      await driver.save();

      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          token,
          driver: {
            _id: driver._id,
            id: driver._id,
            name: driver.name,
            phone: driver.phone,
            vehicleType: driver.vehicleType,
            licensePlate: driver.licensePlate,
            status: driver.status,
            driverCode: driver.driverCode,
            stats: driver.stats,
            isOnline: driver.isOnline,
            isPriority5s: driver.isPriority5s,
            commissionRate: driver.commissionRate,
            completionRate: driver.completionRate,
            avatar: driver.avatar,
            cccd: driver.cccd,
            gplx: driver.gplx,
            idleSince: driver.idleSince,
            idleWarningLevel: driver.idleWarningLevel || 0,
            idleWarningSentAt: driver.idleWarningSentAt,
            idleConfirmedAt: driver.idleConfirmedAt,
            idleLockedUntil: driver.idleLockedUntil
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
      const { IDLE_MONITOR_ENABLED } = require('../utils/idleDriverMonitor');

      if (driver && !IDLE_MONITOR_ENABLED && (driver.idleWarningLevel > 0 || driver.idleLockedUntil)) {
        driver.idleWarningLevel = 0;
        driver.idleWarningSentAt = null;
        driver.idleConfirmedAt = null;
        driver.idleLockedUntil = null;
        driver.idleOfflineAt = null;
        driver.idleAccumulatedMs = 0;
        await driver.save();
      } else if (driver && driver.idleLockedUntil && new Date(driver.idleLockedUntil) <= new Date()) {
        // Tự động gỡ khóa nếu đã hết thời gian phạt
        driver.idleLockedUntil = null;
        if ((driver.idleWarningLevel || 0) >= 3) {
          driver.idleWarningLevel = 0;
          driver.idleWarningSentAt = null;
          driver.idleConfirmedAt = null;
          driver.idleSince = null;
        }
        await driver.save();
      }

      // Đồng bộ điểm tuần và cấp bậc của tài xế từ đơn hàng thực tế
      let tierInfo = null;
      let weekTimeRemainingMs = 0;
      if (driver) {
        const { syncDriverWeeklyStats, getWeekTimeRemainingVN } = require('../utils/weekHelper');
        tierInfo = await syncDriverWeeklyStats(driver);
        await driver.save();
        weekTimeRemainingMs = getWeekTimeRemainingVN();
      }

      res.status(200).json({
        success: true,
        data: {
          ...driver.toJSON(),
          completionRate: driver.completionRate,
          tierInfo,
          weekTimeRemainingMs
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
      const { name, vehicleType, licensePlate, avatar, cccd, gplx, password } = req.body;
      const updateData = {};
      if (name) updateData.name = name;
      if (vehicleType) updateData.vehicleType = vehicleType;
      if (licensePlate !== undefined) updateData.licensePlate = licensePlate;
      if (avatar !== undefined) updateData.avatar = avatar;
      if (cccd !== undefined) updateData.cccd = cccd;
      if (gplx !== undefined) updateData.gplx = gplx;

      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const driver = await Driver.findByIdAndUpdate(
        req.driver._id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      // Báo mộng cho Admin biết Tài xế vừa đổi Tên/Biển Số/Avatar để Update tức thời
      if (req.io) {
        const { emitDriverStatusChange } = require('../sockets/index');
        emitDriverStatusChange(req.io, driver);
      }

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

  // PUT /api/auth/driver/location - Cập nhật vị trí tài xế qua API
  updateDriverLocation: async (req, res) => {
    try {
      const { lat, lng } = req.body;
      const driverId = req.driver._id;

      const updateData = {
        currentLocation: { lat, lng, updatedAt: new Date() }
      };
      if (req.headers['x-app-version']) updateData.appVersion = req.headers['x-app-version'];
      if (req.headers['x-device-platform']) updateData.devicePlatform = req.headers['x-device-platform'];

      const driver = await Driver.findByIdAndUpdate(driverId, updateData, { new: true });
      
      if (req.io && driver) {
        req.io.to('admins').emit('driver_location_update', {
          driverId: driverId,
          name: driver.name,
          lat,
          lng,
          timestamp: Date.now()
        });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error updateDriverLocation API:', error);
      res.status(500).json({ success: false });
    }
  },

  // DELETE /api/auth/driver/me - Yêu cầu xóa tài khoản tài xế
  deleteDriverAccount: async (req, res) => {
    try {
      // Vì tránh lỗi khóa ngoại và giữ lại lịch sử đơn hàng, ta chỉ đổi trạng thái thành banned hoặc xoá thông tin cá nhân
      const newName = req.driver.name.endsWith(' (Đã xoá)') ? req.driver.name : req.driver.name + ' (Đã xoá)';
      const driver = await Driver.findByIdAndUpdate(
        req.driver._id,
        { 
          status: 'banned', 
          isOnline: false,
          sessionToken: null,
          fcmToken: '',
          name: newName
        },
        { new: true }
      );

      if (req.io) {
        req.io.to(`driver_${driver._id}`).emit('force_logout', { 
          message: 'Tài khoản của bạn đã được xoá.' 
        });
      }

      res.status(200).json({
        success: true,
        message: 'Tài khoản đã được xoá thành công.'
      });
    } catch (error) {
      console.error('Error deleteDriverAccount:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi yêu cầu xoá tài khoản'
      });
    }
  },

  // PUT /api/auth/driver/status - Cập nhật trạng thái online/offline
  updateDriverStatus: async (req, res) => {
    try {
      const { isOnline, lat, lng } = req.body;
      const now = new Date();

      if (isOnline && req.driver.status === 'pending') {
        return res.status(403).json({
          success: false,
          message: 'Liên hệ admin để được duyệt trở thành tài xế chính thức của AloShipp'
        });
      }

      if (isOnline && req.driver.status === 'banned') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị khóa'
        });
      }

      const { ONE_HOUR_MS, FORTY_FIVE_MINS_MS, IDLE_MONITOR_ENABLED } = require('../utils/idleDriverMonitor');

      // Kiểm tra nếu tài xế đang bị tạm khóa do treo app (Lần 2: 15p hoặc Lần 3: 12h)
      if (IDLE_MONITOR_ENABLED && isOnline && req.driver.idleLockedUntil && new Date(req.driver.idleLockedUntil) > now) {
        const remainingMs = new Date(req.driver.idleLockedUntil).getTime() - now.getTime();
        const remainingMins = Math.ceil(remainingMs / 60000);
        const level = req.driver.idleWarningLevel || 2;
        const lockTimeText = level >= 3
          ? `${Math.floor(remainingMins / 60)} giờ ${remainingMins % 60} phút`
          : `${remainingMins} phút`;

        return res.status(403).json({
          success: false,
          code: 'IDLE_LOCKED',
          idleWarningLevel: level,
          idleLockedUntil: req.driver.idleLockedUntil,
          message: level >= 3
            ? `Tài khoản đang bị tạm khóa 12 tiếng do treo app không nhận đơn (Cảnh báo lần 3). Vui lòng quay lại sau ${lockTimeText}!`
            : `Tài khoản đang bị tạm khóa 15 phút do treo app không nhận đơn (Cảnh báo lần 2). Vui lòng quay lại sau ${lockTimeText}!`
        });
      }

      const wasOnline = !!req.driver.isOnline;
      const targetOnline = isOnline !== undefined ? Boolean(isOnline) : wasOnline;

      const updateData = {
        isOnline: targetOnline
      };

      if (!wasOnline && targetOnline) {
        // Tài xế bật Online -> Bắt đầu phiên mới
        const session = await startDriverOnlineSession(req.driver._id, now);
        if (session) {
          updateData.currentOnlineSessionId = session._id;
          updateData.lastOnlineAt = now;
        }
      } else if (targetOnline && !req.driver.currentOnlineSessionId) {
        // Đang Online nhưng chưa có session -> Tự động mở phiên
        const session = await startDriverOnlineSession(req.driver._id, now);
        if (session) {
          updateData.currentOnlineSessionId = session._id;
          updateData.lastOnlineAt = now;
        }
      } else if (wasOnline && !targetOnline) {
        // Tài xế tắt Online -> Đóng phiên
        await endDriverOnlineSession(req.driver._id, now, 'MANUAL');
        updateData.currentOnlineSessionId = null;
      }

      if (!IDLE_MONITOR_ENABLED) {
        updateData.idleWarningLevel = 0;
        updateData.idleWarningSentAt = null;
        updateData.idleConfirmedAt = null;
        updateData.idleLockedUntil = null;
        updateData.idleOfflineAt = null;
        updateData.idleAccumulatedMs = 0;
        updateData.idleSince = isOnline ? now : null;
        if (isOnline) updateData.lastActive = now;
        if (isOnline === false) updateData.currentLocation = null;
      } else if (isOnline) {
        updateData.lastActive = now;
        updateData.idleOfflineAt = null;

        let effectiveLevel = req.driver.idleWarningLevel || 0;

        // Nếu thời gian khóa đã hết hạn
        if (req.driver.idleLockedUntil && new Date(req.driver.idleLockedUntil) <= now) {
          updateData.idleLockedUntil = null;
          if (effectiveLevel >= 3) {
            effectiveLevel = 0;
            updateData.idleWarningLevel = 0;
            updateData.idleWarningSentAt = null;
            updateData.idleConfirmedAt = null;
            updateData.idleAccumulatedMs = 0;
          }
          // Lưu ý: Nếu idleWarningLevel === 2 (vừa hết khóa 15p), giữ nguyên mức 2 để đếm 45p tiếp theo cho Cảnh báo lần 3
        }

        // Kiểm tra thời gian tài xế đã Offline trước khi bật Online lại
        const offlineDurationMs = req.driver.idleOfflineAt
          ? now.getTime() - new Date(req.driver.idleOfflineAt).getTime()
          : Infinity;

        // - Trước Cảnh báo lần 1 (Mức 0): Phải Offline trên 1 tiếng (ONE_HOUR_MS) mới được tính lại từ đầu 2 tiếng
        // - Đang ở Cảnh báo lần 1 (Mức 1): Phải Offline đủ 45 phút (FORTY_FIVE_MINS_MS) mới được reset về ban đầu
        const requiredOfflineResetMs = effectiveLevel === 0 ? ONE_HOUR_MS : FORTY_FIVE_MINS_MS;

        if (effectiveLevel <= 1 && offlineDurationMs >= requiredOfflineResetMs) {
          updateData.idleWarningLevel = 0;
          updateData.idleWarningSentAt = null;
          updateData.idleConfirmedAt = null;
          updateData.idleAccumulatedMs = 0;
          updateData.idleSince = now;
        } else {
          // Chưa Offline đủ thời gian quy định (Mức 0 < 1 tiếng, Mức 1 < 45 phút, hoặc đang ở Mức 2 chờ lên Mức 3)
          // -> Giữ nguyên mức cảnh báo và nối tiếp thời gian treo đã tích lũy trước đó
          const accruedMs = req.driver.idleAccumulatedMs || 0;
          const resumedRefTime = new Date(now.getTime() - accruedMs);
          updateData.idleSince = resumedRefTime;
          if (effectiveLevel === 1) {
            updateData.idleWarningLevel = 1;
            updateData.idleConfirmedAt = resumedRefTime;
          }
        }
      } else if (isOnline === false) {
        updateData.currentLocation = null;
        updateData.idleSince = null;
        updateData.idleOfflineAt = now;

        const currentLevel = req.driver.idleWarningLevel || 0;
        if (currentLevel === 1) {
          // Khi đang ở Cảnh báo lần 1 mà bấm Offline: KHÔNG xóa cảnh báo ngay (phải đợi Offline đủ 45p mới xóa)
          if (!req.driver.idleConfirmedAt) {
            // Vừa bấm nút Offline trên bảng Cảnh báo lần 1
            updateData.idleConfirmedAt = now;
            updateData.idleAccumulatedMs = 0;
          } else {
            // Đã xác nhận trước đó rồi mới bấm Offline -> lưu lại số phút đã treo ở mức 1
            const elapsed = Math.max(0, now.getTime() - new Date(req.driver.idleConfirmedAt).getTime());
            updateData.idleAccumulatedMs = elapsed;
          }
        } else if (req.driver.idleSince) {
          const elapsed = Math.max(0, now.getTime() - new Date(req.driver.idleSince).getTime());
          updateData.idleAccumulatedMs = elapsed;
        }
      }

      if (lat !== undefined && lng !== undefined && isOnline !== false) {
        updateData.currentLocation = {
          lat,
          lng,
          updatedAt: now
        };
      }
      
      if (req.headers['x-app-version']) updateData.appVersion = req.headers['x-app-version'];
      if (req.headers['x-device-platform']) updateData.devicePlatform = req.headers['x-device-platform'];

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
          updatedAt: driver.currentLocation?.updatedAt || now
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

  // POST /api/auth/driver/confirm-active - Tài xế xác nhận còn đang hoạt động (khi nhận Cảnh báo lần 1)
  confirmDriverActive: async (req, res) => {
    try {
      const now = new Date();
      const driver = await Driver.findByIdAndUpdate(
        req.driver._id,
        {
          idleConfirmedAt: now,
          idleOfflineAt: null,
          idleAccumulatedMs: 0,
          lastActive: now
        },
        { new: true }
      ).select('-password');

      res.status(200).json({
        success: true,
        message: 'Đã xác nhận bạn vẫn đang hoạt động!',
        data: driver
      });
    } catch (error) {
      console.error('Error confirmDriverActive:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xác nhận hoạt động'
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
            _id: driver._id,
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
            isPriority5s: driver.isPriority5s,
            commissionRate: driver.commissionRate,
            completionRate: driver.completionRate,
            idleSince: driver.idleSince,
            idleWarningLevel: driver.idleWarningLevel || 0,
            idleWarningSentAt: driver.idleWarningSentAt,
            idleConfirmedAt: driver.idleConfirmedAt,
            idleLockedUntil: driver.idleLockedUntil,
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
          message: 'Sai tài khoản hoặc mật khẩu'
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Sai tài khoản hoặc mật khẩu'
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
        { 
          id: admin._id, 
          role: admin.role, 
          phone: admin.phone,
          tokenVersion: admin.tokenVersion || 0
        },
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

  // POST /api/auth/admin/reset-sessions - Đăng xuất mọi thiết bị
  resetAdminSessions: async (req, res) => {
    try {
      const admin = req.admin;
      admin.tokenVersion = (admin.tokenVersion || 0) + 1;
      await admin.save();
      
      res.status(200).json({
        success: true,
        message: 'Đã vô hiệu hóa toàn bộ các phiên đăng nhập khác'
      });
    } catch (error) {
      console.error('Error resetAdminSessions:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi reset phiên đăng nhập'
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

  // PUT /api/auth/admin/me - Cập nhật thông tin admin
  updateAdminProfile: async (req, res) => {
    try {
      const { name, phone, password, oldPassword } = req.body;
      const updateData = {};
      
      if (name) updateData.name = name;
      
      if (phone && phone !== req.admin.phone) {
         const existingAdmin = await Admin.findOne({ phone, _id: { $ne: req.admin._id } });
         if (existingAdmin) {
           return res.status(400).json({ success: false, message: 'Số điện thoại đã được đăng ký bởi tài khoản khác' });
         }
         updateData.phone = phone;
      }

      if (password) {
         if (!oldPassword) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu cũ để thay đổi mật khẩu' });
         }
         const adminObj = await Admin.findById(req.admin._id);
         const isMatch = await bcrypt.compare(oldPassword, adminObj.password);
         if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Mật khẩu cũ không chính xác' });
         }
         updateData.password = await bcrypt.hash(password, 10);
      }

      const admin = await Admin.findByIdAndUpdate(
        req.admin._id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin thành công',
        data: admin
      });
    } catch (error) {
       console.error('Error updateAdminProfile:', error);
       res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật thông tin' });
    }
  },

  // ==================== CUSTOMER / SHOP ====================

  // POST /api/auth/customer/register
  registerCustomer: async (req, res) => {
    try {
      const { name, phone, password, role, shopName, shopAddress, defaultLocation, region } = req.body;

      const userRole = (role === 'SHOP') ? 'SHOP' : 'CUSTOMER';

      // Check phone exists
      let user = await User.findOne({ phone });
      
      if (user) {
        if (userRole === 'CUSTOMER') {
          return res.status(400).json({
            success: false,
            message: 'Số điện thoại đã được đăng ký. Bạn có thể dùng chung tài khoản để đăng nhập cả 2 ứng dụng.'
          });
        }
        if (userRole === 'SHOP' && user.role === 'SHOP') {
          return res.status(400).json({
            success: false,
            message: 'Số điện thoại này đã là tài khoản cửa hàng. Vui lòng đăng nhập.'
          });
        }
        if (userRole === 'SHOP' && user.role === 'CUSTOMER') {
          // Check password matches to allow upgrading
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return res.status(400).json({
              success: false,
              message: 'Số điện thoại này đã là tài khoản khách hàng. Vui lòng nhập đúng mật khẩu cũ để nâng cấp thành cửa hàng.'
            });
          }
          // Upgrade to SHOP
          user.role = 'SHOP';
          user.shopName = shopName;
          user.shopAddress = shopAddress;
          user.defaultLocation = defaultLocation;
          if (region) user.region = region;
          await user.save();
        }
      } else {
        // Create new user
        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({
          name,
          phone,
          password: hashedPassword,
          role: userRole,
          region: region || null,
          shopName: userRole === 'SHOP' ? shopName : null,
          shopAddress: userRole === 'SHOP' ? shopAddress : null,
          defaultLocation: userRole === 'SHOP' ? defaultLocation : undefined
        });
        await user.save();
      }

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
            shopAddress: user.shopAddress,
            defaultLocation: user.defaultLocation,
            avatar: user.avatar
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
          message: 'Sai tài khoản hoặc mật khẩu'
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Sai tài khoản hoặc mật khẩu'
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
            shopAddress: user.shopAddress,
            defaultLocation: user.defaultLocation,
            avatar: user.avatar
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
  },

  // PUT /api/auth/customer/me
  updateOwnCustomerProfile: async (req, res) => {
    try {
      const { name, phone, password, avatar, shopAddress, defaultLocation, shopName, coverImage } = req.body;
      const updateData = {};
      if (name) updateData.name = name;
      if (avatar !== undefined) updateData.avatar = avatar;
      if (coverImage !== undefined) updateData.coverImage = coverImage;
      if (shopAddress !== undefined) updateData.shopAddress = shopAddress;
      if (defaultLocation !== undefined) updateData.defaultLocation = defaultLocation;
      if (shopName !== undefined) updateData.shopName = shopName;

      if (phone && phone !== req.customer.phone) {
         // Check if phone already exists
         const existingUser = await User.findOne({ phone, _id: { $ne: req.customer._id } });
         if (existingUser) {
           return res.status(400).json({ success: false, message: 'Số điện thoại đã được đăng ký bởi tài khoản khác' });
         }
         updateData.phone = phone;
      }

      if (password) {
         updateData.password = await bcrypt.hash(password, 10);
      }

      const user = await User.findByIdAndUpdate(
        req.customer._id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin thành công',
        data: user
      });
    } catch (error) {
       console.error('Error updateOwnCustomerProfile:', error);
       res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật thông tin' });
    }
  },

  // DELETE /api/auth/customer/me
  deleteCustomerAccount: async (req, res) => {
    try {
      const newName = req.customer.name.endsWith(' (Đã xoá)') ? req.customer.name : req.customer.name + ' (Đã xoá)';
      await User.findByIdAndUpdate(req.customer._id, {
        isActive: false,
        name: newName,
        fcmToken: ''
      });

      res.status(200).json({
        success: true,
        message: 'Tài khoản đã được xoá thành công.'
      });
    } catch (error) {
      console.error('Error deleteCustomerAccount:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi yêu cầu xoá tài khoản'
      });
    }
  },

  // POST /api/auth/fcm-token
  updateFcmToken: async (req, res) => {
    try {
      const { token } = req.body;
      const { role, id } = req.user;

      if (!token) {
        return res.status(400).json({ success: false, message: 'Thiếu FCM Token' });
      }

      let userModel;
      if (role === 'driver') userModel = Driver;
      else if (role === 'admin') userModel = Admin;
      else userModel = User;

      // Xoá token này khỏi tất cả người dùng khác để tránh gửi nhầm thông báo khi 1 thiết bị đăng nhập nhiều tài khoản
      await Driver.updateMany({ fcmToken: token, _id: { $ne: role === 'driver' ? id : null } }, { fcmToken: '' });
      await Admin.updateMany({ fcmToken: token, _id: { $ne: role === 'admin' ? id : null } }, { fcmToken: '' });
      await User.updateMany({ fcmToken: token, _id: { $ne: role.toUpperCase() === 'CUSTOMER' || role.toUpperCase() === 'SHOP' ? id : null } }, { fcmToken: '' });

      await userModel.findByIdAndUpdate(id, { fcmToken: token });
      console.log(`[FCM-DEBUG] Token PUSH lưu thành công cho ${role} ${id}. Độ dài Token: ${token?.length}`);

      res.json({ success: true, message: 'Cập nhật FCM Token thành công' });
    } catch (error) {
      console.error('Lỗi cập nhật FCM:', error);
      res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật FCM' });
    }
  }
};

module.exports = authController;
