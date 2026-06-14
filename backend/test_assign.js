const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Order = require('./models/Order');
  
  // Lấy đơn mới nhất vừa tạo
  const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(3).lean();
  
  recentOrders.forEach((o, i) => {
    console.log(`\n--- ĐƠN ${i+1} ---`);
    console.log('ID:', o._id);
    console.log('pickupAddress:', o.pickupAddress);
    console.log('pickupCoordinates:', o.pickupCoordinates);
    console.log('deliveryCoordinates:', o.deliveryCoordinates);
    console.log('pendingAssignTo:', o.pendingAssignTo);
    console.log('status:', o.status);
    console.log('assignedTo:', o.assignedTo);
    console.log('createdAt:', o.createdAt);
  });

  console.log('\n--- TÀI XẾ ĐANG ONLINE ---');
  const Driver = require('./models/Driver');
  const onlineDrivers = await Driver.find({ isOnline: true, status: 'active' }).select('name currentLocation isOnline status').lean();
  
  for (const d of onlineDrivers) {
    const activeCount = await Order.countDocuments({
      assignedTo: d._id,
      status: { $in: ['ACCEPTED', 'PICKED_UP', 'DELIVERING'] }
    });
    
    const { checkDriverDebtBlock } = require('./utils/debtUtils');
    const debtCheck = await checkDriverDebtBlock(d._id);
    
    console.log(`\n${d.name}:`);
    console.log('  location:', d.currentLocation);
    console.log('  activeOrders:', activeCount, activeCount >= 3 ? '⚠️ QUÁ 3 ĐƠN' : '✅ OK');
    console.log('  debt blocked:', debtCheck.blocked ? '⚠️ BỊ CHẶN' : '✅ OK');
  }
  
  process.exit();
});
