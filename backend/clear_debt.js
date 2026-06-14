const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const DebtTransaction = require('./models/DebtTransaction');
  
  // Xóa toàn bộ nợ cũ (chuyển sang PAID) cho tài khoản nguyenloctan
  const res = await DebtTransaction.updateMany(
    { driverId: '69c514fd463bb31d6fb71b92' },
    { $set: { status: 'PAID' } }
  );
  
  console.log('Đã xử lý xóa nợ cũ cho nguyenloctan. Số giao dịch cập nhật:', res.modifiedCount);
  process.exit();
});
