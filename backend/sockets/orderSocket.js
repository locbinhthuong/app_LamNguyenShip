const Order = require('../models/Order');

const setupOrderSocket = (io) => {
  // Khi client kết nối
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Client join room để nhận realtime updates
    socket.on('join_room', (room) => {
      socket.join(room);
      console.log(`[Socket.IO] Client ${socket.id} joined room: ${room}`);
    });

    // Client rời room
    socket.on('leave_room', (room) => {
      socket.leave(room);
      console.log(`[Socket.IO] Client ${socket.id} left room: ${room}`);
    });

    // Ping/pong heartbeat
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Khi client ngắt kết nối
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  // Helper functions để emit events từ controller
  return {
    // Emit khi có đơn mới
    emitNewOrder: (order) => {
      io.emit('new_order', order);
      console.log('[Socket.IO] Emitted: new_order');
    },

    // Emit khi đơn được nhận
    emitOrderTaken: (order) => {
      io.emit('order_taken', order);
      console.log('[Socket.IO] Emitted: order_taken');
    },

    // Emit khi đơn hoàn thành
    emitOrderDone: (order) => {
      io.emit('order_done', order);
      console.log('[Socket.IO] Emitted: order_done');
    }
  };
};

module.exports = setupOrderSocket;
