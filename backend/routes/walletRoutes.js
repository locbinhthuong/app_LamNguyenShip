const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { verifyToken, onlyAdmin } = require('../middleware/auth');

// Mọi lệnh dùng Ví đều cần token bảo mật
router.use(verifyToken);

// === CHỨC NĂNG TÀI XẾ ===
router.get('/driver/me', walletController.getMyWalletDetail); // Xem ví + lịch sử của bản thân (Ghi có, Rút tiền pending...)
router.post('/driver/request-withdraw', walletController.requestWithdraw);

// === CHỨC NĂNG ADMIN ===
router.use(onlyAdmin);

router.get('/admin/:driverId', walletController.getDriverWalletDetail); // Lấy lịch sử ví tài xế X
router.post('/admin/:driverId/adjust', walletController.adminAdjustWallet); // Nạp tiền thưởng / Trừ tiền phạt vào ví

router.post('/admin/tx/:txId/process', walletController.processWithdraw); // Duyệt/Từ chối lệnh Pending
router.delete('/admin/tx/:txId', walletController.deleteWalletTx); // Xóa cứng lệnh do lỗi

module.exports = router;
