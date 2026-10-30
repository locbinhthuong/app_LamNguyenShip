import React, { useState, useEffect } from 'react';
import { getMyWeeklySchedule, registerWeeklySchedule, changeShiftBeforehand } from '../services/api';

const DAY_LABELS = {
  monday: 'Thứ Hai',
  tuesday: 'Thứ Ba',
  wednesday: 'Thứ Tư',
  thursday: 'Thứ Năm',
  friday: 'Thứ Sáu'
};

export default function WeeklyScheduleModal({ isOpen, onClose, onScheduleUpdated }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'next'
  const [selectedShifts, setSelectedShifts] = useState({
    monday: 'PARTTIME',
    tuesday: 'PARTTIME',
    wednesday: 'PARTTIME',
    thursday: 'PARTTIME',
    friday: 'PARTTIME'
  });
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
        if (res.data.isSunday && res.data.nextSchedule) {
          setActiveTab('next');
        } else {
          setActiveTab('current');
        }

        const scheduleSource = (res.data.isSunday && res.data.nextSchedule?.schedule) 
          ? res.data.nextSchedule.schedule 
          : res.data.currentSchedule?.schedule || {};

        setSelectedShifts({
          monday: scheduleSource.monday?.shift || 'PARTTIME',
          tuesday: scheduleSource.tuesday?.shift || 'PARTTIME',
          wednesday: scheduleSource.wednesday?.shift || 'PARTTIME',
          thursday: scheduleSource.thursday?.shift || 'PARTTIME',
          friday: scheduleSource.friday?.shift || 'PARTTIME'
        });
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
  const editableDays = data?.editableDays || {};
  const isSunday = data?.isSunday;
  const currentWeekKey = data?.currentWeekKey;
  const nextWeekKey = data?.nextWeekKey;
  const currentDayKey = data?.currentDayKey;

  // Xử lý đổi ca cho một ngày cụ thể (áp dụng tuần hiện tại)
  const handleChangeSingleShift = async (dayKey, newShift) => {
    try {
      setActionLoading(true);
      setMessage('');

      const targetWeekKey = activeTab === 'current' ? currentWeekKey : nextWeekKey;

      const res = await changeShiftBeforehand(targetWeekKey, dayKey, newShift);
      if (res?.success) {
        setSelectedShifts(prev => ({ ...prev, [dayKey]: newShift }));
        setMessage(`✅ Đã đổi ca ${DAY_LABELS[dayKey]} sang ${newShift === 'FULLTIME' ? 'Fulltime' : newShift === 'OFF' ? 'Nghỉ (Off)' : 'Part-time'}`);
        await loadSchedule();
        if (onScheduleUpdated) onScheduleUpdated();
      }
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Không thể đổi ca'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Đăng ký toàn bộ tuần mới (vào Chủ Nhật)
  const handleSaveFullWeek = async () => {
    try {
      setActionLoading(true);
      setMessage('');

      const targetWeekKey = activeTab === 'next' ? nextWeekKey : currentWeekKey;
      const res = await registerWeeklySchedule(targetWeekKey, selectedShifts);

      if (res?.success) {
        setMessage('🎉 Đăng ký lịch thành công!');
        await loadSchedule();
        if (onScheduleUpdated) onScheduleUpdated();
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Lỗi khi đăng ký'}`);
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
            <p className="text-[11px] text-slate-500">Đăng ký ca và đổi lịch trước 1 ngày</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Tab Tuần này / Tuần tới */}
        <div className="mt-3 flex gap-2 border-b pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
              activeTab === 'current'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tuần này ({currentWeekKey})
          </button>
          {isSunday && (
            <button
              type="button"
              onClick={() => setActiveTab('next')}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'next'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span>⭐</span> Đăng ký Tuần mới ({nextWeekKey})
            </button>
          )}
        </div>

        {/* Thông báo hướng dẫn / Cảnh báo */}
        {data?.noticeMessage && (
          <div className="mt-2.5 rounded-xl bg-amber-50 p-2.5 border border-amber-200 text-[11px] text-amber-800 font-medium">
            🔔 {data.noticeMessage}
          </div>
        )}

        {message && (
          <div className={`mt-2 rounded-xl p-2 text-center text-xs font-bold ${message.startsWith('✅') || message.startsWith('🎉') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        {/* Quy định tóm tắt */}
        <div className="mt-2.5 rounded-2xl bg-blue-50/70 p-2.5 border border-blue-100 text-[10px] text-slate-600 space-y-1">
          <p>• <strong>Đổi ca:</strong> Chỉ đổi được trước 23:59 ngày hôm trước (trước ít nhất 1 ngày).</p>
          <p>• <strong>Fulltime:</strong> Bấm Offline quá 2 lần trong ngày sẽ bị hạ xuống Part-time.</p>
          <p>• <strong>Đăng ký Off:</strong> Nếu vẫn muốn chạy, cứ bật Online bình thường để nhận đơn treo (Part-time).</p>
        </div>

        {/* Danh sách 5 ngày T2 -> T6 */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Đang tải lịch...</div>
          ) : (
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((dayKey) => {
              const isToday = (dayKey === currentDayKey && activeTab === 'current');
              const isEditable = activeTab === 'next' ? true : editableDays[dayKey];
              const currentShiftObj = activeTab === 'current' 
                ? currentSchedule?.schedule?.[dayKey] 
                : nextSchedule?.schedule?.[dayKey];

              const currentShift = selectedShifts[dayKey] || currentShiftObj?.shift || 'PARTTIME';
              const isDowngraded = currentShiftObj?.isDowngraded;
              const offlineCount = currentShiftObj?.offlineCount || 0;

              return (
                <div
                  key={dayKey}
                  className={`rounded-2xl border p-2.5 transition ${
                    isToday
                      ? 'border-blue-400 bg-blue-50/40 shadow-sm ring-1 ring-blue-300'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800">
                        {DAY_LABELS[dayKey]}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                          Hôm nay
                        </span>
                      )}
                      {!isEditable && (
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                          🔒 Đã khóa
                        </span>
                      )}
                    </div>

                    {isToday && currentShift === 'FULLTIME' && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isDowngraded
                          ? 'bg-red-100 text-red-700'
                          : offlineCount === 2
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isDowngraded ? 'Hạ Part-time (Off > 2 lần)' : `Offline: ${offlineCount}/2 lần`}
                      </span>
                    )}
                  </div>

                  {/* 3 Nút chọn ca */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {/* FULLTIME */}
                    <button
                      type="button"
                      disabled={!isEditable || actionLoading}
                      onClick={() => {
                        if (activeTab === 'next' || data?.canRegisterRemaining) {
                          setSelectedShifts(prev => ({ ...prev, [dayKey]: 'FULLTIME' }));
                        } else {
                          handleChangeSingleShift(dayKey, 'FULLTIME');
                        }
                      }}
                      className={`rounded-xl py-2 text-[11px] font-bold transition border ${
                        currentShift === 'FULLTIME'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                      } ${!isEditable ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                    >
                      ⭐ Fulltime
                    </button>

                    {/* PARTTIME */}
                    <button
                      type="button"
                      disabled={!isEditable || actionLoading}
                      onClick={() => {
                        if (activeTab === 'next' || data?.canRegisterRemaining) {
                          setSelectedShifts(prev => ({ ...prev, [dayKey]: 'PARTTIME' }));
                        } else {
                          handleChangeSingleShift(dayKey, 'PARTTIME');
                        }
                      }}
                      className={`rounded-xl py-2 text-[11px] font-bold transition border ${
                        currentShift === 'PARTTIME'
                          ? 'bg-amber-500 text-white border-amber-500 shadow'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                      } ${!isEditable ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                    >
                      ⚡ Part-time
                    </button>

                    {/* OFF */}
                    <button
                      type="button"
                      disabled={!isEditable || actionLoading}
                      onClick={() => {
                        if (activeTab === 'next' || data?.canRegisterRemaining) {
                          setSelectedShifts(prev => ({ ...prev, [dayKey]: 'OFF' }));
                        } else {
                          handleChangeSingleShift(dayKey, 'OFF');
                        }
                      }}
                      className={`rounded-xl py-2 text-[11px] font-bold transition border ${
                        currentShift === 'OFF'
                          ? 'bg-slate-700 text-white border-slate-700 shadow'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-200'
                      } ${!isEditable ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                    >
                      ⚪ Nghỉ (Off)
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Nút đăng ký trọn tuần khi là Chủ Nhật hoặc Thứ 2 bổ sung */}
        {(activeTab === 'next' || data?.canRegisterRemaining) && (
          <div className="mt-3 border-t pt-3">
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleSaveFullWeek}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 active:scale-95 transition"
            >
              {actionLoading ? 'Đang lưu...' : '💾 Xác Nhận Đăng Ký Lịch Tuần'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
