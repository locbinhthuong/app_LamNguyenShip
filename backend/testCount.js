const mongoose = require('mongoose');
const Order = require('./models/Order');
const Driver = require('./models/Driver');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  console.log("Start of day:", startOfDay);
  console.log("End of day:", endOfDay);

  const driver = await Driver.findOne({ phone: '0827758062' }); // User phone
  if(!driver) {
     console.log("Driver not found");
     process.exit();
  }

  const count = await Order.countDocuments({
    status: 'COMPLETED',
    assignedTo: driver._id,
    deliveredAt: { $gte: startOfDay, $lte: endOfDay }
  });

  console.log("Count today:", count);
  process.exit();
}
check();
