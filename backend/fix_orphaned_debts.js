require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');
const Driver = require('./models/Driver');
const DebtTransaction = require('./models/DebtTransaction');

async function fixOrphanedDebts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const feeDeductions = await DebtTransaction.find({ type: 'FEE_DEDUCTION' });
    let refundCount = 0;
    let totalRefundAmount = 0;

    for (const debtTx of feeDeductions) {
      if (!debtTx.orderId) continue;
      
      const order = await Order.findById(debtTx.orderId);
      let shouldRefund = false;

      if (!order) {
        console.log(`Order ${debtTx.orderId} NOT FOUND. Refunding debt ${debtTx.amount} cho tài xế ${debtTx.driverId}`);
        shouldRefund = true;
      } else if (order.status === 'CANCELLED') {
        console.log(`Order ${order.orderCode} CANCELLED. Refunding debt ${debtTx.amount} cho tài xế ${debtTx.driverId}`);
        shouldRefund = true;
      }

      if (shouldRefund) {
        if (debtTx.driverId) {
          await Driver.findByIdAndUpdate(debtTx.driverId, { $inc: { walletDebt: -debtTx.amount } });
          await DebtTransaction.findByIdAndDelete(debtTx._id);
          refundCount++;
          totalRefundAmount += debtTx.amount;
        }
      }
    }

    console.log(`\nDONE! Refunded ${refundCount} transactions, total amount: ${totalRefundAmount} đ`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixOrphanedDebts();
