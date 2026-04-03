const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

module.exports = {
  // Lấy danh sách nhân viên
  getAllStaff: async (req, res) => {
    try {
      // Chỉ Admin root mới thấy tất cả, staff thì không được gọi API này (cần check)
      if (req.admin.role !== 'admin' && req.admin.role !== 'manager') {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền quản lý nhân viên' });
      }

      const staffs = await Admin.find({ role: { $in: ['staff', 'manager', 'admin'] } }).select('-password').sort({ createdAt: -1 });
      res.status(200).json({ success: true, count: staffs.length, data: staffs });
    } catch (error) {
      console.error('Error getAllStaff:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // Tạo nhân viên mới
  createStaff: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    if (req.admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ Quản trị viên mới được tạo tài khoản' });
    }

    try {
      const { name, phone, password, role } = req.body;

      const existingAdmin = await Admin.findOne({ phone });
      if (existingAdmin) {
        return res.status(400).json({ success: false, message: 'Số điện thoại này đã được sử dụng' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const staff = new Admin({
        name,
        phone,
        password: hashedPassword,
        role: role || 'staff',
        status: 'active'
      });

      await staff.save();
      const staffResponse = staff.toJSON();
      delete staffResponse.password;

      res.status(201).json({
        success: true,
        message: 'Tạo tài khoản nhân viên thành công',
        data: staffResponse
      });
    } catch (error) {
      console.error('Error createStaff:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // Sửa đổi nhân viên
  updateStaff: async (req, res) => {
    if (req.admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ Quản trị viên mới được thao tác' });
    }

    try {
      const { id } = req.params;
      const { name, phone, password, role, status } = req.body;

      const staff = await Admin.findById(id);
      if (!staff) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
      }
      
      // Không cho tự khóa account của mình đang dùng
      if (id === req.admin._id.toString() && status === 'inactive') {
          return res.status(400).json({ success: false, message: 'Không thể tự vô hiệu hóa tài khoản của bạn' });
      }

      if (phone && phone !== staff.phone) {
        const exist = await Admin.findOne({ phone });
        if (exist) {
          return res.status(400).json({ success: false, message: 'Số điện thoại đã tồn tại' });
        }
        staff.phone = phone;
      }

      if (name) staff.name = name;
      if (role) staff.role = role;
      if (status) staff.status = status;

      if (password && password.trim().length >= 6) {
        const salt = await bcrypt.genSalt(10);
        staff.password = await bcrypt.hash(password, salt);
      }

      await staff.save();
      const staffResponse = staff.toJSON();
      delete staffResponse.password;

      res.status(200).json({
        success: true,
        message: 'Cập nhật thành công',
        data: staffResponse
      });

    } catch (error) {
      console.error('Error updateStaff:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // Khoá / Tuất chức (Delete)
  deleteStaff: async (req, res) => {
    if (req.admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ Quản trị viên mới được thao tác' });
    }

    try {
      const { id } = req.params;
      
      if (id === req.admin._id.toString()) {
        return res.status(400).json({ success: false, message: 'Bạn không thể tự xóa tài khoản của mình!' });
      }

      const staff = await Admin.findByIdAndDelete(id);
      if (!staff) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
      }

      res.status(200).json({ success: true, message: 'Đã xoá tài khoản nhân viên' });
    } catch (error) {
      console.error('Error deleteStaff:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }
};
