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

  // Clear existing debts for this driver to avoid confusion
  await DebtTransaction.deleteMany({ driverId: driver._id });
  driver.walletDebt = 0;

  const today = new Date();
  
  const daysAgo = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  };

  // Create some debts for past days
  const debts = [
    { targetDate: daysAgo(3), amount: 150000, desc: 'Chiết khấu ngày ' + daysAgo(3) },
    { targetDate: daysAgo(2), amount: 80000, desc: 'Chiết khấu ngày ' + daysAgo(2) },
    { targetDate: daysAgo(1), amount: 200000, desc: 'Chiết khấu ngày ' + daysAgo(1) },
  ];

  let totalDebt = 0;
  for (const debt of debts) {
    await DebtTransaction.create({
      driverId: driver._id,
      type: 'FEE_DEDUCTION',
      amount: debt.amount,
      description: debt.desc,
      targetDate: debt.targetDate,
      status: 'SUCCESS'
    });
    totalDebt += debt.amount;
  }

  // Add a partial payment for 3 days ago
  await DebtTransaction.create({
    driverId: driver._id,
    type: 'PAYMENT',
    amount: -50000, // Paid 50k
    description: 'Thanh toán một phần',
    targetDate: daysAgo(3),
    status: 'SUCCESS'
  });
  totalDebt -= 50000;

  driver.walletDebt = totalDebt;
  await driver.save();

  console.log('Successfully created mock debts. Total walletDebt:', totalDebt);
  process.exit(0);
}

run();
