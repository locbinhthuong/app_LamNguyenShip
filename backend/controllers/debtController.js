const Driver = require('../models/Driver');
const DebtTransaction = require('../models/DebtTransaction');
const { emitDebtPaymentRequest } = require('../sockets/index');

const debtController = {
  // Lấy chi tiết ví công nợ và lịch sử giao dịch của 1 tài xế (Admin)
  getDriverDebtDetail: async (req, res) => {
    try {
      const { driverId } = req.params;
      
      const driver = await Driver.findById(driverId).select('name phone walletDebt commissionRate');
      if (!driver) return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế' });

      const transactions = await DebtTransaction.find({ driverId })
        .populate('orderId', 'orderCode deliveryFee')
        .populate('createdByAdminId', 'name')
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({
        success: true,
        data: {
          driver,
          transactions
        }
      });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // Thêm một khoản phạt (tăng nợ)
  addPenalty: async (req, res) => {
    try {
      const { driverId } = req.params;
      const { amount, description } = req.body;
      const adminId = req.admin._id;

      if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Số tiền phạt không hợp lệ' });

      // Lưu giao dịch
      const tx = new DebtTransaction({
        driverId,
        type: 'PENALTY',
        amount: Number(amount),
        description: description || 'Phạt vi phạm nội quy/chậm trễ',
        createdByAdminId: adminId
      });
      await tx.save();

      // Cập nhật ví nợ tài xế
      const dr = await Driver.findByIdAndUpdate(driverId, { $inc: { walletDebt: Number(amount) } }, { new: true });

      res.status(201).json({ success: true, message: 'Thêm Tiền Phạt Thành Công!', data: dr.walletDebt });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // Ghi nhận Tài xế nạp tiền trả nợ (giảm nợ)
  addPayment: async (req, res) => {
    try {
      const { driverId } = req.params;
      const { amount, description } = req.body;
      const adminId = req.admin._id;

      if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Số tiền nạp không hợp lệ' });

      // Lưu giao dịch
      const tx = new DebtTransaction({
        driverId,
        type: 'PAYMENT',
        amount: -Number(amount), // Âm vì đây là khoản trả
        description: description || 'Nạp tiền thanh toán công nợ',
        createdByAdminId: adminId
      });
      await tx.save();

      // Cập nhật ví nợ tài xế
      const dr = await Driver.findByIdAndUpdate(driverId, { $inc: { walletDebt: -Number(amount) } }, { new: true });

      res.status(201).json({ success: true, message: 'Thu tiền Công Nợ Thành Công!', data: dr.walletDebt });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // Xóa sạch nợ (Cho về 0)
  resetDebt: async (req, res) => {
    try {
      const { driverId } = req.params;
      const adminId = req.admin._id;

      const driver = await Driver.findById(driverId);
      if (!driver) return res.status(404).json({ success: false, message: 'Driver 404' });

      // Nếu đang nợ dương (> 0) thì ghi nhận Payment. Nếu âm (< 0) thì Penalty để bù về 0.
      const debtValue = driver.walletDebt;
      if (debtValue === 0) return res.status(400).json({ success: false, message: 'Nợ hiện tại đã bằng 0' });

      const type = debtValue > 0 ? 'PAYMENT' : 'PENALTY';
      
      const tx = new DebtTransaction({
        driverId,
        type: type,
        amount: -debtValue,
        description: 'Xóa Sạch Nợ Tự Động / Thủ công Reset Mốc 0',
        createdByAdminId: adminId
      });
      await tx.save();

      const dr = await Driver.findByIdAndUpdate(driverId, { walletDebt: 0 }, { new: true });

      res.status(200).json({ success: true, message: 'Đã đưa nợ về MỐC 0 (XÓA SẠCH NỢ)!', data: dr.walletDebt });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // (DRIVER) Gửi yêu cầu kiểm duyệt thanh toán QR cho Admin
  requestPayment: async (req, res) => {
    try {
      const { driverId } = req.params;
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Số tiền nạp không hợp lệ' });
      }

      const driver = await Driver.findById(driverId).select('name phone driverCode');
      if (!driver) return res.status(404).json({ success: false, message: 'Tài xế không tồn tại' });

      // Phát lệnh hú còi lên tất cả socket Admin
      const payload = {
        driverId: driver._id,
        name: driver.name,
        phone: driver.phone,
        driverCode: driver.driverCode,
        amount: Number(amount),
        timestamp: new Date()
      };
      
      if (req.io) {
        emitDebtPaymentRequest(req.io, payload);
      } else {
        // Fallback in case io is not strictly attached, wait, io is usually inside req.io if bound via middleware, but typically we require the exported emit func which needs the io instance. Wait, we export setupSocket and functions, maybe require req.io? Yes, our orderController uses req.io. Let's use that.
        emitDebtPaymentRequest(req.io, payload);
      }

      res.status(200).json({ success: true, message: 'Đã gửi thông báo cho Tổng đài thành công!', data: payload });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi server khi gửi yêu cầu' });
    }
  }
};

module.exports = debtController;
