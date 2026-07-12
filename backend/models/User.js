const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, 'Số điện thoại là bắt buộc'],
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Mật khẩu là bắt buộc']
  },
  name: {
    type: String,
    required: [true, 'Họ tên là bắt buộc'],
    trim: true
  },
  avatar: {
    type: String, // Đường dẫn đến ảnh đại diện
    default: null
  },
  role: {
    type: String,
    enum: ['CUSTOMER', 'SHOP'],
    default: 'CUSTOMER'
  },
  region: {
    type: String,
    default: null
  },
  // Fields for SHOP role
  shopName: {
    type: String,
    trim: true,
    default: null
  },
  shopAddress: {
    type: String,
    trim: true,
    default: null
  },
  coverImage: {
    type: String,
    default: null
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 5.0
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  categories: [{
    type: String
  }],
  // For SHOP role approval
  isApprovedShop: {
    type: Boolean,
    default: false
  },
  // Default location for pinning on map
  defaultLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    address: { type: String, default: null }
  },
  fcmToken: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes cho truy vấn nhanh
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
