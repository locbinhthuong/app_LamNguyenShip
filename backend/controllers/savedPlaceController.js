const SavedPlace = require('../models/SavedPlace');

/**
 * Tìm kiếm gợi ý điểm lấy đã lưu (dùng cho autocomplete khi lên đơn)
 * GET /api/saved-places/search?q=...
 */
exports.searchSavedPlaces = async (req, res) => {
  try {
    const { q } = req.query;
    let query = {};

    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      query = {
        $or: [
          { name: searchRegex },
          { address: searchRegex },
          { phone: searchRegex }
        ]
      };
    }

    const places = await SavedPlace.find(query)
      .sort({ usageCount: -1, lastUsedAt: -1 })
      .limit(15)
      .lean();

    return res.json({
      success: true,
      data: places
    });
  } catch (error) {
    console.error('[SavedPlace] Search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tìm kiếm điểm lấy',
      error: error.message
    });
  }
};

/**
 * Tự động khớp điểm lấy và toạ độ đã ghim (dành cho Smart Paste Zalo/FB hoặc nhập địa chỉ)
 * GET /api/saved-places/match?address=...&phone=...
 */
exports.matchSavedPlace = async (req, res) => {
  try {
    const { address, phone } = req.query;
    const Order = require('../models/Order');

    let matched = null;

    // 1. Tìm ưu tiên theo Số điện thoại (nếu có SĐT)
    if (phone && phone.trim()) {
      const cleanPhone = phone.trim().replace(/\D/g, '');
      if (cleanPhone.length >= 9) {
        matched = await SavedPlace.findOne({
          phone: new RegExp(cleanPhone, 'i'),
          'coordinates.lat': { $ne: null }
        }).lean();

        if (!matched) {
          // Tìm trong Order cũ gần nhất
          const oldOrder = await Order.findOne({
            pickupPhone: new RegExp(cleanPhone, 'i'),
            'pickupCoordinates.lat': { $ne: null }
          }).sort({ createdAt: -1 }).lean();

          if (oldOrder && oldOrder.pickupCoordinates?.lat) {
            matched = {
              name: oldOrder.pickupAddress?.split(',')[0] || 'Điểm lấy quen',
              address: oldOrder.pickupAddress,
              phone: oldOrder.pickupPhone,
              coordinates: oldOrder.pickupCoordinates,
              fromHistory: true
            };
          }
        }
      }
    }

    // 2. Nếu chưa tìm thấy theo SĐT, tìm theo Địa chỉ / Tên quán
    if (!matched && address && address.trim()) {
      const cleanAddr = address.trim();
      const firstPart = cleanAddr.split(',')[0].trim();
      
      const escapedQuery = cleanAddr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedFirstPart = firstPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Tìm trong SavedPlace
      matched = await SavedPlace.findOne({
        $or: [
          { name: new RegExp(escapedFirstPart, 'i') },
          { address: new RegExp(escapedFirstPart, 'i') },
          { address: new RegExp(escapedQuery, 'i') }
        ],
        'coordinates.lat': { $ne: null }
      }).sort({ usageCount: -1, lastUsedAt: -1 }).lean();

      // Nếu chưa có trong SavedPlace, tìm trong Order cũ gần nhất
      if (!matched) {
        const oldOrder = await Order.findOne({
          $or: [
            { pickupAddress: new RegExp(escapedFirstPart, 'i') },
            { pickupAddress: new RegExp(escapedQuery, 'i') }
          ],
          'pickupCoordinates.lat': { $ne: null }
        }).sort({ createdAt: -1 }).lean();

        if (oldOrder && oldOrder.pickupCoordinates?.lat) {
          matched = {
            name: oldOrder.pickupAddress?.split(',')[0] || 'Điểm lấy quen',
            address: oldOrder.pickupAddress,
            phone: oldOrder.pickupPhone || '',
            coordinates: oldOrder.pickupCoordinates,
            fromHistory: true
          };
        }
      }
    }

    if (matched) {
      return res.json({
        success: true,
        matched: true,
        data: {
          name: matched.name,
          address: matched.address,
          phone: matched.phone || '',
          coordinates: matched.coordinates
        }
      });
    }

    return res.json({
      success: true,
      matched: false,
      data: null
    });
  } catch (error) {
    console.error('[SavedPlace] Match error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi khớp toạ độ điểm lấy',
      error: error.message
    });
  }
};

/**
 * Thêm mới hoặc cập nhật điểm lấy (gọi khi điều phối tạo đơn hoặc chủ động lưu)
 * POST /api/saved-places
 */
exports.upsertSavedPlace = async (req, res) => {
  try {
    const { name, phone, address, coordinates, category } = req.body;

    if (!name || !address || !coordinates || coordinates.lat == null || coordinates.lng == null) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đủ Tên, Địa chỉ và Tọa độ (lat, lng)'
      });
    }

    // Tìm xem đã có điểm lấy nào cùng tên hoặc cùng địa chỉ tương đối không
    const normalizedName = name.trim();
    let place = await SavedPlace.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { address: address.trim() }
      ]
    });

    if (place) {
      // Cập nhật tọa độ mới nhất và tăng usageCount
      place.name = normalizedName;
      if (phone) place.phone = phone.trim();
      place.address = address.trim();
      place.coordinates = {
        lat: Number(coordinates.lat),
        lng: Number(coordinates.lng)
      };
      if (category) place.category = category;
      place.usageCount = (place.usageCount || 0) + 1;
      place.lastUsedAt = new Date();
      await place.save();
    } else {
      // Tạo mới
      place = await SavedPlace.create({
        name: normalizedName,
        phone: phone ? phone.trim() : '',
        address: address.trim(),
        coordinates: {
          lat: Number(coordinates.lat),
          lng: Number(coordinates.lng)
        },
        category: category || 'RESTAURANT',
        usageCount: 1,
        lastUsedAt: new Date()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Đã lưu điểm lấy thành công',
      data: place
    });
  } catch (error) {
    console.error('[SavedPlace] Upsert error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lưu điểm lấy',
      error: error.message
    });
  }
};

/**
 * Lấy tất cả danh sách điểm lấy có phân trang (Admin quản lý)
 * GET /api/saved-places
 */
exports.getAllSavedPlaces = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [places, total] = await Promise.all([
      SavedPlace.find({})
        .sort({ usageCount: -1, lastUsedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SavedPlace.countDocuments({})
    ]);

    return res.json({
      success: true,
      data: places,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[SavedPlace] GetAll error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách điểm lấy',
      error: error.message
    });
  }
};

/**
 * Xóa điểm lấy
 * DELETE /api/saved-places/:id
 */
exports.deleteSavedPlace = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await SavedPlace.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy điểm lấy cần xóa'
      });
    }

    return res.json({
      success: true,
      message: 'Đã xóa điểm lấy'
    });
  } catch (error) {
    console.error('[SavedPlace] Delete error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa điểm lấy',
      error: error.message
    });
  }
};
