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

    // Gắn Host URL vào File. Với Dev server (chạy local ngrok hoặc ip):
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${hostUrl}/uploads/${req.file.filename}`;

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

module.exports = router;
