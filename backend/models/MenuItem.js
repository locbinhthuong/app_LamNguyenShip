const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Tên món là bắt buộc'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  price: {
    type: Number,
    required: [true, 'Giá tiền là bắt buộc'],
    min: 0
  },
  image: {
    type: String,
    default: null
  },
  images: {
    type: [String],
    default: [],
    validate: [v => v.length <= 3, 'Tối đa 3 ảnh']
  },
  category: {
    type: String,
    default: 'Khác',
    trim: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  soldCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes cho truy vấn nhanh
menuItemSchema.index({ shopId: 1 });
menuItemSchema.index({ shopId: 1, category: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
