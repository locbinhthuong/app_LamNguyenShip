const mongoose = require('mongoose');
require('dotenv').config();
const Driver = require('./models/Driver');
const DebtTransaction = require('./models/DebtTransaction');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aloshipp')
  .then(async () => {
    const driver = await Driver.findOne({ name: 'giao hàng siêu nhân' });
    if (!driver) {
      console.log('Driver not found');
      process.exit(1);
    }
    console.log('Driver found:', driver._id);
    
    // Create 5 different days of debt
    const dates = ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05'];
    
    for (let i = 0; i < dates.length; i++) {
      await DebtTransaction.create({
        driver: driver._id,
        amount: 25000 + (i * 5000), // 25k, 30k, 35k, 40k, 45k
        type: 'ORDER_FEE',
        status: 'COMPLETED',
        date: dates[i],
        description: 'Chiết khấu ngày ' + dates[i]
      });
    }
    
    console.log('Added 5 debts successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
