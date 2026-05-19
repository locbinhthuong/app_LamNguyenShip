require('dotenv').config();
const mongoose = require('mongoose');
const DebtTransaction = require('./models/DebtTransaction');

async function fixDebts() {
  try {
    if (!process.env.MONGO_URI) {
      console.log('Error: MONGO_URI not found in .env');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Tìm tất cả các giao dịch bị gán sai ngày (do lỗi cũ)
    const buggyTxs = await DebtTransaction.find({
      description: { $regex: /Duyệt thanh toán QR tự động \(Semi\)/i }
    });

    console.log(`🔍 Tìm thấy ${buggyTxs.length} giao dịch thanh toán Semi có khả năng bị lỗi ngày.`);

    let fixedCount = 0;

    for (const semiTx of buggyTxs) {
      // Tìm lệnh PENDING tương ứng của tài xế đó với cùng số tiền âm
      const pendingTx = await DebtTransaction.findOne({
        driverId: semiTx.driverId,
        status: 'PENDING',
        type: 'PAYMENT',
        amount: semiTx.amount
      }).sort({ createdAt: -1 });

      if (pendingTx) {
        console.log(`\n⚙️  Đang sửa cho tài xế ID: ${semiTx.driverId}`);
        console.log(`   - Ngày sai (hiện tại): ${semiTx.targetDate}`);
        console.log(`   - Ngày đúng (lấy từ lệnh PENDING): ${pendingTx.targetDate}`);
        
        // Cập nhật lại targetDate cho giao dịch Semi
        semiTx.targetDate = pendingTx.targetDate;
        await semiTx.save();
        
        // Xóa lệnh PENDING đang bị treo để dọn dẹp data
        await DebtTransaction.findByIdAndDelete(pendingTx._id);
        
        console.log(`   ✅ Đã sửa và xóa lệnh PENDING rác thành công.`);
        fixedCount++;
      } else {
        console.log(`\n⚠️  Bỏ qua ID: ${semiTx.driverId} (Không tìm thấy lệnh PENDING treo tương ứng)`);
      }
    }

    console.log(`\n🎉 HOÀN TẤT! Đã sửa thành công ${fixedCount} hồ sơ tài xế.`);
    process.exit(0);
  } catch (error) {
    console.error('Lỗi:', error);
    process.exit(1);
  }
}

fixDebts();
