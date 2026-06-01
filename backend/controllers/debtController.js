const Driver = require('../models/Driver');
const DebtTransaction = require('../models/DebtTransaction');
const { emitDebtPaymentRequest, emitToDriver } = require('../sockets/index');
const { getTodayVN } = require('../utils/debtUtils');

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
        .filter(t => t.type === 'PAYMENT' && t.status === 'SUCCESS')
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

      const netDebtByDate = {};
      const pendingDays = new Set();
      
      transactions.forEach(tx => {
        const dateStr = tx.targetDate || new Date(tx.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
        
        if (tx.status === 'PENDING') {
           pendingDays.add(dateStr);
        } else if (tx.status !== 'REJECTED' && tx.status !== 'DELETED') {
           if (!netDebtByDate[dateStr]) netDebtByDate[dateStr] = 0;
           netDebtByDate[dateStr] += tx.amount;
        }
      });

      let unpaidDays = [];
      const todayStr = getTodayVN();
      if (driver.walletDebt > 0) {
        let remainingDebt = driver.walletDebt;
        const sortedDatesDesc = Object.keys(netDebtByDate)
          .filter(d => netDebtByDate[d] > 0 && d < todayStr)
          .sort((a, b) => (a < b ? 1 : (a > b ? -1 : 0)));

        for (const dateStr of sortedDatesDesc) {
          if (remainingDebt <= 0) break;
          const allocated = Math.min(remainingDebt, netDebtByDate[dateStr]);
          if (allocated > 0) {
            unpaidDays.push({ date: dateStr, amount: Math.round(allocated) });
          }
          remainingDebt -= allocated;
        }
        
        unpaidDays.sort((a, b) => (a.date > b.date ? 1 : (a.date < b.date ? -1 : 0)));
      }

      // Tính nợ hôm nay riêng để Admin tham khảo (chỉ hiển thị, không thu)
      const todayDebt = Math.max(0, Math.round(netDebtByDate[todayStr] || 0));

      res.status(200).json({
        success: true,
        data: {
          driver,
          totalPaid,
          totalUnpaid: driver.walletDebt > 0 ? driver.walletDebt : 0,
          todayDebt,
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
      const { amount, description, targetDate } = req.body;
      const adminId = req.admin._id;

      if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Số tiền phạt không hợp lệ' });

      // Lưu giao dịch
      const tx = new DebtTransaction({
        driverId,
        type: 'PENALTY',
        amount: Number(amount),
        description: description || 'Phạt vi phạm nội quy/chậm trễ',
        targetDate: targetDate || new Date().toLocaleDateString('en-CA'),
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

  // Sửa Xóa Tổng nợ của một Khung Ngày (Adjust Day Debt)
  adjustDailyDebt: async (req, res) => {
    try {
      const { driverId } = req.params;
      const { targetDate, newAmount } = req.body;
      const adminId = req.admin._id;

      const transactions = await DebtTransaction.find({ driverId }).lean();
      let currentAmount = 0;
      transactions.forEach(tx => {
        const dateStr = tx.targetDate || new Date(tx.createdAt).toLocaleDateString('en-CA');
        if (dateStr === targetDate && tx.status !== 'REJECTED' && tx.status !== 'PENDING' && tx.status !== 'DELETED') {
          currentAmount += tx.amount;
        }
      });

      const diff = Number(newAmount) - currentAmount;
      if (diff === 0) return res.status(200).json({ success: true, message: 'Không có thay đổi' });

      const tx = new DebtTransaction({
        driverId,
        type: diff > 0 ? 'PENALTY' : 'PAYMENT',
        amount: diff,
        description: `Điều chỉnh Sổ Đen tổng nợ ngày ${targetDate} (${diff > 0 ? '+' : ''}${diff.toLocaleString()}đ)`,
        targetDate: targetDate,
        createdByAdminId: adminId
      });
      await tx.save();

      const dr = await Driver.findByIdAndUpdate(driverId, { $inc: { walletDebt: diff } }, { new: true });
      if (req.io) emitToDriver(req.io, driverId, 'debt_updated', { debt: dr.walletDebt });

      res.status(200).json({ success: true, message: 'Cập nhật thành công!' });
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

      const finalTargetDate = targetDate || getTodayVN();

      // CHỐNG TRÙNG: Nếu tài xế đã có PENDING cho ngày này → duyệt luôn cái PENDING đó thay vì tạo mới
      const existingPending = await DebtTransaction.findOne({
        driverId,
        type: 'PAYMENT',
        status: 'PENDING',
        targetDate: finalTargetDate
      });

      if (existingPending) {
        // Duyệt PENDING có sẵn thay vì tạo mới (tránh trừ tiền 2 lần)
        existingPending.status = 'SUCCESS';
        existingPending.createdByAdminId = adminId;
        existingPending.description = (existingPending.description || '') + ' [Admin duyệt qua nút Thu Nợ]';
        await existingPending.save();

        const dr = await Driver.findByIdAndUpdate(driverId, { $inc: { walletDebt: existingPending.amount } }, { new: true });
        if (req.io) emitToDriver(req.io, driverId, 'debt_updated', { debt: dr.walletDebt, message: 'Thanh toán THÀNH CÔNG!' });

        console.log(`[DEBT] Admin duyệt PENDING có sẵn cho tài xế ${driverId}, ngày ${finalTargetDate}, số tiền ${existingPending.amount}đ`);
        return res.status(200).json({ success: true, message: `Đã duyệt yêu cầu thanh toán PENDING có sẵn (${Math.abs(existingPending.amount).toLocaleString()}đ)`, data: dr.walletDebt });
      }

      // Không có PENDING → tạo mới (Admin thu thủ công)
      const tx = new DebtTransaction({
        driverId,
        type: 'PAYMENT',
        amount: -Number(amount),
        description: description || `Thu tiền nợ ngày ${finalTargetDate}`,
        targetDate: finalTargetDate,
        createdByAdminId: adminId
      });
      await tx.save();

      const dr = await Driver.findByIdAndUpdate(driverId, { $inc: { walletDebt: -Number(amount) } }, { new: true });
      if (req.io) emitToDriver(req.io, driverId, 'debt_updated', { debt: dr.walletDebt });

      console.log(`[DEBT] Admin thu thủ công tài xế ${driverId}, ngày ${finalTargetDate}, số tiền -${amount}đ`);
      res.status(201).json({ success: true, message: 'Thu tiền Công Nợ Thành Công!', data: dr.walletDebt });
    } catch (e) {
      console.error('Lỗi addPayment:', e);
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

  // Xoá 1 giao dịch nợ bất kỳ (Chỉ xoá Log, không hoàn tiền)
  deleteDebt: async (req, res) => {
    try {
      const { txId } = req.params;
      const tx = await DebtTransaction.findById(txId);
      if (!tx) return res.status(404).json({ success: false, message: 'Giao dịch không tồn tại' });
      
      const prevStatus = tx.status;
      
      tx.status = 'DELETED';
      tx.description = (tx.description || '') + ' [ĐÃ XÓA]';
      await tx.save();

      if (prevStatus === 'SUCCESS') {
         await Driver.findByIdAndUpdate(tx.driverId, { $inc: { walletDebt: -tx.amount } });
      }

      if (req.io) emitToDriver(req.io, tx.driverId, 'debt_updated', {});

      res.status(200).json({ success: true, message: 'Đã xóa lịch sử giao dịch thành công' });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server xóa nợ' });
    }
  },

  // Xóa nhiều giao dịch nợ cùng lúc
  bulkDeleteDebtTx: async (req, res) => {
    try {
      const { txIds } = req.body;
      if (!txIds || !Array.isArray(txIds) || txIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Danh sách ID không hợp lệ' });
      }

      const transactions = await DebtTransaction.find({ _id: { $in: txIds } });
      for (const tx of transactions) {
         if (tx.status === 'SUCCESS') {
            await Driver.findByIdAndUpdate(tx.driverId, { $inc: { walletDebt: -tx.amount } });
         }
      }

      await DebtTransaction.updateMany({ _id: { $in: txIds } }, { $set: { status: 'DELETED', description: '[ĐÃ XÓA]' } });

      // Cập nhật giao diện nếu cần
      if (req.io) {
        req.io.emit('debt_updated', {}); 
      }

      res.status(200).json({ success: true, message: `Đã xóa thành công ${txIds.length} lịch sử giao dịch` });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server khi xóa hàng loạt' });
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

      const finalTargetDate = targetDate || getTodayVN();

      // CHỐNG SPAM 1: Kiểm tra xem tài xế đã có lệnh PENDING nào chưa (bất kỳ ngày nào)
      const existingPending = await DebtTransaction.findOne({ driverId, type: 'PAYMENT', status: 'PENDING' });
      if (existingPending) {
        return res.status(400).json({ success: false, message: 'Bạn đang có một yêu cầu thanh toán chờ duyệt. Vui lòng đợi Admin xử lý trước khi gửi yêu cầu mới.' });
      }


      const tx = new DebtTransaction({
        driverId,
        type: 'PAYMENT',
        amount: -Number(amount),
        status: 'PENDING',
        targetDate: finalTargetDate,
        description: `Yêu cầu xác nhận chuyển khoản cho nợ ngày ${finalTargetDate}`
      });
      await tx.save();
      console.log(`[DEBT REQUEST] Tài xế ${driver.name} (${driverId}): yêu cầu thanh toán ${amount}đ cho ngày ${finalTargetDate}`);

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

      const netDebtByDate = {};
      const pendingDays = new Set();
      transactions.forEach(tx => {
        const dateStr = tx.targetDate || new Date(tx.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
        
        if (tx.status === 'PENDING') {
           pendingDays.add(dateStr);
        } else if (tx.status !== 'REJECTED' && tx.status !== 'DELETED') {
           if (!netDebtByDate[dateStr]) netDebtByDate[dateStr] = 0;
           netDebtByDate[dateStr] += tx.amount;
        }
      });

      const todayStr = getTodayVN();
      let unpaidDays = [];
      if (driver.walletDebt > 0) {
        let remainingDebt = driver.walletDebt;
        const sortedDatesDesc = Object.keys(netDebtByDate)
          .filter(d => netDebtByDate[d] > 0 && d < todayStr)
          .sort((a, b) => (a < b ? 1 : (a > b ? -1 : 0)));

        for (const dateStr of sortedDatesDesc) {
          if (remainingDebt <= 0) break;
          const allocated = Math.min(remainingDebt, netDebtByDate[dateStr]);
          if (allocated > 0) {
            unpaidDays.push({ date: dateStr, amount: Math.round(allocated) });
          }
          remainingDebt -= allocated;
        }
        
        unpaidDays.sort((a, b) => (a.date > b.date ? 1 : (a.date < b.date ? -1 : 0)));
      }

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
