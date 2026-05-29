/**
 * ============================================================
 * AUDIT SCRIPT: Kiểm tra công nợ tất cả tài xế (CHỈ ĐỌC)
 * KHÔNG SỬA BẤT KỲ DỮ LIỆU NÀO
 * 
 * Chạy: node backend/audit_debt.js
 * ============================================================
 */
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://tanlocdepzai123_db_user:CoDtoiPXpllytpuj@cluster0.4sm9yrn.mongodb.net/lamnguyenship?appName=Cluster0';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Đã kết nối MongoDB\n');

  const Driver = require('./models/Driver');
  const DebtTransaction = require('./models/DebtTransaction');

  // Lấy ngày hôm nay giờ VN
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  console.log(`📅 Hôm nay (giờ VN): ${todayStr}\n`);

  // Lấy tất cả tài xế
  const drivers = await Driver.find({}).select('name phone walletDebt commissionRate status').lean();
  console.log(`👥 Tổng tài xế: ${drivers.length}\n`);

  let issueCount = 0;
  let blockedCount = 0;
  let desynced = 0;

  console.log('='.repeat(80));
  console.log('BÁO CÁO KIỂM TRA CÔNG NỢ TẤT CẢ TÀI XẾ (CHỈ ĐỌC)');
  console.log('='.repeat(80));

  for (const driver of drivers) {
    const transactions = await DebtTransaction.find({ driverId: driver._id })
      .select('amount targetDate createdAt status type')
      .lean();

    if (transactions.length === 0 && driver.walletDebt === 0) continue; // Bỏ qua tài xế không có giao dịch

    // Tính nợ ròng theo ngày (CHỈ SUCCESS)
    const netDebtByDate = {};
    let totalActualDebt = 0;
    let pendingCount = 0;

    transactions.forEach(tx => {
      if (tx.status === 'PENDING') {
        pendingCount++;
        return;
      }
      if (tx.status !== 'SUCCESS') return;

      const dateStr = tx.targetDate
        || new Date(tx.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

      if (!netDebtByDate[dateStr]) netDebtByDate[dateStr] = 0;
      netDebtByDate[dateStr] += tx.amount;
      totalActualDebt += tx.amount;
    });

    const correctedDebt = Math.max(0, totalActualDebt);
    const cachedDebt = driver.walletDebt || 0;
    const isDesynced = cachedDebt !== correctedDebt;

    // Kiểm tra nợ cũ (logic mới)
    let oldDebtDate = null;
    let oldDebtAmount = 0;
    const sortedDates = Object.keys(netDebtByDate).sort();
    for (const dateStr of sortedDates) {
      if (dateStr < todayStr && netDebtByDate[dateStr] > 0) {
        oldDebtDate = dateStr;
        oldDebtAmount = Math.round(netDebtByDate[dateStr]);
        break;
      }
    }

    const todayDebt = Math.max(0, Math.round(netDebtByDate[todayStr] || 0));
    const wouldBlock = !!oldDebtDate;

    // Chỉ hiển thị tài xế có vấn đề hoặc có nợ
    if (isDesynced || wouldBlock || correctedDebt > 0 || pendingCount > 0) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`🚗 ${driver.name} | ${driver.phone} | Status: ${driver.status}`);
      console.log(`   Chiết khấu: ${driver.commissionRate || 15}%`);
      console.log(`   walletDebt cached: ${cachedDebt.toLocaleString()}đ`);
      console.log(`   walletDebt thực tế: ${correctedDebt.toLocaleString()}đ`);
      
      if (isDesynced) {
        console.log(`   ⚠️  BỊ LỆCH: cached=${cachedDebt} vs thực tế=${correctedDebt} (chênh ${Math.abs(cachedDebt - correctedDebt).toLocaleString()}đ)`);
        desynced++;
      }

      if (todayDebt > 0) {
        console.log(`   📊 Nợ hôm nay (${todayStr}): ${todayDebt.toLocaleString()}đ → KHÔNG CHẶN`);
      }

      if (pendingCount > 0) {
        console.log(`   ⏳ Có ${pendingCount} giao dịch PENDING (chờ Admin duyệt)`);
      }

      // Chi tiết nợ theo ngày
      const datesWithDebt = sortedDates.filter(d => netDebtByDate[d] > 0);
      if (datesWithDebt.length > 0) {
        console.log(`   📋 Nợ theo ngày:`);
        datesWithDebt.forEach(d => {
          const marker = d < todayStr ? '🔴 CŨ' : (d === todayStr ? '🟢 HÔM NAY' : '🟡 TƯƠNG LAI');
          console.log(`      ${d}: ${Math.round(netDebtByDate[d]).toLocaleString()}đ [${marker}]`);
        });
      }

      if (wouldBlock) {
        console.log(`   🚫 KẾT LUẬN: BỊ CHẶN (nợ cũ ngày ${oldDebtDate}: ${oldDebtAmount.toLocaleString()}đ)`);
        blockedCount++;
      } else {
        console.log(`   ✅ KẾT LUẬN: KHÔNG CHẶN`);
      }

      if (isDesynced || wouldBlock) issueCount++;
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('TÓM TẮT');
  console.log('='.repeat(80));
  console.log(`📅 Hôm nay (giờ VN): ${todayStr}`);
  console.log(`👥 Tổng tài xế: ${drivers.length}`);
  console.log(`🚫 Đang bị chặn (nợ cũ): ${blockedCount}`);
  console.log(`⚠️  walletDebt bị lệch: ${desynced}`);
  console.log(`❗ Tổng vấn đề: ${issueCount}`);

  if (desynced > 0) {
    console.log(`\n💡 GỢI Ý: Có ${desynced} tài xế bị lệch walletDebt.`);
    console.log(`   Sau khi deploy code mới, hệ thống sẽ TỰ ĐỘNG SỬA khi tài xế nhận đơn.`);
    console.log(`   Hoặc bạn có thể chạy script riêng để sync toàn bộ (cần confirm trước).`);
  }

  if (issueCount === 0) {
    console.log('\n✅ TẤT CẢ TÀI XẾ ĐỀU ĐÚNG LOGIC — KHÔNG CÓ VẤN ĐỀ!');
  }

  await mongoose.disconnect();
  console.log('\n🔌 Đã ngắt kết nối MongoDB');
  process.exit(0);
}

main().catch(err => {
  console.error('Lỗi:', err);
  process.exit(1);
});
