const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, onlyDriver, onlyAdmin, driverOrAdmin, onlyCustomer, anyAuthenticatedUser } = require('../middleware/auth');

// ==================== PUBLIC (Driver - Đăng nhập rồi) ====================

// GET /api/orders/available - Đơn có sẵn cho driver nhận
router.get('/available', verifyToken, onlyDriver, orderController.getAvailableOrders);

// GET /api/orders/my - Đơn của tài xế
router.get('/my', verifyToken, onlyDriver, orderController.getMyOrders);

// POST /api/orders/:id/accept - Nhận đơn
router.post('/:id/accept', verifyToken, onlyDriver, orderController.acceptOrder);

// POST /api/orders/:id/pickup - Đã lấy hàng
router.post('/:id/pickup', verifyToken, onlyDriver, orderController.pickedUpOrder);

// POST /api/orders/:id/deliver - Đang giao
router.post('/:id/deliver', verifyToken, onlyDriver, orderController.deliveringOrder);

// POST /api/orders/:id/complete - Hoàn thành
router.post('/:id/complete', verifyToken, onlyDriver, orderController.completeOrder);

// ==================== ADMIN ====================

// GET /api/orders - Danh sách đơn hàng (Admin)
router.get('/', verifyToken, onlyAdmin, orderController.getAllOrders);

// GET /api/orders/stats/dashboard - Dashboard stats (Admin)
router.get('/stats/dashboard', verifyToken, onlyAdmin, orderController.getDashboardStats);

// POST /api/orders - Tạo đơn hàng mới (Admin)
router.post('/', verifyToken, onlyAdmin, [
  body('customerName').trim().notEmpty().withMessage('Tên khách hàng là bắt buộc'),
  body('customerPhone').trim().notEmpty().withMessage('Số điện thoại là bắt buộc'),
  body('pickupAddress').trim().notEmpty().withMessage('Địa chỉ lấy hàng là bắt buộc')
], orderController.createOrder);

// PUT /api/orders/:id - Sửa thông tin đơn hàng / Thu hồi đơn (Admin)
router.put('/:id', verifyToken, onlyAdmin, orderController.updateOrder);

// POST /api/orders/:id/cancel - Hủy đơn
router.post('/:id/cancel', verifyToken, anyAuthenticatedUser, orderController.cancelOrder);

// DELETE /api/orders/:id - Xóa đơn hàng (Admin)
router.delete('/:id', verifyToken, onlyAdmin, orderController.deleteOrder);

// ==================== COMMON ====================

// GET /api/orders/:id - Chi tiết đơn hàng (Admin, Driver, Customer, Shop)
router.get('/:id', verifyToken, anyAuthenticatedUser, orderController.getOrderById);

// ==================== CUSTOMER / SHOP ====================

// POST /api/orders/customer - Tạo đơn hàng (Customer/Shop)
router.post('/customer', verifyToken, onlyCustomer, orderController.createCustomerOrder);

// GET /api/orders/customer/my - Lấy đơn hàng của chính mình (Customer/Shop)
router.get('/customer/my', verifyToken, onlyCustomer, orderController.getCustomerOrders);

module.exports = router;
