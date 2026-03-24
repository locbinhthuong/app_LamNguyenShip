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
const { setupSocket } = require('./sockets/index');

const app = express();
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
      if (host.endsWith('.vercel.app')) {
        return callback(null, true);
      }
    } catch (_) {
      /* ignore */
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(cors(corsOptions));

// ==================== SECURITY ====================
app.use(helmet({ contentSecurityPolicy: false }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
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

// ==================== ROUTES ====================
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/drivers', driverRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.json({
    success: true,
    message: 'LamNguyenShip API đang hoạt động',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mongodb: mongoStatus
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    message: 'LamNguyenShip API Server',
    version: '1.0.0',
    docs: '/api/health'
  });
});

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
║   🚀 LamNguyenShip Backend - PRODUCTION             ║
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
