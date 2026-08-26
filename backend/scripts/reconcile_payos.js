require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { PayOS } = require('@payos/node');
const DebtTransaction = require('../models/DebtTransaction');
const Driver = require('../models/Driver');

const getPayOS = () => {
  if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
    throw new Error('Thiếu cấu hình PayOS trong file .env');
  }
  return new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY
  });
};

const reconcilePayOS = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB. Bắt đầu đối soát PayOS...');

    const payos = getPayOS();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const pendingTxs = await DebtTransaction.find({
      status: 'PENDING',
      payosOrderCode: { $exists: true },
      createdAt: { $lte: fiveMinutesAgo }
    });

    console.log(`Tìm thấy ${pendingTxs.length} giao dịch PayOS PENDING cần đối soát.`);

    for (const tx of pendingTxs) {
      try {
        console.log(`Kiểm tra trạng thái orderCode: ${tx.payosOrderCode}...`);
        const paymentData = await payos.paymentRequests.getPaymentLinkInformation(tx.payosOrderCode);
        
        if (paymentData.status === 'PAID') {
          console.log(`[PAID] orderCode ${tx.payosOrderCode} đã thanh toán. Tiến hành cập nhật bằng Transaction...`);
          
          const session = await mongoose.startSession();
          session.startTransaction();
          let txProcessed = null;

          try {
            const updatedTx = await DebtTransaction.findOneAndUpdate(
              { payosOrderCode: tx.payosOrderCode, status: 'PENDING' },
              { 
                $set: { 
                  status: 'SUCCESS',
                  description: (tx.description || '') + ' [Thanh toán PayOS tự động - ĐỐI SOÁT BOT]'
                }
              },
              { new: true, session }
            );

            if (updatedTx) {
              await Driver.findByIdAndUpdate(
                updatedTx.driverId,
                { $inc: { walletDebt: updatedTx.amount } },
                { new: true, session }
              );
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

    console.log('Hoàn tất đối soát.');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi khi chạy bot đối soát:', error);
    process.exit(1);
  }
};

reconcilePayOS();
