const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên tài xế là bắt buộc'],
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
  },
  zaloId: {
    type: String,
    unique: true,
    sparse: true
  },
  avatar: {
    type: String,
    default: null
  },
  vehicleType: {
    type: String,
    enum: ['motorcycle', 'car', 'bike'],
    default: 'motorcycle'
  },
  licensePlate: {
    type: String,
    trim: true,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned'],
    default: 'active'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  currentLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    updatedAt: { type: Date, default: null }
  },
  // Thống kê
  stats: {
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatingCount: { type: Number, default: 0 }
  },
  lastActive: {
    type: Date,
    default: null
  },
  sessionToken: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index
driverSchema.index({ status: 1, isOnline: 1 });

// Virtual: Mã tài xế
driverSchema.virtual('driverCode').get(function() {
  return `TX${this._id.toString().slice(-6).toUpperCase()}`;
});

// Virtual: Tỷ lệ hoàn thành
driverSchema.virtual('completionRate').get(function() {
  if (this.stats.totalOrders === 0) return 0;
  return Math.round((this.stats.completedOrders / this.stats.totalOrders) * 100);
});

module.exports = mongoose.model('Driver', driverSchema);
