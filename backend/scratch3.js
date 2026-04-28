const mongoose = require('mongoose');
const Order = require('./models/Order');
require('dotenv').config({ path: './.env' });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const orders = await Order.find().sort({ createdAt: -1 });
  for (const o of orders) {
    if (o._id.toString().includes('45ee063b') || o._id.toString().includes('45ee063B')) {
      console.log(`Order found: ${o._id}, commissionRate = ${o.commissionRate}`);
      process.exit(0);
    }
  }
  console.log(`Order not found!`);
  process.exit(0);
}
check();
