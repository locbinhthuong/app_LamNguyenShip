const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Driver = require('./models/Driver');
const DebtTransaction = require('./models/DebtTransaction');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const driver = await Driver.findOne({ phone: '0857986911' });
  const txs = await DebtTransaction.find({ driverId: driver._id }).sort({ createdAt: -1 }).lean();
  
  console.log(`\n=== SỔ LỊCH SỬ GIAO DỊCH NỢ CỦA "Giành Đơn Ko Lại" ===\n`);
  let sum = 0;
  [...txs].reverse().forEach(tx => {
    if (tx.status === 'SUCCESS') {
      sum += tx.amount;
      const date = new Date(tx.createdAt).toLocaleString('vi-VN');
      console.log(`[${date}] ${tx.type.padEnd(14)} | ${String(tx.amount).padStart(7, ' ')} đ | Tổng nợ: ${String(sum).padStart(7, ' ')} đ | ${tx.description}`);
    }
  });
  console.log(`\n=> CÔNG NỢ HIỆN TẠI (walletDebt) = ${driver.walletDebt} đ (Tính toán = ${sum} đ)\n`);
  process.exit(0);
}
main();
