const express = require('express');
const router = express.Router();
const payosController = require('../controllers/payosController');
const { onlyDriver } = require('../middlewares/authMiddleware');

// Driver requests payment link
router.post('/driver/create-link', onlyDriver, payosController.createPaymentLink);

// Webhook from PayOS
router.post('/webhook', payosController.handleWebhook);

module.exports = router;
