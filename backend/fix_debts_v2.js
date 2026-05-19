require('dotenv').config();
const mongoose = require('mongoose');
const DebtTransaction = require('./models/DebtTransaction');

async function fixDebts() {
  await mongoose.connect(process.env.MONGO_URI);

  const buggyTxs = await DebtTransaction.find({
    description: { $regex: /Duyệt thanh toán QR tự động \(Semi\)/i }
  });

  let fixedCount = 0;

  for (const semiTx of buggyTxs) {
    // Bỏ qua lọc status='PENDING', tìm transaction có chữ "Yêu cầu xác nhận"
    const reqTx = await DebtTransaction.findOne({
      driverId: semiTx.driverId,
      description: { $regex: /Yêu cầu xác nhận/i },
      amount: semiTx.amount
    }).sort({ createdAt: -1 });

    if (reqTx) {
      console.log(`Fixing driver ID: ${semiTx.driverId}. Semi date: ${semiTx.targetDate} -> Correct date: ${reqTx.targetDate}`);
      semiTx.targetDate = reqTx.targetDate;
      await semiTx.save();
      
      // Xóa luôn giao dịch yêu cầu cũ để sạch database
      await DebtTransaction.findByIdAndDelete(reqTx._id);
      fixedCount++;
    } else {
      console.log(`No match for driver ID: ${semiTx.driverId}. Amount: ${semiTx.amount}`);
      // In thử các giao dịch gần đây của driver này để debug
      const recentTxs = await DebtTransaction.find({ driverId: semiTx.driverId }).sort({createdAt: -1}).limit(5);
      console.log('Recent TXs for this driver:', recentTxs.map(t => ({ desc: t.description, amt: t.amount, status: t.status })));
    }
  }

  console.log('Done fixed:', fixedCount);
  process.exit(0);
}
fixDebts();
