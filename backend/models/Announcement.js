const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['PROMO', 'NEWS', 'NOTIFICATION', 'TERMS_DRIVER', 'TERMS_CUSTOMER', 'BANNER'],
    default: 'NOTIFICATION'
  },
  title: {
    type: String,
    required: function() { return this.type !== 'BANNER'; },
    trim: true
  },
  content: {
    type: String,
    required: function() { return this.type !== 'BANNER'; }
  },
  imageUrl: {
    type: String,
    default: ''
  },
  videoUrl: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
