const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken, onlyDriver } = require('../middleware/auth');
const fs = require('fs');

// Cấu hình Nơi lưu trữ và Tên file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});

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

    // Gắn đường dẫn tương đối để App Tự Nội Suy từ VITE_API_URL, chống lại lỗi Mixed Content từ Proxy HTTP -> HTTPS
    const fileUrl = `/uploads/${req.file.filename}`;

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

// Cấu hình Nơi lưu trữ cho Media chung (News, Video, Image)
const mediaStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/media');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'media-' + uniqueSuffix + ext);
  }
});

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

    const fileUrl = `/uploads/media/${req.file.filename}`;
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
