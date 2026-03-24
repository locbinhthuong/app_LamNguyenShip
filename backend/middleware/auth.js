const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');
const Admin = require('../models/Admin');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn hoặc không hợp lệ'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi xác thực'
    });
  }
};

// Chỉ cho phép Driver
const onlyDriver = async (req, res, next) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({
      success: false,
      message: 'Chỉ tài xế mới được thực hiện thao tác này'
    });
  }

  // Load driver data
  const driver = await Driver.findById(req.user.id);
  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Tài xế không tồn tại'
    });
  }

  if (driver.status === 'banned') {
    return res.status(403).json({
      success: false,
      message: 'Tài khoản đã bị khóa'
    });
  }

  req.driver = driver;
  next();
};

// Chỉ cho phép Admin
const onlyAdmin = async (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'staff') {
    return res.status(403).json({
      success: false,
      message: 'Chỉ admin mới được thực hiện thao tác này'
    });
  }

  // Load admin data
  const admin = await Admin.findById(req.user.id);
  if (!admin) {
    return res.status(404).json({
      success: false,
      message: 'Admin không tồn tại'
    });
  }

  if (admin.status === 'inactive') {
    return res.status(403).json({
      success: false,
      message: 'Tài khoản đã bị vô hiệu hóa'
    });
  }

  req.admin = admin;
  next();
};

// Cho phép cả Driver và Admin
const driverOrAdmin = async (req, res, next) => {
  if (req.user.role === 'driver') {
    const driver = await Driver.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Tài xế không tồn tại'
      });
    }
    if (driver.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khóa'
      });
    }
    req.driver = driver;
  } else if (['admin', 'manager', 'staff'].includes(req.user.role)) {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin không tồn tại'
      });
    }
    req.admin = admin;
  } else {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập'
    });
  }
  next();
};

module.exports = {
  verifyToken,
  onlyDriver,
  onlyAdmin,
  driverOrAdmin
};
