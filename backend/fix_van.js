const mongoose = require('mongoose');
require('dotenv').config();

const Driver = require('./models/Driver');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Tìm tài xế Phan lâm đình văn
    const driver = await Driver.findOne({ phone: '0944699881' });
    
    if (driver) {
      // Đặt nợ tổng bằng đúng nợ hôm nay
      driver.walletDebt = 18300;
      await driver.save();
      console.log('Thành công! Đã reset nợ của Phan lâm đình văn về:', driver.walletDebt, 'đ');
    } else {
      console.log('Không tìm thấy tài xế.');
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

run();
