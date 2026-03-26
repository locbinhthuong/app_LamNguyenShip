/**
 * Đầu ngày hiện tại theo giờ Việt Nam (Asia/Ho_Chi_Minh).
 * Dùng so sánh với createdAt trong MongoDB (lưu UTC).
 * Dùng chuỗi YYYY-MM-DD từ .format('en-CA') thay vì formatToParts — tránh thiếu part trên một số ICU/Node.
 */
function startOfTodayVietnam() {
  const tz = 'Asia/Ho_Chi_Minh';
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`startOfTodayVietnam: định dạng ngày không hợp lệ "${dateStr}"`);
  }
  return new Date(`${dateStr}T00:00:00+07:00`);
}

module.exports = { startOfTodayVietnam };
