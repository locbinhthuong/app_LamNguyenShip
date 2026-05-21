const mongoose = require('mongoose');
const Driver = require('./models/Driver');
const DebtTransaction = require('./models/DebtTransaction');
const dotenv = require('dotenv');

dotenv.config();

async function syncWalletDebt() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const drivers = await Driver.find({});
    console.log(`Found ${drivers.length} drivers.`);

    let fixedCount = 0;

    for (const driver of drivers) {
      const transactions = await DebtTransaction.find({ 
        driverId: driver._id,
        status: { $in: ['SUCCESS'] } // PENDING or REJECTED do not affect wallet debt
      });

      let calculatedDebt = 0;
      transactions.forEach(tx => {
        // FEE_DEDUCTION, PENALTY are positive, PAYMENT is negative
        calculatedDebt += (tx.amount || 0);
      });

      if (driver.walletDebt !== calculatedDebt) {
        console.log(`Driver ${driver.phone}: walletDebt is ${driver.walletDebt}, but calculated is ${calculatedDebt}. Fixing...`);
        driver.walletDebt = calculatedDebt;
        await driver.save();
        fixedCount++;
      }
    }

    console.log(`Sync complete. Fixed ${fixedCount} drivers.`);
    process.exit(0);
  } catch (err) {
    console.error('Error syncing:', err);
    process.exit(1);
  }
}

syncWalletDebt();
