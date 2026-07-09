const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');

// Lấy danh sách quán ăn (dành cho Customer)
exports.getRestaurants = async (req, res) => {
  try {
    const { search, category, limit = 20, page = 1 } = req.query;
    const query = { role: 'SHOP', isActive: true, isOpen: true };
    
    if (search) {
      query.$or = [
        { shopName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.categories = category;
    }

    const skip = (page - 1) * limit;
    
    const restaurants = await User.find(query)
      .select('shopName shopAddress coverImage rating ratingCount defaultLocation isOpen')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ rating: -1, createdAt: -1 });
      
    res.json({ success: true, data: restaurants });
  } catch (error) {
    console.error('Error getting restaurants:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Lấy thông tin chi tiết và menu của 1 quán
exports.getRestaurantMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await User.findOne({ _id: id, role: 'SHOP' })
      .select('shopName shopAddress coverImage rating ratingCount defaultLocation isOpen');
      
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy quán ăn' });
    }
    
    const menuItems = await MenuItem.find({ shopId: id, isAvailable: true });
    
    res.json({ success: true, data: { restaurant, menuItems } });
  } catch (error) {
    console.error('Error getting menu:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Khách hàng đặt món
exports.createFoodOrder = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { 
      shopId, 
      cartItems, 
      foodTotal, 
      deliveryFee, 
      totalAmount,
      deliveryAddress,
      deliveryCoordinates,
      customerName,
      customerPhone,
      note 
    } = req.body;

    const shop = await User.findOne({ _id: shopId, role: 'SHOP' });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy quán ăn' });
    }

    if (!shop.isOpen) {
      return res.status(400).json({ success: false, message: 'Quán ăn hiện đang đóng cửa' });
    }

    // Prepare order data
    const newOrder = new Order({
      serviceType: 'ALOFOOD',
      customerId,
      customerName,
      customerPhone,
      pickupAddress: shop.shopAddress || shop.defaultLocation?.address || '',
      pickupCoordinates: shop.defaultLocation || { lat: null, lng: null },
      deliveryAddress,
      deliveryCoordinates,
      note,
      alofoodDetails: {
        shopId,
        foodTotal,
        cartItems: cartItems.map(item => ({
          menuItemId: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          note: item.note || ''
        }))
      },
      // Tài xế đến lấy đồ ăn phải trả tiền cho quán (foodTotal)
      // Khi giao cho khách sẽ thu lại (foodTotal + deliveryFee)
      // Nên phần codAmount = foodTotal + deliveryFee
      codAmount: foodTotal + deliveryFee, 
      deliveryFee: deliveryFee,
      feePaidBy: 'RECEIVER',
      status: 'PENDING'
    });

    await newOrder.save();
    
    // Gửi sự kiện qua socket (nếu cần thiết)
    // const io = require('../sockets').getIo();
    // io.emit('new_order', newOrder);

    res.json({ success: true, data: newOrder });
  } catch (error) {
    console.error('Error creating food order:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tạo đơn' });
  }
};
