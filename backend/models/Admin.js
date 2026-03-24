const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên admin là bắt buộc'],
    trim: true,
    maxlength: [100, 'Tên không được quá 100 ký tự']
  },
  phone: {
    type: String,
    required: [true, 'Số điện thoại là bắt buộc'],
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Mật khẩu là bắt buộc'],
    minlength: [6, 'Mật khẩu phải ít nhất 6 ký tự']
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'staff'],
    default: 'admin'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index
adminSchema.index({ phone: 1 }, { unique: true });

module.exports = mongoose.model('Admin', adminSchema);
