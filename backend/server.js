require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const driverRoutes = require('./routes/driverRoutes');
const revenueRoutes = require('./routes/revenueRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const debtRoutes = require('./routes/debtRoutes');
const walletRoutes = require('./routes/walletRoutes');
const { setupSocket } = require('./sockets/index');

const app = express();
app.set('trust proxy', 1); // Bắt buộc khi chạy sau Nginx Reverse Proxy
const server = http.createServer(app);

// ==================== CORS ====================
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.DRIVER_APP_URL,
      process.env.ADMIN_APP_URL,
      process.env.CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:5177',
    ].filter(Boolean);

    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin) || origin.includes('localhost')) {
      return callback(null, true);
    }
    try {
      const host = new URL(origin).hostname;
      if (host.endsWith('.vercel.app') || host.endsWith('.aloshipp.com') || host === 'aloshipp.com') {
        return callback(null, true);
      }
    } catch (_) {
      /* ignore */
    }
    // Chấp nhận tất cả để tránh lỗi CORS Preflight
    return callback(null, true);
  },
  credentials: true
};

app.use(cors(corsOptions));
// Thêm Options explicitly cho Preflight (Sửa lỗi CORS triệt để)
app.options('*', cors(corsOptions));

// ==================== SECURITY & RATE LIMITING ====================
// Thiết lập trust proxy để lấy chuẩn IP đằng sau Nginx
app.set('trust proxy', 1);

app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Tăng giới hạn chống Spam (2000req / 15phut) khi dùng realtime mượt
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' }
});
app.use('/api/', apiLimiter);

// ==================== BODY PARSER ====================
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== REQUEST LOGGING ====================
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ==================== SOCKET.IO ====================
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000
});
setupSocket(io);

// Attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ==================== PUBLIC ENDPOINTS (trước routes) ====================

// Root
app.get('/', (req, res) => {
  res.json({
    message: 'AloShipp API Server',
    version: '1.0.0',
    docs: '/api/health'
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.json({
    success: true,
    message: 'AloShipp API đang hoạt động',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mongodb: mongoStatus
  });
});

// Keep-alive endpoint — gọi mỗi 10 phút để Render không bị sleep
// Response nhanh nhất, không query DB
app.get('/api/ping', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, timestamp: Date.now() });
});


const financeRoutes = require('./routes/financeRoutes');

// ==================== ROUTES ====================
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/finance', financeRoutes);

// Phục vụ các File tĩnh từ thư mục /uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS không cho phép truy cập từ origin này'
    });
  }
  res.status(500).json({
    success: false,
    message: err.message || 'Lỗi server nội bộ'
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route không tồn tại'
  });
});

// ==================== MONGOOSE ====================
mongoose.set('strictQuery', false);

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI chưa được cấu hình trong file .env');
  console.log('Vui lòng cập nhật MONGO_URI trong backend/.env');
  console.log('Hướng dẫn: https://www.mongodb.com/atlas');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Kết nối MongoDB thành công!');

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   🚀 AloShipp Backend - PRODUCTION             ║
║                                                      ║
║   ✅ Server:        http://0.0.0.0:${PORT}             ║
║   ✅ API Health:    http://localhost:${PORT}/api/health ║
║   ✅ WebSocket:     Enabled                          ║
║   ✅ MongoDB:       Connected                        ║
║   ✅ Environment:   ${(process.env.NODE_ENV || 'development').padEnd(20)}   ║
║                                                      ║
║   📱 Driver App:    http://localhost:5173           ║
║   ⚙️  Admin App:    http://localhost:5174           ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
      `);
    });
  })
  .catch((error) => {
    console.error('❌ Lỗi kết nối MongoDB:', error);
    process.exit(1);
  });

// ==================== GRACEFUL SHUTDOWN ====================
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('✅ Server và Database đã đóng an toàn.');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
