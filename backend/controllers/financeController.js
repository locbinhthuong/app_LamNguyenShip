const DebtTransaction = require('../models/DebtTransaction');
const WalletTransaction = require('../models/WalletTransaction');
const Driver = require('../models/Driver');
const { emitToDriver } = require('../sockets');

const financeController = {
  // Lấy danh sách tất cả các Request (PENDING) của Cả hệ thống
  getAllRequests: async (req, res) => {
    try {
      const pendingDebts = await DebtTransaction.find({ status: 'PENDING' })
        .populate('driverId', 'name phone driverCode')
        .sort({ createdAt: 1 })
        .lean();

      const pendingWallets = await WalletTransaction.find({ status: 'PENDING' })
        .populate('driverId', 'name phone driverCode')
        .sort({ createdAt: 1 })
        .lean();

      // Cũng lấy kèm 20 lịch sử gần nhất để Admin tiện tra cứu đối chiếu nhanh
      const recentDebts = await DebtTransaction.find({ status: { $ne: 'PENDING' } })
        .populate('driverId', 'name phone driverCode')
        .populate('createdByAdminId', 'name')
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean();

      const recentWallets = await WalletTransaction.find({ status: { $ne: 'PENDING' } })
        .populate('driverId', 'name phone driverCode')
        .populate('createdByAdminId', 'name')
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean();

      res.status(200).json({
        success: true,
        data: {
          pendingDebts,
          pendingWallets,
          recentDebts,
          recentWallets
        }
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: 'Lỗi lấy dữ liệu Tài Chính' });
    }
  },

  approveDebt: async (req, res) => {
    try {
      const { txId } = req.params;
      const adminId = req.admin._id;

      const tx = await DebtTransaction.findById(txId);
      if (!tx || tx.type !== 'PAYMENT' || tx.status !== 'PENDING') {
        return res.status(400).json({ success: false, message: 'Giao dịch không hợp lệ hoặc đã xử lý' });
      }

      // Duyệt
      tx.status = 'SUCCESS';
      tx.createdByAdminId = adminId;
      await tx.save();

      // Lúc này mới chính thức trừ Nợ (amount là số Âm)
      const dr = await Driver.findByIdAndUpdate(tx.driverId, { $inc: { walletDebt: tx.amount } }, { new: true });

      if (req.io) emitToDriver(req.io, tx.driverId, 'debt_updated', { debt: dr.walletDebt, message: 'Thanh toán THÀNH CÔNG!' });

      res.status(200).json({ success: true, message: 'Đã DUYỆT thanh toán Công Nợ' });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  rejectDebt: async (req, res) => {
    try {
      const { txId } = req.params;
      const { reason } = req.body;
      const adminId = req.admin._id;

      const tx = await DebtTransaction.findById(txId);
      if (!tx || tx.type !== 'PAYMENT' || tx.status !== 'PENDING') {
        return res.status(400).json({ success: false, message: 'Giao dịch không hợp lệ' });
      }

      tx.status = 'REJECTED';
      tx.description = (tx.description || '') + ` [Từ chối: ${reason || 'Không nhận được tiền'}]`;
      tx.createdByAdminId = adminId;
      await tx.save();

      // Lệnh bị từ chối => Không trừ walletDebt

      if (req.io) emitToDriver(req.io, tx.driverId, 'debt_updated', { message: 'Lệnh thanh toán THẤT BẠI. Vui lòng thanh toán lại!' });

      res.status(200).json({ success: true, message: 'Đã TỪ CHỐI thanh toán Công Nợ' });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  approveWallet: async (req, res) => {
    try {
      const { txId } = req.params;
      const adminId = req.admin._id;

      const tx = await WalletTransaction.findById(txId);
      if (!tx || tx.type !== 'WITHDRAW_REQUEST' || tx.status !== 'PENDING') {
        return res.status(400).json({ success: false, message: 'Giao dịch không hợp lệ' });
      }

      tx.status = 'SUCCESS';
      tx.type = 'WITHDRAW_SUCCESS'; // Doi thanh SUCCESS giong luan cu
      tx.description = '✅ Lệnh Rút Đã Thành Công. Đã chuyển tiền.';
      tx.createdByAdminId = adminId;
      await tx.save();

      // Mới thực sự trừ tiền khỏi ví
      const dr = await Driver.findByIdAndUpdate(tx.driverId, { $inc: { walletBalance: tx.amount } }, { new: true });

      if (req.io) {
        emitToDriver(req.io, tx.driverId, 'wallet_updated', { walletBalance: dr.walletBalance });
      }

      res.status(200).json({ success: true, message: 'Đã duyệt lệnh Rút Tiền' });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  rejectWallet: async (req, res) => {
    try {
      const { txId } = req.params;
      const { reason } = req.body;
      const adminId = req.admin._id;

      const tx = await WalletTransaction.findById(txId);
      if (!tx || tx.type !== 'WITHDRAW_REQUEST' || tx.status !== 'PENDING') {
        return res.status(400).json({ success: false, message: 'Giao dịch không hợp lệ' });
      }

      tx.status = 'REJECTED';
      tx.type = 'WITHDRAW_REJECT'; // Giong hoat dong cu
      tx.description = `❌ Bị từ chối: ${reason || 'Sai STK / Bị hủy'}`;
      tx.createdByAdminId = adminId;
      await tx.save();

      // Hủy lệnh -> KHÔNG CẦN CỘNG TIỀN VÀO LẠI VÍ GỐC
      // Vì lúc PENDING nó tự tách ra tính paddingAmount qua lệnh filter
      const dr = await Driver.findById(tx.driverId);

      if (req.io) {
        emitToDriver(req.io, tx.driverId, 'wallet_updated', { walletBalance: dr.walletBalance });
      }

      res.status(200).json({ success: true, message: 'Đã huỷ lệnh Rút Tiền' });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }

};

module.exports = financeController;
