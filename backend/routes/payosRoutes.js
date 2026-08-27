const express = require('express');
const router = express.Router();
const payosController = require('../controllers/payosController');
const { verifyToken, onlyDriver } = require('../middleware/auth');

// Driver requests payment link
router.post('/driver/create-link', verifyToken, onlyDriver, payosController.createPaymentLink);

// Webhook from PayOS
router.post('/webhook', payosController.handleWebhook);

router.get('/success', payosController.handleSuccess);
router.get('/cancel', payosController.handleCancel);

// Custom routes cho app cũ chưa kịp update
router.get('/manual-checkout', payosController.manualCheckoutPage);
router.post('/manual-checkout-submit', payosController.manualCheckoutSubmit);

module.exports = router;
