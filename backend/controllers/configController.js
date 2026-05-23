const Config = require('../models/Config');

// Lấy cấu hình theo key
exports.getConfig = async (req, res) => {
  try {
    const { key } = req.params;
    let config = await Config.findOne({ key });
    
    if (!config) {
      // Nếu chưa có, trả về giá trị mặc định cho PRICING_CONFIG
      if (key === 'PRICING_CONFIG') {
        const defaultPricing = {
          basePrice: 15000,
          baseDistance: 2,
          pricePerKm: 5000
        };
        config = new Config({ key, value: defaultPricing });
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
