const mongoose = require('mongoose');
require('dotenv').config();

const resetCommissions = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lamnguyenship';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const Driver = mongoose.model('Driver', new mongoose.Schema({}, { strict: false }));
    
    // Tìm các tài xế có commissionRate !== 15 mà không phải do Admin khóa cố định (isCustomCommission !== true)
    const result = await Driver.updateMany(
      {
        commissionRate: { $ne: 15 },
        isCustomCommission: { $ne: true }
      },
      {
        $set: { commissionRate: 15 }
      }
    );

    console.log(`✅ Đã cập nhật ${result.modifiedCount} tài xế về mức chiết khấu chuẩn 15%`);
    process.exit(0);
  } catch (error) {
    console.error('Lỗi reset chiết khấu:', error);
    process.exit(1);
  }
};

resetCommissions();
