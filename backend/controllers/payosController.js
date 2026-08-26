const { PayOS } = require('@payos/node');
const DebtTransaction = require('../models/DebtTransaction');
const Driver = require('../models/Driver');
const { getTodayVN } = require('../utils/debtUtils');

// Hàm khởi tạo PayOS gọi khi cần để tránh sập Server lúc khởi động nếu thiếu biến môi trường
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

const payosController = {
  createPaymentLink: async (req, res) => {
    try {
      const driverId = req.driver._id;
      const { amount, targetDate } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Số tiền nạp không hợp lệ' });
      }

      const driver = await Driver.findById(driverId).select('name phone driverCode');
      if (!driver) return res.status(404).json({ success: false, message: 'Tài xế không tồn tại' });

      const finalTargetDate = targetDate || getTodayVN();

      let orderCode;
      let paymentLink;
      let tx;
      let retryCount = 0;
      let success = false;

      while (!success && retryCount < 3) {
        try {
          orderCode = Number(String(Date.now()).slice(-9) + Math.floor(Math.random() * 100));
          
          const returnUrl = `https://api.aloshipp.com/api/payos/success`;
          const cancelUrl = `https://api.aloshipp.com/api/payos/cancel`;

          const body = {
            orderCode,
            amount: Number(amount),
            description: `Thanh toan no ${driver.driverCode}`.substring(0, 25),
            returnUrl,
            cancelUrl,
          };

          const payos = getPayOS();
          paymentLink = await payos.paymentRequests.create(body);

          tx = new DebtTransaction({
            driverId,
            type: 'PAYMENT',
            amount: -Number(amount),
            status: 'PENDING',
            targetDate: finalTargetDate,
            description: `Thanh toán công nợ ngày ${finalTargetDate}`,
            payosOrderCode: orderCode
          });
          await tx.save();
          success = true;
        } catch (err) {
          // If duplicate key error (code 11000) on payosOrderCode, retry. Otherwise, throw it.
          if (err.code === 11000 && err.keyPattern && err.keyPattern.payosOrderCode) {
            retryCount++;
            console.log(`[PAYOS] Trùng orderCode ${orderCode}, thử lại lần ${retryCount}...`);
          } else {
            throw err;
          }
        }
      }

      if (!success) {
        throw new Error('Không thể tạo mã orderCode duy nhất sau 3 lần thử');
      }

      console.log(`[PAYOS] Created payment link for driver ${driver.name}, amount ${amount}`);
      res.status(200).json({ success: true, checkoutUrl: paymentLink.checkoutUrl });

    } catch (error) {
      console.error('Error createPaymentLink:', error);
      
      let fallbackAllowed = false;
      const errMsg = error?.response?.data?.message || error?.message || '';
      
      // Cho phép thủ công CHỈ KHI hết gói cước, hạn mức PayOS (không dùng cho lỗi DB, lỗi mạng)
      if (errMsg.toLowerCase().includes('limit') || errMsg.toLowerCase().includes('exceed') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('vượt hạn mức')) {
         fallbackAllowed = true;
      }

      res.status(500).json({ 
        success: false, 
        message: 'Lỗi khi tạo link thanh toán PayOS', 
        fallbackAllowed 
      });
    }
  },

  handleWebhook: async (req, res) => {
    try {
      console.log('[PAYOS WEBHOOK] Received data:', JSON.stringify(req.body));
      const body = req.body;
      
      // Verify signature
      const payos = getPayOS();
      const webhookData = await payos.webhooks.verify(req.body);
      
      if (req.body.code === '00' || req.body.success === true || req.body.desc === 'success') {
        // Payment success
        const orderCode = webhookData.orderCode;
        const mongoose = require('mongoose');
        const session = await mongoose.startSession();
        session.startTransaction();
        let txProcessed = null;
        let driverUpdated = null;

        try {
          const tx = await DebtTransaction.findOneAndUpdate(
            { payosOrderCode: orderCode, status: 'PENDING' },
            [
              { 
                $set: { 
                  status: 'SUCCESS',
                  description: { $concat: [{ $ifNull: ["$description", ""] }, " [Thanh toán PayOS tự động]"] }
                }
              }
            ],
            { new: true, session }
          );
          
          if (tx) {
            // Update driver wallet within the same transaction
            const driver = await Driver.findByIdAndUpdate(
              tx.driverId,
              { $inc: { walletDebt: tx.amount } },
              { new: true, session }
            );

            // FIX: Phải kiểm tra tài xế có tồn tại trước khi commit
            if (!driver) {
              console.error(`[ERROR] Không tìm thấy tài xế ${tx.driverId} cho orderCode ${orderCode}. Hủy transaction.`);
              await session.abortTransaction();
              session.endSession();
              // Không văng lỗi HTTP 500 nếu do tài xế bị xoá cứng (rất hiếm), chỉ skip và báo log
              // Hoặc có thể văng lỗi để retry, nhưng nếu tài xế bị xoá thì retry mãi vẫn thế.
              // Ta chọn ném lỗi để nếu do lỗi tạm thời thì retry được, hoặc có log rõ ràng
              throw new Error(`Không tìm thấy tài xế ${tx.driverId}`);
            }

            await session.commitTransaction();
            session.endSession();
            
            txProcessed = tx;
            driverUpdated = driver;
          } else {
            // Transaction đã được xử lý bởi webhook callback khác hoặc không tìm thấy
            await session.abortTransaction();
            session.endSession();
          }
        } catch (updateError) {
          await session.abortTransaction();
          session.endSession();
          console.error('Lỗi khi cập nhật ví tài xế trong Webhook Transaction:', updateError);
          throw updateError;
        }

        if (txProcessed && driverUpdated) {
          console.log(`[PAYOS WEBHOOK] Successfully processed orderCode ${orderCode}, Driver ${driverUpdated.name} debt reduced by ${Math.abs(txProcessed.amount)}`);

          // Emit socket event to the correct driver room 'driver_{id}'
          if (req.io) {
             try {
                req.io.to(`driver_${txProcessed.driverId.toString()}`).emit('debt_updated', { debt: driverUpdated.walletDebt, message: 'Thanh toán PayOS THÀNH CÔNG!' });
             } catch(e) { console.error('Emit socket error in webhook', e)}
          }
        }
      }
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('PayOS Webhook Error:', error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  },

  handleSuccess: (req, res) => {
    res.send(`
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thanh toán thành công</title>
        <style>
          body { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; font-family:sans-serif; text-align:center; background-color:#f0fdf4; }
          .icon { font-size: 80px; margin-bottom: 20px; }
          h1 { color: #15803d; margin-bottom: 10px; font-size: 24px; }
          p { color: #374151; font-size: 16px; padding: 0 20px; line-height: 1.5; }
          .btn { margin-top: 30px; padding: 12px 24px; background-color: #10b981; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4); }
        </style>
      </head>
      <body>
        <div class="icon">⏳</div>
        <h1>Đang xác nhận thanh toán</h1>
        <p>Hệ thống đang đối soát dữ liệu với ngân hàng.</p>
        <p>Vui lòng bấm nút <b>"Xong"</b> hoặc <b>"Đóng"</b> ở góc màn hình để quay lại App và chờ trong giây lát.</p>
      </body>
      </html>
    `);
  },

  handleCancel: (req, res) => {
    res.send(`
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Đã hủy thanh toán</title>
        <style>
          body { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; font-family:sans-serif; text-align:center; background-color:#fff1f2; }
          .icon { font-size: 80px; margin-bottom: 20px; }
          h1 { color: #be123c; margin-bottom: 10px; font-size: 24px; }
          p { color: #374151; font-size: 16px; padding: 0 20px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="icon">❌</div>
        <h1>Đã hủy thanh toán</h1>
        <p>Giao dịch của bạn đã bị hủy.</p>
        <p>Vui lòng bấm nút <b>"Xong"</b> hoặc <b>"Đóng"</b> ở góc màn hình để quay lại App.</p>
      </body>
      </html>
    `);
  }
};

module.exports = payosController;
