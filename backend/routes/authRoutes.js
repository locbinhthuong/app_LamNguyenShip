const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, onlyDriver, onlyAdmin, onlyCustomer } = require('../middleware/auth');

// ==================== DRIVER AUTH ====================

// POST /api/auth/driver/register
router.post('/driver/register', [
  body('name').trim().notEmpty().withMessage('Tên là bắt buộc'),
  body('phone').trim().notEmpty().withMessage('Số điện thoại là bắt buộc'),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải ít nhất 6 ký tự')
], authController.registerDriver);

// POST /api/auth/driver/login
router.post('/driver/login', [
  body('phone').trim().notEmpty().withMessage('Số điện thoại là bắt buộc'),
  body('password').notEmpty().withMessage('Mật khẩu là bắt buộc')
], authController.loginDriver);

// GET /api/auth/driver/me
router.get('/driver/me', verifyToken, onlyDriver, authController.getDriverProfile);

// PUT /api/auth/driver/me
router.put('/driver/me', verifyToken, onlyDriver, authController.updateOwnProfile);

// PUT /api/auth/driver/status
router.put('/driver/status', verifyToken, onlyDriver, authController.updateDriverStatus);

// POST /api/auth/zalo/login
router.post('/zalo/login', authController.zaloLogin);

// ==================== ADMIN AUTH ====================

// POST /api/auth/admin/login
router.post('/admin/login', [
  body('phone').trim().notEmpty().withMessage('Số điện thoại là bắt buộc'),
  body('password').notEmpty().withMessage('Mật khẩu là bắt buộc')
], authController.loginAdmin);

// GET /api/auth/admin/me
router.get('/admin/me', verifyToken, onlyAdmin, authController.getAdminProfile);

// ==================== CUSTOMER/SHOP AUTH ====================

// POST /api/auth/customer/register
router.post('/customer/register', [
  body('name').trim().notEmpty().withMessage('Tên là bắt buộc'),
  body('phone').trim().notEmpty().withMessage('Số điện thoại là bắt buộc'),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải ít nhất 6 ký tự')
], authController.registerCustomer);

// POST /api/auth/customer/login
router.post('/customer/login', [
  body('phone').trim().notEmpty().withMessage('Số điện thoại là bắt buộc'),
  body('password').notEmpty().withMessage('Mật khẩu là bắt buộc')
], authController.loginCustomer);

// GET /api/auth/customer/me
router.get('/customer/me', verifyToken, onlyCustomer, authController.getCustomerProfile);

module.exports = router;
