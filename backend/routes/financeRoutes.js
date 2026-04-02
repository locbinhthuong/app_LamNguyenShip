const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { verifyToken, onlyAdmin } = require('../middleware/auth');

// Toàn bộ chức năng Tài Chính dành cho Admin
router.use(verifyToken);
router.use(onlyAdmin);

router.get('/all-requests', financeController.getAllRequests);

// Duyệt Nợ
router.post('/debts/:txId/approve', financeController.approveDebt);
router.post('/debts/:txId/reject', financeController.rejectDebt);

// Duyệt Ví
router.post('/wallets/:txId/approve', financeController.approveWallet);
router.post('/wallets/:txId/reject', financeController.rejectWallet);

module.exports = router;
