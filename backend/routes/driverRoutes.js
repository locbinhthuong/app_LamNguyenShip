const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { verifyToken, onlyAdmin } = require('../middleware/auth');

// Tất cả routes đều cần admin
router.use(verifyToken, onlyAdmin);

// GET /api/drivers - Danh sách tài xế
router.get('/', driverController.getAllDrivers);

// GET /api/drivers/:id - Chi tiết tài xế
router.get('/:id', driverController.getDriverById);

// POST /api/drivers - Tạo tài xế mới
router.post('/', [
  body('name').trim().notEmpty().withMessage('Tên là bắt buộc'),
  body('phone').trim().notEmpty().withMessage('Số điện thoại là bắt buộc'),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải ít nhất 6 ký tự')
], driverController.createDriver);

// PUT /api/drivers/:id - Cập nhật tài xế
router.put('/:id', driverController.updateDriver);

// PUT /api/drivers/:id/reset-password - Reset mật khẩu
router.put('/:id/reset-password', driverController.resetPassword);

// PUT /api/drivers/:id/force-offline - Tắt định vị tài xế
router.put('/:id/force-offline', driverController.forceOffline);

// DELETE /api/drivers/:id - Xóa tài xế
router.delete('/:id', driverController.deleteDriver);

module.exports = router;
