const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const { verifyToken } = require('../middleware/auth'); // Middleware kiểm tra token đăng nhập

// Lấy danh sách món ăn của quán
router.get('/menu', verifyToken, shopController.getMyMenu);

// Thêm món mới
router.post('/menu', verifyToken, shopController.createMenuItem);

// Sửa món
router.put('/menu/:id', verifyToken, shopController.updateMenuItem);

// Xóa món
router.delete('/menu/:id', verifyToken, shopController.deleteMenuItem);

// Cập nhật profile quán (Mở cửa, ảnh bìa...)
router.put('/profile', verifyToken, shopController.updateShopProfile);

// Lấy danh sách đơn khách đặt của quán
router.get('/orders', verifyToken, shopController.getIncomingOrders);

// Chấp nhận đơn hàng
router.put('/orders/:id/accept', verifyToken, shopController.acceptAlofoodOrder);

// Từ chối đơn hàng
router.put('/orders/:id/reject', verifyToken, shopController.rejectAlofoodOrder);

module.exports = router;
