import re

with open('backend/controllers/orderController.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the old block starting at `let didAdminForceAssign = false;` and ending at `req.io.to(\`shop_${creatorId.toString()}\`).emit('order_updated', payload);`
old_block_pattern = r"let didAdminForceAssign = false;.*?req\.io\.to\(`shop_\$\{creatorId\.toString\(\)\}`\)\.emit\('order_updated', payload\);\s*\}\s*\}"

new_block = """      // 1. CẬP NHẬT TRẠNG THÁI (STATUS) THEO YÊU CẦU
      let isDraftToPending = false;

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
        }
      }

      // Xử lý nhánh "Đưa lên Đơn Treo" (Từ DRAFT lên PENDING)
      if (status === 'PENDING' && orderToUpdate.status === 'DRAFT') {
        orderToUpdate.status = 'PENDING';
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
      if (codAmount !== undefined) orderToUpdate.codAmount = codAmount;
      
      let isDeliveryFeeChanged = false;
      if (deliveryFee !== undefined) {
        if (orderToUpdate.deliveryFee !== deliveryFee && deliveryFee > 0) isDeliveryFeeChanged = true;
        orderToUpdate.deliveryFee = deliveryFee;
      }
      if (adminBonus !== undefined) orderToUpdate.adminBonus = adminBonus;
      if (commissionRate !== undefined) orderToUpdate.commissionRate = commissionRate;

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
            await sendNotification(user.fcmToken, title, body, { url: `/customer/order/${orderToUpdate._id}` });
          }
        } catch (err) {
          console.error('Lỗi gửi push cho khách hàng:', err);
        }
      }

      // 4. PHÁT SÓNG SOCKET THEO TRẠNG THÁI SAU KHI LƯU
      if (req.io) {
        const payload = typeof orderToUpdate.toObject === 'function' ? orderToUpdate.toObject({ virtuals: true }) : orderToUpdate;
        const { emitNewOrder, emitOrderAccepted } = require('../sockets/index');

        if (didAdminForceAssign) {
          emitOrderAccepted(req.io, payload);
          req.io.to(`driver_${forceAssignDriverId.toString()}`).emit('force_assigned', payload);
          
          if (forceAssignedDriverFcm) {
            const { sendMultipleNotifications } = require('../utils/notification');
            const feeResponse = payload.deliveryFee ? `${payload.deliveryFee.toLocaleString('vi-VN')}đ` : 'Thỏa thuận';
            let msgBody = `📍 Đón: ${payload.pickupAddress}\\n💵 Phí: ${feeResponse}`;
            await sendMultipleNotifications([forceAssignedDriverFcm], '🎯 TỔNG ĐÀI ĐIỀU PHỐI ĐƠN CHO MÌNH!', msgBody, { url: `/order/${payload._id}` }).catch(e => console.log('Push lỗi', e));
          }
        } else if (isDraftToPending) {
          emitNewOrder(req.io, payload, true); // true = isSilentAdmin (Treo lại đơn không báo hú Admin)
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
      }"""

# Execute replacement
new_content = re.sub(old_block_pattern, new_block, content, flags=re.DOTALL)

with open('backend/controllers/orderController.js', 'w', encoding='utf-8') as f:
    f.write(new_content)
