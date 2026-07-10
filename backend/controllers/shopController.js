const MenuItem = require('../models/MenuItem');
const User = require('../models/User');

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
