require('dotenv').config({ path: 'c:\\app_LamNguyenShip\\backend\\.env' });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const Order = require('./models/Order');
    const order = await Order.findOne({ customerName: /tao l.* coder/i });
    console.log("Found:", order._id, order.pickupCoordinates);
    // test encode URI
    console.log(`https://www.google.com/maps/search/?api=1&query=${order.pickupCoordinates?.lat},${order.pickupCoordinates?.lng}`);
  } catch (err) {
    console.error('ERROR ON SAVE:', err);
  } finally {
    process.exit(0);
  }
}).catch(console.log);
