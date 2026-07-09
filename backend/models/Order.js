const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Phân loại hình thức dịch vụ
  serviceType: {
    type: String,
    enum: ['GIAO_HANG', 'DAT_XE', 'MUA_HO', 'DIEU_PHOI', 'DON_GHEP', 'ALOFOOD'],
    default: 'GIAO_HANG',
    index: true
  },
  // Tiểu phân loại (Ví dụ: XE_OM, LAI_HO_XE_MAY, NAP_TIEN, RUT_TIEN, GAP_TRUC_TIEP)
  subServiceType: {
    type: String,
    default: null
  },

  // Liên kết người dùng (Customer App)
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  
  // Liên kết đơn hàng Bakery App
  bakeryOrderId: {
    type: String,
    default: null,
    index: true
  },

  // Thông tin khách hàng (Người đặt chung)
  customerName: {
    type: String,
    required: [true, 'Tên người đặt là bắt buộc'],
    trim: true,
    maxlength: [100, 'Tên người đặt không quá 100 ký tự']
  },
  customerPhone: {
    type: String,
    required: [true, 'Số điện thoại người đặt là bắt buộc'],
    trim: true
  },
  pickupPhone: {
    type: String,
    trim: true,
    default: ''
  },
  // THÔNG TIN GIAO HÀNG (Người gửi / Người nhận)
  senderName: { type: String, trim: true },
  senderPhone: { type: String, trim: true },
  receiverName: { type: String, trim: true },
  receiverPhone: { type: String, trim: true },
  receiverPhone2: { type: String, trim: true }, // SĐT phụ người nhận (mới thêm)

  // Địa chỉ
  pickupAddress: {
    type: String,
    default: '',
    trim: true
  },
  
  // Danh sách hàng hóa
  items: {
    type: [String],
    default: []
  },
  deliveryAddress: {
    type: String,
    default: '',
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
  
  // Lời nhắn nhắc nhở tài xế (Admin ghi riêng)
  driverReminder: {
    type: String,
    default: ''
  },

  // Chi tiết dịch vụ: MUA_HO / GIAO_HANG
  packageDetails: {
    weight: { type: String, default: '' },
    itemsToBuy: { type: [String], default: [] }, // Cho mua hộ (ví dụ: ["Cơm sườn", "Trà đá"])
    isFragile: { type: Boolean, default: false },
    bulkyFee: { type: Number, default: 0 }, // Phí cồng kềnh
    description: { type: String, default: '' }
  },

  // Chi tiết dịch vụ: DAT_XE
  rideDetails: {
    vehicleType: { type: String, enum: ['XE_MAY', 'OTO'], default: 'XE_MAY' },
    vehicleClass: { type: String, default: '' }, // Có thể là 'TAY_GA', 'XE_SO' hoặc tên dòng xe Ô tô (VD: 'Mazda 3')
    passengerCount: { type: Number, default: 1 },
    surcharge: { type: Number, default: 0 } // Phụ phí lái hộ
  },

  // Chi tiết dịch vụ: DIEU_PHOI (Nạp/Rút Tài khoản)
  financialDetails: {
    bankAccount: { type: String, default: '' },
    bankAccountName: { type: String, default: '' }, // Tên chủ tài khoản
    bankName: { type: String, default: '' },
    transactionAmount: { type: Number, default: 0 }
  },

  // Chi tiết dịch vụ: ALOFOOD
  alofoodDetails: {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    foodTotal: { type: Number, default: 0 },
    cartItems: [{
      menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
      name: { type: String },
      quantity: { type: Number, default: 1 },
      price: { type: Number, default: 0 },
      note: { type: String, default: '' }
    }]
  },

  // Chi tiết dịch vụ: DON_GHEP (Đơn nhiều điểm giao)
  batchedDeliveries: [{
    receiverName: { type: String, trim: true },
    receiverPhone: { type: String, trim: true },
    deliveryAddress: { type: String, trim: true },
    deliveryCoordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null }
    },
    codAmount: { type: Number, default: 0 },
    fee: { type: Number, default: 0 },
    extraSurcharge: { type: Number, default: 0 },
    feePaidBy: { type: String, enum: ['SENDER', 'RECEIVER'], default: 'RECEIVER' },
    distanceKm: { type: Number, default: 0 },
    note: { type: String, default: '' },
    status: { type: String, enum: ['PENDING', 'DELIVERED', 'FAILED'], default: 'PENDING' }
  }],

  // Trạng thái đơn hàng
  // DRAFT (Lưu nháp/Đang sửa) -> PENDING -> ACCEPTED -> PICKED_UP -> DELIVERING -> COMPLETED
  //           CANCELLED (hủy bất kỳ lúc nào)
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING', 'ACCEPTED', 'PICKED_UP', 'DELIVERING', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  adminReviewed: {
    type: Boolean,
    default: false
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
  
  // Lịch hẹn giờ tự động đẩy đơn cho Tài xế
  scheduledPublishAt: {
    type: Date,
    default: null
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
  extraSurcharge: {
    type: Number,
    default: 0,
    min: 0
  },
  feePaidBy: {
    type: String,
    enum: ['SENDER', 'RECEIVER'],
    default: 'RECEIVER'
  },
  adminBonus: {
    type: Number,
    default: 0,
    min: 0
  },
  kpiBonus: {
    type: Number,
    default: 0,
    min: 0
  },
  commissionRate: {
    type: Number,
    default: null,
    min: 0,
    max: 100
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
  },
  pendingAssignTo: [{ // Gán tạm thời cho một nhóm tài xế gần nhất để đợi họ xác nhận (popup 30s cạnh tranh)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  }],
  rejectedBy: [{ // Danh sách các tài xế đã từ chối nhận đơn này (hoặc hết hạn popup)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  }]
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
orderSchema.index({ createdAt: -1 });
orderSchema.index({ deliveredAt: -1 });
orderSchema.index({ updatedAt: -1 });
orderSchema.index({ scheduledPublishAt: 1, status: 1 }); // Cho Cron Job

// Virtual: Mã đơn hàng
orderSchema.virtual('orderCode').get(function() {
  return `DH${this._id.toString().slice(-8).toUpperCase()}`;
});

module.exports = mongoose.model('Order', orderSchema);
