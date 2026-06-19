/**
 * ============================================================
 * DEBT UTILS — Hàm dùng chung cho hệ thống Công Nợ Tài Xế
 * ============================================================
 * 
 * QUY TẮC CÔNG NỢ:
 * 1. Nợ trong ngày (hôm nay giờ VN) → KHÔNG chặn tài xế
 * 2. Nợ ngày CŨ (trước 0h hôm nay) chưa thanh toán → CHẶN
 * 3. PENDING payment → vẫn chặn (chưa được Admin duyệt)
 * 4. Chỉ tính transactions có status = SUCCESS
 * 5. Tối đa 1 khung nợ tại 1 thời điểm
 * 6. Đã trả nợ cũ = tự do nhận đơn cả ngày
 */

const DebtTransaction = require('../models/DebtTransaction');
const Driver = require('../models/Driver');

/**
 * Trả về ngày hôm nay theo múi giờ Việt Nam (UTC+7)
 * Format: 'YYYY-MM-DD'
 */
function getTodayVN() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

/**
 * Kiểm tra tài xế có bị chặn nhận đơn vì công nợ không.
 * 
 * Thuật toán:
 * 1. Quét TẤT CẢ DebtTransaction của tài xế (chỉ status = SUCCESS)
 * 2. Gom nợ RÒNG theo từng ngày (cộng dồn theo targetDate)
 * 3. Nếu bất kỳ ngày CŨ nào (dateStr < todayVN) có nợ ròng > 0 → CHẶN
 * 4. Nợ ngày hôm nay → BỎ QUA, không chặn
 * 5. Tuyệt đối không bù trừ tiền giữa các ngày.
 * 
 * @param {string} driverId - MongoDB ObjectId của tài xế
 * @returns {{ blocked: boolean, message: string, details: object }}
 */
async function checkDriverDebtBlock(driverId) {
  const todayStr = getTodayVN();

  const driver = await Driver.findById(driverId).select('walletDebt name');
  if (!driver) return { blocked: true, message: 'Tài xế không tồn tại' };

  // Tối ưu hiệu năng: Nếu cache báo nợ = 0 thì cho qua luôn, không cần quét lịch sử giao dịch.
  if (driver.walletDebt === 0) {
    return {
      blocked: false,
      message: '',
      details: { todayStr, todayDebt: 0, totalDebt: 0 }
    };
  }

  const transactions = await DebtTransaction.find({ driverId })
    .select('amount targetDate createdAt status type')
    .lean();

  const netDebtByDate = {};
  let totalActualDebt = 0;

  transactions.forEach(tx => {
    if (tx.status !== 'SUCCESS') return;

    const dateStr = tx.targetDate || new Date(tx.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

    netDebtByDate[dateStr] = Math.round((netDebtByDate[dateStr] || 0) + tx.amount);
    totalActualDebt = Math.round(totalActualDebt + tx.amount);
  });

  const correctedDebt = Math.max(0, totalActualDebt);
  if (driver.walletDebt !== correctedDebt) {
    console.log(
      `[DEBT SYNC] Tài xế "${driver.name}" (${driverId}): ` +
      `walletDebt cached=${driver.walletDebt} → thực tế=${correctedDebt}. ĐÃ TỰ ĐỘNG SỬA.`
    );
    await Driver.findByIdAndUpdate(driverId, { walletDebt: correctedDebt });
  }

  // KHÔNG exit sớm nếu correctedDebt <= 0, để bắt buộc kiểm tra từng ngày xem nợ cũ đã thanh toán đúng ngày chưa.

  let oldDebtDate = null;
  let oldDebtAmount = 0;

  // Lọc ngày CŨ (< todayStr) có NỢ RÒNG > 0
  const sortedPastDatesAsc = Object.keys(netDebtByDate)
    .filter(dateStr => dateStr < todayStr && netDebtByDate[dateStr] > 0)
    .sort((a, b) => (a > b ? 1 : (a < b ? -1 : 0)));

  if (sortedPastDatesAsc.length > 0) {
    oldDebtDate = sortedPastDatesAsc[0];
    oldDebtAmount = Math.round(netDebtByDate[oldDebtDate]);
  }

  if (oldDebtDate) {
    const message = `Bạn chưa thanh toán công nợ`;
    console.log(
      `[DEBT BLOCK] Tài xế "${driver?.name}" (${driverId}) BỊ CHẶN:\n` +
      `  → Nợ cũ ngày ${oldDebtDate}: ${oldDebtAmount.toLocaleString()}đ\n` +
      `  → Tổng nợ: ${correctedDebt.toLocaleString()}đ\n` +
      `  → Hôm nay: ${todayStr}`
    );
    return {
      blocked: true,
      message,
      details: { todayStr, oldDebtDate, oldDebtAmount, totalDebt: correctedDebt, netDebtByDate }
    };
  }

  console.log(
    `[DEBT OK] Tài xế "${driver?.name}" (${driverId}): ` +
    `Nợ hôm nay ${(netDebtByDate[todayStr] || 0).toLocaleString()}đ (không chặn). Today=${todayStr}`
  );
  return {
    blocked: false,
    message: '',
    details: { todayStr, todayDebt: netDebtByDate[todayStr] || 0, totalDebt: correctedDebt }
  };
}

module.exports = { getTodayVN, checkDriverDebtBlock };
