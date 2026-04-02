const Driver = require('../models/Driver');
const DebtTransaction = require('../models/DebtTransaction');
const { emitDebtPaymentRequest, emitToDriver } = require('../sockets/index');

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

      // Tính tổng đã nạp (PAYMENT)
      const totalPaid = transactions
        .filter(t => t.type === 'PAYMENT')
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

      // Nhóm nợ theo ngày & tìm các ngày đang PENDING
      const debtByDate = {};
      const pendingDays = new Set();
      transactions.forEach(tx => {
        const dateStr = tx.targetDate || new Date(tx.createdAt).toLocaleDateString('en-CA');
        
        if (tx.status === 'PENDING') {
           pendingDays.add(dateStr);
        } else if (tx.status !== 'REJECTED') { // Chỉ cộng dồn các khoản SUCCESS hoặc cũ không có status
           if (!debtByDate[dateStr]) debtByDate[dateStr] = 0;
           debtByDate[dateStr] += tx.amount;
        }
      });

      const todayStr = new Date().toLocaleDateString('en-CA');
      const unpaidDays = [];
      for (const [dateStr, amount] of Object.entries(debtByDate)) {
        if (amount > 0 && dateStr !== todayStr) {
          unpaidDays.push({ date: dateStr, amount });
        }
      }
      unpaidDays.sort((a, b) => new Date(b.date) - new Date(a.date));

      res.status(200).json({
        success: true,
        data: {
          driver,
          totalPaid,
          totalUnpaid: driver.walletDebt > 0 ? driver.walletDebt : 0,
          unpaidDays,
          pendingDays: Array.from(pendingDays),
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

      if (req.io) emitToDriver(req.io, driverId, 'debt_updated', { debt: dr.walletDebt });

      res.status(201).json({ success: true, message: 'Thêm Tiền Phạt Thành Công!', data: dr.walletDebt });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // Ghi nhận Tài xế nạp tiền trả nợ (giảm nợ theo ngày)
  addPayment: async (req, res) => {
    try {
      const { driverId } = req.params;
      const { amount, description, targetDate } = req.body;
      const adminId = req.admin._id;

      if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Số tiền nạp không hợp lệ' });

      // Lưu giao dịch
      const tx = new DebtTransaction({
        driverId,
        type: 'PAYMENT',
        amount: -Number(amount), // Âm vì đây là khoản trả
        description: description || `Thu tiền nợ ngày ${targetDate || 'cũ'}`,
        targetDate: targetDate || new Date().toLocaleDateString('en-CA'),
        createdByAdminId: adminId
      });
      await tx.save();

      // Cập nhật ví nợ tài xế
      const dr = await Driver.findByIdAndUpdate(driverId, { $inc: { walletDebt: -Number(amount) } }, { new: true });

      if (req.io) emitToDriver(req.io, driverId, 'debt_updated', { debt: dr.walletDebt });

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

      if (req.io) emitToDriver(req.io, driverId, 'debt_updated', { debt: dr.walletDebt });

      res.status(200).json({ success: true, message: 'Đã đưa nợ về MỐC 0 (XÓA SẠCH NỢ)!', data: dr.walletDebt });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // Sửa 1 giao dịch nợ bất kỳ
  updateDebt: async (req, res) => {
    try {
      const { txId } = req.params;
      const { amount, description } = req.body;
      
      const tx = await DebtTransaction.findById(txId);
      if (!tx) return res.status(404).json({ success: false, message: 'Giao dịch không tồn tại' });
      
      const oldAmount = tx.amount;
      let newAmount = Number(amount);
      if (tx.type === 'PAYMENT') {
        newAmount = -Math.abs(newAmount); // Thanh toán (đóng tiền) phải luôn mang giá trị âm để trừ nợ
      } else {
        newAmount = Math.abs(newAmount); // Phạt/Nợ mới phải mang giá trị dương
      }

      const diff = newAmount - oldAmount;
      
      tx.amount = newAmount;
      tx.description = description;
      await tx.save();

      // Cập nhật lại ví
      await Driver.findByIdAndUpdate(tx.driverId, { $inc: { walletDebt: diff } });

      if (req.io) emitToDriver(req.io, tx.driverId, 'debt_updated', {});

      res.status(200).json({ success: true, message: 'Đã sửa giao dịch thành công' });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server sửa nợ' });
    }
  },

  // Xoá 1 giao dịch nợ bất kỳ
  deleteDebt: async (req, res) => {
    try {
      const { txId } = req.params;
      const tx = await DebtTransaction.findById(txId);
      if (!tx) return res.status(404).json({ success: false, message: 'Giao dịch không tồn tại' });

      // Nếu xoá giao dịch, hoàn lại khoản tiền đó vào ví nợ
      // Vd xóa phạt 20k (+20k) => trừ đi 20k khỏi nợ
      // Xóa nạp -20k (-20k) => cộng lại 20k vào nợ
      const amountToReverse = -tx.amount; 
      
      await Driver.findByIdAndUpdate(tx.driverId, { $inc: { walletDebt: amountToReverse } });
      await DebtTransaction.findByIdAndDelete(txId);

      if (req.io) emitToDriver(req.io, tx.driverId, 'debt_updated', {});

      res.status(200).json({ success: true, message: 'Đã xóa giao dịch và hoàn tất cộng trừ nợ' });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server xóa nợ' });
    }
  },

  // (DRIVER) Gửi yêu cầu kiểm duyệt thanh toán QR cho Admin
  requestPayment: async (req, res) => {
    try {
      const driverId = req.driver._id; // Bảo mật: Không dùng req.params.driverId
      const { amount, targetDate } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Số tiền nạp không hợp lệ' });
      }

      const driver = await Driver.findById(driverId).select('name phone driverCode');
      if (!driver) return res.status(404).json({ success: false, message: 'Tài xế không tồn tại' });

      const tx = new DebtTransaction({
        driverId,
        type: 'PAYMENT',
        amount: -Number(amount), // Âm là khoản nạp/thanh toán nợ. Khi pending chưa trừ ví.
        status: 'PENDING',
        targetDate: targetDate || new Date().toLocaleDateString('en-CA'),
        description: `Yêu cầu xác nhận chuyển khoản cho nợ ngày ${targetDate || 'cũ'}`
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
        targetDate: targetDate, // Nhận ngày của Hóa đơn Driver muốn thanh toán
        timestamp: new Date()
      };
      
      if (req.io) {
        emitDebtPaymentRequest(req.io, payload);
      }

      res.status(200).json({ success: true, message: 'Đã gửi thông báo cho Ban quản trị! Vui lòng chờ kiểm duyệt.', data: payload });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi server khi gửi yêu cầu' });
    }
  },

  // (DRIVER) Tự xem Sổ nợ của chính mình
  getMyDebtDetail: async (req, res) => {
    try {
      const driverId = req.driver._id;
      
      const driver = await Driver.findById(driverId).select('name phone walletDebt');
      if (!driver) return res.status(404).json({ success: false, message: 'Tài xế không hợp lệ' });

      const transactions = await DebtTransaction.find({ driverId })
        .populate('orderId', 'orderCode deliveryFee')
        .sort({ createdAt: -1 })
        .lean();

      // Nhóm nợ theo ngày
      const debtByDate = {};
      const pendingDays = new Set();
      transactions.forEach(tx => {
        const dateStr = tx.targetDate || new Date(tx.createdAt).toLocaleDateString('en-CA');
        
        if (tx.status === 'PENDING') {
           pendingDays.add(dateStr);
        } else if (tx.status !== 'REJECTED') {
           if (!debtByDate[dateStr]) debtByDate[dateStr] = 0;
           debtByDate[dateStr] += tx.amount;
        }
      });

      const todayStr = new Date().toLocaleDateString('en-CA');
      const unpaidDays = [];
      for (const [dateStr, amount] of Object.entries(debtByDate)) {
        if (amount > 0 && dateStr !== todayStr) {
          unpaidDays.push({ date: dateStr, amount });
        }
      }
      unpaidDays.sort((a, b) => new Date(b.date) - new Date(a.date));

      res.status(200).json({
        success: true,
        data: {
          walletDebt: driver.walletDebt > 0 ? driver.walletDebt : 0,
          unpaidDays,
          pendingDays: Array.from(pendingDays),
          transactions
        }
      });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server truy xuất nợ cá nhân' });
    }
  }
};

module.exports = debtController;
