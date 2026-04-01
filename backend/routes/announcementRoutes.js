const express = require('express');
const router = express.Router();
const controller = require('../controllers/announcementController');
const { verifyToken, onlyAdmin } = require('../middleware/auth');

// Public route: Lấy bảng tin cho app Khách/Tài xế xem
router.get('/', controller.getActiveAnnouncements);

// Admin-only routes
router.get('/all', verifyToken, onlyAdmin, controller.getAllAnnouncements);
router.post('/', verifyToken, onlyAdmin, controller.createAnnouncement);
router.put('/:id', verifyToken, onlyAdmin, controller.updateAnnouncement);
router.delete('/:id', verifyToken, onlyAdmin, controller.deleteAnnouncement);

module.exports = router;
