const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { PayOS } = require('@payos/node');
const DebtTransaction = require('../models/DebtTransaction');
const Driver = require('../models/Driver');

let payosInstance = null;
const getPayOS = () => {
  if (payosInstance) return payosInstance;
  if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
    console.error('Thiếu cấu hình PayOS trong file .env');
    return null;
  }
  payosInstance = new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY
  });
  return payosInstance;
};

const reconcilePayOS = async () => {
  try {
    // Nếu mongoose chưa kết nối (ví dụ chạy độc lập qua CLI) thì kết nối
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('Connected to DB. Bắt đầu đối soát PayOS...');
    } else {
      console.log('[CRON] Bắt đầu đối soát PayOS tự động...');
    }

    const payos = getPayOS();
    if (!payos) return;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const pendingTxs = await DebtTransaction.find({
      status: 'PENDING',
      payosOrderCode: { $exists: true },
      createdAt: { $lte: fiveMinutesAgo }
    });

    if (pendingTxs.length > 0) {
       console.log(`Tìm thấy ${pendingTxs.length} giao dịch PayOS PENDING cần đối soát.`);
    }

    for (const tx of pendingTxs) {
      try {
        console.log(`Kiểm tra trạng thái orderCode: ${tx.payosOrderCode}...`);
        
        // P0 FIX: Gọi đúng phương thức của @payos/node v2
        const paymentData = await payos.paymentRequests.get(tx.payosOrderCode);
        
        if (paymentData.status === 'PAID') {
          console.log(`[PAID] orderCode ${tx.payosOrderCode} đã thanh toán. Tiến hành cập nhật bằng Transaction...`);
          
          const session = await mongoose.startSession();
          session.startTransaction();

          try {
            const updatedTx = await DebtTransaction.findOneAndUpdate(
              { payosOrderCode: tx.payosOrderCode, status: 'PENDING' },
              [
                { 
                  $set: { 
                    status: 'SUCCESS',
                    description: { $concat: [{ $ifNull: ["$description", ""] }, " [Thanh toán PayOS tự động - ĐỐI SOÁT BOT]"] }
                  }
                }
              ],
              { new: true, session }
            );

            if (updatedTx) {
              const driver = await Driver.findByIdAndUpdate(
                updatedTx.driverId,
                { $inc: { walletDebt: updatedTx.amount } },
                { new: true, session }
              );

              // FIX: Phải kiểm tra tài xế có tồn tại trước khi commit
              if (!driver) {
                console.error(`[ERROR] Không tìm thấy tài xế ${updatedTx.driverId} cho orderCode ${tx.payosOrderCode}. Hủy transaction.`);
                await session.abortTransaction();
                session.endSession();
                continue;
              }

              await session.commitTransaction();
              session.endSession();
              console.log(`[SUCCESS] Đã đối soát và giảm nợ thành công cho orderCode ${tx.payosOrderCode}.`);
            } else {
              await session.abortTransaction();
              session.endSession();
              console.log(`[SKIP] Giao dịch ${tx.payosOrderCode} đã được xử lý.`);
            }
          } catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error(`[ERROR] Lỗi khi commit transaction cho orderCode ${tx.payosOrderCode}:`, error);
          }
        } else if (paymentData.status === 'CANCELLED' || paymentData.status === 'EXPIRED') {
           console.log(`[${paymentData.status}] orderCode ${tx.payosOrderCode}. Đánh dấu hủy.`);
           tx.status = 'DELETED';
           tx.description = (tx.description || '') + ` [PayOS: ${paymentData.status}]`;
           await tx.save();
        } else {
           console.log(`[${paymentData.status}] orderCode ${tx.payosOrderCode}. Vẫn đang treo.`);
        }
      } catch (err) {
        console.error(`[ERROR] Không thể lấy thông tin orderCode ${tx.payosOrderCode} từ PayOS:`, err.message);
      }
    }

  } catch (error) {
    console.error('Lỗi khi chạy bot đối soát:', error);
  }
};

// Cho phép gọi độc lập qua CLI
if (require.main === module) {
  reconcilePayOS().then(() => process.exit(0));
}

module.exports = { reconcilePayOS };
