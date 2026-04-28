const mongoose = require('mongoose');
const Order = require('./models/Order');
require('dotenv').config({ path: './.env' });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const order = await Order.findOne().sort({ createdAt: -1 });
  console.log(`Before update: commissionRate = ${order.commissionRate}`);
  order.commissionRate = 20;
  await order.save();
  
  const fetched = await Order.findById(order._id).lean();
  console.log(`After update (lean): commissionRate = ${fetched.commissionRate}`);
  process.exit(0);
}
check();
