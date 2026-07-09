const express = require('express');
const router = express.Router();
const alofoodController = require('../controllers/alofoodController');
const { verifyToken } = require('../middleware/auth');

// Khách hàng xem danh sách quán ăn
router.get('/restaurants', alofoodController.getRestaurants);

// Khách hàng xem menu của 1 quán
router.get('/restaurants/:id/menu', alofoodController.getRestaurantMenu);

// Khách hàng đặt món
router.post('/order', verifyToken, alofoodController.createFoodOrder);

module.exports = router;
