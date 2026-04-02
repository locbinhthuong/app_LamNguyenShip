const express = require('express');
const router = express.Router();
const debtController = require('../controllers/debtController');
const { verifyToken, onlyAdmin } = require('../middleware/auth');

// Yêu cầu xác thực cơ bản cho mọi route
router.use(verifyToken);

// === Route của Driver ===
router.post('/driver/:driverId/request-payment', debtController.requestPayment);
router.get('/driver/me', debtController.getMyDebtDetail);

// === Routes của Admin ===
router.use(onlyAdmin); // Khóa các route bên dưới chỉ cho Admin
router.get('/driver/:driverId', debtController.getDriverDebtDetail);
router.post('/driver/:driverId/penalty', debtController.addPenalty);
router.post('/driver/:driverId/payment', debtController.addPayment);
router.post('/driver/:driverId/reset', debtController.resetDebt);
router.put('/tx/:txId', debtController.updateDebt);
router.delete('/tx/:txId', debtController.deleteDebt);

module.exports = router;
