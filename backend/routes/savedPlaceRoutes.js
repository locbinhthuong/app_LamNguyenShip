const express = require('express');
const router = express.Router();
const savedPlaceController = require('../controllers/savedPlaceController');
const { verifyToken, anyAuthenticatedUser, onlyAdmin } = require('../middleware/auth');

// Tìm kiếm điểm lấy (dành cho Admin / Staff / Customer / Merchant tạo đơn)
router.get('/search', verifyToken, anyAuthenticatedUser, savedPlaceController.searchSavedPlaces);

// Lấy toàn bộ danh sách điểm lấy
router.get('/', verifyToken, anyAuthenticatedUser, savedPlaceController.getAllSavedPlaces);

// Lưu hoặc cập nhật điểm lấy
router.post('/', verifyToken, anyAuthenticatedUser, savedPlaceController.upsertSavedPlace);

// Xóa điểm lấy (Admin)
router.delete('/:id', verifyToken, onlyAdmin, savedPlaceController.deleteSavedPlace);

module.exports = router;
