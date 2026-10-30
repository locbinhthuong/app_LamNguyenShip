const mongoose = require('mongoose');

const savedPlaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên điểm lấy / quán là bắt buộc'],
      trim: true,
      index: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      type: String,
      required: [true, 'Địa chỉ chi tiết là bắt buộc'],
      trim: true
    },
    coordinates: {
      lat: {
        type: Number,
        required: [true, 'Vĩ độ (lat) là bắt buộc']
      },
      lng: {
        type: Number,
        required: [true, 'Kinh độ (lng) là bắt buộc']
      }
    },
    category: {
      type: String,
      enum: ['RESTAURANT', 'SHOP', 'WAREHOUSE', 'CUSTOMER', 'OTHER'],
      default: 'RESTAURANT'
    },
    usageCount: {
      type: Number,
      default: 1
    },
    lastUsedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Hỗ trợ tìm kiếm nhanh theo tên và địa chỉ
savedPlaceSchema.index({ name: 'text', address: 'text' });
savedPlaceSchema.index({ usageCount: -1, lastUsedAt: -1 });

module.exports = mongoose.model('SavedPlace', savedPlaceSchema);
