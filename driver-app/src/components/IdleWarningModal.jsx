import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, Lock, Clock, CheckCircle2, PowerOff, VolumeX, LogOut } from 'lucide-react';

const formatDuration = (ms) => {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
};

// Tạm ẩn bảng cảnh báo treo app khi đang vận hành (chờ lên App Store)
const IDLE_WARNING_UI_ENABLED = false;

export default function IdleWarningModal() {
  if (!IDLE_WARNING_UI_ENABLED) return null;

  const { driver, setOnline, confirmActive, loadProfile, logout } = useAuth();
  const [socketWarning, setSocketWarning] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now() + (window.serverTimeOffset || 0));
  const [alarmMuted, setAlarmMuted] = useState(false);
  const triggeredProfileWarningRef = useRef(false);

  // Lắng nghe sự kiện cảnh báo treo app từ Socket / FCM Foreground
  useEffect(() => {
    const handleWarningEvent = (e) => {
      const data = e.detail;
      if (!data) return;
      setAlarmMuted(false);
      setSocketWarning(data);
    };

    const handleUnlockedEvent = () => {
      setSocketWarning(null);
      window.dispatchEvent(new CustomEvent('stop_warning_alarm_event'));
      loadProfile();
    };

    window.addEventListener('driver_idle_warning_event', handleWarningEvent);
    window.addEventListener('driver_idle_unlocked_event', handleUnlockedEvent);

    return () => {
      window.removeEventListener('driver_idle_warning_event', handleWarningEvent);
      window.removeEventListener('driver_idle_unlocked_event', handleUnlockedEvent);
    };
  }, [loadProfile]);

  // Nếu mở app lên từ trạng thái chạy ngầm mà đang bị cảnh báo lần 1 chưa xác nhận -> kích hoạt chuông cảnh báo 1 lần
  useEffect(() => {
    const isUnconfirmedLevel1 =
      driver?.isOnline &&
      Number(driver?.idleWarningLevel) === 1 &&
      !driver?.idleConfirmedAt;

    if (isUnconfirmedLevel1 && !triggeredProfileWarningRef.current) {
      triggeredProfileWarningRef.current = true;
      setAlarmMuted(false);
      window.dispatchEvent(new CustomEvent('play_warning_alarm_event'));
    } else if (!isUnconfirmedLevel1) {
      triggeredProfileWarningRef.current = false;
    }
  }, [driver?.isOnline, driver?.idleWarningLevel, driver?.idleConfirmedAt]);

  // Xác định thời điểm khóa từ socketWarning hoặc hồ sơ driver
  const lockedUntilRaw = socketWarning?.lockedUntil || driver?.idleLockedUntil || null;
  const lockedUntilMs = lockedUntilRaw ? new Date(lockedUntilRaw).getTime() : 0;
  const remainingLockMs = Math.max(0, lockedUntilMs - nowMs);
  const isLocked = lockedUntilMs > 0 && remainingLockMs > 0;

  // Đồng hồ đếm ngược khi đang bị khóa app
  useEffect(() => {
    if (!lockedUntilMs) return;

    const timer = setInterval(() => {
      const currentNow = Date.now() + (window.serverTimeOffset || 0);
      setNowMs(currentNow);
      if (lockedUntilMs - currentNow <= 0) {
        clearInterval(timer);
        setSocketWarning(null);
        window.dispatchEvent(new CustomEvent('stop_warning_alarm_event'));
        loadProfile();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lockedUntilMs, loadProfile]);

  // Kiểm tra trạng thái Cảnh báo Lần 1 (Online 2 tiếng không nhận đơn)
  const isLevel1Active =
    !isLocked &&
    ((socketWarning?.level === 1 && driver?.isOnline) ||
      (driver?.isOnline && Number(driver?.idleWarningLevel) === 1 && !driver?.idleConfirmedAt));

  const stopWarningSound = () => {
    setAlarmMuted(true);
    window.dispatchEvent(new CustomEvent('stop_warning_alarm_event'));
    window.dispatchEvent(new CustomEvent('stop_alarm_event'));
  };

  const handleConfirmActive = async () => {
    if (submitting) return;
    setSubmitting(true);
    stopWarningSound();
    try {
      await confirmActive();
      setSocketWarning(null);
    } catch (err) {
      console.error('Lỗi xác nhận hoạt động:', err);
      await loadProfile();
      setSocketWarning(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoOffline = async () => {
    if (submitting) return;
    setSubmitting(true);
    stopWarningSound();
    try {
      await setOnline(false);
      setSocketWarning(null);
    } catch (err) {
      console.error('Lỗi chuyển Offline:', err);
      await loadProfile();
      setSocketWarning(null);
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== MODAL KHÓA APP (CẢNH BÁO LẦN 2: 15 PHÚT / LẦN 3: 12 TIẾNG) ====================
  if (isLocked) {
    const lockLevel =
      socketWarning?.level ||
      (Number(driver?.idleWarningLevel) >= 3 || remainingLockMs > 20 * 60 * 1000 ? 3 : 2);
    const isLevel3 = lockLevel >= 3;

    return (
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border-2 border-red-500">
          {/* Header */}
          <div className={`p-5 text-center relative overflow-hidden ${isLevel3 ? 'bg-gradient-to-r from-red-700 via-red-600 to-rose-700' : 'bg-gradient-to-r from-orange-600 to-red-600'}`}>
            <div className="mx-auto mb-2.5 w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/40 shadow-inner">
              <Lock size={32} className="text-white animate-pulse" />
            </div>
            <span className="inline-block px-3 py-0.5 rounded-full bg-black/25 text-white text-[11px] font-black uppercase tracking-wider mb-1">
              {isLevel3 ? 'Cảnh báo lần 3 • Vi phạm treo app' : 'Cảnh báo lần 2 • Treo app quá lâu'}
            </span>
            <h3 className="text-white font-black text-xl uppercase tracking-wide">
              {isLevel3 ? 'KHÓA APP 12 TIẾNG' : 'TẠM KHÓA APP 15 PHÚT'}
            </h3>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Đồng hồ đếm ngược */}
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-red-600 uppercase tracking-wider mb-1">
                <Clock size={14} /> Thời gian mở khóa còn lại
              </div>
              <div className="text-3xl font-black text-red-700 font-mono tracking-widest">
                {formatDuration(remainingLockMs)}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Mở khóa lúc: {new Date(lockedUntilMs).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                ({new Date(lockedUntilMs).toLocaleDateString('vi-VN')})
              </p>
            </div>

            {/* Nội dung cảnh báo */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-sm text-slate-700 leading-relaxed space-y-2">
              {isLevel3 ? (
                <>
                  <p className="font-bold text-red-700">
                    🚫 Tài khoản của bạn đã bị khóa nhận đơn trong 12 tiếng!
                  </p>
                  <p className="text-xs text-slate-600 font-medium">
                    Sau 15 phút khóa app ở lần cảnh báo 2, bạn vẫn tiếp tục mở Online treo app quá <b>45 phút</b> mà không nhận đơn. Hệ thống đã tự động chuyển bạn sang trạng thái <b>Offline</b> và khóa app <b>12 tiếng</b>.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-orange-700">
                    ⚠️ Bạn đã treo app thêm 45 phút sau cảnh báo lần 1 mà không nhận đơn!
                  </p>
                  <p className="text-xs text-slate-600 font-medium">
                    Hệ thống đã tự động chuyển bạn sang trạng thái <b>Offline</b> và khóa tính năng nhận đơn trong <b>15 phút</b>.
                  </p>
                  <div className="bg-amber-100/80 border border-amber-300 rounded-xl p-2.5 text-[11px] text-amber-900 font-bold">
                    🔔 Lưu ý: Sau 15 phút mở khóa, nếu bạn bật Online mà vẫn treo app không nhận đơn trong 45 phút tiếp theo sẽ bị cảnh báo lần 3 và <span className="text-red-600 underline">khóa app 12 tiếng</span>!
                  </div>
                </>
              )}
            </div>

            {/* Nút tắt chuông & Đăng xuất */}
            <div className="flex flex-col gap-2.5 pt-1">
              {!alarmMuted && (
                <button
                  type="button"
                  onClick={stopWarningSound}
                  className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black rounded-xl shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2 uppercase text-sm"
                >
                  <VolumeX size={18} /> Tắt chuông cảnh báo
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  stopWarningSound();
                  logout();
                }}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 text-xs"
              >
                <LogOut size={14} /> Đăng xuất tài khoản
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MODAL CẢNH BÁO LẦN 1 (2 TIẾNG TREO APP) ====================
  if (isLevel1Active) {
    return (
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border-2 border-amber-500">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-5 text-center relative overflow-hidden">
            <div className="mx-auto mb-2.5 w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/40">
              <AlertTriangle size={34} className="text-white animate-bounce" />
            </div>
            <span className="inline-block px-3 py-0.5 rounded-full bg-black/20 text-white text-[11px] font-black uppercase tracking-wider mb-1">
              Cảnh báo treo app • Lần 1
            </span>
            <h3 className="text-white font-black text-lg uppercase tracking-wide">
              Bạn còn đang hoạt động không?
            </h3>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center space-y-2">
              <p className="text-slate-900 font-extrabold text-base leading-snug">
                Bạn còn đang hoạt động không? Hãy xác nhận nếu còn đang hoạt động!
              </p>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Hệ thống ghi nhận bạn đã bật <b>Online hơn 2 tiếng</b> nhưng chưa nhận đơn hàng nào.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 font-semibold leading-relaxed">
              ⚠️ Nếu không còn chạy xe, vui lòng bấm <b>Offline</b>. Sau <b>45 phút</b> nữa nếu bạn vẫn treo app mà không nhận đơn, hệ thống sẽ cảnh báo lần 2 và <b>khóa app 15 phút</b>!
            </div>

            {/* 2 Nút: Xác nhận & Offline */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={handleGoOffline}
                className="py-3.5 px-4 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 uppercase text-sm disabled:opacity-50"
              >
                <PowerOff size={18} />
                Offline
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmActive}
                className="py-3.5 px-4 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-black rounded-2xl shadow-lg shadow-green-600/30 transition-all flex items-center justify-center gap-2 uppercase text-sm disabled:opacity-50"
              >
                <CheckCircle2 size={18} />
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
