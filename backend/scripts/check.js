const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Order = require('./models/Order');
    const count = await Order.countDocuments();
    console.log('Total Orders:', count);
    const testOrders = await Order.countDocuments({ customerName: /^TEST_/ });
    console.log('Test Orders:', testOrders);
    process.exit(0);
});
