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
          // PayOS yêu cầu orderCode là số nguyên (Int32) tối đa 2147483647.
          // Lấy 5 số cuối của Date.now() + 4 số ngẫu nhiên = 9 số (chắc chắn < 2.1 tỷ)
          orderCode = Number(String(Date.now()).slice(-5) + String(Math.floor(Math.random() * 10000)).padStart(4, '0'));
          
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
          const errMsg = err.message || err.response?.data?.message || '';
          // Nếu lỗi do trùng orderCode (từ MongoDB hoặc PayOS), tiến hành retry
          if (
            (err.code === 11000 && err.keyPattern && err.keyPattern.payosOrderCode) || 
            errMsg.toLowerCase().includes('exist') || 
            errMsg.toLowerCase().includes('duplicate')
          ) {
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
      const errMsg = String(error?.response?.data?.message || error?.message || '');
      
      // Bật QR Code thủ công nếu hết quota HOẶC bị lỗi gói cước MBBank từ PayOS
      if (
        errMsg.toLowerCase().includes('limit') || 
        errMsg.toLowerCase().includes('exceed') || 
        errMsg.toLowerCase().includes('quota') || 
        errMsg.toLowerCase().includes('vượt hạn mức') ||
        errMsg.toLowerCase().includes('mbbank') ||
        errMsg.toLowerCase().includes('gói') ||
        errMsg.includes('215') ||
        errMsg.includes('218') ||
        errMsg.toLowerCase().includes('kênh thanh toán')
      ) {
         // HACK CHO APP CŨ: Nếu app cũ không có cơ chế fallbackAllowed, chúng ta trả về 200 OK 
         // và một checkoutUrl giả trỏ về trang QR thủ công trên server của chúng ta.
         const crypto = require('crypto');
         const payloadData = JSON.stringify({ driverId: driverId.toString(), amount, targetDate: finalTargetDate, driverCode: driver.driverCode });
         const signature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback_secret').update(payloadData).digest('hex');
         const payloadB64 = Buffer.from(payloadData).toString('base64');
         const customCheckoutUrl = `https://api.aloshipp.com/api/payos/manual-checkout?payload=${payloadB64}&signature=${signature}`;
         
         return res.status(200).json({ success: true, checkoutUrl: customCheckoutUrl, fallbackAllowed: true });
      }

      // Xóa chữ APIError HTTP 200 đi cho thông báo đẹp hơn
      const cleanMsg = errMsg.replace('APIError: HTTP 200, ', '').replace('APIError: ', '');

      res.status(500).json({ 
        success: false, 
        message: cleanMsg ? `Lỗi PayOS: ${cleanMsg}` : 'Lỗi khi tạo link thanh toán PayOS', 
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
        // Cập nhật trạng thái thành PROCESSING để lock giao dịch
        const tx = await DebtTransaction.findOneAndUpdate(
          { payosOrderCode: orderCode, status: { $in: ['PENDING', 'PROCESSING'] } },
          { $set: { status: 'PROCESSING' } },
          { new: true }
        );
        
        let txProcessed = null;
        let driverUpdated = null;

        if (tx) {
          try {
            // Update driver wallet ONLY IF orderCode is not in processedPayOS
            // This is an atomic, idempotent update on MongoDB standalone.
            let driver = await Driver.findOneAndUpdate(
              { _id: tx.driverId, processedPayOS: { $ne: orderCode } },
              { 
                $inc: { walletDebt: tx.amount },
                $push: { processedPayOS: orderCode }
              },
              { new: true }
            );

            // Nếu driver trả về null, có 2 khả năng: 1 là tài xế đã bị xoá, 2 là đã được processed rồi
            if (!driver) {
               // Thử tìm lại xem có phải do đã process không
               driver = await Driver.findById(tx.driverId);
               if (!driver) {
                 console.error(`[ERROR] Không tìm thấy tài xế ${tx.driverId} cho orderCode ${orderCode}. Rollback về DELETED vì tài xế không tồn tại.`);
                 await DebtTransaction.findByIdAndUpdate(tx._id, { status: 'DELETED', description: 'Tài xế không tồn tại' });
                 throw new Error(`Không tìm thấy tài xế ${tx.driverId}`);
               } else {
                 // Đã processed rồi (bởi tiến trình khác), chỉ cần đánh dấu SUCCESS
                 console.log(`[INFO] orderCode ${orderCode} đã được cộng vào ví trước đó. Chỉ cập nhật SUCCESS.`);
               }
            }

            // Hoàn tất: Cập nhật SUCCESS và ghi chú
            txProcessed = await DebtTransaction.findByIdAndUpdate(
              tx._id,
              [
                { 
                  $set: { 
                    status: 'SUCCESS',
                    description: { $concat: [{ $ifNull: ["$description", ""] }, " [Thanh toán PayOS tự động]"] }
                  }
                }
              ],
              { new: true }
            );
            driverUpdated = driver;
          } catch (updateError) {
            // Không rollback mù quáng về PENDING nữa. Cứ để PROCESSING để bot xử lý lại đúng chuẩn idempotent.
            console.error('Lỗi khi cập nhật ví tài xế trong Webhook, giữ nguyên PROCESSING:', updateError);
            throw updateError;
          }
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
  },

  manualCheckoutPage: async (req, res) => {
    try {
      const { payload: payloadB64, signature } = req.query;
      const payloadData = Buffer.from(payloadB64, 'base64').toString('utf8');
      const crypto = require('crypto');
      const expectedSignature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback_secret').update(payloadData).digest('hex');
      
      if (signature !== expectedSignature) {
         return res.status(403).send('Link không hợp lệ hoặc đã hết hạn.');
      }
      const data = JSON.parse(payloadData);
      
      const Announcement = require('../models/Announcement');
      const ann = await Announcement.findOne({ type: 'DEBT_QR_INFO', isActive: true });
      const bankName = ann?.title || 'MB';
      const bankAccount = ann?.content || '0857986911';
      const accountName = ann?.videoUrl || 'NGUYEN LAM NGUYEN';
      const addInfo = 'THANHTOANNO ' + data.driverCode + ' ' + (data.targetDate || '');
      const amountStr = Math.round(data.amount);
      const qrUrl = `https://img.vietqr.io/image/${bankName}-${bankAccount}-compact2.jpg?amount=${amountStr}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`;
      
      res.send(`
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Thanh toán Công Nợ</title>
          <style>
            body { font-family: sans-serif; text-align: center; margin: 0; padding: 20px; background: #f3f4f6; }
            .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
            img { max-width: 100%; border-radius: 8px; margin-bottom: 10px; }
            h2 { color: #1f2937; font-size: 20px; margin-bottom: 10px; }
            p { color: #4b5563; font-size: 14px; margin-bottom: 20px; line-height: 1.5;}
            .btn { display: block; width: 100%; padding: 14px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; text-decoration: none; margin-top: 10px; box-sizing: border-box;}
            .btn:hover { background: #1d4ed8; }
            .info-box { background: #eff6ff; padding: 12px; border-radius: 8px; text-align: left; margin-bottom: 20px; border: 1px solid #bfdbfe; }
            .info-box div { margin-bottom: 6px; font-size: 14px; color: #1e3a8a; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Chuyển khoản thủ công</h2>
            <p>Hệ thống tự động đang bảo trì. Vui lòng dùng app Ngân hàng quét mã QR dưới đây để bù điểm.</p>
            <img src="${qrUrl}" alt="VietQR" />
            
            <div class="info-box">
               <div><b>Số tiền:</b> ${amountStr.toLocaleString('vi-VN')} đ</div>
               <div><b>Nội dung:</b> ${addInfo}</div>
            </div>
            
            <form action="/api/payos/manual-checkout-submit" method="POST">
               <input type="hidden" name="payload" value="${payloadB64}" />
               <input type="hidden" name="signature" value="${signature}" />
               <button type="submit" class="btn">TÔI ĐÃ CHUYỂN KHOẢN</button>
            </form>
          </div>
        </body>
        </html>
      `);
    } catch (e) {
      console.error(e);
      res.send('Lỗi hệ thống');
    }
  },

  manualCheckoutSubmit: async (req, res) => {
     try {
       const { payload: payloadB64, signature } = req.body;
       const payloadData = Buffer.from(payloadB64, 'base64').toString('utf8');
       const crypto = require('crypto');
       const expectedSignature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback_secret').update(payloadData).digest('hex');
       
       if (signature !== expectedSignature) {
         return res.send('Link không hợp lệ hoặc đã hết hạn.');
       }
       const data = JSON.parse(payloadData);
       
       const existingPending = await DebtTransaction.findOne({ driverId: data.driverId, type: 'PAYMENT', status: 'PENDING', payosOrderCode: { $exists: false } });
       
       if (!existingPending) {
         const tx = new DebtTransaction({
            driverId: data.driverId,
            type: 'PAYMENT',
            amount: -Number(data.amount),
            status: 'PENDING',
            targetDate: data.targetDate,
            description: `Yêu cầu xác nhận chuyển khoản thủ công cho nợ ngày ${data.targetDate || ''}`
         });
         await tx.save();
         console.log(`[MANUAL QR] Tạo yêu cầu thanh toán cho ${data.driverCode}, ${data.amount}đ`);
       }
       
       res.send(`
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Đã gửi yêu cầu</title>
          <style>
            body { font-family: sans-serif; text-align: center; margin: 0; padding: 20px; background: #f0fdf4; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;}
            .icon { font-size: 80px; margin-bottom: 20px; }
            h2 { color: #166534; font-size: 24px; margin-bottom: 10px; }
            p { color: #374151; font-size: 16px; padding: 0 20px; line-height: 1.5; }
          </style>
        </head>
        <body>
            <div class="icon">✅</div>
            <h2>Đã gửi yêu cầu</h2>
            <p>Kế toán sẽ kiểm tra đối soát và cộng điểm cho bạn sớm nhất.</p>
            <p>Vui lòng bấm nút <b>"Xong"</b> hoặc <b>"Đóng"</b> ở góc màn hình để quay lại App.</p>
        </body>
        </html>
       `);
     } catch(e) {
       console.error(e);
       res.send('Lỗi xử lý yêu cầu');
     }
  }
};

module.exports = payosController;
