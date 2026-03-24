const Order = require('../models/Order');
const Driver = require('../models/Driver');
const { validationResult } = require('express-validator');

const orderController = {
  // GET /api/orders - Lấy danh sách đơn hàng
  getAllOrders: async (req, res) => {
    try {
      const { status, driverId, page = 1, limit = 50 } = req.query;

      let query = {};

      if (status) {
        query.status = status.toUpperCase();
      }

      if (driverId) {
        query.assignedTo = driverId;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate('assignedTo', 'name phone driverCode vehicleType')
          .populate('createdBy', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Order.countDocuments(query)
      ]);

      res.status(200).json({
        success: true,
        data: orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total
        }
      });
    } catch (error) {
      console.error('Error getAllOrders:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách đơn hàng',
        error: error.message
      });
    }
  },

  // GET /api/orders/available - Lấy đơn hàng available cho driver
  getAvailableOrders: async (req, res) => {
    try {
      const orders = await Order.find({ status: 'PENDING' })
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      console.error('Error getAvailableOrders:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    }
  },

  // GET /api/orders/my - Lấy đơn của tài xế hiện tại
  getMyOrders: async (req, res) => {
    try {
      const { status } = req.query;
      let query = { assignedTo: req.driver._id };

      if (status) {
        query.status = status.toUpperCase();
      }

      const orders = await Order.find(query)
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      console.error('Error getMyOrders:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    }
  },

  // GET /api/orders/:id - Lấy chi tiết đơn hàng
  getOrderById: async (req, res) => {
    try {
      const { id } = req.params;

      const order = await Order.findById(id)
        .populate('assignedTo', 'name phone driverCode vehicleType')
        .populate('createdBy', 'name')
        .lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng'
        });
      }

      res.status(200).json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error getOrderById:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy chi tiết đơn hàng'
      });
    }
  },

  // POST /api/orders - Tạo đơn hàng mới (Admin)
  createOrder: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array()
        });
      }

      const { customerName, customerPhone, pickupAddress, deliveryAddress, items, note, codAmount, deliveryFee, pickupCoordinates, deliveryCoordinates } = req.body;

      const order = new Order({
        customerName,
        customerPhone,
        pickupAddress,
        deliveryAddress,
        items: items || [],
        note: note || '',
        codAmount: codAmount || 0,
        deliveryFee: deliveryFee || 0,
        pickupCoordinates,
        deliveryCoordinates,
        status: 'PENDING',
        createdBy: req.admin._id,
        ipAddress: req.ip
      });

      await order.save();

      // Emit socket
      if (req.io) {
        req.io.emit('new_order', order);
      }

      console.log(`[Order] Created: ${order._id} by ${req.admin.name}`);

      res.status(201).json({
        success: true,
        message: 'Tạo đơn hàng thành công',
        data: order
      });
    } catch (error) {
      console.error('Error createOrder:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo đơn hàng'
      });
    }
  },

  // POST /api/orders/:id/accept - Tài xế nhận đơn
  acceptOrder: async (req, res) => {
    try {
      const { id } = req.params;

      // Race condition prevention: chỉ update nếu status vẫn là PENDING
      const order = await Order.findOneAndUpdate(
        { _id: id, status: 'PENDING' },
        {
          status: 'ACCEPTED',
          assignedTo: req.driver._id,
          acceptedAt: new Date()
        },
        { new: true }
      ).populate('assignedTo', 'name phone driverCode');

      if (!order) {
        return res.status(400).json({
          success: false,
          message: 'Đơn hàng đã được nhận bởi tài xế khác hoặc không tồn tại'
        });
      }

      // Update driver stats
      await Driver.findByIdAndUpdate(req.driver._id, {
        $inc: { 'stats.totalOrders': 1 }
      });

      // Emit socket
      if (req.io) {
        req.io.emit('order_accepted', order);
        req.io.to(`driver_${req.driver._id}`).emit('order_accepted', order);
      }

      console.log(`[Order] Accepted: ${order._id} by ${req.driver.name}`);

      res.status(200).json({
        success: true,
        message: 'Nhận đơn hàng thành công',
        data: order
      });
    } catch (error) {
      console.error('Error acceptOrder:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi nhận đơn hàng'
      });
    }
  },

  // POST /api/orders/:id/pickup - Tài xế đã lấy hàng
  pickedUpOrder: async (req, res) => {
    try {
      const { id } = req.params;

      const order = await Order.findOneAndUpdate(
        { _id: id, status: 'ACCEPTED', assignedTo: req.driver._id },
        {
          status: 'PICKED_UP',
          pickedUpAt: new Date()
        },
        { new: true }
      ).populate('assignedTo', 'name phone');

      if (!order) {
        return res.status(400).json({
          success: false,
          message: 'Không thể cập nhật trạng thái'
        });
      }

      if (req.io) {
        req.io.emit('order_picked_up', order);
      }

      res.status(200).json({
        success: true,
        message: 'Đã lấy hàng thành công',
        data: order
      });
    } catch (error) {
      console.error('Error pickedUpOrder:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    }
  },

  // POST /api/orders/:id/deliver - Tài xế đang giao
  deliveringOrder: async (req, res) => {
    try {
      const { id } = req.params;

      const order = await Order.findOneAndUpdate(
        { _id: id, status: 'PICKED_UP', assignedTo: req.driver._id },
        {
          status: 'DELIVERING'
        },
        { new: true }
      ).populate('assignedTo', 'name phone');

      if (!order) {
        return res.status(400).json({
          success: false,
          message: 'Không thể cập nhật trạng thái'
        });
      }

      if (req.io) {
        req.io.emit('order_delivering', order);
      }

      res.status(200).json({
        success: true,
        message: 'Đang giao hàng',
        data: order
      });
    } catch (error) {
      console.error('Error deliveringOrder:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    }
  },

  // POST /api/orders/:id/complete - Hoàn thành đơn hàng
  completeOrder: async (req, res) => {
    try {
      const { id } = req.params;
      const { rating, ratingComment } = req.body;

      const order = await Order.findOneAndUpdate(
        { _id: id, status: { $in: ['ACCEPTED', 'PICKED_UP', 'DELIVERING'] }, assignedTo: req.driver._id },
        {
          status: 'COMPLETED',
          deliveredAt: new Date()
        },
        { new: true }
      ).populate('assignedTo', 'name phone stats');

      if (!order) {
        return res.status(400).json({
          success: false,
          message: 'Không thể hoàn thành đơn hàng này'
        });
      }

      // Update driver stats
      await Driver.findByIdAndUpdate(req.driver._id, {
        $inc: {
          'stats.completedOrders': 1,
          'stats.totalOrders': 1
        }
      });

      // Rating from customer
      if (rating && rating >= 1 && rating <= 5) {
        order.rating = rating;
        await order.save();

        const driver = await Driver.findById(req.driver._id);
        const newTotal = driver.stats.totalRatingCount + 1;
        const newRating = ((driver.stats.rating * driver.stats.totalRatingCount) + rating) / newTotal;
        await Driver.findByIdAndUpdate(req.driver._id, {
          'stats.rating': Math.round(newRating * 10) / 10,
          'stats.totalRatingCount': newTotal
        });
      }

      if (req.io) {
        req.io.emit('order_completed', order);
      }

      console.log(`[Order] Completed: ${order._id}`);

      res.status(200).json({
        success: true,
        message: 'Hoàn thành đơn hàng thành công',
        data: order
      });
    } catch (error) {
      console.error('Error completeOrder:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi hoàn thành đơn hàng'
      });
    }
  },

  // POST /api/orders/:id/cancel - Hủy đơn hàng
  cancelOrder: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      let query = { _id: id, status: { $in: ['PENDING', 'ACCEPTED'] } };

      // Nếu là driver, chỉ hủy đơn của mình
      // Nếu là admin, hủy được mọi đơn
      if (req.driver) {
        query.assignedTo = req.driver._id;
      }

      const order = await Order.findOneAndUpdate(
        query,
        {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: req.driver ? req.driver._id : req.admin._id,
          cancelReason: reason || 'Hủy bởi ' + (req.driver ? 'tài xế' : 'admin')
        },
        { new: true }
      );

      if (!order) {
        return res.status(400).json({
          success: false,
          message: 'Không thể hủy đơn hàng này'
        });
      }

      // Update driver stats if cancelled by driver
      if (req.driver) {
        await Driver.findByIdAndUpdate(req.driver._id, {
          $inc: {
            'stats.cancelledOrders': 1,
            'stats.totalOrders': 1
          }
        });
      }

      if (req.io) {
        req.io.emit('order_cancelled', order);
      }

      res.status(200).json({
        success: true,
        message: 'Hủy đơn hàng thành công',
        data: order
      });
    } catch (error) {
      console.error('Error cancelOrder:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi hủy đơn hàng'
      });
    }
  },

  // DELETE /api/orders/:id - Xóa đơn hàng (Admin)
  deleteOrder: async (req, res) => {
    try {
      const { id } = req.params;

      const order = await Order.findByIdAndDelete(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Xóa đơn hàng thành công'
      });
    } catch (error) {
      console.error('Error deleteOrder:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa đơn hàng'
      });
    }
  },

  // GET /api/orders/stats/dashboard - Thống kê dashboard (Admin)
  getDashboardStats: async (req, res) => {
    try {
      const [
        totalOrders,
        pendingOrders,
        activeOrders,
        completedOrders,
        cancelledOrders,
        totalDrivers,
        activeDrivers
      ] = await Promise.all([
        Order.countDocuments(),
        Order.countDocuments({ status: 'PENDING' }),
        Order.countDocuments({ status: { $in: ['ACCEPTED', 'PICKED_UP', 'DELIVERING'] } }),
        Order.countDocuments({ status: 'COMPLETED' }),
        Order.countDocuments({ status: 'CANCELLED' }),
        Driver.countDocuments(),
        Driver.countDocuments({ isOnline: true })
      ]);

      // Top drivers
      const topDrivers = await Driver.find()
        .select('name phone stats driverCode')
        .sort({ 'stats.completedOrders': -1 })
        .limit(5)
        .lean();

      // Recent orders
      const recentOrders = await Order.find()
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      res.status(200).json({
        success: true,
        data: {
          orders: {
            total: totalOrders,
            pending: pendingOrders,
            active: activeOrders,
            completed: completedOrders,
            cancelled: cancelledOrders
          },
          drivers: {
            total: totalDrivers,
            active: activeDrivers
          },
          topDrivers,
          recentOrders
        }
      });
    } catch (error) {
      console.error('Error getDashboardStats:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    }
  }
};

module.exports = orderController;
