const Announcement = require('../models/Announcement');
const fs = require('fs');
const path = require('path');

// Hàm hỗ trợ xóa file vật lý
const deletePhysicalFile = (fileUrl) => {
  if (!fileUrl) return;
  try {
    // fileUrl trả về có dạng /uploads/media/filename...
    // ta tìm đường dẫn tuyệt đối
    if (fileUrl.startsWith('/uploads/')) {
      const relativePath = fileUrl.replace('/uploads/', '');
      const absolutePath = path.join(__dirname, '../uploads', relativePath);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        console.log(`Đã dọn dẹp file rác: ${absolutePath}`);
      }
    }
  } catch (error) {
    console.error('Lỗi khi xóa file vật lý:', error);
  }
};

const announcementController = {
  // Public App Khách & Tài xế
  getActiveAnnouncements: async (req, res) => {
    try {
      const list = await Announcement.find({ isActive: true })
        .sort({ createdAt: -1 })
        .lean();
      res.status(200).json({ success: true, data: list });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi lấy bảng tin' });
    }
  },

  // Admin
  getAllAnnouncements: async (req, res) => {
    try {
      const list = await Announcement.find()
        .sort({ createdAt: -1 })
        .lean();
      res.status(200).json({ success: true, data: list });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  createAnnouncement: async (req, res) => {
    try {
      const { title, content, imageUrl, videoUrl, isActive } = req.body;
      const adminId = req.admin?._id || req.user?.id;

      const ann = new Announcement({
        title,
        content,
        imageUrl,
        videoUrl,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: adminId
      });

      await ann.save();
      res.status(201).json({ success: true, message: 'Tạo bảng tin thành công', data: ann });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi tạo bảng tin' });
    }
  },

  updateAnnouncement: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, imageUrl, videoUrl, isActive } = req.body;

      const oldAnn = await Announcement.findById(id);
      if (!oldAnn) return res.status(404).json({ success: false, message: 'Không tìm thấy tin' });

      // Nếu có cập nhật ảnh/video mới, xóa ảnh/video cũ khỏi ổ cứng
      if (imageUrl !== undefined && imageUrl !== oldAnn.imageUrl) {
        deletePhysicalFile(oldAnn.imageUrl);
      }
      if (videoUrl !== undefined && videoUrl !== oldAnn.videoUrl) {
        deletePhysicalFile(oldAnn.videoUrl);
      }

      const updateData = {};
      if (title) updateData.title = title;
      if (content) updateData.content = content;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
      if (isActive !== undefined) updateData.isActive = isActive;

      const newAnn = await Announcement.findByIdAndUpdate(id, updateData, { new: true });
      res.status(200).json({ success: true, message: 'Đã cập nhật', data: newAnn });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi cập nhật' });
    }
  },

  deleteAnnouncement: async (req, res) => {
    try {
      const { id } = req.params;
      const ann = await Announcement.findById(id);
      
      if (!ann) return res.status(404).json({ success: false, message: 'Không tìm thấy' });

      // Chặt rễ tận gốc Ảnh và Video trong ổ cứng VPS
      deletePhysicalFile(ann.imageUrl);
      deletePhysicalFile(ann.videoUrl);

      await Announcement.findByIdAndDelete(id);

      res.status(200).json({ success: true, message: 'Đã xóa tận gốc Bài viết và File đính kèm' });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi xóa bảng tin' });
    }
  }
};

module.exports = announcementController;
