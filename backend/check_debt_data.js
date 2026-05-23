const mongoose = require('mongoose');
const Driver = require('./models/Driver');
const DebtTransaction = require('./models/DebtTransaction');
const dotenv = require('dotenv');

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const driver = await Driver.findOne({ phone: '0827758062' });
  if (!driver) {
    console.log('Driver not found');
    process.exit(1);
  }

  console.log('Driver:', driver.name, driver.phone, 'walletDebt:', driver.walletDebt);
  
  const txs = await DebtTransaction.find({ driverId: driver._id }).lean();
  console.log('Transactions count:', txs.length);
  txs.forEach(t => console.log(t.type, t.amount, t.targetDate, t.status));

  process.exit(0);
}

run();
