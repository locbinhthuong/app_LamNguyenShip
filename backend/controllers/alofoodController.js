const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Review = require('../models/Review');

// Lấy 6 món ăn phổ biến nhất (dành cho Customer)
exports.getPopularItems = async (req, res) => {
  try {
    const popularItemsRaw = await MenuItem.find({ isAvailable: true })
      .sort({ soldCount: -1, createdAt: -1 })
      .limit(20)
      .populate('shopId', 'shopName coverImage isApprovedShop')
      .lean();
      
    const popularItems = popularItemsRaw.filter(item => item.shopId != null && item.shopId.isApprovedShop).slice(0, 6);
      
    res.json({ success: true, data: popularItems });
  } catch (error) {
    console.error('Error getting popular items:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Lấy danh sách quán ăn (dành cho Customer)
exports.getRestaurants = async (req, res) => {
  try {
    const { search, category, limit = 20, page = 1 } = req.query;
    const query = { role: 'SHOP', isActive: { $ne: false }, isOpen: { $ne: false }, isApprovedShop: true };
    
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
      .select('shopName shopAddress coverImage rating ratingCount defaultLocation isOpen isApprovedShop')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ rating: -1, createdAt: -1 })
      .lean();
      
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
      .select('shopName shopAddress coverImage rating ratingCount defaultLocation isOpen')
      .lean();
      
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy quán ăn' });
    }
    
    const menuItems = await MenuItem.find({ shopId: id }).lean();
    
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
      distance,
      deliveryAddress,
      deliveryCoordinates,
      customerName,
      customerPhone,
      note,
      scheduledTime,
      extraSurcharge
    } = req.body;

    const shop = await User.findOne({ _id: shopId, role: 'SHOP' });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy quán ăn' });
    }

    if (!shop.isOpen) {
      return res.status(400).json({ success: false, message: 'Quán ăn hiện đang đóng cửa' });
    }

    const orderController = require('./orderController');
    const surchargeReminder = await orderController.getLateNightSurchargeDriverReminder();
    
    let finalDeliveryFee = deliveryFee || 0;
    let calculatedSurcharge = await orderController.getLateNightSurchargeAmount();
    let finalExtraSurcharge = extraSurcharge || calculatedSurcharge;
    // Frontend already separated deliveryFee and extraSurcharge

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
      driverReminder: surchargeReminder || '',
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
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
      // Tài xế đến lấy đồ ăn chỉ phải trả tiền cho quán (foodTotal)
      // Khi giao cho khách, hệ thống sẽ tự động cộng (codAmount + deliveryFee + extraSurcharge)
      codAmount: foodTotal, 
      deliveryFee: finalDeliveryFee,
      extraSurcharge: finalExtraSurcharge,
      distanceKm: distance || 0,
      feePaidBy: 'RECEIVER',
      status: 'WAITING_SHOP'
    });

    await newOrder.save();
    
    // Gửi thông báo đẩy về cho cửa hàng
    try {
      if (shop && shop.fcmToken) {
        const { sendNotification } = require('../utils/notification');
        const titleShop = "🔔 Có đơn đặt đồ ăn mới!";
        const itemsStrShop = cartItems.map(item => `${item.quantity}x ${item.name}`).join(', ');
        const bodyShop = `Khách: ${customerName} - ${customerPhone}\nGiao đến: ${deliveryAddress}\nMón: ${itemsStrShop}\nGhi chú: ${note || 'Không có'}`;
        
        const finalBodyShop = bodyShop.length > 250 ? bodyShop.substring(0, 247) + '...' : bodyShop;
        
        await sendNotification(shop.fcmToken, titleShop, finalBodyShop, { url: `/shop/orders` });
      }
    } catch (pushErr) {
      console.error('Error sending push to shop for AloFood:', pushErr);
    }

    // Gửi thông báo đẩy về cho khách hàng
    try {
      const { sendNotification } = require('../utils/notification');
      const customer = await User.findById(customerId);
      if (customer && customer.fcmToken) {
        const title = "🥘 Đặt đơn đồ ăn thành công!";
        const itemsStr = cartItems.map(item => `${item.quantity}x ${item.name}`).join(', ');
        const body = `Món: ${itemsStr}\nGiao đến: ${deliveryAddress}\nNgười nhận: ${customerName} - ${customerPhone}\nGhi chú: ${note || 'Không có'}`;
        
        const finalBody = body.length > 250 ? body.substring(0, 247) + '...' : body;
        
        await sendNotification(customer.fcmToken, title, finalBody, { url: `/order/${newOrder._id}` });
      }
    } catch (pushErr) {
      console.error('Error sending push to customer for AloFood:', pushErr);
    }

    // Gửi sự kiện qua socket (nếu cần thiết)
    // const io = require('../sockets').getIo();
    // io.emit('new_order', newOrder);

    res.json({ success: true, data: newOrder });
  } catch (error) {
    console.error('Error creating food order:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tạo đơn' });
  }
};

// Lấy 5 đánh giá mới nhất của quán
exports.getReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const reviews = await Review.find({ shopId: id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
      
    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('Error getting reviews:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Khách hàng gửi đánh giá
exports.addReview = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { id: shopId } = req.params;
    const { rating, comment, customerName } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Điểm đánh giá không hợp lệ (1-5)' });
    }

    const review = new Review({
      shopId,
      customerId,
      customerName: customerName || 'Khách hàng',
      rating,
      comment
    });

    await review.save();

    // Cập nhật lại rating trung bình cho quán
    const mongoose = require('mongoose');
    const stats = await Review.aggregate([
      { $match: { shopId: new mongoose.Types.ObjectId(shopId) } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    if (stats.length > 0) {
      await User.findByIdAndUpdate(shopId, {
        rating: Math.round(stats[0].avgRating * 10) / 10,
        ratingCount: stats[0].count
      });
    }

    res.json({ success: true, data: review, message: 'Đánh giá thành công' });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
