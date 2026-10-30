import React, { useState, useEffect } from 'react';
import { getAdminWeeklySchedules } from '../services/api';

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

export default function DriverSchedules() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [filterShift, setFilterShift] = useState('ALL');

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async (weekKey = '') => {
    try {
      setLoading(true);
      const res = await getAdminWeeklySchedules(weekKey);
      if (res?.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Lỗi tải lịch tuần:', err);
    } finally {
      setLoading(false);
    }
  };

  const fullList = data?.data || [];
  const stats = data?.stats || {};
  const currentWeekKey = data?.weekKey || '';

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

  const renderShiftBadge = (dayObj) => {
    const shift = dayObj?.shift || 'PARTTIME';
    const isDowngraded = dayObj?.isDowngraded;
    const offlineCount = dayObj?.offlineCount || 0;

    if (shift === 'FULLTIME') {
      if (isDowngraded) {
        return (
          <span className="inline-flex flex-col items-center justify-center rounded-lg bg-red-50 border border-red-200 px-1.5 py-1 text-[10px] font-bold text-red-700 shadow-xs" title={`Bị hạ do offline ${offlineCount} lần`}>
            <span>⚠️ Hạ Part</span>
            <span className="text-[8px] font-mono font-normal">Off: {offlineCount} lần</span>
          </span>
        );
      }
      return (
        <span className="inline-flex flex-col items-center justify-center rounded-lg bg-emerald-50 border border-emerald-300 px-1.5 py-1 text-[10px] font-bold text-emerald-800 shadow-xs">
          <span>⭐ Fulltime</span>
          {offlineCount > 0 && <span className="text-[8px] text-amber-700 font-mono font-normal">Off: {offlineCount}/2</span>}
        </span>
      );
    }

    if (shift === 'OFF') {
      return (
        <span className="inline-flex items-center justify-center rounded-lg bg-slate-100 border border-slate-300 px-1.5 py-1 text-[10px] font-bold text-slate-500">
          ⚪ Nghỉ (Off)
        </span>
      );
    }

    return (
      <span className="inline-flex items-center justify-center rounded-lg bg-amber-50 border border-amber-300 px-1.5 py-1 text-[10px] font-bold text-amber-800">
        ⚡ Part-time
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2.5">
            <span>📅</span> Bảng Phân Ca Làm Việc Tuần (7 Ngày)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Mã tuần: <strong className="text-blue-600 font-mono">{currentWeekKey}</strong> (Áp dụng từ Thứ Hai đến Chủ Nhật)
          </p>
        </div>
        <button
          onClick={() => loadSchedules(currentWeekKey)}
          className="self-start sm:self-auto rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
        >
          🔄 Làm mới dữ liệu
        </button>
      </div>

      {/* Thống kê cả 7 ngày */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {ALL_DAYS.map(day => (
          <div key={day} className="rounded-2xl bg-white border border-slate-200 p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{DAY_LABELS[day]}</span>
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
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
        <table className="w-full text-left border-collapse text-xs min-w-[750px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold text-slate-600 uppercase">
              <th className="py-3 px-3">Tài xế</th>
              <th className="py-3 px-2 text-center">Mã</th>
              <th className="py-3 px-2 text-center">Thứ 2</th>
              <th className="py-3 px-2 text-center">Thứ 3</th>
              <th className="py-3 px-2 text-center">Thứ 4</th>
              <th className="py-3 px-2 text-center">Thứ 5</th>
              <th className="py-3 px-2 text-center">Thứ 6</th>
              <th className="py-3 px-2 text-center">Thứ 7</th>
              <th className="py-3 px-2 text-center">Chủ Nhật</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="9" className="py-12 text-center text-slate-400">Đang tải bảng phân ca...</td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-12 text-center text-slate-400">Không tìm thấy tài xế nào</td>
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
                    <td className="py-3 px-1 text-center">{renderShiftBadge(schedule.monday)}</td>
                    <td className="py-3 px-1 text-center">{renderShiftBadge(schedule.tuesday)}</td>
                    <td className="py-3 px-1 text-center">{renderShiftBadge(schedule.wednesday)}</td>
                    <td className="py-3 px-1 text-center">{renderShiftBadge(schedule.thursday)}</td>
                    <td className="py-3 px-1 text-center">{renderShiftBadge(schedule.friday)}</td>
                    <td className="py-3 px-1 text-center">{renderShiftBadge(schedule.saturday)}</td>
                    <td className="py-3 px-1 text-center">{renderShiftBadge(schedule.sunday)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
