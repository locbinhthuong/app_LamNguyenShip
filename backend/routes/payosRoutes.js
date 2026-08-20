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

module.exports = router;
