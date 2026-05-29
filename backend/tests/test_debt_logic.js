/**
 * ============================================================
 * TEST SCRIPT: Kiểm tra logic checkDriverDebtBlock()
 * 
 * KHÔNG cần MongoDB — test thuần bằng mock data
 * Chạy: node backend/tests/test_debt_logic.js
 * ============================================================
 */

// Giả lập hàm getTodayVN() — cố định ngày để test
function getTodayVN_mock() {
  return '2026-05-30'; // Giả sử hôm nay là 30/5/2026 (giờ VN)
}

/**
 * Logic y hệt checkDriverDebtBlock() trong debtUtils.js
 * nhưng nhận mock data thay vì query MongoDB
 */
function checkDriverDebtBlock_mock(transactions, todayStr) {
  const netDebtByDate = {};
  let totalActualDebt = 0;

  transactions.forEach(tx => {
    if (tx.status !== 'SUCCESS') return;
    const dateStr = tx.targetDate || '(unknown)';
    if (!netDebtByDate[dateStr]) netDebtByDate[dateStr] = 0;
    netDebtByDate[dateStr] += tx.amount;
    totalActualDebt += tx.amount;
  });

  const correctedDebt = Math.max(0, totalActualDebt);

  if (correctedDebt <= 0) {
    return { blocked: false, reason: 'Không có nợ', correctedDebt, netDebtByDate };
  }

  let oldDebtDate = null;
  let oldDebtAmount = 0;
  const sortedDates = Object.keys(netDebtByDate).sort();
  for (const dateStr of sortedDates) {
    if (dateStr < todayStr && netDebtByDate[dateStr] > 0) {
      oldDebtDate = dateStr;
      oldDebtAmount = Math.round(netDebtByDate[dateStr]);
      break;
    }
  }

  if (oldDebtDate) {
    return { blocked: true, reason: `Nợ cũ ngày ${oldDebtDate}: ${oldDebtAmount}đ`, correctedDebt, netDebtByDate };
  }

  return { blocked: false, reason: `Nợ chỉ có hôm nay (${netDebtByDate[todayStr] || 0}đ)`, correctedDebt, netDebtByDate };
}

// ============================================================
// TEST CASES
// ============================================================

let passed = 0;
let failed = 0;

function test(name, transactions, todayStr, expectedBlocked) {
  const result = checkDriverDebtBlock_mock(transactions, todayStr);
  const ok = result.blocked === expectedBlocked;
  if (ok) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    console.log(`     Kỳ vọng blocked=${expectedBlocked}, thực tế blocked=${result.blocked}`);
    console.log(`     Reason: ${result.reason}`);
    console.log(`     netDebtByDate: ${JSON.stringify(result.netDebtByDate)}`);
    failed++;
  }
}

console.log('\n========================================');
console.log('TEST HỆ THỐNG CÔNG NỢ TÀI XẾ');
console.log('========================================\n');

const TODAY = '2026-05-30';

// ---- 1. TÀI XẾ MỚI, CHƯA CÓ NỢ ----
console.log('--- Kịch bản 1: Tài xế mới, chưa có nợ ---');
test('Không có transaction nào → Được nhận đơn', [], TODAY, false);

// ---- 2. NỢ TRONG NGÀY HÔM NAY → KHÔNG CHẶN ----
console.log('\n--- Kịch bản 2: Nợ phát sinh trong ngày hôm nay ---');
test('1 đơn hôm nay → Không chặn', [
  { amount: 3300, targetDate: '2026-05-30', status: 'SUCCESS', type: 'FEE_DEDUCTION' }
], TODAY, false);

