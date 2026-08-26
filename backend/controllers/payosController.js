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

      // Check if there is an existing PENDING transaction for this date
      let tx = await DebtTransaction.findOne({ driverId, type: 'PAYMENT', status: 'PENDING', targetDate: finalTargetDate, payosOrderCode: { $exists: true } });
      
      if (!tx) {
        tx = new DebtTransaction({
          driverId,
          type: 'PAYMENT',
          amount: -Number(amount),
          status: 'PENDING',
          targetDate: finalTargetDate,
          description: `Thanh toán công nợ ngày ${finalTargetDate}`
        });
        await tx.save();
      } else {
        // Update amount if changed
        tx.amount = -Number(amount);
        await tx.save();
      }

      // orderCode must be a number, unique, max length 50.
      // We can use the last 6 digits of timestamp + random to ensure uniqueness but short enough.
      // PayOS recommends timestamp.
      const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 1000));
      
      // Save orderCode in transaction so webhook can find it
      tx.payosOrderCode = orderCode;
      await tx.save();

      const returnUrl = `https://api.aloshipp.com/api/payos/success`;
      const cancelUrl = `https://api.aloshipp.com/api/payos/cancel`;

      const body = {
        orderCode,
        amount: Number(amount),
        description: `Thanh toan no ${driver.driverCode}`.substring(0, 25), // max 25 chars
        returnUrl,
        cancelUrl,
      };

      const payos = getPayOS();
      const paymentLink = await payos.paymentRequests.create(body);

      console.log(`[PAYOS] Created payment link for driver ${driver.name}, amount ${amount}`);
      res.status(200).json({ success: true, checkoutUrl: paymentLink.checkoutUrl });

    } catch (error) {
      console.error('Error createPaymentLink:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi tạo link thanh toán' });
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
        const tx = await DebtTransaction.findOne({ payosOrderCode: orderCode, status: 'PENDING' });
        
        if (tx) {
          tx.status = 'SUCCESS';
          tx.description = (tx.description || '') + ' [Thanh toán PayOS tự động]';
          await tx.save();

          // Update driver wallet
          const driver = await Driver.findByIdAndUpdate(
            tx.driverId,
            { $inc: { walletDebt: tx.amount } },
            { new: true }
          );

          console.log(`[PAYOS WEBHOOK] Successfully processed orderCode ${orderCode}, Driver ${driver.name} debt reduced by ${Math.abs(tx.amount)}`);

          // Emit socket event if io is available
          if (req.io) {
             try {
                req.io.to(tx.driverId.toString()).emit('debt_updated', { debt: driver.walletDebt, message: 'Thanh toán PayOS THÀNH CÔNG!' });
             } catch(e) { console.error('Emit socket error in webhook', e)}
          }
        }
      }
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('PayOS Webhook Error:', error);
      return res.status(200).json({ success: false }); // Always return 200 to webhook
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
        <div class="icon">✅</div>
        <h1>Thanh toán thành công!</h1>
        <p>Hệ thống đã ghi nhận khoản nạp của bạn.</p>
        <p>Vui lòng bấm nút <b>"Xong"</b> hoặc <b>"Đóng"</b> ở góc màn hình để quay lại App.</p>
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
