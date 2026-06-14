const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Order = require('./models/Order');
  // Get 5 most recent orders
  const orders = await Order.find().sort({createdAt: -1}).limit(5).lean();
  for (const o of orders) {
    console.log(`ID: ${o._id}`);
    console.log(`Coords:`, o.pickupCoordinates);
    console.log(`Name: ${o.customerName}`);
    console.log('----------------');
  }
  process.exit();
});
