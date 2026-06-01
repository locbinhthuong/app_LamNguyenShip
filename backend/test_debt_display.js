const getTodayVN = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
};

// Mock data
const todayStr = getTodayVN();
const yesterdayStr = '2026-05-31'; // Giả sử hôm qua

// Tài xế đang nợ 10.000đ
const driver = { walletDebt: 10000 };

// Chi tiết nợ: 4.000đ từ hôm qua, 6.000đ phát sinh hôm nay
const netDebtByDate = {
  [yesterdayStr]: 4000,
  [todayStr]: 6000
};

console.log('=== TRƯỚC KHI LỌC (DỮ LIỆU GỐC) ===');
console.log('Tổng nợ (walletDebt):', driver.walletDebt);
console.log('Nợ theo ngày:', netDebtByDate);
console.log('Ngày hiện tại:', todayStr);
console.log('-----------------------------------');

// LOGIC HIỆN TẠI TRONG CODE ĐÃ SỬA:
let unpaidDays = [];
if (driver.walletDebt > 0) {
  let remainingDebt = driver.walletDebt;
  
  // Đã thêm điều kiện: d < todayStr
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

console.log('=== KẾT QUẢ ĐẦU RA HIỂN THỊ LÊN APP (unpaidDays) ===');
console.log(unpaidDays);
console.log('Nhận xét: Chỉ hiển thị ngày cũ, KHÔNG hiển thị ngày hôm nay!');
