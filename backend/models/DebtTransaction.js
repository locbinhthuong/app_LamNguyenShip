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
  description: {
    type: String,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  createdByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('DebtTransaction', debtTransactionSchema);
