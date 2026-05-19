require('dotenv').config();
const mongoose = require('mongoose');
const Driver = require('./models/Driver');
const DebtTransaction = require('./models/DebtTransaction');

async function restoreDebts() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Lấy tất cả tài xế
  const drivers = await Driver.find().select('_id name phone walletDebt');
  console.log(`🔍 Tìm thấy ${drivers.length} tài xế. Đang khôi phục công nợ...\n`);

  let totalFixed = 0;

  for (const driver of drivers) {
    // Lấy tất cả giao dịch KHÔNG phải PAYMENT (tức là chỉ FEE_DEDUCTION và PENALTY)
    const feeTxs = await DebtTransaction.find({
      driverId: driver._id,
      type: { $in: ['FEE_DEDUCTION', 'PENALTY'] },
      status: { $ne: 'REJECTED' }
    });

    // Tính tổng nợ thực sự = tổng chiết khấu + phạt
    const trueDebt = feeTxs.reduce((sum, tx) => sum + tx.amount, 0);

    // Xóa toàn bộ giao dịch PAYMENT (kể cả PENDING) của tài xế này
    const deleted = await DebtTransaction.deleteMany({
      driverId: driver._id,
      type: 'PAYMENT'
    });

    // Cập nhật lại walletDebt = tổng thực tế (chỉ từ phí đơn + phạt)
    await Driver.findByIdAndUpdate(driver._id, { walletDebt: trueDebt });

    if (deleted.deletedCount > 0 || Math.abs(driver.walletDebt - trueDebt) > 1) {
      console.log(`✅ ${driver.name} (${driver.phone})`);
      console.log(`   Xóa ${deleted.deletedCount} lệnh thanh toán`);
      console.log(`   WalletDebt: ${driver.walletDebt}đ → ${trueDebt}đ`);
      console.log('');
      totalFixed++;
    }
  }

  console.log(`\n🎉 HOÀN TẤT! Đã khôi phục công nợ cho ${totalFixed} tài xế.`);
  console.log('Ví công nợ của tất cả tài xế hiện tại = ĐÚNG tổng chiết khấu đơn hàng thực tế.');
  process.exit(0);
}

restoreDebts().catch(e => {
  console.error('Lỗi:', e.message);
  process.exit(1);
});
