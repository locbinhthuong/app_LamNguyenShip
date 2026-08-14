const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('./models/Order');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const order = await Order.findOne().sort({ createdAt: -1 });
    console.log(JSON.stringify(order, null, 2));
    process.exit(0);
  });
