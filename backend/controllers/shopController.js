const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const Order = require('../models/Order');

// Quán ăn xem danh sách món ăn của mình
exports.getMyMenu = async (req, res) => {
  try {
    const shopId = req.user.id;
    const menuItems = await MenuItem.find({ shopId }).sort({ createdAt: -1 });
    res.json({ success: true, data: menuItems });
  } catch (error) {
    console.error('Error getting my menu:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Quán ăn thêm món mới
exports.createMenuItem = async (req, res) => {
  try {
    const shopId = req.user.id;
    const { name, description, price, images, category, isAvailable } = req.body;

    let imageArr = [];
    if (images && Array.isArray(images)) {
      imageArr = images.slice(0, 3);
    } else if (req.body.image) {
      imageArr = [req.body.image];
    }

    const newItem = new MenuItem({
      shopId,
      name,
      description,
      price,
      images: imageArr,
      image: imageArr.length > 0 ? imageArr[0] : null,
      category,
      isAvailable
    });

    await newItem.save();
    res.json({ success: true, data: newItem });
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Quán ăn sửa món
exports.updateMenuItem = async (req, res) => {
  try {
    const shopId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    if (updates.images && Array.isArray(updates.images)) {
      updates.images = updates.images.slice(0, 3);
      if (updates.images.length > 0) {
        updates.image = updates.images[0];
      } else {
        updates.image = null;
      }
    }

    const item = await MenuItem.findOneAndUpdate(
      { _id: id, shopId },
      { $set: updates },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Quán ăn xóa món
exports.deleteMenuItem = async (req, res) => {
  try {
    const shopId = req.user.id;
    const { id } = req.params;

    const item = await MenuItem.findOneAndDelete({ _id: id, shopId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn' });
    }

    res.json({ success: true, message: 'Đã xóa món ăn' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Quán ăn cập nhật trạng thái mở cửa / thông tin
exports.updateShopProfile = async (req, res) => {
  try {
    const shopId = req.user.id;
    const { isOpen, coverImage, shopName, shopAddress, defaultLocation } = req.body;

    const updates = {};
    if (isOpen !== undefined) updates.isOpen = isOpen;
    if (coverImage !== undefined) updates.coverImage = coverImage;
    if (shopName !== undefined) updates.shopName = shopName;
    if (shopAddress !== undefined) updates.shopAddress = shopAddress;
    if (defaultLocation !== undefined) updates.defaultLocation = defaultLocation;

    const user = await User.findByIdAndUpdate(
      shopId,
      { $set: updates },
      { new: true }
    ).select('-password');

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating shop profile:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Lấy danh sách đơn hàng khách đặt của quán
exports.getIncomingOrders = async (req, res) => {
  try {
    const shopId = req.user.id;
    
    // Tìm các đơn hàng ALOFOOD có shopId trùng với quán
    const orders = await Order.find({ 
      serviceType: 'ALOFOOD', 
      'alofoodDetails.shopId': shopId 
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error getting incoming orders:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Quán ăn chấp nhận đơn hàng
exports.acceptAlofoodOrder = async (req, res) => {
  try {
    const shopId = req.user.id;
    const { id } = req.params;

    const order = await Order.findOneAndUpdate(
      { _id: id, serviceType: 'ALOFOOD', 'alofoodDetails.shopId': shopId, status: 'WAITING_SHOP' },
      { $set: { status: 'PENDING' } },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Đơn hàng không hợp lệ hoặc đã xử lý' });
    }

    if (order.customerId) {
      const User = require('../models/User');
      const { sendNotification } = require('../utils/notification');
      const customer = await User.findById(order.customerId);
      if (customer && customer.fcmToken) {
        await sendNotification(
          customer.fcmToken, 
          "✅ Quán đã nhận đơn!", 
          `Đơn hàng #${order.orderCode} đã được quán xác nhận và đang tìm tài xế giao cho bạn.`, 
          { url: `/customer/order/${order._id}` }
        );
      }
    }

    if (req.io) {
      const { emitNewOrder } = require('../sockets/index');
      const payload = typeof order.toObject === 'function' ? order.toObject({ virtuals: true }) : order;
      emitNewOrder(req.io, payload);
    }

    res.json({ success: true, message: 'Đã nhận đơn', data: order });
  } catch (error) {
    console.error('Error acceptAlofoodOrder:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Quán ăn từ chối đơn hàng
exports.rejectAlofoodOrder = async (req, res) => {
  try {
    const shopId = req.user.id;
    const { id } = req.params;
    const { cancelReason } = req.body;

    if (!cancelReason) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do hủy đơn' });
    }

    const order = await Order.findOneAndUpdate(
      { _id: id, serviceType: 'ALOFOOD', 'alofoodDetails.shopId': shopId, status: 'WAITING_SHOP' },
      { $set: { status: 'CANCELLED', cancelReason } },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Đơn hàng không hợp lệ hoặc đã xử lý' });
    }

    if (order.customerId) {
      const User = require('../models/User');
      const { sendNotification } = require('../utils/notification');
      const customer = await User.findById(order.customerId);
      if (customer && customer.fcmToken) {
        await sendNotification(
          customer.fcmToken, 
          "❌ Quán đã hủy đơn", 
          `Đơn hàng #${order.orderCode} bị hủy. Lý do: ${cancelReason}`, 
          { url: `/customer/order/${order._id}` }
        );
      }
    }

    if (req.io) {
      req.io.to('admins').emit('order_updated', order);
    }

    res.json({ success: true, message: 'Đã hủy đơn', data: order });
  } catch (error) {
    console.error('Error rejectAlofoodOrder:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Quán ăn bàn giao cho tài xế
exports.handoverAlofoodOrder = async (req, res) => {
  try {
    const shopId = req.user.id;
    const { id } = req.params;

    // Chỉ cập nhật nếu đơn hàng đang ở trạng thái ACCEPTED (hoặc PENDING nếu chưa có xế nhưng quán đã xong, tuy nhiên chuẩn nhất là ACCEPTED)
    const order = await Order.findOneAndUpdate(
      { _id: id, serviceType: 'ALOFOOD', 'alofoodDetails.shopId': shopId, status: { $in: ['ACCEPTED', 'PENDING'] } },
      { $set: { status: 'PICKED_UP', pickedUpAt: new Date() } },
      { new: true }
    ).populate('assignedTo', 'name phone');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Đơn hàng không hợp lệ hoặc không thể bàn giao lúc này' });
    }

    if (order.customerId) {
      const User = require('../models/User');
      const { sendNotification } = require('../utils/notification');
      const customer = await User.findById(order.customerId);
      if (customer && customer.fcmToken) {
        await sendNotification(
          customer.fcmToken, 
          "📦 Quán đã giao hàng cho tài xế!", 
          `Tài xế đã nhận hàng và đang trên đường giao đến bạn.`, 
          { url: `/customer/order/${order._id}` }
        );
      }
    }

    if (req.io) {
      const { emitOrderPickedUp } = require('../sockets/index');
      emitOrderPickedUp(req.io, order);
    }

    res.json({ success: true, message: 'Đã giao cho tài xế', data: order });
  } catch (error) {
    console.error('Error handoverAlofoodOrder:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
