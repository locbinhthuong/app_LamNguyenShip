import React, { useState, useEffect } from 'react';
import { getMyWeeklySchedule, registerWeeklySchedule, changeShiftBeforehand } from '../services/api';

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

export default function WeeklyScheduleModal({ isOpen, onClose, onScheduleUpdated }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'next'
  const [currentWeekShifts, setCurrentWeekShifts] = useState({});
  const [nextWeekShifts, setNextWeekShifts] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSchedule();
    }
  }, [isOpen]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      setMessage('');
      const res = await getMyWeeklySchedule();
      if (res?.success && res.data) {
        setData(res.data);

        // Khởi tạo state cho tuần này
        const curSched = res.data.currentSchedule?.schedule || {};
        const curMap = {};
        ALL_DAYS.forEach(d => {
          curMap[d] = curSched[d]?.shift || 'PARTTIME';
        });
        setCurrentWeekShifts(curMap);

        // Khởi tạo state cho tuần tới
        const nxtSched = res.data.nextSchedule?.schedule || {};
        const nxtMap = {};
        ALL_DAYS.forEach(d => {
          nxtMap[d] = nxtSched[d]?.shift || 'PARTTIME';
        });
        setNextWeekShifts(nxtMap);
      }
    } catch (err) {
      console.error('Lỗi tải lịch:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentSchedule = data?.currentSchedule;
  const nextSchedule = data?.nextSchedule;
  const editableDaysCurrent = data?.editableDays || {};
  const currentWeekKey = data?.currentWeekKey || '';
  const nextWeekKey = data?.nextWeekKey || '';
  const currentDayKey = data?.currentDayKey;

  const isNextTab = activeTab === 'next';
  const displayedShifts = isNextTab ? nextWeekShifts : currentWeekShifts;

  // Xử lý đổi ca 1 ngày (trước 1 ngày)
  const handleShiftSelect = async (dayKey, newShift) => {
    const isEditable = isNextTab ? true : editableDaysCurrent[dayKey];
    if (!isEditable) return;

    if (isNextTab) {
      // Ở tab tuần tới: Cập nhật state trước để bấm Lưu cả tuần hoặc đổi từng ngày
      setNextWeekShifts(prev => ({ ...prev, [dayKey]: newShift }));
    } else {
      // Ở tab tuần hiện tại: Gọi API đổi ca trực tiếp
      try {
        setActionLoading(true);
        setMessage('');
        const res = await changeShiftBeforehand(currentWeekKey, dayKey, newShift);
        if (res?.success) {
          setCurrentWeekShifts(prev => ({ ...prev, [dayKey]: newShift }));
          setMessage(`✅ Đã đổi ca ${DAY_LABELS[dayKey]} sang ${newShift === 'FULLTIME' ? 'Fulltime' : newShift === 'OFF' ? 'Nghỉ (Off)' : 'Part-time'}`);
          if (onScheduleUpdated) onScheduleUpdated();
          await loadSchedule();
        }
      } catch (err) {
        setMessage(`❌ ${err.response?.data?.message || 'Không thể đổi ca'}`);
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Lưu lịch tuần tới
  const handleSaveNextWeek = async () => {
    try {
      setActionLoading(true);
      setMessage('');
      const res = await registerWeeklySchedule(nextWeekKey, nextWeekShifts);
      if (res?.success) {
        setMessage('🎉 Đã lưu đăng ký ca cho Tuần Tới thành công!');
        if (onScheduleUpdated) onScheduleUpdated();
        await loadSchedule();
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Lỗi khi lưu ca'}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span>📅</span> Lịch Làm Việc Tuần
            </h2>
            <p className="text-[11px] text-slate-500">Đăng ký ca và đổi lịch trước ít nhất 1 ngày</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        {/* 2 Tab: Tuần này & Tuần tới (Luôn mở để tài xế bấm qua lại tự do) */}
        <div className="mt-3 flex gap-2 border-b pb-2">
          <button
            type="button"
            onClick={() => { setActiveTab('current'); setMessage(''); }}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'current'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>📌</span> Tuần này ({currentWeekKey})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('next'); setMessage(''); }}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'next'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <span>⭐</span> Đăng ký Tuần tới ({nextWeekKey})
          </button>
        </div>

        {/* Thông báo hướng dẫn / Cảnh báo */}
        {data?.noticeMessage && activeTab === 'current' && (
          <div className="mt-2.5 rounded-xl bg-amber-50 p-2.5 border border-amber-200 text-[11px] text-amber-800 font-medium">
            🔔 {data.noticeMessage}
          </div>
        )}

        {message && (
          <div className={`mt-2 rounded-xl p-2.5 text-center text-xs font-bold ${message.startsWith('✅') || message.startsWith('🎉') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message}
          </div>
        )}

        {/* Quy định tóm tắt */}
        <div className="mt-2 rounded-2xl bg-blue-50/70 p-2.5 border border-blue-100 text-[10px] text-slate-600 space-y-1">
          <p>• <strong>Tuần này:</strong> Ngày hôm nay và ngày qua sẽ khóa 🔒. Các ngày tới được đổi trước 23:59 đêm hôm trước.</p>
          <p>• <strong>Tuần tới:</strong> Mở tự do cả 7 ngày, bạn có thể đăng ký trước bất cứ lúc nào!</p>
          <p>• <strong>Fulltime:</strong> Bấm Offline quá 2 lần trong ngày sẽ bị hạ xuống Part-time cho ngày hôm đó.</p>
        </div>

        {/* Danh sách 7 ngày trong tuần */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Đang tải lịch...</div>
          ) : (
            ALL_DAYS.map((dayKey) => {
              const isToday = (dayKey === currentDayKey && !isNextTab);
              const isEditable = isNextTab ? true : editableDaysCurrent[dayKey];

              const currentShiftObj = !isNextTab 
                ? currentSchedule?.schedule?.[dayKey] 
                : nextSchedule?.schedule?.[dayKey];

              const selectedShift = displayedShifts[dayKey] || currentShiftObj?.shift || 'PARTTIME';
              const isDowngraded = currentShiftObj?.isDowngraded;
              const offlineCount = currentShiftObj?.offlineCount || 0;

              return (
                <div
                  key={dayKey}
                  className={`rounded-2xl border p-2.5 transition ${
                    isToday
                      ? 'border-blue-400 bg-blue-50/40 shadow-sm ring-1 ring-blue-300'
                      : isEditable
                        ? 'border-slate-200 bg-white hover:border-slate-300'
                        : 'border-slate-200 bg-slate-50/60 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${isEditable ? 'text-slate-800' : 'text-slate-500'}`}>
                        {DAY_LABELS[dayKey]}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                          Hôm nay
                        </span>
                      )}
                      {!isEditable && (
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                          🔒 Đã khóa (Quá hạn)
                        </span>
                      )}
                    </div>

                    {isToday && selectedShift === 'FULLTIME' && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isDowngraded
                          ? 'bg-red-100 text-red-700'
                          : offlineCount === 2
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isDowngraded ? 'Hạ Part (Off > 2 lần)' : `Offline: ${offlineCount}/2 lần`}
                      </span>
                    )}
                  </div>

                  {/* 3 Nút chọn ca */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {/* FULLTIME */}
                    <button
                      type="button"
                      disabled={!isEditable || actionLoading}
                      onClick={() => handleShiftSelect(dayKey, 'FULLTIME')}
                      className={`rounded-xl py-2 text-[11px] font-bold transition border ${
                        selectedShift === 'FULLTIME'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                      } ${!isEditable ? 'opacity-40 cursor-not-allowed' : 'active:scale-95 cursor-pointer'}`}
                    >
                      ⭐ Fulltime
                    </button>

                    {/* PARTTIME */}
                    <button
                      type="button"
                      disabled={!isEditable || actionLoading}
                      onClick={() => handleShiftSelect(dayKey, 'PARTTIME')}
                      className={`rounded-xl py-2 text-[11px] font-bold transition border ${
                        selectedShift === 'PARTTIME'
                          ? 'bg-amber-500 text-white border-amber-500 shadow'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                      } ${!isEditable ? 'opacity-40 cursor-not-allowed' : 'active:scale-95 cursor-pointer'}`}
                    >
                      ⚡ Part-time
                    </button>

                    {/* OFF */}
                    <button
                      type="button"
                      disabled={!isEditable || actionLoading}
                      onClick={() => handleShiftSelect(dayKey, 'OFF')}
                      className={`rounded-xl py-2 text-[11px] font-bold transition border ${
                        selectedShift === 'OFF'
                          ? 'bg-slate-700 text-white border-slate-700 shadow'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-200'
                      } ${!isEditable ? 'opacity-40 cursor-not-allowed' : 'active:scale-95 cursor-pointer'}`}
                    >
                      ⚪ Nghỉ (Off)
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Nút lưu khi ở tab Tuần Tới */}
        {isNextTab && (
          <div className="mt-3 border-t pt-3">
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleSaveNextWeek}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition"
            >
              {actionLoading ? 'Đang lưu...' : `💾 Xác Nhận Đăng Ký Tuần Tới (${nextWeekKey})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
