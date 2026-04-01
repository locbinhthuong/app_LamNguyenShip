const express = require('express');
const router = express.Router();
const debtController = require('../controllers/debtController');
const authMiddleware = require('../middleware/authMiddleware'); // { adminAuth, onlyAdmin }

// Bật bảo mật Admin cho toàn bộ route
router.use(authMiddleware.adminAuth);
router.use(authMiddleware.onlyAdmin);

// Các thao tác của Admin
router.get('/driver/:driverId', debtController.getDriverDebtDetail);
router.post('/driver/:driverId/penalty', debtController.addPenalty);
router.post('/driver/:driverId/payment', debtController.addPayment);
router.post('/driver/:driverId/reset', debtController.resetDebt);

module.exports = router;
