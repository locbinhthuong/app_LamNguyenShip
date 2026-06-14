const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Driver = require('./models/Driver');
  const driver = await Driver.findOne({ name: 'Ngô Fuck Ngôn' });
  console.log('--- NGÔ FUCK NGÔN ---');
  console.log('isOnline:', driver.isOnline);
  console.log('status:', driver.status);
  console.log('currentLocation:', driver.currentLocation);
  
  const Order = require('./models/Order');
  const count = await Order.countDocuments({
    assignedTo: driver._id,
    status: { $in: ['ACCEPTED', 'PICKED_UP', 'DELIVERING'] }
  });
  console.log('active orders:', count);

  const { findNearestAvailableDriver } = require('./utils/driverAssignment');
  console.log('\n--- TÌM NGƯỜI GẦN NHẤT ---');
  const nearest = await findNearestAvailableDriver(10.762622, 106.660172);
  console.log('Nearest driver:', nearest ? nearest.name : 'None');

  process.exit();
});
