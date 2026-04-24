const Order = require('../models/Order');
const Driver = require('../models/Driver');
const Admin = require('../models/Admin');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { emitNewOrder, emitOrderAccepted, emitOrderPickedUp, emitOrderDelivering, emitOrderCompleted, emitOrderCancelled } = require('../sockets/index');
const { startOfTodayVietnam } = require('../utils/todayVietnam');
const DebtTransaction = require('../models/DebtTransaction');
const { sendNotification, sendMultipleNotifications } = require('../utils/notification');

const orderController = {
  // GET /api/orders - Lấy danh sách đơn hàng
  getAllOrders: async (req, res) => {
    try {
      const { status, driverId, page = 1, limit = 50 } = req.query;

      let query = {};

      if (status) {
        const statuses = status.split(',').map(s => s.trim().toUpperCase());
        query.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
      }

      if (driverId) {
        query.assignedTo = driverId;
      }

      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, 'i');
        query.$or = [
          { customerPhone: searchRegex },
          { customerName: searchRegex }
        ];
        // Xử lý tìm theo OrderCode (bất cứ chuỗi nào khớp id)
        const pureSearch = req.query.search.replace(/^DH/i, '').toLowerCase();
        if (pureSearch.length > 0) {
          query.$or.push({ $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: pureSearch, options: "i" } } });
        }
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

      // Xử lý Hiển thị "Tiền thưởng KPI Tạm tính" (Cho Tài Xế xem trước viễn cảnh khi họ chuẩn bị đi Giao)
      if (order.assignedTo && ['ACCEPTED', 'PICKED_UP', 'DELIVERING'].includes(order.status) && !order.kpiBonus) {
        try {
          const todayStrVN = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
          const startOfDayUTC = new Date(`${todayStrVN}T00:00:00.000+07:00`);
          const endOfDayUTC = new Date(`${todayStrVN}T23:59:59.999+07:00`);

          const todayCount = await Order.countDocuments({
            status: 'COMPLETED',
            assignedTo: order.assignedTo._id || order.assignedTo,
            deliveredAt: { $gte: startOfDayUTC, $lte: endOfDayUTC }
          });

          const prospective = todayCount + 1;
          if (prospective >= 17 && prospective < 25) {
            order.kpiBonus = 1000;
            order.isExpectedKpi = true;
          } else if (prospective >= 25) {
            order.kpiBonus = 2000;
            order.isExpectedKpi = true;
          }
        } catch (e) { console.error('Error calculating prospective KPI:', e); }
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

      const { customerName, customerPhone, pickupPhone, pickupAddress, deliveryAddress, items, note, codAmount, deliveryFee, adminBonus, pickupCoordinates, deliveryCoordinates } = req.body;

      const order = new Order({
        customerName,
        customerPhone,
        pickupPhone: pickupPhone || '',
        pickupAddress,
        deliveryAddress,
        items: items || [],
        note: note || '',
        codAmount: codAmount || 0,
        deliveryFee: deliveryFee || 0,
        adminBonus: adminBonus || 0,
        pickupCoordinates,
        deliveryCoordinates,
        status: 'PENDING',
        createdBy: req.admin._id,
        ipAddress: req.ip
      });

      await order.save();

      // Emit socket — plain object để createdAt luôn có trong JSON (Mongoose doc đôi khi serialize lệch)
      if (req.io) {
        const payload = typeof order.toObject === 'function'
          ? order.toObject({ virtuals: true })
          : order;
        emitNewOrder(req.io, payload, true); // true = isSilentAdmin
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

  // POST /api/orders/customer - Tạo đơn hàng (Customer / Shop)
  createCustomerOrder: async (req, res) => {
    try {
      const customerId = req.customer._id;
      const {
        serviceType, subServiceType, customerName, customerPhone, pickupPhone,
        senderName, senderPhone, receiverName, receiverPhone, receiverPhone2,
        pickupAddress, deliveryAddress, pickupCoordinates, deliveryCoordinates,
        items, note, packageDetails, rideDetails, financialDetails, codAmount
      } = req.body;

      const order = new Order({
        serviceType: serviceType || 'GIAO_HANG',
        subServiceType: subServiceType || null,
        customerId,
        customerName: customerName || req.customer.name,
        customerPhone: customerPhone || req.customer.phone,
        pickupPhone: pickupPhone || '',
        senderName: senderName || '',
        senderPhone: senderPhone || '',
        receiverName: receiverName || '',
        receiverPhone: receiverPhone || '',
        receiverPhone2: receiverPhone2 || '',
        pickupAddress,
        deliveryAddress: deliveryAddress || '',
        pickupCoordinates,
        deliveryCoordinates: deliveryCoordinates || null,
        items: items || [],
        note: note || '',
        packageDetails: packageDetails || {},
        rideDetails: rideDetails || {},
        financialDetails: financialDetails || {},
        codAmount: codAmount || 0,
        deliveryFee: 0, // Admin tính giá sau (Phí Ship)
        status: 'DRAFT', // Khách tạo đơn xong phải chờ Admin tính phí Ship -> status: DRAFT
        ipAddress: req.ip
      });

      await order.save();

      if (req.io) {
        const payload = typeof order.toObject === 'function' ? order.toObject({ virtuals: true }) : order;
        emitNewOrder(req.io, payload);
      }

      // --- Bắn Push Notification cho Admin ---
      try {
        const admins = await Admin.find({ fcmToken: { $exists: true, $ne: null } });
        const tokens = admins.map(a => a.fcmToken).filter(t => t);
        if (tokens.length > 0) {
          const title = '🔔 Có đơn đặt xe mới!';
          const body = `Khách hàng ${order.customerName || 'ẩn danh'} vừa tạo đơn ${order.serviceType || 'mới'}.`;
          await sendMultipleNotifications(tokens, title, body, { url: '/orders' });
        }
      } catch (err) {
        console.error('Error sending push to admin:', err);
      }
      // ---------------------------------------

      console.log(`[Order] Created (Customer App): ${order._id} by ${req.customer.phone}`);

      res.status(201).json({
        success: true,
        message: 'Tạo đơn hàng thành công',
        data: order
      });
    } catch (error) {
      console.error('Error createCustomerOrder:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi tạo đơn hàng' });
    }
  },

  // GET /api/orders/customer/my - Khách lấy đơn của mình
  getCustomerOrders: async (req, res) => {
    try {
      const orders = await Order.find({ customerId: req.customer._id })
        .populate('assignedTo', 'name phone driverCode vehicleType')
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({
        success: true,
        data: orders
      });
    } catch (error) {
      console.error('Error getCustomerOrders:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // PUT /api/orders/:id - Sửa thông tin đơn hàng / Thu hồi đơn (Admin)
  updateOrder: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        customerName, customerPhone, pickupPhone, pickupAddress, deliveryAddress, senderPhone, receiverPhone, receiverPhone2,
        items, note, codAmount, deliveryFee, status, adminBonus,
        bulkyFee, surcharge, // Các phí mới
        packageDescription, // Chi tiết Hàng hóa / Mua hộ
        vehicleClass, // Cập nhật loại xe nếu cần
        bankName, bankAccount, bankAccountName, transactionAmount, // Nạp Rút
        forceAssignDriverId // Cờ Admin cướp quyền Gán đơn
      } = req.body;
      const orderToUpdate = await Order.findById(id);
      if (!orderToUpdate) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      }

      let didAdminForceAssign = false;

      // Xử lý nhánh "Thu hồi về Lưu Nháp (DRAFT)" (Gỡ bỏ tài xế, ẩn khỏi chợ)
      if (status === 'DRAFT' && orderToUpdate.status !== 'DRAFT') {
        orderToUpdate.status = 'DRAFT';
        orderToUpdate.assignedTo = null;
        orderToUpdate.acceptedAt = undefined;
        orderToUpdate.pickedUpAt = undefined;
        orderToUpdate.cancelReason = undefined; // Bắt buộc xóa Lý do hủy lỗi cũ để khi Treo lại không bị Rống Chuông Admin

        // Tước đơn khỏi map của Admin và xóa trên App của tài xế (như hủy nhưng thực ra là thu hồi ẩn)
        if (req.io) {
          req.io.emit('order_cancelled', { _id: orderToUpdate._id.toString(), status: 'DRAFT' }); // Báo driver gỡ đơn
          const payload = typeof orderToUpdate.toObject === 'function' ? orderToUpdate.toObject({ virtuals: true }) : orderToUpdate;
          req.io.to('admins').emit('order_updated', payload); // Cập nhật map admin
        }
      }

      // Xử lý nhánh "Đưa lên Đơn Treo" (Từ DRAFT lên PENDING)
      if (status === 'PENDING' && orderToUpdate.status === 'DRAFT') {
        orderToUpdate.status = 'PENDING';

        // Phát socket đăng đơn lại lên chợ cho tài xế
        if (req.io) {
          const payload = typeof orderToUpdate.toObject === 'function' ? orderToUpdate.toObject({ virtuals: true }) : orderToUpdate;
          const { emitNewOrder } = require('../sockets/index');
          emitNewOrder(req.io, payload, true); // true = isSilentAdmin (Treo lại đơn không báo hú Admin)
          req.io.to('admins').emit('order_updated', payload); // Cập nhật danh sách bên Admin
        }
      }

      // XỬ LÝ KIỂM TRA BẮN ĐƠN MẠNH BẠO TỪ ADMIN (KHÔNG VƯỢT TƯỜNG LỬA CHẶN NỢ)
      if (forceAssignDriverId && forceAssignDriverId !== orderToUpdate.assignedTo?.toString()) {
        const Driver = require('../models/Driver');
        const DebtTransaction = require('../models/DebtTransaction');

        const driver = await Driver.findById(forceAssignDriverId);
        if (!driver || driver.status !== 'active') {
          return res.status(400).json({ success: false, message: 'Tài xế không hợp lệ hoặc đã bị khóa.' });
        }

        // Tường lửa Đòi Nợ y chang App Tài Xế (Không nể nang)
        let hasUnpaidDebt = false;
        const transactions = await DebtTransaction.find({ driverId: forceAssignDriverId }).select('amount targetDate createdAt status').lean();
        const debtByDate = {};
        transactions.forEach(tx => {
          const dateStr = tx.targetDate || new Date(tx.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
          if (tx.status !== 'REJECTED' && tx.status !== 'PENDING') {
            if (!debtByDate[dateStr]) debtByDate[dateStr] = 0;
            debtByDate[dateStr] += tx.amount;
          }
        });
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
        for (const [dateStr, amount] of Object.entries(debtByDate)) {
          if (amount > 0 && dateStr !== todayStr) {
            hasUnpaidDebt = true;
            break;
          }
        }

        if (hasUnpaidDebt) {
          return res.status(400).json({
            success: false,
            message: 'Tài xế này đang MẮC NỢ CŨ CHƯA THANH TOÁN. Hệ thống đã chặn gán đơn!'
          });
        }

        // Qua ải, được phép chốt đơn cho Tài Xế này
        orderToUpdate.assignedTo = forceAssignDriverId;

        // Bắt buộc chuyển Order sang Đã nhận (Bất kể DRAFT hay PENDING)
        if (['DRAFT', 'PENDING'].includes(orderToUpdate.status)) {
          orderToUpdate.status = 'ACCEPTED';
          orderToUpdate.acceptedAt = new Date();
        }

        didAdminForceAssign = true;

        // Hú Còi Push Notification tận Điện Thoại
        if (driver.fcmToken) {
          const { sendMultipleNotifications } = require('../utils/notification');
          const feeResponse = orderToUpdate.deliveryFee ? `${orderToUpdate.deliveryFee.toLocaleString('vi-VN')}đ` : 'Thỏa thuận';
          let msgBody = `📍 Đón: ${orderToUpdate.pickupAddress}\n💵 Phí: ${feeResponse}`;
          await sendMultipleNotifications([driver.fcmToken], '🎯 TỔNG ĐÀI ĐIỀU PHỐI ĐƠN CHO MÌNH!', msgBody, { url: `/order/${orderToUpdate._id}` }).catch(e => console.log('Push lỗi', e));
        }
      }

      // Cập nhật thông tin text
      if (customerName) orderToUpdate.customerName = customerName;
      if (customerPhone) orderToUpdate.customerPhone = customerPhone;
      if (pickupPhone !== undefined) orderToUpdate.pickupPhone = pickupPhone;
      if (senderPhone !== undefined) orderToUpdate.senderPhone = senderPhone;
      if (receiverPhone !== undefined) orderToUpdate.receiverPhone = receiverPhone;
      if (receiverPhone2 !== undefined) orderToUpdate.receiverPhone2 = receiverPhone2;
      if (pickupAddress !== undefined) orderToUpdate.pickupAddress = pickupAddress;
      if (deliveryAddress !== undefined) orderToUpdate.deliveryAddress = deliveryAddress;
      if (items !== undefined) orderToUpdate.items = items;
      if (note !== undefined) orderToUpdate.note = note;
      if (codAmount !== undefined) orderToUpdate.codAmount = codAmount;
      let isDeliveryFeeChanged = false;
      if (deliveryFee !== undefined) {
        if (orderToUpdate.deliveryFee !== deliveryFee && deliveryFee > 0) isDeliveryFeeChanged = true;
        orderToUpdate.deliveryFee = deliveryFee;
      }
      if (adminBonus !== undefined) orderToUpdate.adminBonus = adminBonus;

      // Cập nhật các phí phát sinh chuyên sâu cho Siêu App
      if (bulkyFee !== undefined || packageDescription !== undefined) {
        if (!orderToUpdate.packageDetails) orderToUpdate.packageDetails = {};
        if (bulkyFee !== undefined) orderToUpdate.packageDetails.bulkyFee = bulkyFee;
        if (packageDescription !== undefined) orderToUpdate.packageDetails.description = packageDescription;
      }
      if (surcharge !== undefined) {
        if (!orderToUpdate.rideDetails) orderToUpdate.rideDetails = {};
        orderToUpdate.rideDetails.surcharge = surcharge;
      }
      if (vehicleClass !== undefined) {
        if (!orderToUpdate.rideDetails) orderToUpdate.rideDetails = {};
        orderToUpdate.rideDetails.vehicleClass = vehicleClass;
      }

      // Tài chính Nạp rút
      if (bankName !== undefined || bankAccount !== undefined || bankAccountName !== undefined || transactionAmount !== undefined) {
        if (!orderToUpdate.financialDetails) orderToUpdate.financialDetails = {};
        if (bankName !== undefined) orderToUpdate.financialDetails.bankName = bankName;
        if (bankAccount !== undefined) orderToUpdate.financialDetails.bankAccount = bankAccount;
        if (bankAccountName !== undefined) orderToUpdate.financialDetails.bankAccountName = bankAccountName;
        if (transactionAmount !== undefined) orderToUpdate.financialDetails.transactionAmount = transactionAmount;
      }

      await orderToUpdate.save();

      // Gửi push notification cho khách hàng nếu có báo giá mới
      if (isDeliveryFeeChanged && orderToUpdate.customerId) {
        try {
          const user = await User.findById(orderToUpdate.customerId);
          if (user && user.fcmToken) {
            const title = '💰 Đơn hàng đã được báo giá!';
            const body = `Đơn hàng ${orderToUpdate.serviceType} của bạn đã có phí: ${deliveryFee.toLocaleString('vi-VN')}đ.`;
            await sendNotification(user.fcmToken, title, body, { url: `/customer/order/${orderToUpdate._id}` });
          }
        } catch (err) {
          console.error('Lỗi gửi push cho khách hàng:', err);
        }
      }

      // Load gắp thông tin tài xế để socket báo chuẩn chữ
      if (didAdminForceAssign) {
        await orderToUpdate.populate('assignedTo', 'name phone driverCode');
      }

      if (req.io) {
        const { emitToDriver, emitOrderAccepted } = require('../sockets/index');
        const payload = typeof orderToUpdate.toObject === 'function' ? orderToUpdate.toObject({ virtuals: true }) : orderToUpdate;

        // Quát làng nước là đơn này đã vào túi ai qua emitOrderAccepted
        if (didAdminForceAssign) {
          emitOrderAccepted(req.io, payload);
          // Phát còi báo động riêng cho tài xế xui xẻo/may mắn này
          req.io.to(`driver_${forceAssignDriverId.toString()}`).emit('force_assigned', payload);
        } else {
          // Bắn socket thông thường
          req.io.to('admins').emit('order_updated', payload);
        }

        // Emit tới Khách hàng/Shop đã tạo đơn
        if (orderToUpdate.customerId) {
          const creatorId = orderToUpdate.customerId._id || orderToUpdate.customerId;
          req.io.to(`customer_${creatorId.toString()}`).emit('order_updated', payload);
          req.io.to(`shop_${creatorId.toString()}`).emit('order_updated', payload);
        }

        // Emit tới Tài xế nhận đơn (nếu có)
        if (orderToUpdate.assignedTo) {
          const driverId = orderToUpdate.assignedTo._id || orderToUpdate.assignedTo;
          emitToDriver(req.io, driverId.toString(), 'order_updated', payload);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Cập nhật đơn hàng thành công',
        data: orderToUpdate
      });
    } catch (error) {
      console.error('Error updateOrder:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi sửa đơn hàng' });
    }
  },

  // POST /api/orders/:id/accept - Tài xế nhận đơn
  acceptOrder: async (req, res) => {
    try {
      const { id } = req.params;

      const driver = await Driver.findById(req.driver._id).select('walletDebt status');

      if (!driver || driver.status !== 'active') {
        return res.status(200).json({ success: false, message: 'Tài khoản đã bị khóa hoặc không tồn tại' });
      }

      let hasUnpaidDebt = false;

      // Luôn kiểm tra chi tiết từng ngày (Chỉ chặn nếu có nợ CŨ chưa thanh toán)
      const transactions = await DebtTransaction.find({ driverId: req.driver._id }).select('amount targetDate createdAt status').lean();
      const debtByDate = {};
      transactions.forEach(tx => {
        const dateStr = tx.targetDate || new Date(tx.createdAt).toLocaleDateString('en-CA');
        if (tx.status !== 'REJECTED' && tx.status !== 'PENDING') {
          if (!debtByDate[dateStr]) debtByDate[dateStr] = 0;
          debtByDate[dateStr] += tx.amount;
        }
      });
      const todayStr = new Date().toLocaleDateString('en-CA');
      for (const [dateStr, amount] of Object.entries(debtByDate)) {
        if (amount > 0 && dateStr !== todayStr) {
          hasUnpaidDebt = true;
          break;
        }
      }

      if (hasUnpaidDebt) {
        return res.status(200).json({
          success: false,
          message: 'Bạn chưa thanh toán công nợ'
        });
      }

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
        emitOrderAccepted(req.io, order);
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
        emitOrderPickedUp(req.io, order);
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
        emitOrderDelivering(req.io, order);
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
      const driver = await Driver.findById(req.driver._id);

      // LOGIC CỘNG CÔNG NỢ TỰ ĐỘNG KHI HOÀN THÀNH ĐƠN
      // Tiền nợ = Tổng Phí Giao Hàng * Phần Trăm Chiết Khấu Hiện Tại Của Tài Xế
      const deliveryFee = order.deliveryFee || 0;
      const commissionRate = driver.commissionRate || 15;
      const debtAmount = Math.round(deliveryFee * (commissionRate / 100));

      if (debtAmount > 0) {
        // Lưu Lịch sử Giao Dịch
        const todayStr = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD' local time
        const debtTx = new DebtTransaction({
          driverId: driver._id,
          orderId: order._id,
          type: 'FEE_DEDUCTION',
          amount: debtAmount,
          description: `Thu chiết khấu ${commissionRate}% đơn hàng ${order.orderCode} (Phí ship: ${deliveryFee}đ)`,
          targetDate: todayStr
        });
        await debtTx.save();
      }

      // Nếu đơn hàng có tiền thưởng, cộng ngay vào Ví
      const adminBonus = order.adminBonus || 0;
      let walletInc = { 'stats.completedOrders': 1, walletDebt: debtAmount };

      const WalletTransaction = require('../models/WalletTransaction');

      if (adminBonus > 0) {
        walletInc.walletBalance = adminBonus;

        const walletTx = new WalletTransaction({
          driverId: driver._id,
          type: 'DEPOSIT', // 'DEPOSIT' dùng chung cho Nạp Tiền / Thưởng
          amount: adminBonus,
          status: 'SUCCESS',
          description: `Thưởng nóng từ đơn ${order.orderCode} hoàn thành`
        });
        await walletTx.save();
      }

      // ==========================================
      // LOGIC THƯỞNG MỐC ĐƠN HẰNG NGÀY (DAILY KPI) - MÚI GIỜ VIỆT NAM (UTC+7)
      // ==========================================
      const todayStrVN = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }); // Format: "YYYY-MM-DD"

      // Chuyển đổi "YYYY-MM-DD" của VN thành Range thời gian chuẩn UTC để query chuẩn xác MongoDB 
      const startOfDayUTC = new Date(`${todayStrVN}T00:00:00.000+07:00`);
      const endOfDayUTC = new Date(`${todayStrVN}T23:59:59.999+07:00`);

      // Đếm số đơn đã hoàn thành TỪ 0H SÁNG ĐẾN 23H59 THEO GIỜ VIỆT NAM
      const todayCompletedCount = await Order.countDocuments({
        status: 'COMPLETED',
        assignedTo: req.driver._id,
        deliveredAt: { $gte: startOfDayUTC, $lte: endOfDayUTC }
      });

      let milestoneBonus = 0;
      let milestoneDesc = '';
      if (todayCompletedCount >= 17 && todayCompletedCount < 25) {
        milestoneBonus = 1000;
        milestoneDesc = `Thưởng đạt KPI (đơn thứ ${todayCompletedCount})`;
      } else if (todayCompletedCount >= 25) {
        milestoneBonus = 2000;
        milestoneDesc = `Thưởng KPI cày cuốc (đơn thứ ${todayCompletedCount})`;
      }

      if (milestoneBonus > 0) {
        if (!walletInc.walletBalance) walletInc.walletBalance = 0;
        walletInc.walletBalance += milestoneBonus;

        const bonusTx = new WalletTransaction({
          driverId: driver._id,
          type: 'BONUS',
          amount: milestoneBonus,
          status: 'SUCCESS',
          description: milestoneDesc
        });
        await bonusTx.save();

        // Cập nhật mức thưởng KPI vào chính đơn hàng này
        order.kpiBonus = milestoneBonus;
        await order.save();
      }

      await Driver.findByIdAndUpdate(req.driver._id, { $inc: walletInc });

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
        emitOrderCompleted(req.io, order);
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

      if (req.driver) {
        return res.status(403).json({ success: false, message: 'Tài xế không có quyền tự ý hủy đơn. Vui lòng liên hệ tổng đài.' });
      }

      if (req.customer) {
        const order = await Order.findOneAndUpdate(
          { _id: id, customerId: req.customer._id, status: { $in: ['PENDING', 'DRAFT'] } },
          {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelReason: reason || 'Khách hàng đổi ý'
          },
          { new: true }
        );

        if (!order) {
          return res.status(400).json({ success: false, message: 'Không thể hủy! Đơn có thể đã được Tài xế nhận.' });
        }

        if (req.io) {
          const { emitOrderCancelled } = require('../sockets/index');
          emitOrderCancelled(req.io, order._id);
        }
        return res.status(200).json({ success: true, message: 'Hủy đơn thành công', data: order });
      }

      // VỚI ADMIN: HỦY CHẾT TRƠN ĐƠN HÀNG (CANCELLED)
      const order = await Order.findOneAndUpdate(
        { _id: id, status: { $in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'DELIVERING'] } },
        {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: req.admin._id,
          cancelReason: reason || 'Hủy bởi admin'
        },
        { new: true }
      );

      if (!order) {
        return res.status(400).json({ success: false, message: 'Không thể hủy đơn hàng này' });
      }

      if (req.io) {
        const { emitOrderCancelled } = require('../sockets/index');
        emitOrderCancelled(req.io, order);
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

      if (req.io) {
        req.io.emit('order_deleted_event', id);
        req.io.emit('refresh_orders_data');
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
      // Đầu ngày theo giờ Việt Nam (Render chạy UTC — setHours(0) local sẽ lệch 7h)
      const startOfToday = startOfTodayVietnam();

      // Đơn hoàn thành / doanh thu "trong ngày" = theo thời điểm giao (deliveredAt), không phải ngày tạo đơn
      const completedTodayMatch = {
        status: 'COMPLETED',
        $or: [
          { deliveredAt: { $gte: startOfToday } },
          { deliveredAt: null, updatedAt: { $gte: startOfToday } },
        ],
      };
      const cancelledTodayMatch = {
        status: 'CANCELLED',
        $or: [
          { cancelledAt: { $gte: startOfToday } },
          { cancelledAt: null, updatedAt: { $gte: startOfToday } },
        ],
      };

      // Đơn tạo "hôm nay" VN: sử dụng $gte bình thường vì timestamps: true tự động sinh Date obj
      const todayCreatedQuery = Order.countDocuments({ createdAt: { $gte: startOfToday } });

      const [
        totalOrders,
        pendingOrders,
        activeOrders,
        completedOrders,
        cancelledOrders,
        totalDrivers,
        activeDrivers,
        // Trong ngày VN
        todayCreated,
        todayCompleted,
        todayCancelled,
        todayRevenue,
      ] = await Promise.all([
        Order.countDocuments(),
        Order.countDocuments({ status: 'PENDING' }),
        Order.countDocuments({ status: { $in: ['ACCEPTED', 'PICKED_UP', 'DELIVERING'] } }),
        Order.countDocuments({ status: 'COMPLETED' }),
        Order.countDocuments({ status: 'CANCELLED' }),
        Driver.countDocuments(),
        Driver.countDocuments({ isOnline: true }),
        todayCreatedQuery,
        Order.countDocuments(completedTodayMatch),
        Order.countDocuments(cancelledTodayMatch),
        Order.aggregate([
          { $match: completedTodayMatch },
          { $group: { _id: null, total: { $sum: '$codAmount' } } },
        ]),
      ]);

      const revenueToday = todayRevenue[0]?.total || 0;

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
          today: {
            total: todayCreated,
            completed: todayCompleted,
            cancelled: todayCancelled,
            revenue: revenueToday,
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
