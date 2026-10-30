/**
 * Tiện ích xử lý Ngày/Tuần cho Hệ thống Lịch làm việc theo giờ Việt Nam (UTC+7)
 */

const TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Lấy thời gian hiện tại theo Date tại VN
 */
function getNowVN() {
  const now = new Date();
  const vnTimeStr = now.toLocaleString('en-US', { timeZone: TIMEZONE });
  return new Date(vnTimeStr);
}

/**
 * Lấy thứ hiện tại trong tuần theo giờ VN
 * 0: Chủ Nhật, 1: Thứ 2, ..., 6: Thứ 7
 */
function getDayOfWeekVN(date = new Date()) {
  const vnTimeStr = date.toLocaleString('en-US', { timeZone: TIMEZONE });
  const vnDate = new Date(vnTimeStr);
  return vnDate.getDay();
}

/**
 * Lấy số thứ tự ngày trong tuần ISO (1: Thứ Hai -> 7: Chủ Nhật)
 */
function getDayNumInISOWeek(date = new Date()) {
  const day = getDayOfWeekVN(date);
  return day === 0 ? 7 : day;
}

/**
 * Lấy mã ISO Week Key (ví dụ "2026-W44")
 */
function getWeekKey(date = new Date()) {
  const vnTimeStr = date.toLocaleString('en-US', { timeZone: TIMEZONE });
  const d = new Date(vnTimeStr);
  
  // ISO-8601: Tuần bắt đầu từ Thứ Hai
  const day = d.getDay();
  d.setDate(d.getDate() + 4 - (day === 0 ? 7 : day));
  
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Lấy mã ISO Week Key của tuần tiếp theo
 */
function getNextWeekKey(date = new Date()) {
  const vnTimeStr = date.toLocaleString('en-US', { timeZone: TIMEZONE });
  const nextWeekDate = new Date(vnTimeStr);
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  return getWeekKey(nextWeekDate);
}

/**
 * Lấy ngày (YYYY-MM-DD) của cả 7 ngày trong tuần: Thứ 2 đến Chủ Nhật
 * @param {Date} refDate
 */
function getWeekDates(refDate = new Date()) {
  const vnTimeStr = refDate.toLocaleString('en-US', { timeZone: TIMEZONE });
  const d = new Date(vnTimeStr);
  const day = d.getDay();
  // Khoảng cách tới Thứ Hai của tuần đó
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const daysMap = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const result = {};

  daysMap.forEach((dayKey, idx) => {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + idx);
    const dateStr = cur.toISOString().split('T')[0];
    result[dayKey] = {
      dateStr,
      dateObj: cur
    };
  });

  return result;
}

/**
 * Ánh xạ thứ trong tuần sang key tiếng Anh
 */
function getDayKeyFromDayOfWeek(dayNum) {
  switch (dayNum) {
    case 1: return 'monday';
    case 2: return 'tuesday';
    case 3: return 'wednesday';
    case 4: return 'thursday';
    case 5: return 'friday';
    case 6: return 'saturday';
    case 0: return 'sunday';
    default: return 'monday';
  }
}

module.exports = {
  getNowVN,
  getDayOfWeekVN,
  getDayNumInISOWeek,
  getWeekKey,
  getNextWeekKey,
  getWeekDates,
  getDayKeyFromDayOfWeek
};
