import React, { useState, useEffect, useMemo } from 'react';
import { getAdminWeeklySchedules, adminUpdateDriverShift } from '../services/api';

const DAY_LABELS = {
  monday: 'Thứ Hai',
  tuesday: 'Thứ Ba',
  wednesday: 'Thứ Tư',
  thursday: 'Thứ Năm',
  friday: 'Thứ Sáu',
  saturday: 'Thứ Bảy',
  sunday: 'Chủ Nhật'
};

const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// ==================== HELPER TÍNH TOÁN TUẦN ISO-8601 ====================
function getISOWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getMondayOfISOWeek(weekKey) {
  if (!weekKey || !weekKey.includes('-W')) return new Date();
  const [yearStr, weekStr] = weekKey.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const jan4 = new Date(year, 0, 4);
  const dayOfWeekJan4 = jan4.getDay() === 0 ? 7 : jan4.getDay();
  const monW1 = new Date(year, 0, 4 - (dayOfWeekJan4 - 1));
  return new Date(monW1.getTime() + (week - 1) * 7 * 86400000);
}

function getAdjacentWeekKey(weekKey, offsetWeeks = 1) {
  const monday = getMondayOfISOWeek(weekKey);
  const targetDate = new Date(monday.getTime() + offsetWeeks * 7 * 86400000 + 43200000);
  return getISOWeekKey(targetDate);
}

