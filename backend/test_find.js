const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('./models/Order');
const Driver = require('./models/Driver');
const { findNearestAvailableDriversGroup } = require('./utils/driverAssignment');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB.");
    const order = await Order.findOne().sort({ createdAt: -1 });
    console.log("--- LATEST ORDER ---");
    console.log("ID:", order._id);
    console.log("isVipAssigning:", order.isVipAssigning);
    console.log("autoAssignNearest:", order.autoAssignNearest);
    console.log("pickupCoordinates:", order.pickupCoordinates);
    console.log("rejectedBy:", order.rejectedBy);
    console.log("--------------------");

    if (order.pickupCoordinates && order.pickupCoordinates.lat) {
      console.log("Testing findNearestAvailableDriversGroup...");
      const drivers = await findNearestAvailableDriversGroup(
        order.pickupCoordinates.lat,
        order.pickupCoordinates.lng,
        order.commissionRate,
        order.rejectedBy || [],
        5
      );
      console.log("Result of findNearestAvailableDriversGroup:");
      console.log(drivers.map(d => ({ id: d._id, name: d.name, distance: d.distance })));
    } else {
      console.log("Order has no pickupCoordinates.lat");
    }

    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
