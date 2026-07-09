const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken, onlyDriver } = require('../middleware/auth');
const fs = require('fs');

// Cấu hình Nơi lưu trữ trên Memory (Do Vercel không cho phép lưu file tĩnh)
const storage = multer.memoryStorage();

// Bộ lọc Ảnh (Chỉ nhận Image)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file định dạng hình ảnh.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
  }
});

// POST /api/upload/avatar - Trả về Link file ảnh sau khi Upload thành công
router.post('/avatar', verifyToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Chưa có file nào được tải lên.' });
    }

    // Chuyển buffer thành chuỗi Base64 Data URI để frontend lưu thẳng vào Database
    const fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    res.status(200).json({
      success: true,
      message: 'Upload ảnh thành công!',
      data: {
        url: fileUrl
      }
    });

  } catch (error) {
    console.error('Error in Upload Avatar:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lưu file ảnh.' });
  }
});

// Cấu hình Nơi lưu trữ cho Media chung trên Memory
const mediaStorage = multer.memoryStorage();

const mediaFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file hình ảnh hoặc video.'), false);
  }
};

const uploadMedia = multer({ 
  storage: mediaStorage,
  fileFilter: mediaFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // Giới hạn Video 50MB
  }
});

// POST /api/upload/media - Dành cho admin up file Bảng tin
router.post('/media', verifyToken, uploadMedia.single('media'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Chưa có file nào được tải lên.' });
    }

    // Chuyển buffer thành chuỗi Base64 Data URI
    const fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const fileType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

    res.status(200).json({
      success: true,
      message: 'Upload file thành công!',
      data: {
        url: fileUrl,
        type: fileType
      }
    });

  } catch (error) {
    console.error('Error in Upload Media:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lưu file media.' });
  }
});

module.exports = router;
