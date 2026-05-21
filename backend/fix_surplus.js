const mongoose = require('mongoose');
require('dotenv').config({ path: '../admin-app/.env' });

const Driver = require('./models/Driver');
const DebtTransaction = require('./models/DebtTransaction');

async function fixSurplus() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/lamnguyenship');
    console.log('Connected to DB');

    const drivers = await Driver.find({});
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    let fixedCount = 0;

    for (let drv of drivers) {
      // Find today's transactions
      const todayTxs = await DebtTransaction.find({
        driverId: drv._id,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      let todayDebt = 0;
      let todayPayment = 0;

      for (let tx of todayTxs) {
        if (['FEE_DEDUCTION', 'PENALTY'].includes(tx.type)) {
          todayDebt += tx.amount;
        } else if (tx.type === 'PAYMENT') {
          todayPayment += tx.amount; // usually negative
        }
      }

      // Calculate starting balance for today
      // Current walletDebt = startingBalance + todayDebt + todayPayment
      // So startingBalance = walletDebt - todayDebt - todayPayment
      let startingBalance = drv.walletDebt - todayDebt - todayPayment;

      // If starting balance is negative (surplus), user wants to wipe it out
      if (startingBalance < 0 && todayDebt > 0) {
        const adjustmentAmount = Math.abs(startingBalance);
        console.log(`Driver ${drv.name} (${drv.phone}): walletDebt = ${drv.walletDebt}, todayDebt = ${todayDebt}, todayPayment = ${todayPayment}. Starting balance = ${startingBalance}. Adjusting +${adjustmentAmount} đ`);
        
        // Add a penalty to correct the starting balance
        await DebtTransaction.create({
          driverId: drv._id,
          type: 'PENALTY',
          amount: adjustmentAmount,
          description: 'Truy thu công nợ do lỗi hệ thống cũ (khôi phục nợ đúng)',
          status: 'SUCCESS'
        });

        // Update walletDebt
        drv.walletDebt += adjustmentAmount;
        await drv.save();
        fixedCount++;
      }
    }

    console.log(`Fixed surplus for ${fixedCount} drivers.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixSurplus();
