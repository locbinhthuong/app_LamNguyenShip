const mongoose = require('mongoose');
const Driver = require('./models/Driver');
const DebtTransaction = require('./models/DebtTransaction');
const dotenv = require('dotenv');

dotenv.config();

async function testLogic() {
  await mongoose.connect(process.env.MONGO_URI);
  const driverId = (await Driver.findOne({ phone: '0827758062' }))._id;

  const driver = await Driver.findById(driverId).select('name phone walletDebt');
  
  const transactions = await DebtTransaction.find({ driverId })
    .sort({ createdAt: -1 })
    .lean();

  const debtByDate = {};
  const pendingDays = new Set();
  transactions.forEach(tx => {
    const dateStr = tx.targetDate || new Date(tx.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    if (tx.status === 'PENDING') {
       pendingDays.add(dateStr);
    } else if (tx.status !== 'REJECTED') { // The fix we applied
       if (!debtByDate[dateStr]) debtByDate[dateStr] = 0;
       debtByDate[dateStr] += tx.amount;
    }
  });

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  let unpaidDays = [];
  if (driver.walletDebt > 0) {
    for (const [dateStr, amount] of Object.entries(debtByDate)) {
      if (amount > 0 && dateStr !== todayStr) {
        unpaidDays.push({ date: dateStr, amount });
      }
    }
    unpaidDays.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  console.log('debtByDate:', debtByDate);
  console.log('unpaidDays:', unpaidDays);
  console.log('pendingDays:', Array.from(pendingDays));

  process.exit(0);
}

testLogic();
