const express = require('express');
const router = express.Router();
const payosController = require('../controllers/payosController');
const { verifyToken, onlyDriver } = require('../middleware/auth');

// Driver requests payment link
router.post('/driver/create-link', verifyToken, onlyDriver, payosController.createPaymentLink);

// Webhook from PayOS
router.post('/webhook', payosController.handleWebhook);

module.exports = router;
