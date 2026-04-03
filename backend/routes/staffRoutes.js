const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { verifyToken, onlyAdmin } = require('../middleware/auth');

// GET /api/staffs - Admin lấy danh sách tổng đài viên
router.get('/', verifyToken, onlyAdmin, staffController.getAllStaff);

// POST /api/staffs - Admin tạo mới tổng đài viên
router.post('/', verifyToken, onlyAdmin, [
  body('name').trim().notEmpty().withMessage('Tên là bắt buộc'),
  body('phone').trim().notEmpty().withMessage('Số điện thoại là bắt buộc'),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu ít nhất 6 ký tự'),
  body('role').isIn(['staff', 'manager', 'admin']).withMessage('Vai trò không hợp lệ')
], staffController.createStaff);

// PUT /api/staffs/:id - Admin sửa thông tin / cập nhật pass
router.put('/:id', verifyToken, onlyAdmin, [
  body('name').optional().trim(),
  body('phone').optional().trim()
], staffController.updateStaff);

// DELETE /api/staffs/:id - Admin xoá nhân viên
router.delete('/:id', verifyToken, onlyAdmin, staffController.deleteStaff);

module.exports = router;
