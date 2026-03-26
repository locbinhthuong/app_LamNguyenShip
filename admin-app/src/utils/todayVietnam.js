/** Đầu ngày theo giờ VN — khớp với backend getDashboardStats */
export function startOfTodayVietnam() {
  const tz = 'Asia/Ho_Chi_Minh';
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  return new Date(`${dateStr}T00:00:00+07:00`);
}
