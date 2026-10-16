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
  fcmToken: {
    type: String,
    default: ''
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
  cccd: {
    type: String,
    trim: true,
    default: null
  },
  gplx: {
    type: String,
    trim: true,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned', 'pending'],
    default: 'pending'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  isPriority5s: {
    type: Boolean,
    default: false
  },
  currentLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    updatedAt: { type: Date, default: null }
  },
  commissionRate: {
    type: Number,
    default: 20
  },
  // Hệ thống tính điểm và cấp bậc theo tuần
  driverTier: {
    type: Number,
    default: 1 // 1: Cấp 1 (Đồng), 2: Cấp 2 (Bạc), 3: Cấp 3 (Vàng)
  },
  weeklyPoints: {
    type: Number,
    default: 0 // 1 đơn hoàn thành = 1 điểm
  },
  currentWeek: {
    type: String,
    default: null // Ví dụ: "2026-W42"
  },
  lastWeekTier: {
    type: Number,
    default: 1 // Cấp bậc đạt được ở tuần trước
  },
  lastWeekPoints: {
    type: Number,
    default: 0 // Điểm tuần trước
  },
  isCustomCommission: {
    type: Boolean,
    default: false // Nếu true, admin chỉnh tay cố định, hệ thống không tự động ghi đè
  },
  walletDebt: {
    type: Number,
    default: 0
  },
  walletBalance: { // Ví điện tử chứa tiền dương (có thể Rút)
    type: Number,
    default: 0
  },
  processedPayOS: [{
    type: Number
  }],
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
  // Theo dõi treo app (online không nhận đơn) & khóa tạm thời
  idleSince: {
    type: Date,
    default: null
  },
  idleWarningLevel: {
    type: Number,
    default: 0 // 0: bình thường, 1: đã cảnh báo 2h, 2: đã cảnh báo + khóa 15p, 3: đã cảnh báo + khóa 12h
  },
  idleWarningSentAt: {
    type: Date,
    default: null
  },
  idleConfirmedAt: {
    type: Date,
    default: null
  },
  idleLockedUntil: {
    type: Date,
    default: null
  },
  idleOfflineAt: {
    type: Date,
    default: null
  },
  idleAccumulatedMs: {
    type: Number,
    default: 0
  },
  sessionToken: {
    type: String,
    default: null
  },
  appVersion: {
    type: String,
    default: null
  },
  devicePlatform: {
    type: String,
    default: null
  },
  // Quản lý phiên online để thống kê thời gian hoạt động
  currentOnlineSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DriverOnlineSession',
    default: null
  },
  lastOnlineAt: {
    type: Date,
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
