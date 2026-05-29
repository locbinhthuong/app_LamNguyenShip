/**
 * Kiểm tra chi tiết công nợ tài xế Le quang huy (0935278494)
 * CHỈ ĐỌC — không sửa dữ liệu
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Đã kết nối MongoDB\n');

  const Driver = require('./models/Driver');
  const DebtTransaction = require('./models/DebtTransaction');

  const phone = process.argv[2] || '0935278494';
  const driver = await Driver.findOne({ phone }).lean();
  if (!driver) { console.log('Không tìm thấy tài xế!'); process.exit(1); }

  console.log(`🚗 ${driver.name} | ${driver.phone}`);
  console.log(`   walletDebt: ${driver.walletDebt}`);
  console.log(`   commissionRate: ${driver.commissionRate || 15}%\n`);

  const transactions = await DebtTransaction.find({ driverId: driver._id })
    .sort({ createdAt: 1 })
    .lean();

  console.log(`📋 Tổng giao dịch: ${transactions.length}\n`);

  // Group by targetDate
  const byDate = {};
  transactions.forEach(tx => {
    const dateStr = tx.targetDate || 'NO_DATE';
    if (!byDate[dateStr]) byDate[dateStr] = [];
    byDate[dateStr].push(tx);
  });

  const sortedDates = Object.keys(byDate).sort();
  
  let grandTotal = 0;

  for (const dateStr of sortedDates) {
    const txs = byDate[dateStr];
    let dateNet = 0;
    
    console.log(`${'═'.repeat(60)}`);
    console.log(`📅 NGÀY: ${dateStr}`);
    console.log(`${'─'.repeat(60)}`);
    
    txs.forEach((tx, i) => {
      const time = new Date(tx.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const sign = tx.amount >= 0 ? '+' : '';
      const statusIcon = tx.status === 'SUCCESS' ? '✅' : 
                         tx.status === 'PENDING' ? '⏳' : 
                         tx.status === 'DELETED' ? '🗑️' : 
                         tx.status === 'REJECTED' ? '❌' : '❓';
      
      console.log(`  ${i+1}. ${statusIcon} [${tx.status}] ${tx.type || 'N/A'} | ${sign}${tx.amount.toLocaleString()}đ`);
      console.log(`     Thời gian: ${time}`);
      console.log(`     Mô tả: ${tx.description || '(không có)'}`);
      if (tx.orderId) console.log(`     OrderId: ${tx.orderId}`);
      console.log('');
      
      if (tx.status === 'SUCCESS') {
        dateNet += tx.amount;
      }
    });
    
    console.log(`  📊 NỢ RÒNG ngày ${dateStr} (chỉ SUCCESS): ${dateNet.toLocaleString()}đ`);
    grandTotal += dateNet;
    console.log('');
  }

  console.log(`${'═'.repeat(60)}`);
  console.log(`💰 TỔNG NỢ RÒNG (tất cả ngày): ${grandTotal.toLocaleString()}đ`);
  console.log(`💰 walletDebt cached: ${(driver.walletDebt || 0).toLocaleString()}đ`);
  console.log(`${grandTotal === (driver.walletDebt || 0) ? '✅ KHỚP' : '⚠️ LỆCH!'}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
