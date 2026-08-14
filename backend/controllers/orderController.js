const Order = require('../models/Order');
const Driver = require('../models/Driver');
const Admin = require('../models/Admin');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { emitNewOrder, emitOrderAccepted, emitOrderPickedUp, emitOrderDelivering, emitOrderCompleted, emitOrderCancelled } = require('../sockets/index');
const { startOfTodayVietnam } = require('../utils/todayVietnam');
const DebtTransaction = require('../models/DebtTransaction');
const { checkDriverDebtBlock, getTodayVN } = require('../utils/debtUtils');
const { findNearestAvailableDriver, findNearestAvailableDriversGroup } = require('../utils/driverAssignment');
const { sendNotification, sendMultipleNotifications } = require('../utils/notification');
const Config = require('../models/Config');
const { getDrivingDistance } = require('../utils/distance');


const refundOrderDebtIfAny = async (orderId) => {
  try {
    const debtTxList = await DebtTransaction.find({ 
      orderId: orderId, 
      type: 'FEE_DEDUCTION',
      status: 'SUCCESS'  // Chỉ hoàn nợ đã SUCCESS
    });
    
    for (const debtTx of debtTxList) {
      if (debtTx.driverId) {
        await Driver.findByIdAndUpdate(debtTx.driverId, { 
          $inc: { walletDebt: -debtTx.amount } 
        });
        
        await DebtTransaction.create({
          driverId: debtTx.driverId,
          orderId: orderId,
          type: 'PAYMENT',
          amount: -debtTx.amount,
          targetDate: debtTx.targetDate, // Đúng ngày gốc, không fallback
          status: 'SUCCESS',
          description: `Hoàn nợ do hủy/xóa đơn`
        });
        
        await DebtTransaction.findByIdAndUpdate(debtTx._id, { 
          description: (debtTx.description || '') + ' [HOÀN DO HỦY ĐƠN]'
        });
        
        console.log(`[REFUND DEBT] Hoàn lại ${debtTx.amount}đ cho tài xế ${debtTx.driverId} do đơn bị hủy/xóa.`);
      }
    }
  } catch (err) {
    console.error('Error refunding order debt:', err);
  }
};

const getLateNightSurchargeDriverReminder = async () => {
  try {
    const surchargeDoc = await Config.findOne({ key: 'LATE_NIGHT_SURCHARGE_CONFIG' });
    let cfg = { level1: { time: '22:30', amount: 3000 }, level2: { time: '23:30', amount: 5000 }, endTime: '06:00' };
    if (surchargeDoc && surchargeDoc.value) {
      cfg = surchargeDoc.value;
    }

    if (cfg) {
      const parseTime = (timeStr) => {
        if (!timeStr) return null;
        const parts = timeStr.split(':');
        return { h: parseInt(parts[0], 10) || 0, m: parseInt(parts[1], 10) || 0 };
      };
      
      const l1 = parseTime(cfg.level1?.time);
      const l2 = parseTime(cfg.level2?.time);
      const e = parseTime(cfg.endTime);
      
      if (l1 && l2 && e) {
        const vnTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
        const currentTotalMinutes = vnTime.getHours() * 60 + vnTime.getMinutes();
        
        const l1Total = l1.h * 60 + l1.m;
        const l2Total = l2.h * 60 + l2.m;
        const eTotal = e.h * 60 + e.m;
        
        const isBetween = (startMins, endMins, current) => {
          if (startMins <= endMins) {
            return current >= startMins && current <= endMins;
          } else {
            return current >= startMins || current <= endMins;
          }
        };
        
        let surchargeStr = '';
        if (isBetween(l2Total, eTotal, currentTotalMinutes)) {
          surchargeStr = `[ĐƠN KHUYA SAU ${cfg.level2?.time} - Đã cộng phụ phí ${(cfg.level2?.amount || 0).toLocaleString('vi-VN')}đ vào tiền ship]`;
        } else if (isBetween(l1Total, eTotal, currentTotalMinutes)) {
          surchargeStr = `[ĐƠN KHUYA SAU ${cfg.level1?.time} - Đã cộng phụ phí ${(cfg.level1?.amount || 0).toLocaleString('vi-VN')}đ vào tiền ship]`;
        }
        
        return surchargeStr;
      }
    }
  } catch (err) {
    console.error('Lỗi check phụ phí khuya khi tạo đơn:', err);
  }
  return '';
};

const getLateNightSurchargeAmount = async () => {
  try {
    const surchargeDoc = await Config.findOne({ key: 'LATE_NIGHT_SURCHARGE_CONFIG' });
    let cfg = { level1: { time: '22:30', amount: 3000 }, level2: { time: '23:30', amount: 5000 }, endTime: '06:00' };
    if (surchargeDoc && surchargeDoc.value) {
      cfg = surchargeDoc.value;
    }

    if (cfg) {
      const parseTime = (timeStr) => {
        if (!timeStr) return null;
        const parts = timeStr.split(':');
        return { h: parseInt(parts[0], 10) || 0, m: parseInt(parts[1], 10) || 0 };
      };
      
      const l1 = parseTime(cfg.level1?.time);
      const l2 = parseTime(cfg.level2?.time);
      const e = parseTime(cfg.endTime);
      
      if (l1 && l2 && e) {
        const vnTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
        const currentTotalMinutes = vnTime.getHours() * 60 + vnTime.getMinutes();
        
        const l1Total = l1.h * 60 + l1.m;
        const l2Total = l2.h * 60 + l2.m;
        const eTotal = e.h * 60 + e.m;
        
        const isBetween = (startMins, endMins, current) => {
          if (startMins <= endMins) {
            return current >= startMins && current <= endMins;
          } else {
            return current >= startMins || current <= endMins;
          }
        };
        
        if (isBetween(l2Total, eTotal, currentTotalMinutes)) {
          return (cfg.level2?.amount || 0);
        } else if (isBetween(l1Total, eTotal, currentTotalMinutes)) {
          return (cfg.level1?.amount || 0);
        }
      }
    }
  } catch (err) {
    console.error('Lỗi tính toán phụ phí khuya:', err);
  }
  return 0;
};

