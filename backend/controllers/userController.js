const User = require('../models/User');
const bcrypt = require('bcryptjs');

const userController = {
  // Quản lý Khách Hàng cho Admin
  getUsers: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 1000;
      const page = parseInt(req.query.page) || 1;
      const skip = (page - 1) * limit;

      const { verificationStatus, role } = req.query;
      const query = {};
      if (role) {
        query.role = role;
      } else {
        query.role = { $in: ['CUSTOMER', 'SHOP'] };
      }
      if (verificationStatus) {
        if (verificationStatus === 'PENDING') {
          query.verificationStatus = { $in: ['PENDING', 'UNVERIFIED'] };
        } else {
          query.verificationStatus = verificationStatus;
        }
      }

      const sortQuery = verificationStatus === 'PENDING'
        ? { verificationRequestedAt: -1, createdAt: -1 }
        : { createdAt: -1 };

      const [users, total, pendingCount, verifiedCount, rejectedCount] = await Promise.all([
        User.find(query)
          .sort(sortQuery)
          .select('-password')
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(query),
        User.countDocuments({ role: { $in: ['CUSTOMER', 'SHOP'] }, verificationStatus: { $in: ['PENDING', 'UNVERIFIED'] } }),
        User.countDocuments({ role: { $in: ['CUSTOMER', 'SHOP'] }, verificationStatus: 'VERIFIED' }),
        User.countDocuments({ role: { $in: ['CUSTOMER', 'SHOP'] }, verificationStatus: 'REJECTED' })
      ]);

      res.status(200).json({
        success: true,
        data: users,
        counts: {
          pending: pendingCount,
          verified: verifiedCount,
          rejected: rejectedCount
        },
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total
        }
      });
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
      const { name, phone, password, isActive, region, isApprovedShop } = req.body;
      const updateData = {};
      if (name) updateData.name = name;
      if (region !== undefined) updateData.region = region;
      if (isApprovedShop !== undefined) updateData.isApprovedShop = isApprovedShop;
      if (isActive !== undefined) {
        updateData.isActive = isActive;
        if (isActive === true) {
          const currentUser = await User.findById(req.params.id);
          if (currentUser && currentUser.name) {
             updateData.name = currentUser.name.replace(/\s*\(Đã (xoá|xóa)\)/gi, '');
          }
        }
      }
      
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
  },

  requestVerification: async (req, res) => {
    try {
      const userId = req.customer?._id || req.user?.id;
      const { zaloPhone, verificationNote } = req.body;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
      }

      user.verificationStatus = 'PENDING';
      user.verificationRequestedAt = new Date();
      if (zaloPhone) user.zaloPhone = zaloPhone;
      if (verificationNote) user.verificationNote = verificationNote;
      user.rejectReason = null;
      await user.save();

      if (req.io) {
        req.io.to('admin_room').emit('new_verification_request', {
          userId: user._id,
          name: user.name,
          phone: user.phone,
          zaloPhone: user.zaloPhone || user.phone,
          role: user.role,
          shopName: user.shopName,
          verificationRequestedAt: user.verificationRequestedAt,
          verificationNote: user.verificationNote
        });
      }

      res.status(200).json({
        success: true,
        message: 'Đã gửi yêu cầu xác minh. Ban quản trị sẽ kiểm tra SĐT/Zalo của bạn trong ít phút!',
        data: {
          verificationStatus: user.verificationStatus,
          verificationRequestedAt: user.verificationRequestedAt,
          zaloPhone: user.zaloPhone,
          verificationNote: user.verificationNote
        }
      });
    } catch (error) {
      console.error('Error requestVerification:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi gửi yêu cầu xác minh' });
    }
  },

  verifyUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, rejectReason } = req.body;
      if (!['VERIFIED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Trạng thái xác minh không hợp lệ' });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }

      user.verificationStatus = status;
      if (status === 'VERIFIED') {
        user.verifiedAt = new Date();
        user.verifiedBy = req.admin?._id || req.user?.id || null;
        user.rejectReason = null;
        if (user.role === 'SHOP') {
          user.isApprovedShop = true;
        }
      } else {
        user.rejectReason = rejectReason || 'Số điện thoại không thể liên lạc hoặc chưa xác định được Zalo chính chủ';
      }

      await user.save();

      if (req.io) {
        const payload = {
          userId: user._id,
          verificationStatus: user.verificationStatus,
          verifiedAt: user.verifiedAt,
          rejectReason: user.rejectReason,
          message: status === 'VERIFIED'
            ? '🎉 Tài khoản của bạn đã được Admin xác minh thành công! Bạn có thể sử dụng tất cả dịch vụ ngay bây giờ.'
            : `⚠️ Yêu cầu xác minh bị từ chối: ${user.rejectReason}`
        };
        req.io.to(`customer_${user._id}`).emit('user_verification_updated', payload);
        req.io.to(`shop_${user._id}`).emit('user_verification_updated', payload);
      }

      res.status(200).json({
        success: true,
        message: status === 'VERIFIED' ? 'Đã phê duyệt tài khoản thành công' : 'Đã từ chối tài khoản',
        data: {
          id: user._id,
          verificationStatus: user.verificationStatus,
          verifiedAt: user.verifiedAt,
          rejectReason: user.rejectReason
        }
      });
    } catch (error) {
      console.error('Error verifyUser:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi xác minh tài khoản' });
    }
  },
};

module.exports = userController;
