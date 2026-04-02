const mongoose = require('mongoose');

const debtTransactionSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  type: {
    type: String, // 'FEE_DEDUCTION' (Cuốc xe thu phí), 'PENALTY' (Phạt), 'PAYMENT' (Tài xế nạp tiền trả nợ)
    enum: ['FEE_DEDUCTION', 'PENALTY', 'PAYMENT'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'REJECTED'],
    default: 'SUCCESS' // Default is SUCCESS for fee_deductions and pre-existing payments
  },
  description: {
    type: String,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  targetDate: { // Dùng để xác định Khoản Nợ hoặc Thanh Toán thuộc về khung ngày nào (YYYY-MM-DD)
    type: String,
    default: null
  },
  createdByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('DebtTransaction', debtTransactionSchema);
