const User = require('../models/User');
const bcrypt = require('bcryptjs');

const userController = {
  // Quản lý Khách Hàng cho Admin
  getUsers: async (req, res) => {
    try {
      const users = await User.find({ role: { $in: ['CUSTOMER', 'SHOP'] } }).sort({ createdAt: -1 }).select('-password');
      res.json({ success: true, data: users });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  createUser: async (req, res) => {
    try {
      const { name, phone, password } = req.body;
      const existingUser = await User.findOne({ phone });
      if (existingUser) return res.status(400).json({ success: false, message: 'Số điện thoại đã tồn tại' });
      
      const hashedPassword = await bcrypt.hash(password || '123456', 10);
      const newUser = new User({
        name, phone, password: hashedPassword, role: 'CUSTOMER'
      });
      await newUser.save();
      
      const userObj = newUser.toObject();
      delete userObj.password;
      res.json({ success: true, data: userObj });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  updateUser: async (req, res) => {
    try {
      const { name, phone, password, isActive } = req.body;
      const updateData = {};
      if (name) updateData.name = name;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      if (phone) {
        const existingUser = await User.findOne({ phone, _id: { $ne: req.params.id } });
        if (existingUser) return res.status(400).json({ success: false, message: 'Số điện thoại đã tồn tại ở tài khoản khác' });
        updateData.phone = phone;
      }

      if (password) {
         updateData.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
      res.json({ success: true, data: updatedUser });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  deleteUser: async (req, res) => {
    try {
      await User.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: 'Đã xóa tài khoản' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }
};

module.exports = userController;
