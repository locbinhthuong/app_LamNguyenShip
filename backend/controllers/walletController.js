const Driver = require('../models/Driver');
const WalletTransaction = require('../models/WalletTransaction');
const { emitToDriver, emitWalletWithdrawalRequest } = require('../sockets/index');

const walletController = {
  // === CHO TÀI XẾ ===
  
  // Tài xế tự động lấy lịch sử ví của mình (Bao gồm Pending)
  getMyWalletDetail: async (req, res) => {
    try {
      const driverId = req.driver._id;
      const driver = await Driver.findById(driverId).select('walletBalance name phone');
      
      if (!driver) return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế' });

      // Tính tổng tiền đang bị treo (Pending) do chờ giải ngân
      const pendingTx = await WalletTransaction.find({ driverId, status: 'PENDING' });
      const pendingAmount = pendingTx.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

      const transactions = await WalletTransaction.find({ driverId })
        .populate('createdByAdminId', 'name')
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({
        success: true,
        data: {
          walletBalance: driver.walletBalance,
          availableBalance: driver.walletBalance - pendingAmount,
          pendingAmount,
          transactions
        }
      });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi lấy ví cá nhân' });
    }
  },

  // Lệnh tạo Yêu cầu Rút Tiền từ Tài Xế
  requestWithdraw: async (req, res) => {
    try {
      const driverId = req.driver._id;
      const { amount, bankName, accountNumber, accountName } = req.body;

      if (!amount || amount < 50000) return res.status(400).json({ success: false, message: 'Vui lòng rút tối thiểu 50,000đ' });

      const driver = await Driver.findById(driverId);
      if (!driver) return res.status(404).json({ success: false, message: 'Lỗi dữ liệu' });

      // Tính Pending
      const pendingTx = await WalletTransaction.find({ driverId, status: 'PENDING' });
      const pendingAmount = pendingTx.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

      // Số dư thực tế có thể rút
      if (driver.walletBalance - pendingAmount < amount) {
        return res.status(400).json({ success: false, message: 'Số dư khả dụng không đủ (Khoá tạm các khoản chờ duyệt)' });
      }

      // Lưu giao dịch chờ duyệt
      const tx = new WalletTransaction({
        driverId,
        type: 'WITHDRAW_REQUEST',
        amount: -Math.abs(amount), // Rút tiền trừ vào ví báo âm
        status: 'PENDING',
        description: 'Tài xế yêu cầu Rút Số Dư Ví',
        bankInfo: { bankName, accountNumber, accountName }
      });
      await tx.save();

      // Phát lệnh hú còi lên tất cả socket Admin
      const payload = {
        txId: tx._id,
        driverId: driver._id,
        name: driver.name,
        phone: driver.phone,
        driverCode: driver.driverCode,
        amount: Number(amount),
        bankInfo: { bankName, accountNumber, accountName },
        timestamp: new Date()
      };
      
      if (req.io) {
        emitWalletWithdrawalRequest(req.io, payload);
      }

      res.status(201).json({ success: true, message: 'Đã gửi yêu cầu rút tiền thành công!' });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server rút tiền' });
    }
  },


  // === CHO ADMIN ===

  // Admin lấy chi tiết Ví của 1 tài xế
  getDriverWalletDetail: async (req, res) => {
    try {
      const { driverId } = req.params;
      
      const driver = await Driver.findById(driverId).select('name phone walletBalance');
      if (!driver) return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế' });

      const transactions = await WalletTransaction.find({ driverId })
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

  // Admin chủ động Nạp Tiền / Trừ tiền vào ví
  adminAdjustWallet: async (req, res) => {
    try {
      const { driverId } = req.params;
      const { amount, description, type } = req.body; // type = 'DEPOSIT' hoặc 'ADMIN_ADJUST'
      const adminId = req.admin._id;

      if (!amount) return res.status(400).json({ success: false, message: 'Số lượng không hợp lệ' });

      const driver = await Driver.findById(driverId);
      if (!driver) return res.status(404).json({ success: false, message: 'Không tìm thấy' });

      const parsedAmount = Number(amount);

      const tx = new WalletTransaction({
        driverId,
        type: type || (parsedAmount >= 0 ? 'DEPOSIT' : 'ADMIN_ADJUST'), // Âm/Dương định đoạt type nếu rỗng
        amount: parsedAmount,
        status: 'SUCCESS',
        description: description || 'Admin điều chỉnh Số Dư Ví',
        createdByAdminId: adminId
      });
      await tx.save();

      // Cộng tiền thẳng vào ví dương
      const dr = await Driver.findByIdAndUpdate(driverId, { $inc: { walletBalance: parsedAmount } }, { new: true });

      if (req.io) emitToDriver(req.io, driverId, 'wallet_updated', { balance: dr.walletBalance });

      res.status(200).json({ success: true, data: dr.walletBalance });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server Admin Adjust' });
    }
  },

  // Admin Xử Lý Yêu Cầu Rút (Pending -> Success/Reject)
  processWithdraw: async (req, res) => {
    try {
      const { txId } = req.params;
      const { action, rejectReason } = req.body; // action = 'APPROVE' hoặc 'REJECT'
      const adminId = req.admin._id;

      const tx = await WalletTransaction.findById(txId);
      if (!tx || tx.type !== 'WITHDRAW_REQUEST' || tx.status !== 'PENDING') {
        return res.status(400).json({ success: false, message: 'Giao dịch không hợp lệ để duyệt' });
      }

      if (action === 'APPROVE') {
        tx.status = 'SUCCESS';
        tx.type = 'WITHDRAW_SUCCESS';
        tx.description = '✅ Lệnh Rút Đã Thành Công. Đã chuyển tiền.';
        tx.createdByAdminId = adminId;
        await tx.save();

        // Bây giờ mới trừ thẳng vào ví gốc
        await Driver.findByIdAndUpdate(tx.driverId, { $inc: { walletBalance: tx.amount } }); // tx.amount đang âm

        if (req.io) emitToDriver(req.io, tx.driverId, 'wallet_updated', {});

        return res.status(200).json({ success: true, message: 'Đã duyệt Rút Thành Công!' });
      } else if (action === 'REJECT') {
        tx.status = 'REJECTED';
        tx.type = 'WITHDRAW_REJECT';
        tx.description = '❌ Bị từ chối: ' + (rejectReason || 'Không hợp lệ');
        tx.createdByAdminId = adminId;
        // Không trừ tiền vì REJECTED
        await tx.save();

        if (req.io) emitToDriver(req.io, tx.driverId, 'wallet_updated', {});

        return res.status(200).json({ success: true, message: 'Đã Huỷ Rút Thành Công' });
      } else {
        return res.status(400).json({ success: false, message: 'Hành động không xác định' });
      }

    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi Process' });
    }
  },

  // Chức năng Sửa - Xoá tuỳ biến cho Admin nâng cao
  deleteWalletTx: async (req, res) => {
    try {
      const { txId } = req.params;
      const tx = await WalletTransaction.findById(txId);
      if (!tx) return res.status(404).json({ success: false, message: 'Không tồn tại' });
      
      // CHỈ XÓA DỮ LIỆU LỊCH SỬ (LOG), KHÔNG HOÀN LẠI TIỀN VÀO VÍ
      await WalletTransaction.findByIdAndDelete(txId);
      
      if (req.io) emitToDriver(req.io, tx.driverId, 'wallet_updated', {});
      
      res.status(200).json({ success: true, message: 'Xoá lịch sử ví thành công' });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi báo xoá' });
    }
  }
};

module.exports = walletController;
