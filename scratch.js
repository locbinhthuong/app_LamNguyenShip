const mongoose = require('mongoose');
const Order = require('./backend/models/Order');
const Driver = require('./backend/models/Driver');
require('dotenv').config({ path: './backend/.env' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  console.log("Checking for driver...");
  const driver = await Driver.findOne({ phone: '0827758062' }); // user's phone from screenshot
  
  if (!driver) {
     const anyDriver = await Driver.findOne();
     console.log("Driver not found by phone, using", anyDriver._id);
     var driverId = anyDriver._id;
  } else {
     var driverId = driver._id;
  }

  const count = await Order.countDocuments({
    status: 'COMPLETED',
    assignedTo: driverId,
    deliveredAt: { $gte: startOfDay, $lte: endOfDay }
  });

  console.log("Today completed count for driver", driverId, "is", count);
  process.exit();
}
check();
