const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { verifyToken, onlyDriver, onlyAdmin } = require('../middleware/auth');

// Tài xế lấy lịch của mình
router.get('/my', verifyToken, onlyDriver, scheduleController.getMyWeeklySchedule);

// Tài xế đăng ký ca tuần mới (Chủ Nhật hoặc bổ sung khi quên)
router.post('/register', verifyToken, onlyDriver, scheduleController.registerWeeklySchedule);

// Tài xế đổi ca trước ít nhất 1 ngày
router.post('/change-shift', verifyToken, onlyDriver, scheduleController.changeShiftBeforehand);

// Admin xem bảng ma trận lịch tuần
router.get('/admin', verifyToken, onlyAdmin, scheduleController.getAllSchedulesAdmin);
router.put('/admin/update-shift', verifyToken, onlyAdmin, scheduleController.adminUpdateDriverShift);

module.exports = router;
