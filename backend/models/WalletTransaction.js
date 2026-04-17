const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  type: {
    type: String,
    enum: ['DEPOSIT', 'WITHDRAW_REQUEST', 'WITHDRAW_SUCCESS', 'WITHDRAW_REJECT', 'ADMIN_ADJUST', 'BONUS'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'REJECTED'], // PENDING chỉ dùng cho WITHDRAW_REQUEST
    default: 'SUCCESS'
  },
  description: {
    type: String,
    trim: true
  },
  bankInfo: { // Lưu thông tin ngân hàng nếu là yêu cầu rút tiền
    bankName: String,
    accountNumber: String,
    accountName: String
  },
  createdByAdminId: { // Nếu Admin thao tác nạp/trừ/duyệt
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, {
  timestamps: true
});

// Index để truy vấn nhanh lịch sử ví của tài xế
walletTransactionSchema.index({ driverId: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
