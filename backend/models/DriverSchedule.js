const mongoose = require('mongoose');

const dayScheduleSchema = new mongoose.Schema(
  {
    shift: {
      type: String,
      enum: ['FULLTIME', 'PARTTIME', 'OFF'],
      default: 'PARTTIME'
    },
    // Số lần bấm Offline trong ngày (áp dụng khi shift là FULLTIME)
    offlineCount: {
      type: Number,
      default: 0
    },
    // Đánh dấu nếu bị hệ thống hạ từ Fulltime xuống Part-time do offline > 2 lần
    isDowngraded: {
      type: Boolean,
      default: false
    },
    downgradedAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const driverScheduleSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
      index: true
    },
    weekKey: {
      type: String,
      required: true,
      index: true // Ví dụ: "2026-W44"
    },
    schedule: {
      monday: { type: dayScheduleSchema, default: () => ({ shift: 'PARTTIME' }) },
      tuesday: { type: dayScheduleSchema, default: () => ({ shift: 'PARTTIME' }) },
      wednesday: { type: dayScheduleSchema, default: () => ({ shift: 'PARTTIME' }) },
      thursday: { type: dayScheduleSchema, default: () => ({ shift: 'PARTTIME' }) },
      friday: { type: dayScheduleSchema, default: () => ({ shift: 'PARTTIME' }) }
    },
    // Ghi nhận lịch sử đổi ca
    changeHistory: [
      {
        dayKey: { type: String, required: true },
        oldShift: { type: String, required: true },
        newShift: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        reason: { type: String, default: '' }
      }
    ],
    // Trạng thái đăng ký
    isSubmitted: {
      type: Boolean,
      default: false
    },
    submittedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Một tài xế chỉ có 1 bản ghi lịch cho 1 tuần cụ thể
driverScheduleSchema.index({ driverId: 1, weekKey: 1 }, { unique: true });

module.exports = mongoose.model('DriverSchedule', driverScheduleSchema);