test('5 đơn hôm nay (nợ 16.500đ) → Không chặn', [
  { amount: 3300, targetDate: '2026-05-30', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: 3300, targetDate: '2026-05-30', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: 3300, targetDate: '2026-05-30', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: 3300, targetDate: '2026-05-30', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: 3300, targetDate: '2026-05-30', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
], TODAY, false);

// ---- 3. NỢ CŨ (HÔM QUA) CHƯA TRẢ → CHẶN ----
console.log('\n--- Kịch bản 3: Qua 0h, nợ hôm qua chưa trả ---');
test('Nợ ngày 29/5 chưa trả → Chặn', [
  { amount: 6600, targetDate: '2026-05-29', status: 'SUCCESS', type: 'FEE_DEDUCTION' }
], TODAY, true);

test('Nợ ngày 28/5 + 29/5 chưa trả → Chặn', [
  { amount: 26850, targetDate: '2026-05-28', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: 6600, targetDate: '2026-05-29', status: 'SUCCESS', type: 'FEE_DEDUCTION' }
], TODAY, true);

// ---- 4. ĐÃ TRẢ NỢ CŨ → KHÔNG CHẶN ----
console.log('\n--- Kịch bản 4: Đã trả nợ cũ → Tự do cả ngày ---');
test('Nợ 29/5: 6600đ, đã trả -6600đ → Không chặn', [
  { amount: 6600, targetDate: '2026-05-29', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: -6600, targetDate: '2026-05-29', status: 'SUCCESS', type: 'PAYMENT' }
], TODAY, false);

test('Trả xong nợ cũ + chạy 3 đơn mới hôm nay → Không chặn', [
  { amount: 26850, targetDate: '2026-05-29', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: -26850, targetDate: '2026-05-29', status: 'SUCCESS', type: 'PAYMENT' },
  { amount: 3300, targetDate: '2026-05-30', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: 3300, targetDate: '2026-05-30', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: 3300, targetDate: '2026-05-30', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
], TODAY, false);

// ---- 5. PENDING PAYMENT → VẪN CHẶN ----
console.log('\n--- Kịch bản 5: Thanh toán đang chờ duyệt (PENDING) ---');
test('Nợ 29/5: 6600đ, thanh toán PENDING → Chặn (chờ Admin)', [
  { amount: 6600, targetDate: '2026-05-29', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: -6600, targetDate: '2026-05-29', status: 'PENDING', type: 'PAYMENT' }
], TODAY, true);

test('PENDING → sau khi Admin duyệt (SUCCESS) → Không chặn', [
  { amount: 6600, targetDate: '2026-05-29', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: -6600, targetDate: '2026-05-29', status: 'SUCCESS', type: 'PAYMENT' }
], TODAY, false);

// ---- 6. KỊCH BẢN THỰC TẾ: TÀI XẾ "NGUYỄN TÂN QUÝ" ngày 29/5 ----
console.log('\n--- Kịch bản 6: Thực tế tài xế Nguyễn Tân Quý (ngày 29/5) ---');

// Giả sử hôm nay là 29/5 (tài xế đang chạy đơn trong ngày)
const TODAY_29 = '2026-05-29';

test('Sáng 29/5, nợ 28/5 đã trả xong → Không chặn', [
  // Nợ 28/5
  { amount: 26850, targetDate: '2026-05-28', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  // Thanh toán 28/5 (đã duyệt)
  { amount: -26850, targetDate: '2026-05-28', status: 'SUCCESS', type: 'PAYMENT' },
], TODAY_29, false);

test('Chiều 29/5, trả xong nợ cũ + chạy 2 đơn → Không chặn', [
  { amount: 26850, targetDate: '2026-05-28', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: -26850, targetDate: '2026-05-28', status: 'SUCCESS', type: 'PAYMENT' },
  // Đơn mới ngày 29/5
  { amount: 3300, targetDate: '2026-05-29', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: 3300, targetDate: '2026-05-29', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
], TODAY_29, false);

test('Tối 29/5, trả xong nợ cũ + chạy 4 đơn + admin điều chỉnh → Không chặn', [
  { amount: 26850, targetDate: '2026-05-28', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: -26850, targetDate: '2026-05-28', status: 'SUCCESS', type: 'PAYMENT' },
  { amount: 3300, targetDate: '2026-05-29', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: 3300, targetDate: '2026-05-29', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: -6600, targetDate: '2026-05-29', status: 'SUCCESS', type: 'PAYMENT' },
  { amount: 2550, targetDate: '2026-05-29', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: -2550, targetDate: '2026-05-29', status: 'SUCCESS', type: 'PAYMENT' },
  { amount: 3750, targetDate: '2026-05-29', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
], TODAY_29, false);

// ---- 7. EDGE CASE: NỢ CŨ + NỢ MỚI CÙNG TỒN TẠI ----
console.log('\n--- Kịch bản 7: Edge cases ---');
test('Nợ 28/5 CHƯA trả + nợ 30/5 đang tích lũy → Chặn', [
  { amount: 26850, targetDate: '2026-05-28', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: 3300, targetDate: '2026-05-30', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
], TODAY, true);

test('Nợ cũ trả DƯ (overpay) → Không chặn', [
  { amount: 6600, targetDate: '2026-05-29', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: -10000, targetDate: '2026-05-29', status: 'SUCCESS', type: 'PAYMENT' },
], TODAY, false);

test('Transaction bị DELETED/REJECTED → Bỏ qua', [
  { amount: 6600, targetDate: '2026-05-29', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: -6600, targetDate: '2026-05-29', status: 'DELETED', type: 'PAYMENT' },
], TODAY, true);

test('walletDebt sync: totalDebt âm → correctedDebt = 0 → Không chặn', [
  { amount: 6600, targetDate: '2026-05-29', status: 'SUCCESS', type: 'FEE_DEDUCTION' },
  { amount: -20000, targetDate: '2026-05-29', status: 'SUCCESS', type: 'PAYMENT' },
], TODAY, false);

// ---- KẾT QUẢ ----
console.log('\n========================================');
console.log(`KẾT QUẢ: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
  console.log('❌ CÒN LỖI! CẦN SỬA TRƯỚC KHI DEPLOY!');
  process.exit(1);
} else {
  console.log('✅ TẤT CẢ TEST ĐỀU PASSED — LOGIC ĐÚNG!');
  process.exit(0);
}