const orderController = {
  getLateNightSurchargeDriverReminder,
  getLateNightSurchargeAmount,

  // GET /api/orders - Lấy danh sách đơn hàng
  getAllOrders: async (req, res) => {
    try {
      const { status, driverId, page = 1, limit = 50 } = req.query;

      let query = {};

      if (status === 'SCHEDULED') {
        query.status = 'DRAFT';
        query.scheduledPublishAt = { $ne: null };
      } else if (status === 'DRAFT') {
        query.status = 'DRAFT';
        query.$or = [{ scheduledPublishAt: null }, { scheduledPublishAt: { $exists: false } }];
      } else if (status) {
        const statuses = status.split(',').map(s => s.trim().toUpperCase());
        query.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
      }

      if (driverId) {
        query.assignedTo = driverId;
      }

      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, 'i');
        
        // Tìm các tài xế có tên hoặc SĐT khớp với từ khóa
        const matchingDrivers = await Driver.find({
          $or: [{ name: searchRegex }, { phone: searchRegex }]
        }).select('_id');
        const driverIds = matchingDrivers.map(d => d._id);

        query.$or = [
          { customerPhone: searchRegex },
          { customerName: searchRegex },
          { pickupAddress: searchRegex },
          { deliveryAddress: searchRegex },
          { senderPhone: searchRegex },
          { receiverPhone: searchRegex }
        ];

        if (driverIds.length > 0) {
          query.$or.push({ assignedTo: { $in: driverIds } });
        }

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
      const driver = await Driver.findById(req.driver._id);
      const driverRate = driver.commissionRate ? Number(driver.commissionRate) : 15;

      const orders = await Order.find({ 
        status: 'PENDING',
        $or: [
          { pendingAssignTo: { $exists: false } },
          { pendingAssignTo: null },
          { pendingAssignTo: { $size: 0 } },
          { pendingAssignTo: req.driver._id }
        ],
        $and: [
          {
            $or: [
              { commissionRate: null },
              { commissionRate: { $exists: false } },
              { commissionRate: driverRate }
            ]
          }
        ]
      })
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
        .limit(200)
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

      const { 
        customerName, customerPhone, pickupPhone, pickupAddress, deliveryAddress, 
        items, note, driverReminder, codAmount, deliveryFee, extraSurcharge, adminBonus, pickupCoordinates, deliveryCoordinates, 
        scheduledPublishAt, forceAssignDriverId, commissionRate, serviceType, subServiceType,
        senderPhone, receiverPhone, receiverPhone2, rideDetails, financialDetails, packageDetails, autoAssignNearest, batchedDeliveries, feePaidBy
      } = req.body;

      let didAdminForceAssign = false;
      let forceAssignedDriverFcm = null;

      if (forceAssignDriverId) {
        const Driver = require('../models/Driver');

        const driver = await Driver.findById(forceAssignDriverId);
        if (!driver || driver.status !== 'active') {
          return res.status(400).json({ success: false, message: 'Tài xế không hợp lệ hoặc đã bị khóa.' });
        }

        // Kiểm tra công nợ (dùng hàm chung — chỉ chặn nợ CŨ, bỏ qua nợ hôm nay)
        const debtCheck = await checkDriverDebtBlock(forceAssignDriverId);
        if (debtCheck.blocked) {
          return res.status(400).json({
            success: false,
            message: `Tài xế này đang MẮC NỢ CŨ CHƯA THANH TOÁN (${debtCheck.details.oldDebtDate}). Hệ thống đã chặn gán đơn!`
          });
        }

        didAdminForceAssign = true;
        forceAssignedDriverFcm = driver.fcmToken;
      }

      const surchargeReminder = await getLateNightSurchargeDriverReminder();
      const finalDriverReminder = surchargeReminder ? (driverReminder ? `${driverReminder}\n${surchargeReminder}` : surchargeReminder) : driverReminder;

      let finalDeliveryFee = deliveryFee || 0;
      let calculatedSurcharge = await getLateNightSurchargeAmount();
      let finalExtraSurcharge = extraSurcharge || calculatedSurcharge;
      // Do not re-subtract surcharge here because frontend now separates extraSurcharge and deliveryFee


      const order = new Order({
        serviceType: serviceType || 'GIAO_HANG',
        subServiceType: subServiceType || null,
        customerName,
        customerPhone,
        pickupPhone: pickupPhone || '',
        pickupAddress,
        deliveryAddress,
        items: items || [],
        note: note || '',
        driverReminder: finalDriverReminder || '',
        codAmount: codAmount || 0,
        deliveryFee: finalDeliveryFee,
        extraSurcharge: finalExtraSurcharge,
        adminBonus: adminBonus || 0,
        commissionRate: commissionRate !== undefined ? commissionRate : null,
        senderPhone: senderPhone || '',
        receiverPhone: receiverPhone || '',
        receiverPhone2: receiverPhone2 || '',
        rideDetails: rideDetails || {},
        financialDetails: financialDetails || {},
        packageDetails: packageDetails || {},
        pickupCoordinates,
        deliveryCoordinates,
        batchedDeliveries: batchedDeliveries || [],
        feePaidBy: feePaidBy || 'RECEIVER',
        status: didAdminForceAssign ? 'ACCEPTED' : (scheduledPublishAt ? 'DRAFT' : 'PENDING'),
        assignedTo: didAdminForceAssign ? forceAssignDriverId : undefined,
        acceptedAt: didAdminForceAssign ? new Date() : undefined,
        scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : null,
        createdBy: req.admin._id,
        ipAddress: req.ip
      });

      await order.save();

      if (didAdminForceAssign) {
        await order.populate('assignedTo', 'name phone driverCode');
      }

      // Emit socket — plain object để createdAt luôn có trong JSON (Mongoose doc đôi khi serialize lệch)
      if (req.io && !scheduledPublishAt) {
        const payload = typeof order.toObject === 'function'
          ? order.toObject({ virtuals: true })
          : order;
          
        if (didAdminForceAssign) {
          req.io.to(`driver_${forceAssignDriverId.toString()}`).emit('force_assigned', payload);
          req.io.to('admins').emit('new_order', payload);
          
          if (forceAssignedDriverFcm) {
            const { sendMultipleNotifications } = require('../utils/notification');
            const feeResponse = payload.deliveryFee ? `${payload.deliveryFee.toLocaleString('vi-VN')}đ` : 'Thỏa thuận';
            let msgBody = `📍 Đơn: ${payload.pickupAddress}\n💵 Phí: ${feeResponse}`;
            await sendMultipleNotifications([forceAssignedDriverFcm], '🎯 TỔNG ĐÀI ĐIỀU PHỐI ĐƠN CHO MÌNH!', msgBody, { url: `/order/${payload._id}`, orderId: payload._id.toString() }).catch(e => console.log('Push lỗi', e));
          }
        } else {
          // Xử lý ưu tiên 5s cho tài xế VIP
          const Driver = require('../models/Driver');
          const vipDriversFilter = { isOnline: true, isPriority5s: true, status: 'active' };
          if (commissionRate) vipDriversFilter.commissionRate = commissionRate;
          const vipDrivers = await Driver.find(vipDriversFilter);
          
            if (vipDrivers.length > 0) {
              const driverIds = vipDrivers.map(d => d._id);
              payload.pendingAssignTo = driverIds;
              payload.isVipAssigning = true;
              payload.timeoutDuration = 5;
              await Order.findByIdAndUpdate(order._id, { pendingAssignTo: driverIds, isVipAssigning: true });
            
            const { sendMultipleNotifications } = require('../utils/notification');
            const feeResponse = payload.deliveryFee ? `${payload.deliveryFee.toLocaleString('vi-VN')}đ` : 'Thỏa thuận';
            let msgBody = `📍 Đón: ${payload.pickupAddress}\n💵 Phí: ${feeResponse}`;
            const fcmTokens = [];

            for (const driver of vipDrivers) {
              req.io.to(`driver_${driver._id.toString()}`).emit('nearest_order_assignment', payload);
              if (driver.fcmToken) {
                fcmTokens.push(driver.fcmToken);
              }
            }
            req.io.to('admins').emit('new_order', payload);
            
            if (fcmTokens.length > 0) {
              await sendMultipleNotifications(fcmTokens, '⭐ ĐƠN HÀNG ƯU TIÊN CHO BẠN!', msgBody, { url: `/order/${payload._id}`, orderId: payload._id.toString() }).catch(e => console.log('Push lỗi', e));
            }

            // Fallback timeout: 5s
            setTimeout(async () => {
              try {
                const checkOrder = await Order.findById(order._id);
                if (checkOrder && checkOrder.status === 'PENDING' && checkOrder.pendingAssignTo && checkOrder.pendingAssignTo.length > 0) {
                  const remainingIds = checkOrder.pendingAssignTo;
                  const forcedOrder = await Order.findOneAndUpdate(
                    { _id: order._id, status: 'PENDING' },
                    {
                      $set: { pendingAssignTo: [] },
                      $addToSet: { rejectedBy: { $each: remainingIds } }
                    },
                    { new: true }
                  );
                  if (forcedOrder && req.io) {
                    const forcedPayload = typeof forcedOrder.toObject === 'function' ? forcedOrder.toObject({ virtuals: true }) : forcedOrder;
                    if (autoAssignNearest && forcedPayload.pickupCoordinates && forcedPayload.pickupCoordinates.lat && forcedPayload.pickupCoordinates.lng) {
                      const { findNearestAvailableDriversGroup } = require('../utils/driverAssignment');
                      const nearestDrivers = await findNearestAvailableDriversGroup(
                        forcedPayload.pickupCoordinates.lat,
                        forcedPayload.pickupCoordinates.lng,
                        forcedPayload.commissionRate,
                        remainingIds,
                        5
                      );
                      if (nearestDrivers && nearestDrivers.length > 0) {
                        const driverIds = nearestDrivers.map(d => d._id);
                        forcedPayload.pendingAssignTo = driverIds;
                        forcedPayload.isVipAssigning = false;
                        forcedPayload.timeoutDuration = 30;
                        await Order.findByIdAndUpdate(forcedOrder._id, { pendingAssignTo: driverIds, isVipAssigning: false });
                        const { sendMultipleNotifications } = require('../utils/notification');
                        const feeResponse = forcedPayload.deliveryFee ? `${forcedPayload.deliveryFee.toLocaleString('vi-VN')}đ` : 'Thỏa thuận';
                        let msgBody = `📍 Đón: ${forcedPayload.pickupAddress}\n💵 Phí: ${feeResponse}`;
                        const fcmTokens = [];
                        for (const driver of nearestDrivers) {
                          req.io.to(`driver_${driver._id.toString()}`).emit('nearest_order_assignment', forcedPayload);
                          if (driver.fcmToken) fcmTokens.push(driver.fcmToken);
                        }
                        req.io.to('admins').emit('new_order', forcedPayload);
                        if (fcmTokens.length > 0) {
                          await sendMultipleNotifications(fcmTokens, '🚀 CÓ ĐƠN HÀNG MỚI GẦN BẠN!', msgBody, { url: `/order/${forcedPayload._id}`, orderId: forcedPayload._id.toString() }).catch(e => console.log('Push lỗi', e));
                        }
                        setTimeout(async () => {
                          try {
                            const checkOrder = await Order.findById(forcedOrder._id);
                            if (checkOrder && checkOrder.status === 'PENDING' && checkOrder.pendingAssignTo && checkOrder.pendingAssignTo.length > 0) {
                              const remainingIds2 = checkOrder.pendingAssignTo;
                              const forcedOrder2 = await Order.findOneAndUpdate({ _id: forcedOrder._id, status: 'PENDING' }, { $set: { pendingAssignTo: [] }, $addToSet: { rejectedBy: { $each: remainingIds2 } } }, { new: true });
                              if (forcedOrder2 && req.io) {
                                const forcedPayload2 = typeof forcedOrder2.toObject === 'function' ? forcedOrder2.toObject({ virtuals: true }) : forcedOrder2;
                                const { emitNewOrder } = require('../sockets/index');
                                emitNewOrder(req.io, forcedPayload2, true);
                              }
                            }
                          } catch (e) { console.error(e); }
                        }, 30000);
                      } else {
                        const { emitNewOrder } = require('../sockets/index');
                        emitNewOrder(req.io, forcedPayload, true);
                      }
                    } else {
                      const { emitNewOrder } = require('../sockets/index');
                      emitNewOrder(req.io, forcedPayload, true);
                    }
                  }
                }
              } catch (e) {
                console.error('Fallback timeout error:', e);
              }
            }, 5000);
          } else if (autoAssignNearest && payload.pickupCoordinates && payload.pickupCoordinates.lat && payload.pickupCoordinates.lng) {
          // Gán cho một nhóm tài xế gần nhất
          const nearestDrivers = await findNearestAvailableDriversGroup(
            payload.pickupCoordinates.lat,
            payload.pickupCoordinates.lng,
            payload.commissionRate,
            [],
            5 // Lấy top 5 người
          );
          
          if (nearestDrivers && nearestDrivers.length > 0) {
            const driverIds = nearestDrivers.map(d => d._id);
            payload.pendingAssignTo = driverIds; // Gửi mảng xuống client
            payload.isVipAssigning = false;
            payload.timeoutDuration = 30;
            await Order.findByIdAndUpdate(order._id, { pendingAssignTo: driverIds, isVipAssigning: false });
            
            const { sendMultipleNotifications } = require('../utils/notification');
            const feeResponse = payload.deliveryFee ? `${payload.deliveryFee.toLocaleString('vi-VN')}đ` : 'Thỏa thuận';
            let msgBody = `📍 Đón: ${payload.pickupAddress}\n💵 Phí: ${feeResponse}`;
            const fcmTokens = [];

            for (const driver of nearestDrivers) {
              req.io.to(`driver_${driver._id.toString()}`).emit('nearest_order_assignment', payload);
              if (driver.fcmToken) {
                fcmTokens.push(driver.fcmToken);
              }
            }
            req.io.to('admins').emit('new_order', payload);
            
            if (fcmTokens.length > 0) {
              await sendMultipleNotifications(fcmTokens, '🚀 CÓ ĐƠN HÀNG MỚI GẦN BẠN!', msgBody, { url: `/order/${payload._id}`, orderId: payload._id.toString() }).catch(e => console.log('Push lỗi', e));
            }

            // Fallback timeout: Sau 32s nếu đơn vẫn PENDING và mảng chưa rỗng thì ép xóa và nổ cho tất cả
            setTimeout(async () => {
              try {
                const checkOrder = await Order.findById(order._id);
                if (checkOrder && checkOrder.status === 'PENDING' && checkOrder.pendingAssignTo && checkOrder.pendingAssignTo.length > 0) {
                  const remainingIds = checkOrder.pendingAssignTo;
                  const forcedOrder = await Order.findOneAndUpdate(
                    { _id: order._id, status: 'PENDING' },
                    {
                      $set: { pendingAssignTo: [] },
                      $addToSet: { rejectedBy: { $each: remainingIds } }
                    },
                    { new: true }
                  );
                  if (forcedOrder && req.io) {
                    const forcedPayload = typeof forcedOrder.toObject === 'function' ? forcedOrder.toObject({ virtuals: true }) : forcedOrder;
                    const { emitNewOrder } = require('../sockets/index');
                    emitNewOrder(req.io, forcedPayload, true);
                  }
                }
              } catch (e) {
                console.error('Fallback timeout error:', e);
              }
            }, 30000);
          } else {
            // Không tìm thấy ai thì nổ cho tất cả
            const { emitNewOrder } = require('../sockets/index');
            emitNewOrder(req.io, payload, true); // true = isSilentAdmin
          }
        } else {
          const { emitNewOrder } = require('../sockets/index');
          emitNewOrder(req.io, payload, true); // true = isSilentAdmin
        }
        }
      } else if (req.io && scheduledPublishAt) {
        req.io.to('admins').emit('new_order', order);
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
        items, note, packageDetails, rideDetails, financialDetails, codAmount, extraSurcharge, batchedDeliveries, feePaidBy, autoAssignNearest
      } = req.body;

      const surchargeReminder = await getLateNightSurchargeDriverReminder();
      
      let finalDeliveryFee = req.body.deliveryFee || 0;
      let finalExtraSurcharge = extraSurcharge || 0;
      // Do not re-subtract surcharge here because frontend now separates extraSurcharge and deliveryFee

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
        driverReminder: surchargeReminder || '',
        packageDetails: packageDetails || {},
        rideDetails: rideDetails || {},
        financialDetails: financialDetails || {},
        batchedDeliveries: batchedDeliveries || [],
        codAmount: codAmount || 0,
        extraSurcharge: finalExtraSurcharge,
        deliveryFee: finalDeliveryFee,
        feePaidBy: feePaidBy || 'RECEIVER',
        status: (String(autoAssignNearest) === 'true' || autoAssignNearest === true) ? 'PENDING' : 'DRAFT', // Mặc định luôn là DRAFT để bắt buộc Admin duyệt và Treo đơn
        autoAssignNearest: String(autoAssignNearest) === "true",
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
        items, note, driverReminder, codAmount, deliveryFee, extraSurcharge, status, adminBonus,
        bulkyFee, surcharge, // Các phí mới
        packageDescription, // Chi tiết Hàng hóa / Mua hộ
        vehicleClass, // Cập nhật loại xe nếu cần
        bankName, bankAccount, bankAccountName, transactionAmount, // Nạp Rút
        forceAssignDriverId, // Cờ Admin cướp quyền Gán đơn
        commissionRate, // Tỉ lệ chiết khấu riêng
        scheduledPublishAt, // Hẹn giờ lên đơn
        batchedDeliveries, // Cập nhật mảng Đơn ghép
        autoAssignNearest // Cờ tự động gán đơn gần nhất
      } = req.body;
      const orderToUpdate = await Order.findById(id);
      if (!orderToUpdate) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      }

      // Đánh dấu là Admin đã xem/chỉnh sửa đơn này
      orderToUpdate.adminReviewed = true;

      // 1. CẬP NHẬT TRẠNG THÁI (STATUS) THEO YÊU CẦU
      let isDraftToPending = false;

      // Xử lý cờ Quét Lại Gần Nhất từ Admin (Force restart into PENDING)
      if (autoAssignNearest) {
        orderToUpdate.status = 'PENDING';
        orderToUpdate.assignedTo = null;
        orderToUpdate.acceptedAt = undefined;
        orderToUpdate.pickedUpAt = undefined;
        orderToUpdate.cancelReason = undefined;
        if (req.io) {
          req.io.emit('order_cancelled', { _id: orderToUpdate._id.toString(), status: 'DRAFT' }); // Báo driver gỡ đơn
        }
      }

      // Xử lý nhánh "Thu hồi về Lưu Nháp (DRAFT)" (Gỡ bỏ tài xế, ẩn khỏi chợ)
      if (status === 'DRAFT' && orderToUpdate.status !== 'DRAFT') {
        orderToUpdate.status = 'DRAFT';
        orderToUpdate.assignedTo = null;
        orderToUpdate.acceptedAt = undefined;
        orderToUpdate.pickedUpAt = undefined;
        orderToUpdate.cancelReason = undefined; // Bắt buộc xóa Lý do hủy lỗi cũ để khi Treo lại không bị Rống Chuông Admin
        orderToUpdate.pendingAssignTo = [];

        // Tước đơn khỏi map của Admin và xóa trên App của tài xế (như hủy nhưng thực ra là thu hồi ẩn)
        if (req.io) {
          req.io.emit('order_cancelled', { _id: orderToUpdate._id.toString(), status: 'DRAFT' }); // Báo driver gỡ đơn
        }
      }

      // Xử lý nhánh "Đưa lên Đơn Treo" (Từ DRAFT lên PENDING)
      if (status === 'PENDING' && orderToUpdate.status === 'DRAFT') {
        orderToUpdate.status = 'PENDING';
        orderToUpdate.pendingAssignTo = [];
        isDraftToPending = true;
      }

      // 2. GÁN CÁC THÔNG SỐ TEXT VÀ TÀI CHÍNH
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
      if (driverReminder !== undefined) orderToUpdate.driverReminder = driverReminder;
      if (codAmount !== undefined) orderToUpdate.codAmount = codAmount;
      if (extraSurcharge !== undefined) orderToUpdate.extraSurcharge = extraSurcharge;
      
      let isDeliveryFeeChanged = false;
      if (deliveryFee !== undefined) {
        if (orderToUpdate.deliveryFee !== deliveryFee && deliveryFee > 0) isDeliveryFeeChanged = true;
        orderToUpdate.deliveryFee = deliveryFee;
      }
      if (adminBonus !== undefined) orderToUpdate.adminBonus = adminBonus;
      if (commissionRate !== undefined) orderToUpdate.commissionRate = commissionRate;
      if (scheduledPublishAt !== undefined) orderToUpdate.scheduledPublishAt = scheduledPublishAt ? new Date(scheduledPublishAt) : null;
      if (batchedDeliveries !== undefined) orderToUpdate.batchedDeliveries = batchedDeliveries;
      if (autoAssignNearest !== undefined) orderToUpdate.autoAssignNearest = autoAssignNearest;

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

      // 3. XỬ LÝ KIỂM TRA BẮN ĐƠN MẠNH BẠO TỪ ADMIN (KHÔNG VƯỢT TƯỜNG LỬA CHẶN NỢ)
      let didAdminForceAssign = false;
      let forceAssignedDriverFcm = null;
      if (forceAssignDriverId && forceAssignDriverId !== orderToUpdate.assignedTo?.toString()) {
        const Driver = require('../models/Driver');

        const driver = await Driver.findById(forceAssignDriverId);
        if (!driver || driver.status !== 'active') {
          return res.status(400).json({ success: false, message: 'Tài xế không hợp lệ hoặc đã bị khóa.' });
        }

        // Kiểm tra công nợ (dùng hàm chung — chỉ chặn nợ CŨ, bỏ qua nợ hôm nay)
        const debtCheck = await checkDriverDebtBlock(forceAssignDriverId);
        if (debtCheck.blocked) {
          return res.status(400).json({
            success: false,
            message: `Tài xế này đang MẮC NỢ CŨ CHƯA THANH TOÁN (${debtCheck.details.oldDebtDate}). Hệ thống đã chặn gán đơn!`
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
        forceAssignedDriverFcm = driver.fcmToken;
      }

      await orderToUpdate.save();

      // Load gắp thông tin tài xế để socket báo chuẩn chữ
      if (didAdminForceAssign) {
        await orderToUpdate.populate('assignedTo', 'name phone driverCode');
      }

      // Gửi push notification cho khách hàng nếu có báo giá mới
      if (isDeliveryFeeChanged && orderToUpdate.customerId) {
        try {
          const User = require('../models/User');
          const user = await User.findById(orderToUpdate.customerId);
          if (user && user.fcmToken) {
            const { sendNotification } = require('../utils/notification');
            const title = '💰 Đơn hàng đã được báo giá!';
            const body = `Đơn hàng ${orderToUpdate.serviceType} của bạn đã có phí: ${deliveryFee.toLocaleString('vi-VN')}đ.`;
            const notifUrl = user.role === 'SHOP' ? `/shop/order/${orderToUpdate._id}` : `/customer/order/${orderToUpdate._id}`;
            await sendNotification(user.fcmToken, title, body, { url: notifUrl });
          }
        } catch (err) {
          console.error('Lỗi gửi push cho khách hàng:', err);
        }
      }

      // 4. PHÁT SÓNG SOCKET THEO TRẠNG THÁI SAU KHI LƯU
      if (req.io) {
        const payload = typeof orderToUpdate.toObject === 'function' ? orderToUpdate.toObject({ virtuals: true }) : orderToUpdate;
        const { emitNewOrder, emitOrderAccepted, emitToDriver } = require('../sockets/index');

        if (didAdminForceAssign) {
          emitOrderAccepted(req.io, payload);
          req.io.to(`driver_${forceAssignDriverId.toString()}`).emit('force_assigned', payload);
          
          if (forceAssignedDriverFcm) {
            const { sendMultipleNotifications } = require('../utils/notification');
            const feeResponse = payload.deliveryFee ? `${payload.deliveryFee.toLocaleString('vi-VN')}đ` : 'Thỏa thuận';
            let msgBody = payload.driverReminder ? `⚠️ ${payload.driverReminder}\n` : '';
            msgBody += `📍 Đón: ${payload.pickupAddress}\n💵 Phí: ${feeResponse}`;
            await sendMultipleNotifications([forceAssignedDriverFcm], '🎯 TỔNG ĐÀI ĐIỀU PHỐI ĐƠN CHO MÌNH!', msgBody, { url: `/order/${payload._id}`, orderId: payload._id.toString() }).catch(e => console.log('Push lỗi', e));
          }
        } else if (isDraftToPending || autoAssignNearest) {
          // Xử lý ưu tiên 5s cho tài xế VIP khi đơn từ Draft -> Pending
          const Driver = require('../models/Driver');
          const vipDriversFilter = { isOnline: true, isPriority5s: true, status: 'active' };
          if (orderToUpdate.commissionRate) vipDriversFilter.commissionRate = orderToUpdate.commissionRate;
          const vipDrivers = await Driver.find(vipDriversFilter);
          
          if (vipDrivers.length > 0) {
            const driverIds = vipDrivers.map(d => d._id);
            payload.pendingAssignTo = driverIds;
            payload.isVipAssigning = true;
            payload.timeoutDuration = 5;
            await Order.findByIdAndUpdate(orderToUpdate._id, { pendingAssignTo: driverIds, isVipAssigning: true });
            
            const { sendMultipleNotifications } = require('../utils/notification');
            const feeResponse = payload.deliveryFee ? `${payload.deliveryFee.toLocaleString('vi-VN')}đ` : 'Thỏa thuận';
            let msgBody = `📍 Đón: ${payload.pickupAddress}\n💵 Phí: ${feeResponse}`;
            const fcmTokens = [];

            for (const driver of vipDrivers) {
              req.io.to(`driver_${driver._id.toString()}`).emit('nearest_order_assignment', payload);
              if (driver.fcmToken) {
                fcmTokens.push(driver.fcmToken);
              }
            }
            
            if (fcmTokens.length > 0) {
              await sendMultipleNotifications(fcmTokens, '⭐ ĐƠN HÀNG ƯU TIÊN CHO BẠN!', msgBody, { url: `/order/${payload._id}`, orderId: payload._id.toString() }).catch(e => console.log('Push lỗi', e));
            }

            // Fallback timeout: 5s
            setTimeout(async () => {
              try {
                const checkOrder = await Order.findById(orderToUpdate._id);
                if (checkOrder && checkOrder.status === 'PENDING' && checkOrder.pendingAssignTo && checkOrder.pendingAssignTo.length > 0) {
                  const remainingIds = checkOrder.pendingAssignTo;
                  const forcedOrder = await Order.findOneAndUpdate(
                    { _id: orderToUpdate._id, status: 'PENDING' },
                    {
                      $set: { pendingAssignTo: [] },
                      $addToSet: { rejectedBy: { $each: remainingIds } }
                    },
                    { new: true }
                  );
                  if (forcedOrder && req.io) {
                    const forcedPayload = typeof forcedOrder.toObject === 'function' ? forcedOrder.toObject({ virtuals: true }) : forcedOrder;
                    if (autoAssignNearest && forcedPayload.pickupCoordinates && forcedPayload.pickupCoordinates.lat && forcedPayload.pickupCoordinates.lng) {
                      const { findNearestAvailableDriversGroup } = require('../utils/driverAssignment');
                      const nearestDrivers = await findNearestAvailableDriversGroup(
                        forcedPayload.pickupCoordinates.lat,
                        forcedPayload.pickupCoordinates.lng,
                        forcedPayload.commissionRate,
                        remainingIds,
                        5
                      );
                      if (nearestDrivers && nearestDrivers.length > 0) {
                        const driverIds = nearestDrivers.map(d => d._id);
                        forcedPayload.pendingAssignTo = driverIds;
                        forcedPayload.isVipAssigning = false;
                        forcedPayload.timeoutDuration = 30;
                        await Order.findByIdAndUpdate(forcedOrder._id, { pendingAssignTo: driverIds, isVipAssigning: false });
                        const { sendMultipleNotifications } = require('../utils/notification');
                        const feeResponse = forcedPayload.deliveryFee ? `${forcedPayload.deliveryFee.toLocaleString('vi-VN')}đ` : 'Thỏa thuận';
                        let msgBody = `📍 Đón: ${forcedPayload.pickupAddress}\n💵 Phí: ${feeResponse}`;
                        const fcmTokens = [];
                        for (const driver of nearestDrivers) {
                          req.io.to(`driver_${driver._id.toString()}`).emit('nearest_order_assignment', forcedPayload);
                          if (driver.fcmToken) fcmTokens.push(driver.fcmToken);
                        }
                        req.io.to('admins').emit('new_order', forcedPayload);
                        if (fcmTokens.length > 0) {
                          await sendMultipleNotifications(fcmTokens, '🚀 CÓ ĐƠN HÀNG MỚI GẦN BẠN!', msgBody, { url: `/order/${forcedPayload._id}`, orderId: forcedPayload._id.toString() }).catch(e => console.log('Push lỗi', e));
                        }
                        setTimeout(async () => {
                          try {
                            const checkOrder = await Order.findById(forcedOrder._id);
                            if (checkOrder && checkOrder.status === 'PENDING' && checkOrder.pendingAssignTo && checkOrder.pendingAssignTo.length > 0) {
                              const remainingIds2 = checkOrder.pendingAssignTo;
                              const forcedOrder2 = await Order.findOneAndUpdate({ _id: forcedOrder._id, status: 'PENDING' }, { $set: { pendingAssignTo: [] }, $addToSet: { rejectedBy: { $each: remainingIds2 } } }, { new: true });
                              if (forcedOrder2 && req.io) {
                                const forcedPayload2 = typeof forcedOrder2.toObject === 'function' ? forcedOrder2.toObject({ virtuals: true }) : forcedOrder2;
                                emitNewOrder(req.io, forcedPayload2, true);
                              }
                            }
                          } catch (e) { console.error(e); }
                        }, 30000);
                      } else {
                        emitNewOrder(req.io, forcedPayload, true);
                      }
                    } else {
                      emitNewOrder(req.io, forcedPayload, true);
                    }
                  }
                }
              } catch (e) {
                console.error('Fallback timeout error:', e);
              }
            }, 5000);
          } else if (autoAssignNearest && orderToUpdate.pickupCoordinates && orderToUpdate.pickupCoordinates.lat && orderToUpdate.pickupCoordinates.lng) {
            const { findNearestAvailableDriversGroup } = require('../utils/driverAssignment');
            const nearestDrivers = await findNearestAvailableDriversGroup(
              orderToUpdate.pickupCoordinates.lat,
              orderToUpdate.pickupCoordinates.lng,
              orderToUpdate.commissionRate,
              [],
              9999
            );
            
            if (nearestDrivers && nearestDrivers.length > 0) {
              const driverIds = nearestDrivers.map(d => d._id);
              payload.pendingAssignTo = driverIds;
              payload.isVipAssigning = false;
              payload.timeoutDuration = 30;
              await Order.findByIdAndUpdate(orderToUpdate._id, { pendingAssignTo: driverIds, isVipAssigning: false });
              
              const { sendMultipleNotifications } = require('../utils/notification');
              const feeResponse = payload.deliveryFee ? `${payload.deliveryFee.toLocaleString('vi-VN')}đ` : 'Thỏa thuận';
              let msgBody = `📍 Đón: ${payload.pickupAddress}\n💵 Phí: ${feeResponse}`;
              const fcmTokens = [];

              for (const driver of nearestDrivers) {
                req.io.to(`driver_${driver._id.toString()}`).emit('nearest_order_assignment', payload);
                if (driver.fcmToken) {
                  fcmTokens.push(driver.fcmToken);
                }
              }
              
              if (fcmTokens.length > 0) {
                await sendMultipleNotifications(fcmTokens, '🚀 CÓ ĐƠN HÀNG MỚI GẦN BẠN!', msgBody, { url: `/order/${payload._id}`, orderId: payload._id.toString() }).catch(e => console.log('Push lỗi', e));
              }

              setTimeout(async () => {
                try {
                  const checkOrder = await Order.findById(orderToUpdate._id);
                  if (checkOrder && checkOrder.status === 'PENDING' && checkOrder.pendingAssignTo && checkOrder.pendingAssignTo.length > 0) {
                    const remainingIds = checkOrder.pendingAssignTo;
                    const forcedOrder = await Order.findOneAndUpdate(
                      { _id: orderToUpdate._id, status: 'PENDING' },
                      {
                        $set: { pendingAssignTo: [] },
                        $addToSet: { rejectedBy: { $each: remainingIds } }
                      },
                      { new: true }
                    );
                    if (forcedOrder && req.io) {
                      const forcedPayload = typeof forcedOrder.toObject === 'function' ? forcedOrder.toObject({ virtuals: true }) : forcedOrder;
                      emitNewOrder(req.io, forcedPayload, true);
                    }
                  }
                } catch (e) {
                  console.error('Fallback timeout error:', e);
                }
              }, 30000);
            } else {
              emitNewOrder(req.io, payload, true);
            }
          } else {
            emitNewOrder(req.io, payload, true); // true = isSilentAdmin (Treo lại đơn không báo hú Admin)
          }
          req.io.to('admins').emit('order_updated', payload);
        } else {
          // Bắn socket thông thường cho Admin
          req.io.to('admins').emit('order_updated', payload);
          
          // Bắn order_updated cho Driver để App Tài Xế lọc lại đơn nếu chiết khấu (commissionRate) thay đổi
          if (payload.status === 'PENDING') {
            req.io.to('drivers').emit('order_updated', payload);
          }
        }

        // Emit tới Khách hàng/Shop đã tạo đơn
        if (payload.customerId) {
          const creatorId = payload.customerId._id || payload.customerId;
          req.io.to(`customer_${creatorId.toString()}`).emit('order_updated', payload);
          req.io.to(`shop_${creatorId.toString()}`).emit('order_updated', payload);
        }

        // Emit tới Tài xế nhận đơn (nếu có)
        if (payload.assignedTo) {
          const driverId = payload.assignedTo._id || payload.assignedTo;
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

      // Kiểm tra công nợ (dùng hàm chung — chỉ chặn nợ CŨ, bỏ qua nợ hôm nay)
      const debtCheck = await checkDriverDebtBlock(req.driver._id);
      if (debtCheck.blocked) {
        return res.status(200).json({
          success: false,
          message: debtCheck.message || 'Bạn chưa thanh toán công nợ'
        });
      }

      // KIỂM TRA SỐ LƯỢNG ĐƠN HÀNG ĐANG THỰC HIỆN
      const activeOrdersCount = await Order.countDocuments({
        assignedTo: req.driver._id,
        status: { $in: ['ACCEPTED', 'PICKED_UP', 'DELIVERING'] }
      });

      if (activeOrdersCount >= 3) {
        return res.status(200).json({
          success: false,
          message: 'hiện tại bạn đang có 3 đơn hàng hãy đảm bảo thời gian giao hàng'
        });
      }

      // Lấy Order kiểm tra pendingAssignTo trước khi update
      const existingOrder = await Order.findOne({ _id: id, status: 'PENDING' });
      if (!existingOrder) {
        return res.status(400).json({ success: false, message: 'Đơn hàng đã được nhận bởi tài xế khác hoặc không tồn tại' });
      }
      
      if (existingOrder.pendingAssignTo && existingOrder.pendingAssignTo.length > 0) {
        // Kiểm tra xem req.driver._id có nằm trong mảng pendingAssignTo không
        const isDriverInGroup = existingOrder.pendingAssignTo.some(id => id.toString() === req.driver._id.toString());
        if (!isDriverInGroup) {
          return res.status(400).json({ success: false, message: 'Đơn hàng đang chờ nhóm tài xế khác phản hồi, vui lòng thử lại sau' });
        }
      }

      // Race condition prevention: chỉ update nếu status vẫn là PENDING
      const order = await Order.findOneAndUpdate(
        { _id: id, status: 'PENDING' },
        {
          status: 'ACCEPTED',
          assignedTo: req.driver._id,
          pendingAssignTo: null, // Xóa pendingAssignTo
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

  // POST /api/orders/:id/nearest-reject - Tài xế từ chối gán đơn gần nhất
  rejectNearestAssignment: async (req, res) => {
    try {
      const { id } = req.params;
      const driverId = req.driver._id;
      
      const order = await Order.findById(id);
      if (!order) return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
      
      if (order.pendingAssignTo && order.pendingAssignTo.length > 0) {
        // Atomic update to prevent race conditions when multiple drivers timeout at exactly 30s
        const updatedOrder = await Order.findOneAndUpdate(
          { _id: id, pendingAssignTo: driverId },
          {
            $pull: { pendingAssignTo: driverId },
            $addToSet: { rejectedBy: driverId }
          },
          { new: true }
        );

        // Nếu mảng pendingAssignTo đã trống (tất cả tài xế trong nhóm đều từ chối hoặc hết hạn)
        // và đơn vẫn đang PENDING
        if (updatedOrder && updatedOrder.pendingAssignTo.length === 0 && updatedOrder.status === 'PENDING') {
          if (req.io) {
            const payload = typeof updatedOrder.toObject === 'function' ? updatedOrder.toObject({ virtuals: true }) : updatedOrder;
            console.log('[DEBUG] rejectNearestAssignment -> isVipAssigning:', updatedOrder.isVipAssigning, 'autoAssignNearest:', updatedOrder.autoAssignNearest, 'coords:', payload.pickupCoordinates);
            if (updatedOrder.isVipAssigning && updatedOrder.autoAssignNearest && payload.pickupCoordinates && payload.pickupCoordinates.lat && payload.pickupCoordinates.lng) {
              console.log('[DEBUG] fallback to 1.5km nearest logic');
              const { findNearestAvailableDriversGroup } = require('../utils/driverAssignment');
              const nearestDrivers = await findNearestAvailableDriversGroup(
                payload.pickupCoordinates.lat,
                payload.pickupCoordinates.lng,
                payload.commissionRate,
                updatedOrder.rejectedBy || [],
                5
              );
              if (nearestDrivers && nearestDrivers.length > 0) {
                const driverIds = nearestDrivers.map(d => d._id);
                payload.pendingAssignTo = driverIds;
                payload.isVipAssigning = false;
                payload.timeoutDuration = 30;
                const newlyUpdated = await Order.findByIdAndUpdate(updatedOrder._id, { pendingAssignTo: driverIds, isVipAssigning: false }, { new: true });
                const { sendMultipleNotifications } = require('../utils/notification');
                const feeResponse = payload.deliveryFee ? `${payload.deliveryFee.toLocaleString('vi-VN')}đ` : 'Thỏa thuận';
                let msgBody = `📍 Đón: ${payload.pickupAddress}\n💵 Phí: ${feeResponse}`;
                const fcmTokens = [];
                for (const driver of nearestDrivers) {
                  req.io.to(`driver_${driver._id.toString()}`).emit('nearest_order_assignment', payload);
                  if (driver.fcmToken) fcmTokens.push(driver.fcmToken);
                }
                req.io.to('admins').emit('new_order', payload);
                if (fcmTokens.length > 0) {
                  await sendMultipleNotifications(fcmTokens, '🚀 CÓ ĐƠN HÀNG MỚI GẦN BẠN!', msgBody, { url: `/order/${payload._id}`, orderId: payload._id.toString() }).catch(e => console.log('Push lỗi', e));
                }
                setTimeout(async () => {
                  try {
                    const checkOrder = await Order.findById(newlyUpdated._id);
                    if (checkOrder && checkOrder.status === 'PENDING' && checkOrder.pendingAssignTo && checkOrder.pendingAssignTo.length > 0) {
                      const remainingIds2 = checkOrder.pendingAssignTo;
                      const forcedOrder2 = await Order.findOneAndUpdate({ _id: newlyUpdated._id, status: 'PENDING' }, { $set: { pendingAssignTo: [] }, $addToSet: { rejectedBy: { $each: remainingIds2 } } }, { new: true });
                      if (forcedOrder2 && req.io) {
                        const forcedPayload2 = typeof forcedOrder2.toObject === 'function' ? forcedOrder2.toObject({ virtuals: true }) : forcedOrder2;
                        const { emitNewOrder } = require('../sockets/index');
                        emitNewOrder(req.io, forcedPayload2, true);
                      }
                    }
                  } catch (e) { console.error(e); }
                }, 30000);
              } else {
                const { emitNewOrder } = require('../sockets/index');
                emitNewOrder(req.io, payload, true);
              }
            } else {
              const { emitNewOrder } = require('../sockets/index');
              emitNewOrder(req.io, payload, true); // true = isSilentAdmin
            }
          }
        }
      }
      
      res.status(200).json({ success: true, message: 'Đã từ chối đơn hàng' });
    } catch (error) {
      console.error('Error rejectNearestAssignment:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
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
          message: 'Đơn hàng không còn hợp lệ (có thể đã bị huỷ hoặc trạng thái đã thay đổi).'
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
          message: 'Đơn hàng không còn hợp lệ (có thể đã bị huỷ hoặc trạng thái đã thay đổi).'
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
      const commissionRate = order.commissionRate != null ? order.commissionRate : (driver.commissionRate || 15);
      const debtAmount = Math.round(deliveryFee * (commissionRate / 100));

      if (debtAmount > 0) {
        // Lưu Lịch sử Giao Dịch + Cộng walletDebt NGAY SÁT NHAU (tránh lệch dữ liệu)
        const todayStr = getTodayVN();
        const debtTx = new DebtTransaction({
          driverId: driver._id,
          orderId: order._id,
          type: 'FEE_DEDUCTION',
          amount: debtAmount,
          description: `Thu chiết khấu ${commissionRate}% đơn hàng ${order.orderCode} (Phí ship: ${deliveryFee}đ)`,
          targetDate: todayStr
        });
        await debtTx.save();
        // $inc walletDebt ngay sau khi lưu DebtTransaction thành công
        await Driver.findByIdAndUpdate(req.driver._id, { $inc: { walletDebt: debtAmount } });
        console.log(`[DEBT ADD] Tài xế ${driver.name} (${driver._id}): +${debtAmount}đ cho đơn ${order.orderCode}. Ngày: ${todayStr}`);
      }

      // Nếu đơn hàng có tiền thưởng, cộng ngay vào Ví
      const adminBonus = order.adminBonus || 0;
      // walletDebt đã được $inc ở trên rồi, KHÔNG inc lại ở đây
      let walletInc = { 'stats.completedOrders': 1 };

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

      // Tăng số lượng đã bán (soldCount) cho món ăn nếu là đơn ALOFOOD
      if (order.serviceType === 'ALOFOOD' && order.alofoodDetails && order.alofoodDetails.cartItems) {
        const MenuItem = require('../models/MenuItem');
        for (const item of order.alofoodDetails.cartItems) {
          if (item.menuItemId) {
            await MenuItem.findByIdAndUpdate(item.menuItemId, { $inc: { soldCount: item.quantity } });
          }
        }
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
          { _id: id, customerId: req.customer._id, status: { $in: ['PENDING', 'DRAFT', 'WAITING_SHOP'] } },
          {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelReason: reason || 'Khách hàng đổi ý'
          },
          { new: true }
        );
      if (order) await refundOrderDebtIfAny(order._id);

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
        { _id: id, status: { $in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'DELIVERING', 'WAITING_SHOP'] } },
        {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: req.admin._id,
          cancelReason: reason || 'Hủy bởi admin'
        },
        { new: true }
      );
      if (order) await refundOrderDebtIfAny(order._id);

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

  // POST /api/orders/:id/confirm - Khách hàng xác nhận đơn hàng sau khi có báo giá
  confirmCustomerOrder: async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.customer) {
        return res.status(403).json({ success: false, message: 'Chỉ khách hàng mới có thể xác nhận đơn.' });
      }

      const order = await Order.findOneAndUpdate(
        { _id: id, customerId: req.customer._id, status: 'DRAFT', adminReviewed: true },
        { status: 'PENDING' },
        { new: true }
      );

      if (!order) {
        return res.status(400).json({ success: false, message: 'Không thể xác nhận! Đơn hàng không tồn tại hoặc đã được xử lý.' });
      }

      if (req.io) {
        const { emitNewOrder } = require('../sockets/index');
        const payload = typeof order.toObject === 'function' ? order.toObject({ virtuals: true }) : order;
        // Phát sự kiện cho Admin và Driver (isSilentAdmin = true để không hú còi rốngng)
        emitNewOrder(req.io, payload, true);
        req.io.to('admins').emit('order_updated', payload);
        
        // Cập nhật lại cho khách
        const creatorId = payload.customerId._id || payload.customerId;
        req.io.to(`customer_${creatorId.toString()}`).emit('order_updated', payload);
        req.io.to(`shop_${creatorId.toString()}`).emit('order_updated', payload);
      }

      res.status(200).json({
        success: true,
        message: 'Xác nhận đơn hàng thành công, đang tìm tài xế!',
        data: order
      });
    } catch (error) {
      console.error('Error confirmCustomerOrder:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xác nhận đơn hàng'
      });
    }
  },

  // DELETE /api/orders/:id - Xóa đơn hàng (Admin)
  deleteOrder: async (req, res) => {
    try {
      const { id } = req.params;

      const order = await Order.findByIdAndDelete(id);
      if (order) await refundOrderDebtIfAny(order._id);

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
      const { date, weekOffset } = req.query;

      // Đầu ngày theo giờ Việt Nam
      let startOfToday;
      if (date) {
        startOfToday = new Date(`${date}T00:00:00+07:00`);
      } else {
        startOfToday = startOfTodayVietnam();
      }

      const endOfToday = new Date(startOfToday);
      endOfToday.setHours(23, 59, 59, 999);

      // Đơn hoàn thành / doanh thu "trong ngày" = theo thời điểm giao (deliveredAt), không phải ngày tạo đơn
      const completedTodayMatch = {
        status: 'COMPLETED',
        $or: [
          { deliveredAt: { $gte: startOfToday, $lte: endOfToday } },
          { deliveredAt: null, updatedAt: { $gte: startOfToday, $lte: endOfToday } },
        ],
      };
      const cancelledTodayMatch = {
        status: 'CANCELLED',
        $or: [
          { cancelledAt: { $gte: startOfToday, $lte: endOfToday } },
          { cancelledAt: null, updatedAt: { $gte: startOfToday, $lte: endOfToday } },
        ],
      };

      // Đơn tạo "hôm nay" VN
      const todayCreatedQuery = Order.countDocuments({ createdAt: { $gte: startOfToday, $lte: endOfToday } });

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

      // Online drivers
      const topDrivers = await Driver.find({ isOnline: true })
        .select('name phone stats driverCode')
        .sort({ 'stats.completedOrders': -1 })
        .lean();

      // Recent orders
      const recentOrders = await Order.find()
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      // Xếp hạng tài xế trong tuần (từ Thứ 2)
      const referenceDate = startOfTodayVietnam();
      const dayOfWeek = referenceDate.getDay();
      const offsetDays = Number(weekOffset) || 0;
      const diffToMonday = referenceDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) + (offsetDays * 7);
      
      const startOfWeek = new Date(referenceDate);
      startOfWeek.setDate(diffToMonday);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const weeklyDriverStats = await Order.aggregate([
        { 
          $match: { 
            status: 'COMPLETED',
            $or: [
              { deliveredAt: { $gte: startOfWeek, $lte: endOfWeek } },
              { deliveredAt: null, updatedAt: { $gte: startOfWeek, $lte: endOfWeek } }
            ]
          } 
        },
        { 
          $group: { 
            _id: '$assignedTo', 
            totalOrders: { $sum: 1 }, 
            totalMoney: { $sum: '$deliveryFee' }
          } 
        },
        { $sort: { totalOrders: -1, totalMoney: -1 } }
      ]);

      const DriverModel = require('../models/Driver');
      await DriverModel.populate(weeklyDriverStats, { path: '_id', select: 'name phone driverCode' });

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
          recentOrders,
          weeklyDriverStats,
          weekRange: {
            start: startOfWeek,
            end: endOfWeek
          }
        }
      });
    } catch (error) {
      console.error('Error getDashboardStats:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    }
  },

  // DELETE /api/orders/cleanup - Xoá đơn hàng theo mốc ngày (Admin)
  deleteOldOrders: async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn Từ ngày và Đến ngày hợp lệ.' });
      }

      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      if (start > end) {
        return res.status(400).json({ success: false, message: 'Từ ngày không thể lớn hơn Đến ngày.' });
      }

      // Chỉ xoá đơn COMPLETED hoặc CANCELLED trong khoảng thời gian đã chọn
      const result = await Order.deleteMany({
        createdAt: { $gte: start, $lte: end },
        status: { $in: ['COMPLETED', 'CANCELLED'] }
      });

      // Recount stats for all drivers
      if (result.deletedCount > 0) {
        const allDrivers = await Driver.find({}, '_id');
        for (const drv of allDrivers) {
          const completed = await Order.countDocuments({ assignedTo: drv._id, status: 'COMPLETED' });
          const cancelled = await Order.countDocuments({ assignedTo: drv._id, status: 'CANCELLED' });
          await Driver.findByIdAndUpdate(drv._id, {
            'stats.completedOrders': completed,
            'stats.cancelledOrders': cancelled
          });
        }
      }

      if (req.io && result.deletedCount > 0) {
        req.io.emit('refresh_orders_data');
      }

      res.status(200).json({
        success: true,
        message: `Đã dọn dẹp thành công ${result.deletedCount} đơn hàng trong khoảng thời gian đã chọn.`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Error deleteOldOrders:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi xoá dữ liệu cũ' });
    }
  },

  // POST /api/orders/bulk-delete - Xoá nhiều đơn hàng (Admin)
  bulkDeleteOrders: async (req, res) => {
    try {
      const { orderIds } = req.body;
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Danh sách đơn hàng không hợp lệ' });
      }

      const result = await Order.deleteMany({
        _id: { $in: orderIds }
      });

      // Recount stats for all drivers
      if (result.deletedCount > 0) {
        const allDrivers = await Driver.find({}, '_id');
        for (const drv of allDrivers) {
          const completed = await Order.countDocuments({ assignedTo: drv._id, status: 'COMPLETED' });
          const cancelled = await Order.countDocuments({ assignedTo: drv._id, status: 'CANCELLED' });
          await Driver.findByIdAndUpdate(drv._id, {
            'stats.completedOrders': completed,
            'stats.cancelledOrders': cancelled
          });
        }
      }

      if (req.io) {
        req.io.emit('refresh_orders_data');
      }

      res.status(200).json({
        success: true,
        message: `Đã xóa thành công ${result.deletedCount} đơn hàng.`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Error bulkDeleteOrders:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi xoá nhiều đơn hàng' });
    }
  },

  // POST /api/orders/integration - API mở cho App bán bánh đẩy đơn sang
  createIntegrationOrder: async (req, res) => {
    try {
      const {
        customerName, customerPhone,
        pickupAddress, pickupCoordinates,
        deliveryAddress, deliveryCoordinates,
        items, note, codAmount
      } = req.body;

      if (!pickupCoordinates || !deliveryCoordinates || !pickupCoordinates.lat || !deliveryCoordinates.lat) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin tọa độ bắt buộc.' });
      }

      // Lấy khoảng cách thực tế từ OSRM
      const distanceKm = await getDrivingDistance(
        pickupCoordinates.lat, pickupCoordinates.lng,
        deliveryCoordinates.lat, deliveryCoordinates.lng
      );

      // Lấy cấu hình tính tiền
      let deliveryFee = 0;
      if (distanceKm > 10.1) {
        deliveryFee = Math.ceil(distanceKm * 5000);
      } else {
        const configDoc = await Config.findOne({ key: 'PRICING_CONFIG' });
        if (configDoc && configDoc.value && Array.isArray(configDoc.value.tiers)) {
          const tiers = configDoc.value.tiers.sort((a, b) => a.maxKm - b.maxKm);
          
          let appliedTier = tiers.find(t => distanceKm <= t.maxKm);
          if (!appliedTier) {
             appliedTier = tiers[tiers.length - 1];
          }

          if (appliedTier.type === 'fixed') {
             deliveryFee = appliedTier.price;
          } else if (appliedTier.type === 'per_km') {
             const prevTierIndex = tiers.indexOf(appliedTier) - 1;
             const prevTier = prevTierIndex >= 0 ? tiers[prevTierIndex] : null;
             
             if (prevTier) {
                const extraKm = Math.max(0, distanceKm - prevTier.maxKm);
                deliveryFee = prevTier.price + Math.ceil(extraKm * appliedTier.price);
             } else {
                deliveryFee = Math.ceil(distanceKm * appliedTier.price);
             }
          }
        } else {
          deliveryFee = 15000;
          if (distanceKm > 2) {
            deliveryFee += Math.ceil((distanceKm - 2) * 5000);
          }
        }
      }

      try {
        const surchargeDoc = await Config.findOne({ key: 'LATE_NIGHT_SURCHARGE_CONFIG' });
        let cfg = { level1: { time: '22:30', amount: 3000 }, level2: { time: '23:30', amount: 5000 }, endTime: '06:00' };
        if (surchargeDoc && surchargeDoc.value) {
          cfg = surchargeDoc.value;
        }

        if (cfg) {
          const parseTime = (timeStr) => {
            if (!timeStr) return null;
            const parts = timeStr.split(':');
            return { h: parseInt(parts[0], 10) || 0, m: parseInt(parts[1], 10) || 0 };
          };
          
          const l1 = parseTime(cfg.level1?.time);
          const l2 = parseTime(cfg.level2?.time);
          const e = parseTime(cfg.endTime);
          
          if (l1 && l2 && e) {
            const vnTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
            const currentTotalMinutes = vnTime.getHours() * 60 + vnTime.getMinutes();
            const l1Total = l1.h * 60 + l1.m;
            const l2Total = l2.h * 60 + l2.m;
            const eTotal = e.h * 60 + e.m;
            const isBetween = (startMins, endMins, current) => {
              if (startMins <= endMins) {
                return current >= startMins && current <= endMins;
              } else {
                return current >= startMins || current <= endMins;
              }
            };
            
            if (isBetween(l2Total, eTotal, currentTotalMinutes)) {
              deliveryFee += (cfg.level2?.amount || 0);
            } else if (isBetween(l1Total, eTotal, currentTotalMinutes)) {
              deliveryFee += (cfg.level1?.amount || 0);
            }
          }
        }
      } catch (err) {}

      // Làm tròn tiền đến hàng nghìn (ví dụ 17500 -> 18000 hoặc giữ nguyên tùy ý, tạm giữ nguyên)
      const surchargeReminder = await getLateNightSurchargeDriverReminder();

      let finalDeliveryFee = deliveryFee || 0;
      let finalExtraSurcharge = 0;
      const surchargeAmount = await getLateNightSurchargeAmount();
      if (surchargeAmount > 0) {
        if (finalDeliveryFee >= surchargeAmount) {
           finalDeliveryFee -= surchargeAmount;
        }
        finalExtraSurcharge += surchargeAmount;
      }

      const order = new Order({
        serviceType: 'GIAO_HANG',
        subServiceType: 'GIAO_BANH',
        customerName: customerName || 'Khách App Bán Bánh',
        bakeryOrderId: req.body.bakeryOrderId || null,
        customerPhone: customerPhone || '',
        pickupAddress: pickupAddress || 'Cửa hàng Bánh',
        deliveryAddress: deliveryAddress || '',
        pickupCoordinates,
        deliveryCoordinates,
        items: items || [],
        note: note || '',
        driverReminder: surchargeReminder || '',
        codAmount: codAmount || 0,
        deliveryFee: finalDeliveryFee, // Phí ship đã trừ surcharge
        extraSurcharge: finalExtraSurcharge,
        status: 'DRAFT', // Chuyển thành DRAFT (Chờ báo giá) thay vì PENDING để chờ Admin xem xét lại trước khi Treo lên cho tài xế
        ipAddress: req.ip
      });

      await order.save();

      // Emit qua socket để báo tài xế & admin
      if (req.io) {
        const payload = typeof order.toObject === 'function' ? order.toObject({ virtuals: true }) : order;
        const { emitNewOrder } = require('../sockets/index');
        emitNewOrder(req.io, payload, false); // false = báo chuông cho Admin
      }

      // Trả về cho App bán bánh
      res.status(201).json({
        success: true,
        message: 'Tạo đơn hàng thành công từ App Bán Bánh',
        data: {
          orderId: order._id,
          orderCode: order.orderCode,
          distanceKm,
          deliveryFee
        }
      });

    } catch (error) {
      console.error('Error createIntegrationOrder:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi tạo đơn integration' });
    }
  },

  // POST /api/orders/integration/:id/cancel
  cancelIntegrationOrder: async (req, res) => {
    try {
      const { id } = req.params;
      
      const order = await Order.findOneAndUpdate(
        { _id: id, status: { $in: ['DRAFT', 'PENDING'] } },
        {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: 'Hủy từ App Bán Bánh'
        },
        { new: true }
      );

      if (!order) {
        return res.status(400).json({ success: false, message: 'Không thể hủy. Đơn hàng có thể đã được tài xế nhận hoặc không tồn tại.' });
      }

      if (req.io) {
        const { emitOrderCancelled } = require('../sockets/index');
        emitOrderCancelled(req.io, order);
      }

      res.status(200).json({ success: true, message: 'Đã hủy đơn bên AloShipp thành công.' });
    } catch (error) {
      console.error('Error cancelIntegrationOrder:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi hủy đơn integration' });
    }
  },

  // POST /api/orders/estimate-fee
  estimateCustomerFee: async (req, res) => {
    try {
      const { pickupCoordinates, deliveryCoordinates, serviceType, subServiceType } = req.body;

      if (serviceType === 'DIEU_PHOI' || !pickupCoordinates || !deliveryCoordinates || !pickupCoordinates.lat || !deliveryCoordinates.lat) {
        return res.status(200).json({ success: true, data: { distanceKm: 0, deliveryFee: null } });
      }

      // Lấy khoảng cách và đường đi thực tế từ Goong
      const { distanceKm, routeLine } = await getDrivingDistance(
        pickupCoordinates.lat, pickupCoordinates.lng,
        deliveryCoordinates.lat, deliveryCoordinates.lng
      );

      // Lấy cấu hình tính tiền
      let deliveryFee = 0;
      const configDoc = await Config.findOne({ key: 'PRICING_CONFIG' });
      
      if (subServiceType === 'XE_OM') {
        const pricePerKm = configDoc?.value?.xeOm?.pricePerKm || 5000;
        deliveryFee = Math.ceil(distanceKm * pricePerKm);
      } else if (subServiceType === 'LAI_HO_XE_MAY') {
        const cfg = configDoc?.value?.laiHoXeMay || { initialKm: 2, initialPrice: 50000, pricePerKm: 10000 };
        if (distanceKm <= cfg.initialKm) {
          deliveryFee = cfg.initialPrice;
        } else {
          deliveryFee = cfg.initialPrice + Math.ceil((distanceKm - cfg.initialKm) * cfg.pricePerKm);
        }
      } else if (subServiceType === 'LAI_HO_OTO') {
        const cfg = configDoc?.value?.laiHoOto || { initialKm: 2, initialPrice: 100000, pricePerKm: 20000 };
        if (distanceKm <= cfg.initialKm) {
          deliveryFee = cfg.initialPrice;
        } else {
          deliveryFee = cfg.initialPrice + Math.ceil((distanceKm - cfg.initialKm) * cfg.pricePerKm);
        }
      } else {
        if (distanceKm > 10.1) {
          deliveryFee = Math.ceil(distanceKm * 5000);
        } else {
          if (configDoc && configDoc.value && Array.isArray(configDoc.value.tiers)) {
            const tiers = configDoc.value.tiers.sort((a, b) => a.maxKm - b.maxKm);
            
            let appliedTier = tiers.find(t => distanceKm <= t.maxKm);
            if (!appliedTier) {
               appliedTier = tiers[tiers.length - 1];
            }

            if (appliedTier.type === 'fixed') {
               deliveryFee = appliedTier.price;
            } else if (appliedTier.type === 'per_km') {
               const prevTierIndex = tiers.indexOf(appliedTier) - 1;
               const prevTier = prevTierIndex >= 0 ? tiers[prevTierIndex] : null;
               
               if (prevTier) {
                  const extraKm = Math.max(0, distanceKm - prevTier.maxKm);
                  deliveryFee = prevTier.price + Math.ceil(extraKm * appliedTier.price);
               } else {
                  deliveryFee = Math.ceil(distanceKm * appliedTier.price);
               }
            }
          } else {
            deliveryFee = 15000;
            if (distanceKm > 2) {
              deliveryFee += Math.ceil((distanceKm - 2) * 5000);
            }
          }
        }
      }

      // Phụ phí giờ khuya (LATE_NIGHT_SURCHARGE_CONFIG)
      let extraSurcharge = 0;
      let surchargeNote = '';
      try {
        const surchargeDoc = await Config.findOne({ key: 'LATE_NIGHT_SURCHARGE_CONFIG' });
        let cfg = { level1: { time: '22:30', amount: 3000 }, level2: { time: '23:30', amount: 5000 }, endTime: '06:00' };
        if (surchargeDoc && surchargeDoc.value) {
          cfg = surchargeDoc.value;
        }
        
        if (cfg) {
          const parseTime = (timeStr) => {
            if (!timeStr) return null;
            const parts = timeStr.split(':');
            return { h: parseInt(parts[0], 10) || 0, m: parseInt(parts[1], 10) || 0 };
          };
          
          const l1 = parseTime(cfg.level1?.time);
          const l2 = parseTime(cfg.level2?.time);
          const e = parseTime(cfg.endTime);
          
          if (l1 && l2 && e) {
            const vnTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
            const currentTotalMinutes = vnTime.getHours() * 60 + vnTime.getMinutes();
            
            const l1Total = l1.h * 60 + l1.m;
            const l2Total = l2.h * 60 + l2.m;
            const eTotal = e.h * 60 + e.m;
            
            // Xử lý trường hợp vượt qua nửa đêm. Ví dụ bắt đầu 23:30, kết thúc 06:00
            // Nghĩa là từ 23:30 -> 23:59 VÀ 00:00 -> 06:00
            const isBetween = (startMins, endMins, current) => {
              if (startMins <= endMins) {
                return current >= startMins && current <= endMins;
              } else {
                return current >= startMins || current <= endMins;
              }
            };
            
            // Phải check mức 2 trước vì nó cao hơn
            if (isBetween(l2Total, eTotal, currentTotalMinutes)) {
              extraSurcharge = (cfg.level2?.amount || 0);
              surchargeNote = `Phụ phí đêm khuya (sau ${cfg.level2?.time})`;
            } else if (isBetween(l1Total, eTotal, currentTotalMinutes)) {
              extraSurcharge = (cfg.level1?.amount || 0);
              surchargeNote = `Phụ phí đêm khuya (sau ${cfg.level1?.time})`;
            }
          }
        }
      } catch (err) {
        console.error('Lỗi tính phụ phí giờ khuya:', err);
      }

      res.status(200).json({
        success: true,
        data: {
          distanceKm,
          deliveryFee,
          extraSurcharge,
          surchargeNote,
          routeLine
        }
      });

    } catch (error) {
      console.error('Error estimateCustomerFee:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi tính phí' });
    }
  }
};

module.exports = orderController;
