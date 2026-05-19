require('dotenv').config();
const mongoose = require('mongoose');
const Driver = require('./models/Driver');
const DebtTransaction = require('./models/DebtTransaction');
const Order = require('./models/Order');

async function verify19May() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');
  console.log('=== KIỂM TRA CÔNG NỢ NGÀY 19/5/2026 ===\n');

  // Lấy tất cả đơn hàng COMPLETED ngày 19/5
  const startOfDay = new Date('2026-05-19T00:00:00+07:00');
  const endOfDay = new Date('2026-05-19T23:59:59+07:00');

  const orders = await Order.find({
    status: 'COMPLETED',
    deliveredAt: { $gte: startOfDay, $lte: endOfDay },
    assignedTo: { $ne: null }
  }).populate('assignedTo', 'name phone commissionRate').lean();

  console.log(`📦 Tổng đơn hoàn thành ngày 19/5: ${orders.length}\n`);

  // Gom nhóm đơn theo tài xế
  const ordersByDriver = {};
  for (const order of orders) {
    if (!order.assignedTo) continue;
    const driverId = order.assignedTo._id.toString();
    if (!ordersByDriver[driverId]) {
      ordersByDriver[driverId] = { driver: order.assignedTo, orders: [] };
    }
    ordersByDriver[driverId].orders.push(order);
  }

  let allCorrect = true;

  for (const [driverId, { driver, orders }] of Object.entries(ordersByDriver)) {
    // Tính chiết khấu đúng từ đơn hàng
    let expectedDebt = 0;
    for (const order of orders) {
      const commissionRate = order.commissionRate != null ? order.commissionRate : (driver.commissionRate || 15);
      const fee = order.deliveryFee || 0;
      expectedDebt += Math.round(fee * commissionRate / 100);
    }

    // Lấy tổng FEE_DEDUCTION ngày 19/5 trong DB
    const feeTxs = await DebtTransaction.find({
      driverId: driverId,
      type: 'FEE_DEDUCTION',
      targetDate: '2026-05-19'
    });
    const actualDebt = feeTxs.reduce((sum, tx) => sum + tx.amount, 0);

    const match = expectedDebt === actualDebt;
    if (!match) allCorrect = false;

    const icon = match ? '✅' : '❌';
    console.log(`${icon} ${driver.name} (${driver.phone})`);
    console.log(`   Số đơn: ${orders.length} | Chiết khấu đúng: ${expectedDebt}đ | DB hiện tại: ${actualDebt}đ`);

    if (!match) {
      console.log(`   ⚠️  CHÊNH LỆCH: ${actualDebt - expectedDebt}đ`);
      // Liệt kê từng đơn
      for (const order of orders) {
        const rate = order.commissionRate != null ? order.commissionRate : (driver.commissionRate || 15);
        const deduction = Math.round((order.deliveryFee || 0) * rate / 100);
        console.log(`   - ${order.orderCode}: phí ${order.deliveryFee}đ x ${rate}% = ${deduction}đ`);
      }
    }
    console.log('');
  }

  if (allCorrect) {
    console.log('🎉 TẤT CẢ CÔNG NỢ NGÀY 19/5 ĐỀU CHÍNH XÁC!');
  } else {
    console.log('⚠️  CÓ TÀI XẾ BỊ CHÊNH LỆCH. Cần kiểm tra thêm!');
  }

  process.exit(0);
}

verify19May().catch(e => {
  console.error('Lỗi:', e.message);
  process.exit(1);
});
