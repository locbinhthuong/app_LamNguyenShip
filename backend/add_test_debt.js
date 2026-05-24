const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const Driver = require('./models/Driver');
const DebtTransaction = require('./models/DebtTransaction');

// Dùng string kết nối prod luôn để test thực tế
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lamnguyenship')
  .then(async () => {
    try {
      const driver = await Driver.findOne({ phone: '0857986911' });
      if (!driver) {
        console.log('Không tìm thấy tài xế 0857986911');
        process.exit(1);
      }
      
      const amount = 35000;
      
      // Tạo giao dịch Phí Đơn
      const tx = new DebtTransaction({
        driverId: driver._id,
        type: 'FEE_DEDUCTION',
        amount: amount,
        status: 'SUCCESS',
        description: 'Thu chiết khấu 15% đơn hàng DH_TEST_888 (Phí ship: 233000đ)',
        targetDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
      });
      await tx.save();
      
      // Cập nhật tổng nợ
      await Driver.findByIdAndUpdate(driver._id, { $inc: { walletDebt: amount } });
      
      console.log('✅ Đã thêm ' + amount.toLocaleString() + 'đ công nợ (Chiết khấu đơn) cho tài xế: ' + driver.name);
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  });
