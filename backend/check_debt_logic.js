const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Driver = require('./models/Driver');
const DebtTransaction = require('./models/DebtTransaction');

async function main() {
  try {
    if (!process.env.MONGO_URI) {
      console.log('Không tìm thấy MONGO_URI trong .env');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Đã kết nối Database thành công');

    const driver = await Driver.findOne({ phone: '0857986911' });
    if (!driver) {
      console.log('❌ Không tìm thấy tài xế với SĐT 0857986911');
      process.exit(0);
    }

    console.log('\n--- THÔNG TIN TÀI XẾ ---');
    console.log('Tên:', driver.name);
    console.log('SĐT:', driver.phone);
    console.log('Nợ hiện tại (walletDebt):', driver.walletDebt);

    const transactions = await DebtTransaction.find({ driverId: driver._id }).sort({ createdAt: -1 }).lean();
    console.log(`\n--- LỊCH SỬ GIAO DỊCH NỢ (${transactions.length} dòng) ---`);
    
    const debtByDate = {};
    let totalCalculated = 0;

    transactions.forEach(tx => {
      const dateStr = tx.targetDate || new Date(tx.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      console.log(`[${dateStr}] Type: ${tx.type.padEnd(14)} | Status: ${tx.status.padEnd(8)} | Amount: ${tx.amount} | TargetDate: ${tx.targetDate}`);
      
      if (tx.status === 'SUCCESS') {
        totalCalculated += tx.amount;
      }

      if (tx.status !== 'REJECTED' && tx.status !== 'PENDING') {
        if (!debtByDate[dateStr]) debtByDate[dateStr] = 0;
        debtByDate[dateStr] += tx.amount;
      }
    });

    console.log('\n--- TỔNG KẾT TÍNH TOÁN THEO NGÀY ---');
    console.log(debtByDate);
    console.log('Tổng cộng theo lịch sử (SUCCESS):', totalCalculated);

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    console.log('\nNgày hôm nay là:', todayStr);

    let unpaidDays = [];
    if (driver.walletDebt > 0) {
      for (const [dateStr, amount] of Object.entries(debtByDate)) {
        if (amount > 0 && dateStr !== todayStr) {
          unpaidDays.push({ date: dateStr, amount });
        }
      }
      unpaidDays.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    console.log('\n--- CÁC KHUNG NỢ SẼ HIỂN THỊ LÊN APP ---');
    console.log(unpaidDays);
    if (unpaidDays.length === 0) {
      console.log('=> KẾT LUẬN: APP SẼ KHÔNG HIỂN THỊ KHUNG NỢ NÀO CHO TÀI XẾ NÀY!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Lỗi:', error);
    process.exit(1);
  }
}

main();
