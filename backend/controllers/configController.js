const Config = require('../models/Config');

// Lấy cấu hình theo key
exports.getConfig = async (req, res) => {
  try {
    const { key } = req.params;
    let config = await Config.findOne({ key });
    
    if (!config) {
      // Nếu chưa có, trả về giá trị mặc định cho cấu hình
      if (key === 'PRICING_CONFIG') {
        const defaultPricing = {
          tiers: [
            { maxKm: 3, price: 17000, type: 'fixed' },
            { maxKm: 4, price: 20000, type: 'fixed' },
            { maxKm: 5, price: 22000, type: 'fixed' },
            { maxKm: 6, price: 25000, type: 'fixed' },
            { maxKm: 8, price: 27000, type: 'fixed' },
            { maxKm: 10, price: 35000, type: 'fixed' },
            { maxKm: 99999, price: 5000, type: 'per_km' }
          ]
        };
        config = new Config({ key, value: defaultPricing });
        await config.save();
      } else if (key === 'REGION_CONFIG') {
        config = new Config({ key, value: ['Cần Thơ', 'Vĩnh Long'] });
        await config.save();
      } else if (key === 'APP_VERSION_CONFIG') {
        const defaultAppVersion = {
          driverApp: {
            minVersion: "1.0.0",
            storeUrlAndroid: "market://details?id=vn.lamnguyenship.driver",
            storeUrlIos: "itms-apps://itunes.apple.com/app/idYOUR_ID"
          },
          customerApp: {
            minVersion: "1.0.0",
            storeUrlAndroid: "market://details?id=vn.lamnguyenship.customer",
            storeUrlIos: "itms-apps://itunes.apple.com/app/idYOUR_ID"
          }
        };
        config = new Config({ key, value: defaultAppVersion });
        await config.save();
      } else if (key === 'LATE_NIGHT_SURCHARGE_CONFIG') {
        const defaultSurcharge = {
          level1: { time: "22:30", amount: 3000 },
          level2: { time: "23:30", amount: 5000 },
          endTime: "06:00"
        };
        config = new Config({ key, value: defaultSurcharge });
        await config.save();
      } else {
        return res.status(404).json({ success: false, message: 'Không tìm thấy cấu hình' });
      }
    }
    
    res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error('Lỗi khi lấy cấu hình:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Cập nhật cấu hình theo key
exports.updateConfig = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (!value) {
      return res.status(400).json({ success: false, message: 'Dữ liệu cấu hình không hợp lệ' });
    }

    const config = await Config.findOneAndUpdate(
      { key },
      { value },
      { new: true, upsert: true } // Nếu chưa có thì tạo mới
    );

    res.status(200).json({ success: true, data: config, message: 'Đã cập nhật cấu hình thành công' });
  } catch (error) {
    console.error('Lỗi khi cập nhật cấu hình:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
