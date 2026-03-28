const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Phân loại hình thức dịch vụ
  serviceType: {
    type: String,
    enum: ['GIAO_HANG', 'DAT_XE', 'MUA_HO', 'DIEU_PHOI'],
    default: 'GIAO_HANG',
    index: true
  },

  // Liên kết người dùng (Customer App)
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },

  // Thông tin khách hàng
  customerName: {
    type: String,
    required: [true, 'Tên khách hàng là bắt buộc'],
    trim: true,
    maxlength: [100, 'Tên khách hàng không được quá 100 ký tự']
  },
  customerPhone: {
    type: String,
    required: [true, 'Số điện thoại khách (giao hàng) là bắt buộc'],
    trim: true
  },
  pickupPhone: {
    type: String,
    default: '',
    trim: true
  },

  // Địa chỉ
  pickupAddress: {
    type: String,
    required: [true, 'Địa chỉ lấy hàng là bắt buộc'],
    trim: true
  },
  deliveryAddress: {
    type: String,
    required: [true, 'Địa chỉ giao hàng là bắt buộc'],
    trim: true
  },

  // Tọa độ (tùy chọn)
  pickupCoordinates: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  deliveryCoordinates: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },

  // Ghi chú chung
  note: {
    type: String,
    default: ''
  },

  // Chi tiết dịch vụ: MUA_HO / GIAO_HANG
  packageDetails: {
    weight: { type: String, default: '' },
    itemsToBuy: { type: [String], default: [] }, // Cho mua hộ (ví dụ: ["Cơm sườn", "Trà đá"])
    isFragile: { type: Boolean, default: false }
  },

  // Chi tiết dịch vụ: DAT_XE
  rideDetails: {
    vehicleType: { type: String, enum: ['XE_MAY', 'OTO'], default: 'XE_MAY' },
    passengerCount: { type: Number, default: 1 }
  },

  // Trạng thái đơn hàng
  // DRAFT (Lưu nháp/Đang sửa) -> PENDING -> ACCEPTED -> PICKED_UP -> DELIVERING -> COMPLETED
  //           CANCELLED (hủy bất kỳ lúc nào)
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING', 'ACCEPTED', 'PICKED_UP', 'DELIVERING', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },

  // Thông tin tài xế
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null,
    index: true
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  pickedUpAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  cancelReason: {
    type: String,
    default: null
  },

  // Thông tin tạo đơn (admin)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null // Đã đổi thành null vì Khách hàng từ Customer App cũng có thể tạo đơn
  },

  // Thông tin thanh toán
  codAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: 0
  },

  // Đánh giá
  rating: {
    type: Number,
    default: null,
    min: 1,
    max: 5
  },

  // Metadata
  ipAddress: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes cho truy vấn nhanh
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ assignedTo: 1, status: 1 });
orderSchema.index({ customerPhone: 1 });
orderSchema.index({ createdBy: 1 });

// Virtual: Mã đơn hàng
orderSchema.virtual('orderCode').get(function() {
  return `DH${this._id.toString().slice(-8).toUpperCase()}`;
});

module.exports = mongoose.model('Order', orderSchema);
