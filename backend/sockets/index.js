const jwt = require('jsonwebtoken');

const setupSocket = (io) => {
  // Middleware: Authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Không có token'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Token không hợp lệ'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id} - Role: ${socket.user.role}`);

    // Join room theo role
    if (socket.user.role === 'driver') {
      socket.join(`driver_${socket.user.id}`);
      socket.join('drivers'); // Tất cả drivers
      console.log(`[Socket] Driver ${socket.user.id} joined driver room`);
    } else {
      socket.join('admins'); // Tất cả admins
      console.log(`[Socket] Admin ${socket.user.id} joined admin room`);
    }

    // Ping/pong
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Helper functions
const emitNewOrder = (io, order) => {
  io.to('drivers').emit('new_order', order);
  io.to('admins').emit('new_order', order);
};

const emitOrderAccepted = (io, order) => {
  io.to('drivers').emit('order_accepted', order);
  io.to('admins').emit('order_accepted', order);
};

const emitOrderPickedUp = (io, order) => {
  io.to('drivers').emit('order_picked_up', order);
  io.to('admins').emit('order_picked_up', order);
};

const emitOrderDelivering = (io, order) => {
  io.to('drivers').emit('order_delivering', order);
  io.to('admins').emit('order_delivering', order);
};

const emitOrderCompleted = (io, order) => {
  io.to('drivers').emit('order_completed', order);
  io.to('admins').emit('order_completed', order);
};

const emitOrderCancelled = (io, order) => {
  io.to('drivers').emit('order_cancelled', order);
  io.to('admins').emit('order_cancelled', order);
};

const emitToDriver = (io, driverId, event, data) => {
  io.to(`driver_${driverId}`).emit(event, data);
};

module.exports = {
  setupSocket,
  emitNewOrder,
  emitOrderAccepted,
  emitOrderPickedUp,
  emitOrderDelivering,
  emitOrderCompleted,
  emitOrderCancelled,
  emitToDriver
};