function getWeekRangeDisplay(weekKey) {
  if (!weekKey || !weekKey.includes('-W')) return '';
  const monday = getMondayOfISOWeek(weekKey);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const f = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${f(monday)} - ${f(sunday)}/${sunday.getFullYear()}`;
}

function getDayDateLabel(weekKey, dayIndex) {
  // dayIndex: 0 (monday) -> 6 (sunday)
  if (!weekKey || !weekKey.includes('-W')) return '';
  const monday = getMondayOfISOWeek(weekKey);
  const d = new Date(monday.getTime() + dayIndex * 86400000);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function DriverSchedules() {
  const realCurrentWeekKey = useMemo(() => getISOWeekKey(new Date()), []);
  const [selectedWeekKey, setSelectedWeekKey] = useState(realCurrentWeekKey);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [filterShift, setFilterShift] = useState('ALL');
  
  // State modal Admin chỉnh sửa ca của 1 tài xế
  const [editModal, setEditModal] = useState({
    isOpen: false,
    driverId: null,
    driverName: '',
    dayKey: '',
    currentShift: 'PARTTIME',
    isDowngraded: false,
    offlineCount: 0
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Tạo danh sách các tuần gợi ý để Admin chọn nhanh (+2 tuần tới đến -8 tuần trước)
  const quickWeekOptions = useMemo(() => {
    const list = [];
    // 2 tuần tới
    for (let i = 2; i >= 1; i--) {
      const wKey = getAdjacentWeekKey(realCurrentWeekKey, i);
      list.push({
        weekKey: wKey,
        label: i === 1 
          ? `📅 Tuần sau: ${wKey} (${getWeekRangeDisplay(wKey)})` 
          : `🚀 2 tuần tới: ${wKey} (${getWeekRangeDisplay(wKey)})`,
        isNext: true
      });
    }
    // Tuần hiện tại
    list.push({
      weekKey: realCurrentWeekKey,
      label: `📌 Tuần này: ${realCurrentWeekKey} (${getWeekRangeDisplay(realCurrentWeekKey)})`,
      isCurrent: true
    });
    // 8 tuần cũ trước đó
    for (let i = -1; i >= -8; i--) {
      const wKey = getAdjacentWeekKey(realCurrentWeekKey, i);
      list.push({
        weekKey: wKey,
        label: i === -1 
          ? `📁 Tuần trước: ${wKey} (${getWeekRangeDisplay(wKey)})` 
          : `📁 ${Math.abs(i)} tuần trước: ${wKey} (${getWeekRangeDisplay(wKey)})`,
        isPast: true
      });
    }
    return list;
  }, [realCurrentWeekKey]);

  useEffect(() => {
    loadSchedules(selectedWeekKey);
  }, [selectedWeekKey]);

  const loadSchedules = async (weekKeyToLoad = selectedWeekKey) => {
    try {
      setLoading(true);
      const res = await getAdminWeeklySchedules(weekKeyToLoad);
      if (res?.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Lỗi tải lịch tuần:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevWeek = () => {
    const prev = getAdjacentWeekKey(selectedWeekKey, -1);
    setSelectedWeekKey(prev);
  };

  const handleNextWeek = () => {
    const next = getAdjacentWeekKey(selectedWeekKey, 1);
    setSelectedWeekKey(next);
  };

  const handleCurrentWeek = () => {
    setSelectedWeekKey(realCurrentWeekKey);
  };

  const fullList = data?.data || [];
  const stats = data?.stats || {};
  const currentWeekKey = data?.weekKey || selectedWeekKey;

  // Xác định tính chất của tuần đang xem
  const isViewingCurrentWeek = selectedWeekKey === realCurrentWeekKey;
  const isViewingNextWeek = selectedWeekKey > realCurrentWeekKey;
  const isViewingPastWeek = selectedWeekKey < realCurrentWeekKey;

  const filteredList = fullList.filter(item => {
    const driver = item.driver || {};
    const matchSearch = (
      (driver.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (driver.phone || '').includes(search) ||
      (driver.driverCode || '').toLowerCase().includes(search.toLowerCase())
    );

    if (!matchSearch) return false;
    if (filterShift === 'ALL') return true;

    return Object.values(item.schedule || {}).some(d => d?.shift === filterShift);
  });

  // Admin bấm lưu đổi ca
  const handleAdminSaveShift = async (newShift, resetDowngrade = false) => {
    try {
      setActionLoading(true);
      setToastMessage('');

      const res = await adminUpdateDriverShift({
        driverId: editModal.driverId,
        weekKey: selectedWeekKey,
        dayKey: editModal.dayKey,
        shift: newShift,
        isDowngraded: resetDowngrade ? false : editModal.isDowngraded
      });

      if (res?.success) {
        setToastMessage(`✅ Đã đổi ca ${DAY_LABELS[editModal.dayKey]} (${selectedWeekKey}) của ${editModal.driverName} thành ${newShift}`);
        setEditModal({ isOpen: false, driverId: null });
        await loadSchedules(selectedWeekKey);
        setTimeout(() => setToastMessage(''), 3000);
      }
    } catch (err) {
      setToastMessage(`❌ ${err.response?.data?.message || 'Không thể đổi ca'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const renderShiftBadge = (driver, dayKey, dayObj) => {
    const shift = dayObj?.shift || 'PARTTIME';
    const isDowngraded = dayObj?.isDowngraded;
    const offlineCount = dayObj?.offlineCount || 0;

    return (
      <button
        type="button"
        onClick={() => setEditModal({
          isOpen: true,
          driverId: driver._id,
          driverName: driver.name || 'Tài xế',
          dayKey,
          currentShift: shift,
          isDowngraded: Boolean(isDowngraded),
          offlineCount
        })}
        className="w-full group hover:scale-105 transition active:scale-95 focus:outline-none"
        title="Bấm để Admin sửa ca làm việc"
      >
        {shift === 'FULLTIME' ? (
          isDowngraded ? (
            <span className="inline-flex flex-col items-center justify-center rounded-lg bg-red-50 border border-red-300 px-1.5 py-1 text-[10px] font-bold text-red-700 shadow-xs group-hover:border-red-400">
              <span>⚠️ Hạ Part</span>
              <span className="text-[8px] font-mono font-normal">Off: {offlineCount} lần</span>
            </span>
          ) : (
            <span className="inline-flex flex-col items-center justify-center rounded-lg bg-emerald-50 border border-emerald-300 px-1.5 py-1 text-[10px] font-bold text-emerald-800 shadow-xs group-hover:border-emerald-500">
              <span>⭐ Fulltime</span>
              {offlineCount > 0 ? (
                <span className="text-[8px] text-amber-700 font-mono font-normal">Off: {offlineCount}/2</span>
              ) : (
                <span className="text-[8px] text-emerald-600 font-normal">Sửa ✏️</span>
              )}
            </span>
          )
        ) : shift === 'OFF' ? (
          <span className="inline-flex flex-col items-center justify-center rounded-lg bg-slate-100 border border-slate-300 px-1.5 py-1 text-[10px] font-bold text-slate-500 group-hover:border-slate-400">
            <span>⚪ Nghỉ</span>
            <span className="text-[8px] font-normal">Sửa ✏️</span>
          </span>
        ) : (
          <span className="inline-flex flex-col items-center justify-center rounded-lg bg-amber-50 border border-amber-300 px-1.5 py-1 text-[10px] font-bold text-amber-800 group-hover:border-amber-400">
            <span>⚡ Part</span>
            <span className="text-[8px] font-normal">Sửa ✏️</span>
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Điều hướng tuần */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
              <span>📅</span> Bảng Phân Ca Làm Việc Tuần (7 Ngày)
            </h1>
            {isViewingCurrentWeek && (
              <span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-bold border border-blue-200">
                📌 Tuần Hiện Tại
              </span>
            )}
            {isViewingNextWeek && (
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-bold border border-emerald-200 animate-pulse">
                🌟 Tuần Sau (Mở Đăng Ký)
              </span>
            )}
            {isViewingPastWeek && (
              <span className="rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-xs font-bold border border-slate-300">
                📁 Tuần Cũ (Lịch Sử)
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Đang xem: <strong className="text-blue-600 font-mono text-sm sm:text-base">{selectedWeekKey}</strong>
            <span className="ml-2 font-medium text-slate-700">({getWeekRangeDisplay(selectedWeekKey)})</span>
            <span className="hidden sm:inline text-slate-400 ml-1.5">— Admin có thể bấm trực tiếp vào từng ô để đổi ca</span>
          </p>
        </div>

        {/* BỘ ĐIỀU HƯỚNG TUẦN (WEEK NAVIGATOR) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút lùi 1 tuần */}
          <button
            type="button"
            onClick={handlePrevWeek}
            className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition active:scale-95 shadow-xs"
            title="Xem tuần trước đó"
          >
            <span>◀</span>
            <span className="hidden sm:inline">Tuần trước</span>
          </button>

          {/* Dropdown chọn nhanh tuần */}
          <select
            value={selectedWeekKey}
            onChange={(e) => setSelectedWeekKey(e.target.value)}
            className="rounded-xl border-2 border-blue-500 bg-blue-50/50 px-3 py-2 text-xs font-black text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer shadow-xs max-w-[210px] sm:max-w-none"
          >
            {quickWeekOptions.map((opt) => (
              <option key={opt.weekKey} value={opt.weekKey}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Nút tiến 1 tuần */}
          <button
            type="button"
            onClick={handleNextWeek}
            className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition active:scale-95 shadow-xs"
            title="Xem tuần tiếp theo"
          >
            <span className="hidden sm:inline">Tuần sau</span>
            <span>▶</span>
          </button>

          {/* Nút quay về tuần hiện tại (nếu đang ở tuần khác) */}
          {!isViewingCurrentWeek && (
            <button
              type="button"
              onClick={handleCurrentWeek}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-2 text-xs font-bold text-white transition active:scale-95 shadow-xs"
            >
              📌 Về tuần này
            </button>
          )}

          {/* Nút làm mới dữ liệu */}
          <button
            type="button"
            onClick={() => loadSchedules(selectedWeekKey)}
            className="rounded-xl bg-slate-100 hover:bg-slate-200 p-2 text-xs font-bold text-slate-600 transition"
            title="Làm mới dữ liệu"
          >
            🔄
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className={`p-3 rounded-xl text-center text-xs font-bold shadow-sm ${toastMessage.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toastMessage}
        </div>
      )}

      {/* Thống kê cả 7 ngày */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {ALL_DAYS.map((day, idx) => (
          <div key={day} className="rounded-2xl bg-white border border-slate-200 p-3 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between border-b pb-1.5 border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{DAY_LABELS[day]}</span>
              <span className="text-[10px] font-mono text-slate-400 font-semibold">{getDayDateLabel(selectedWeekKey, idx)}</span>
            </div>
            <div className="mt-2 space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-emerald-700 font-medium">⭐ Full:</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-1 rounded font-mono">{stats[day]?.fulltime || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-700 font-medium">⚡ Part:</span>
                <span className="font-bold text-amber-800 bg-amber-50 px-1 rounded font-mono">{stats[day]?.parttime || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">⚪ Off:</span>
                <span className="font-bold text-slate-600 bg-slate-100 px-1 rounded font-mono">{stats[day]?.off || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm tên, số điện thoại, mã tài xế..."
          className="w-full sm:w-80 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">Lọc ca:</span>
          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Tất cả ca</option>
            <option value="FULLTIME">Có ca Fulltime</option>
            <option value="PARTTIME">Có ca Part-time</option>
            <option value="OFF">Có ngày Off</option>
          </select>
        </div>
      </div>

      {/* Bảng ma trận 7 ngày */}
      <div className="overflow-x-auto rounded-2xl bg-white border border-slate-200 shadow-sm">
        <table className="w-full text-left border-collapse text-xs min-w-[850px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold text-slate-600 uppercase">
              <th className="py-3 px-3">Tài xế</th>
              <th className="py-3 px-2 text-center">Mã</th>
              {ALL_DAYS.map((day, idx) => (
                <th key={day} className="py-3 px-1 text-center">
                  <div>{DAY_LABELS[day]}</div>
                  <div className="text-[9px] font-mono font-normal text-slate-400 normal-case">{getDayDateLabel(selectedWeekKey, idx)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="9" className="py-12 text-center text-slate-400">Đang tải bảng phân ca tuần {selectedWeekKey}...</td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-12 text-center text-slate-400">Không tìm thấy tài xế nào trong tuần này</td>
              </tr>
            ) : (
              filteredList.map((item) => {
                const driver = item.driver || {};
                const schedule = item.schedule || {};

                return (
                  <tr key={driver._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800">{driver.name || 'N/A'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{driver.phone}</div>
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-slate-600 font-bold text-[11px]">
                      {driver.driverCode || '-'}
                    </td>
                    <td className="py-2 px-1 text-center">{renderShiftBadge(driver, 'monday', schedule.monday)}</td>
                    <td className="py-2 px-1 text-center">{renderShiftBadge(driver, 'tuesday', schedule.tuesday)}</td>
                    <td className="py-2 px-1 text-center">{renderShiftBadge(driver, 'wednesday', schedule.wednesday)}</td>
                    <td className="py-2 px-1 text-center">{renderShiftBadge(driver, 'thursday', schedule.thursday)}</td>
                    <td className="py-2 px-1 text-center">{renderShiftBadge(driver, 'friday', schedule.friday)}</td>
                    <td className="py-2 px-1 text-center">{renderShiftBadge(driver, 'saturday', schedule.saturday)}</td>
                    <td className="py-2 px-1 text-center">{renderShiftBadge(driver, 'sunday', schedule.sunday)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL ADMIN CHỈNH SỬA CA LÀM VIỆC */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2.5">
              <div>
                <h3 className="font-black text-slate-800 text-sm">
                  ✏️ Admin Sửa Ca Làm Việc
                </h3>
                <p className="text-[11px] text-slate-500">
                  {editModal.driverName} - <strong>{DAY_LABELS[editModal.dayKey]}</strong> ({selectedWeekKey})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditModal({ isOpen: false, driverId: null })}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Chọn ca muốn áp dụng cho ngày này:
            </p>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAdminSaveShift('FULLTIME', true)}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95"
              >
                ⭐ Đặt thành FULLTIME (Khôi phục quyền gán 1km)
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAdminSaveShift('PARTTIME')}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 py-2.5 text-xs font-bold text-white shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95"
              >
                ⚡ Đặt thành PART-TIME (Nhận đơn treo)
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAdminSaveShift('OFF')}
                className="w-full rounded-xl bg-slate-700 hover:bg-slate-800 py-2.5 text-xs font-bold text-white shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95"
              >
                ⚪ Đặt thành NGHỈ (OFF)
              </button>
            </div>

            {editModal.isDowngraded && (
              <div className="rounded-xl bg-red-50 p-2.5 border border-red-200 text-[11px] text-red-700">
                ⚠️ Tài xế này đang bị hệ thống phạt hạ ca (Offline {editModal.offlineCount} lần). Khi bấm đặt thành Fulltime, hệ thống sẽ tự động gỡ phạt và reset số lần offline về 0.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
