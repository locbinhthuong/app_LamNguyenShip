const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });

const Driver = require('./models/Driver');
const DebtTransaction = require('./models/DebtTransaction');

async function fixSurplus() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const drivers = await Driver.find({});
    
    // Khóa cứng thời gian là ngày 21/05/2026 (theo giờ Việt Nam)
    const startOfDay = new Date('2026-05-21T00:00:00+07:00');
    const endOfDay = new Date('2026-05-21T23:59:59+07:00');

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
      let startingBalance = drv.walletDebt - todayDebt - todayPayment;

      // If the current walletDebt is LESS than todayDebt, it means they have a surplus (from past bug) or made a payment.
      // The user wants to WIPE OUT any past surplus so walletDebt matches todayDebt.
      // Wait, if todayPayment is 0, walletDebt < todayDebt means startingBalance < 0.
      if (drv.walletDebt < todayDebt) {
        const adjustmentAmount = todayDebt - drv.walletDebt;
        console.log(`[!] Phat hien tai xe ${drv.name} co walletDebt (${drv.walletDebt}) NHO HON todayDebt (${todayDebt}).`);
        console.log(`    => Fix: Cong them ${adjustmentAmount} vao walletDebt.`);
        
        await DebtTransaction.create({
          driverId: drv._id,
          type: 'PENALTY',
          amount: adjustmentAmount,
          description: 'Truy thu công nợ do lỗi hệ thống cũ (khôi phục nợ đúng)',
          status: 'SUCCESS'
        });

        drv.walletDebt += adjustmentAmount;
        await drv.save();
        fixedCount++;
      } else {
        console.log(`[OK] Tai xe ${drv.name} co walletDebt (${drv.walletDebt}) >= todayDebt (${todayDebt}). Bo qua.`);
      }
    }

    console.log(`\n=> DA FIX XONG CHO ${fixedCount} TAI XE.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixSurplus();
