const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, onlyAdmin } = require('../middleware/auth');

// Lấy danh sách Khách Hàng (Admin)
router.get('/', verifyToken, onlyAdmin, userController.getUsers);

// Thêm mới Khách hàng (Admin)
router.post('/', verifyToken, onlyAdmin, userController.createUser);

// Cập nhật Khách Hàng (Admin)
router.put('/:id', verifyToken, onlyAdmin, userController.updateUser);

// Xóa Khách Hàng (Admin)
router.delete('/:id', verifyToken, onlyAdmin, userController.deleteUser);

module.exports = router;
