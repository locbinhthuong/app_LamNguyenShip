const mongoose = require('mongoose');
require('dotenv').config();

const Driver = require('./models/Driver');
const DebtTransaction = require('./models/DebtTransaction');
const { checkDriverDebtBlock } = require('./utils/debtUtils');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('===================================================');
    console.log('🚀 BẮT ĐẦU KIỂM TRA TỔNG THỂ HỆ THỐNG CÔNG NỢ 🚀');
    console.log('===================================================\n');

    const drivers = await Driver.find({ status: 'active' });
    let blockedCount = 0;
    let safeCount = 0;
    let errorCount = 0;

    console.log(`Đang quét ${drivers.length} tài xế đang hoạt động...\n`);

    for (const d of drivers) {
      // 1. Kiểm tra Block
      const check = await checkDriverDebtBlock(d._id);
      
      // 2. Kiểm tra tính toàn vẹn dữ liệu (Ví Công Nợ vs Lịch sử giao dịch)
      const txs = await DebtTransaction.find({ driverId: d._id, status: 'SUCCESS' }).lean();
      let totalTxSum = 0;
      txs.forEach(tx => totalTxSum += tx.amount);
      const roundedTxSum = Math.round(totalTxSum);
      const roundedWallet = Math.round(d.walletDebt);

      let isDataCorrupted = false;
      if (Math.abs(roundedTxSum - roundedWallet) > 10) { // Sai số làm tròn cho phép 10đ
        isDataCorrupted = true;
        errorCount++;
      }

      // In kết quả cho những ca có vấn đề (hoặc bị block, hoặc sai dữ liệu, hoặc có nợ)
      if (check.blocked || isDataCorrupted || d.walletDebt > 0) {
        if (check.blocked) {
          blockedCount++;
          console.log(`❌ [BỊ KHOÁ] ${d.name} (${d.phone})`);
          console.log(`   👉 Nợ cũ làm hệ thống khoá: ${check.details.oldDebtAmount.toLocaleString()}đ (Từ ngày: ${check.details.oldDebtDate})`);
        } else {
          safeCount++;
          console.log(`✅ [AN TOÀN] ${d.name} (${d.phone})`);
        }

        console.log(`   👉 Tổng nợ hiện tại: ${roundedWallet.toLocaleString()}đ`);
        
        if (isDataCorrupted) {
          console.log(`   ⚠️ LỖI ĐỒNG BỘ DỮ LIỆU: Ví nợ (${roundedWallet}) KHÔNG KHỚP với Lịch sử (${roundedTxSum})`);
        }
        console.log('---------------------------------------------------');
      } else {
        safeCount++; // An toàn và không có nợ
      }
    }

    console.log('\n===================================================');
    console.log('📊 TỔNG KẾT BÁO CÁO:');
    console.log(`- Tổng số tài xế Active: ${drivers.length}`);
    console.log(`- Số tài xế AN TOÀN: ${safeCount}`);
    console.log(`- Số tài xế BỊ KHOÁ ĐÚNG LUẬT: ${blockedCount}`);
    if (errorCount === 0) {
       console.log(`- Tính toàn vẹn dữ liệu: 100% HOÀN HẢO (Không có ai bị lệch tiền)`);
    } else {
       console.log(`- Tính toàn vẹn dữ liệu: CÓ ${errorCount} TÀI XẾ BỊ LỆCH TIỀN DO CODE CŨ TRƯỚC ĐÂY!`);
    }
    console.log('===================================================');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Lỗi kết nối DB:', err);
    process.exit(1);
  });
