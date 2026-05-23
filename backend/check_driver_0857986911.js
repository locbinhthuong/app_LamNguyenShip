const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });

const Driver = require('./models/Driver');
const DebtTransaction = require('./models/DebtTransaction');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const driver = await Driver.findOne({ phone: '0857986911' });
  if (!driver) {
    console.log('Driver not found');
    process.exit(0);
  }

  console.log('--- DRIVER INFO ---');
  console.log('Name:', driver.name);
  console.log('Phone:', driver.phone);
  console.log('Wallet Debt:', driver.walletDebt);
  console.log('Commission Rate:', driver.commissionRate);

  const txs = await DebtTransaction.find({ driverId: driver._id }).sort({ createdAt: 1 });
  console.log('\n--- DEBT TRANSACTIONS ---');
  
  const debtByDate = {};
  txs.forEach(tx => {
    const dateStr = tx.targetDate || new Date(tx.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    console.log(`[${dateStr}] [${tx.type}] [${tx.status}] Amount: ${tx.amount} | Desc: ${tx.description}`);
    
    if (tx.status !== 'REJECTED' && tx.status !== 'PENDING') {
      if (!debtByDate[dateStr]) debtByDate[dateStr] = 0;
      debtByDate[dateStr] += tx.amount;
    }
  });

  console.log('\n--- CALCULATED DEBT BY DATE ---');
  console.log(debtByDate);

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  console.log('Today is:', todayStr);

  let unpaidDays = [];
  if (driver.walletDebt > 0) {
    for (const [dateStr, amount] of Object.entries(debtByDate)) {
      if (amount > 0 && dateStr !== todayStr) {
        unpaidDays.push({ date: dateStr, amount });
      }
    }
    unpaidDays.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  console.log('\n--- UNPAID DAYS TO SHOW IN UI ---');
  console.log(unpaidDays);

  process.exit(0);
}

main().catch(console.error);
