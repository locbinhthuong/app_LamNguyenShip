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
 * Tính lại walletDebt thực tế từ tất cả DebtTransaction (chỉ SUCCESS).
 * Nếu phát hiện bị lệch so với giá trị cached trên Driver → tự động sửa.
 * 
 * @param {string} driverId - MongoDB ObjectId của tài xế
 * @returns {number} Tổng nợ thực tế (>= 0)
 */
async function recalcWalletDebt(driverId) {
  const transactions = await DebtTransaction.find({ driverId })
    .select('amount status')
    .lean();

  let actualDebt = 0;
  transactions.forEach(tx => {
    if (tx.status === 'SUCCESS') {
      actualDebt += tx.amount; // Dương = nợ tăng, Âm = nợ giảm (thanh toán)
    }
  });

  const correctedDebt = Math.max(0, actualDebt);

  const driver = await Driver.findById(driverId).select('walletDebt name');
  if (driver && driver.walletDebt !== correctedDebt) {
    console.log(
      `[DEBT SYNC] Tài xế "${driver.name}" (${driverId}): ` +
      `walletDebt cached=${driver.walletDebt} → thực tế=${correctedDebt}. ĐÃ TỰ ĐỘNG SỬA.`
    );
    await Driver.findByIdAndUpdate(driverId, { walletDebt: correctedDebt });
  }

  return correctedDebt;
}

/**
 * Kiểm tra tài xế có bị chặn nhận đơn vì công nợ không.
 * 
 * Thuật toán:
 * 1. Quét TẤT CẢ DebtTransaction của tài xế (chỉ status = SUCCESS)
 * 2. Gom nợ RÒNG theo từng ngày (cộng dương, trừ âm theo targetDate)
 * 3. Nếu bất kỳ ngày CŨ nào (dateStr < todayVN) có nợ ròng > 0 → CHẶN
 * 4. Nợ ngày hôm nay → BỎ QUA, không chặn
 * 5. Tự động đồng bộ walletDebt nếu phát hiện lệch
 * 6. Ghi log chi tiết khi chặn (để debug khi xảy ra sự cố)
 * 
 * @param {string} driverId - MongoDB ObjectId của tài xế
 * @returns {{ blocked: boolean, message: string, details: object }}
 */
async function checkDriverDebtBlock(driverId) {
  const todayStr = getTodayVN();

  // 1. Lấy TẤT CẢ giao dịch nợ của tài xế
  const transactions = await DebtTransaction.find({ driverId })
    .select('amount targetDate createdAt status type')
    .lean();

  // 2. Tính nợ ròng theo từng ngày (CHỈ TÍNH STATUS = SUCCESS)
  const netDebtByDate = {};
  let totalActualDebt = 0;

  transactions.forEach(tx => {
    if (tx.status !== 'SUCCESS') return; // Bỏ qua PENDING, REJECTED, DELETED

    const dateStr = tx.targetDate
      || new Date(tx.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

    if (!netDebtByDate[dateStr]) netDebtByDate[dateStr] = 0;
    netDebtByDate[dateStr] += tx.amount;
    totalActualDebt += tx.amount;
  });

  // 3. Tự động đồng bộ walletDebt nếu bị lệch
  const correctedDebt = Math.max(0, totalActualDebt);
  const driver = await Driver.findById(driverId).select('walletDebt name');
  if (driver && driver.walletDebt !== correctedDebt) {
    console.log(
      `[DEBT SYNC] Tài xế "${driver.name}" (${driverId}): ` +
      `walletDebt cached=${driver.walletDebt} → thực tế=${correctedDebt}. ĐÃ TỰ ĐỘNG SỬA.`
    );
    await Driver.findByIdAndUpdate(driverId, { walletDebt: correctedDebt });
  }

  // 4. Nếu tổng nợ thực tế <= 0 → KHÔNG CHẶN
  if (correctedDebt <= 0) {
    return {
      blocked: false,
      message: '',
      details: { todayStr, totalDebt: 0, netDebtByDate }
    };
  }

  // 5. Kiểm tra nợ CŨ (ngày < hôm nay theo giờ VN)
  let oldDebtDate = null;
  let oldDebtAmount = 0;

  // Sort theo ngày tăng dần để tìm ngày cũ nhất có nợ
  const sortedDates = Object.keys(netDebtByDate).sort();
  for (const dateStr of sortedDates) {
    if (dateStr < todayStr && netDebtByDate[dateStr] > 0) {
      oldDebtDate = dateStr;
      oldDebtAmount = Math.round(netDebtByDate[dateStr]);
      break; // Chỉ cần tìm ngày cũ ĐẦU TIÊN có nợ chưa trả
    }
  }

  // 6. Có nợ cũ → CHẶN + ghi log chi tiết
  if (oldDebtDate) {
    const message = `Bạn chưa thanh toán công nợ`;
    console.log(
      `[DEBT BLOCK] Tài xế "${driver?.name}" (${driverId}) BỊ CHẶN:\n` +
      `  → Nợ cũ ngày ${oldDebtDate}: ${oldDebtAmount.toLocaleString()}đ\n` +
      `  → Tổng nợ: ${correctedDebt.toLocaleString()}đ\n` +
      `  → Hôm nay: ${todayStr}\n` +
      `  → Chi tiết theo ngày: ${JSON.stringify(netDebtByDate)}`
    );
    return {
      blocked: true,
      message,
      details: { todayStr, oldDebtDate, oldDebtAmount, totalDebt: correctedDebt, netDebtByDate }
    };
  }

  // 7. Nợ CHỈ CÓ ngày hôm nay → KHÔNG CHẶN (chưa qua 0h)
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

module.exports = { getTodayVN, recalcWalletDebt, checkDriverDebtBlock };
