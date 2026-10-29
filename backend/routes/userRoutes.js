const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, onlyAdmin } = require('../middleware/auth');

// Yêu cầu xác minh tài khoản (Dành cho Khách hàng & Cửa hàng)
router.post('/request-verification', verifyToken, userController.requestVerification);

// Lấy danh sách Khách Hàng / Shop (Admin)
router.get('/', verifyToken, onlyAdmin, userController.getUsers);

// Admin Phê duyệt / Từ chối xác minh tài khoản
router.put('/:id/verify', verifyToken, onlyAdmin, userController.verifyUser);

// Thêm mới Khách hàng (Admin)
router.post('/', verifyToken, onlyAdmin, userController.createUser);

// Cập nhật Khách Hàng (Admin)
router.put('/:id', verifyToken, onlyAdmin, userController.updateUser);

// Xóa Khách Hàng (Admin)
router.delete('/:id', verifyToken, onlyAdmin, userController.deleteUser);

module.exports = router;
