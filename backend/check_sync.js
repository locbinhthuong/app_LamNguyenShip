require('dotenv').config();
const mongoose = require('mongoose');
const Driver = require('./models/Driver');
const DebtTransaction = require('./models/DebtTransaction');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const drivers = await Driver.find().select('name phone walletDebt');
  console.log(`Checking ${drivers.length} drivers...`);

  let desyncCount = 0;
  for (const driver of drivers) {
    const txs = await DebtTransaction.find({ driverId: driver._id, status: 'SUCCESS' });
    const sum = txs.reduce((acc, tx) => acc + tx.amount, 0);
    
    if (Math.abs(driver.walletDebt - sum) > 1) {
      console.log(`Mismatch: Driver ${driver.name} (${driver.phone}): walletDebt=${driver.walletDebt}, Sum of TXs=${sum}`);
      desyncCount++;
    }
  }
  console.log(`Found ${desyncCount} drivers with desynced walletDebt.`);
  process.exit(0);
}
check();
