const express = require('express');
const router = express.Router();
const revenueController = require('../controllers/revenueController');
const { verifyToken, onlyAdmin, onlyDriver } = require('../middleware/auth');

// Chỉ có Quản trị viên (Admin) mới được phép xem doanh thu hệ thống
router.get('/stats', verifyToken, onlyAdmin, revenueController.getRevenueStats);

// Tài xế tự xem doanh thu cá nhân
router.get('/driver/me', verifyToken, onlyDriver, revenueController.getDriverOwnStats);

// Admin xem doanh thu của MỘT tài xế cụ thể
router.get('/driver-stats/:id', verifyToken, onlyAdmin, revenueController.getDriverStatsAdmin);

module.exports = router;
