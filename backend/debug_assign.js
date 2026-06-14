const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Order = require('./models/Order');
  const Driver = require('./models/Driver');
  const { findNearestAvailableDriver } = require('./utils/driverAssignment');
  
  // Get the most recent order
  const order = await Order.findOne().sort({ createdAt: -1 }).lean();
  console.log('--- RECENT ORDER ---');
  console.log('ID:', order._id);
  console.log('pickupAddress:', order.pickupAddress);
  console.log('pickupCoordinates:', order.pickupCoordinates);
  
  if (!order.pickupCoordinates || !order.pickupCoordinates.lat) {
    console.log('❌ Order has NO coordinates! This is why it failed.');
    process.exit();
  }

  console.log('\n--- SIMULATING findNearestAvailableDriver ---');
  console.log(`Searching around: lat=${order.pickupCoordinates.lat}, lng=${order.pickupCoordinates.lng}`);
  
  const nearest = await findNearestAvailableDriver(
    order.pickupCoordinates.lat,
    order.pickupCoordinates.lng,
    order.commissionRate
  );

  if (nearest) {
    console.log('✅ FOUND NEAREST:', nearest.name, nearest._id);
  } else {
    console.log('❌ NO NEAREST DRIVER FOUND! Let\'s debug why...');
    
    // Manual check
    const drivers = await Driver.find({ status: 'active', isOnline: true }).select('name currentLocation fcmToken').lean();
    for (const d of drivers) {
      console.log(`\nDriver: ${d.name}`);
      console.log('Location:', d.currentLocation);
      
      if (!d.currentLocation || !d.currentLocation.lat) {
        console.log('  -> Rejected: No location');
        continue;
      }
      
      const { getDrivingDistance } = require('./utils/distance');
      const dist = getDrivingDistance(
        order.pickupCoordinates.lat,
        order.pickupCoordinates.lng,
        d.currentLocation.lat,
        d.currentLocation.lng
      );
      
      console.log(`  -> Distance: ${dist} km`);
      if (dist > 5) {
        console.log('  -> Rejected: Distance > 5km (or whatever the limit is)');
      }
      
      // Active orders
      const activeCount = await Order.countDocuments({
        assignedTo: d._id,
        status: { $in: ['ACCEPTED', 'PICKED_UP', 'DELIVERING'] }
      });
      console.log(`  -> Active Orders: ${activeCount}`);
      if (activeCount >= 3) {
        console.log('  -> Rejected: >= 3 active orders');
      }
      
      // Debt
      const { checkDriverDebtBlock } = require('./utils/debtUtils');
      const debtCheck = await checkDriverDebtBlock(d._id);
      console.log(`  -> Debt Blocked: ${debtCheck.blocked}`);
    }
  }
  
  process.exit();
});
