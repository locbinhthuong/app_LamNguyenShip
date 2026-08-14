const mongoose = require('mongoose');
const Order = require('./backend/models/Order');
require('dotenv').config({ path: './backend/.env' });

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const order = await Order.findOne().sort({ createdAt: -1 });
    console.log("Latest Order ID:", order._id);
    console.log("autoAssignNearest:", order.autoAssignNearest);
    console.log("isVipAssigning:", order.isVipAssigning);
    console.log("pickupCoordinates:", order.pickupCoordinates);
    console.log("pendingAssignTo:", order.pendingAssignTo);
    console.log("rejectedBy:", order.rejectedBy);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
