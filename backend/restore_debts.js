require('dotenv').config();
const mongoose = require('mongoose');
const Driver = require('./models/Driver');
const DebtTransaction = require('./models/DebtTransaction');

async function restoreDebts19May() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Bước 1: Tìm tất cả tài xế đã chạy đơn trong ngày 19/5
  const feeTxs19 = await DebtTransaction.find({
    type: 'FEE_DEDUCTION',
    targetDate: '2026-05-19'
  }).distinct('driverId');

  console.log(`🔍 Tìm thấy ${feeTxs19.length} tài xế đã chạy đơn trong ngày 19/5\n`);

  let totalFixed = 0;

  for (const driverId of feeTxs19) {
    const driver = await Driver.findById(driverId).select('name phone walletDebt');

    // Bước 2: Xóa toàn bộ lệnh PAYMENT (kể cả PENDING) của tài xế này
    const deleted = await DebtTransaction.deleteMany({
      driverId: driverId,
      type: 'PAYMENT'
    });

    // Bước 3: Tính lại walletDebt = tổng tất cả FEE_DEDUCTION + PENALTY còn lại
    const allFeeTxs = await DebtTransaction.find({
      driverId: driverId,
      type: { $in: ['FEE_DEDUCTION', 'PENALTY'] },
      status: { $ne: 'REJECTED' }
    });

    const trueDebt = allFeeTxs.reduce((sum, tx) => sum + tx.amount, 0);

    // Cập nhật lại ví
    await Driver.findByIdAndUpdate(driverId, { walletDebt: trueDebt });

    console.log(`✅ ${driver.name} (${driver.phone})`);
    console.log(`   Xóa ${deleted.deletedCount} lệnh thanh toán`);
    console.log(`   WalletDebt: ${driver.walletDebt}đ → ${trueDebt}đ`);
    console.log('');
    totalFixed++;
  }

  console.log(`🎉 HOÀN TẤT! Đã khôi phục công nợ cho ${totalFixed} tài xế chạy ngày 19/5.`);
  process.exit(0);
}

restoreDebts19May().catch(e => {
  console.error('Lỗi:', e.message);
  process.exit(1);
});
