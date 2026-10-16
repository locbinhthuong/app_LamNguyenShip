const mongoose = require('mongoose');

const driverOnlineSessionSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
    index: true
  },
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: {
    type: Date,
    default: null,
    index: true
  },
  durationMinutes: {
    type: Number,
    default: 0
  },
  durationSeconds: {
    type: Number,
    default: 0
  },
  date: {
    type: String, // 'YYYY-MM-DD' theo giờ Việt Nam (UTC+7)
    required: true,
    index: true
  },
  weekIdentifier: {
    type: String, // 'YYYY-Wxx' (ví dụ: '2026-W42')
    required: true,
    index: true
  },
  endReason: {
    type: String,
    enum: ['MANUAL', 'IDLE_TIMEOUT', 'ADMIN_FORCE', 'SERVER_SHUTDOWN', 'LOGOUT'],
    default: 'MANUAL'
  }
}, {
  timestamps: true
});

// Compound indexes để tối ưu tốc độ thống kê theo tuần và theo tài xế
driverOnlineSessionSchema.index({ driverId: 1, weekIdentifier: 1 });
driverOnlineSessionSchema.index({ driverId: 1, startTime: 1, endTime: 1 });
driverOnlineSessionSchema.index({ weekIdentifier: 1 });

module.exports = mongoose.model('DriverOnlineSession', driverOnlineSessionSchema);
