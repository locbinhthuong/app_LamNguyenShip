const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { protect, admin } = require('../middleware/authMiddleware');

// Lấy cấu hình (Public hoặc có thể yêu cầu login tùy bạn, tạm để public để App bán bánh có thể gọi, hoặc protect nếu cần)
// Hiện tại cấu hình giá là admin đọc và public cho app khách
router.get('/:key', configController.getConfig);

// Cập nhật cấu hình (Chỉ Admin)
router.put('/:key', protect, admin, configController.updateConfig);

module.exports = router;
