import { useState, useEffect } from 'react';
import { getRainConfig, updateRainConfig } from '../services/configService';
import { useToast } from '../context/ToastContext';
import { CloudRain, CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

export default function RainConfirmModal() {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentConfig, setCurrentConfig] = useState({ isEnabled: false, amount: 5000 });
  const [amount, setAmount] = useState(5000);

  const fetchConfig = async () => {
    try {
      const res = await getRainConfig();
      if (res.success && res.data && res.data.value) {
        setCurrentConfig(res.data.value);
        if (res.data.value.amount) {
          setAmount(Number(res.data.value.amount) || 5000);
        }
      }
    } catch (err) {
      console.error('Lỗi tải cấu hình mưa:', err);
    }
  };

  useEffect(() => {
    fetchConfig();

    const handleEvent = (e) => {
      setReportData(e.detail);
      setIsOpen(true);
      fetchConfig();
    };

    const handleManualOpen = () => {
      setReportData(null);
      setIsOpen(true);
      fetchConfig();
    };

    const handleRainModeChanged = (e) => {
      if (e.detail) {
        setCurrentConfig(e.detail);
        if (e.detail.amount) setAmount(Number(e.detail.amount) || 5000);
      }
    };

    window.addEventListener('show_rain_confirm_modal', handleEvent);
    window.addEventListener('open_manual_rain_modal', handleManualOpen);
    window.addEventListener('rain_mode_changed_event', handleRainModeChanged);

    return () => {
      window.removeEventListener('show_rain_confirm_modal', handleEvent);
      window.removeEventListener('open_manual_rain_modal', handleManualOpen);
      window.removeEventListener('rain_mode_changed_event', handleRainModeChanged);
    };
  }, []);

  const handleClose = () => {
    if (window.stopAdminAlarm) {
      window.stopAdminAlarm();
    }
    setIsOpen(false);
    setReportData(null);
  };

  const handleConfirmRain = async () => {
    try {
      setIsProcessing(true);
      const newConfig = {
        isEnabled: true,
        amount: Number(amount) || 5000,
        updatedAt: new Date(),
        reportedBy: reportData ? {
          driverId: reportData.driverId,
          name: reportData.driverName,
          phone: reportData.driverPhone,
          driverCode: reportData.driverCode
        } : currentConfig.reportedBy || null
      };

      const res = await updateRainConfig(newConfig);
      if (res.success) {
        setCurrentConfig(newConfig);
        showToast(`🌧️ ĐÃ KÍCH HOẠT CHẾ ĐỘ MƯA! Phụ phí +${(Number(amount) || 5000).toLocaleString('vi-VN')}đ đã được cộng trực tiếp vào tiền ship.`, 'success', 8000);
        handleClose();
      }
    } catch (error) {
      showToast('Lỗi cập nhật: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTurnOffRain = async () => {
    try {
      setIsProcessing(true);
      const newConfig = {
        ...currentConfig,
        isEnabled: false,
        amount: Number(amount) || 5000,
        updatedAt: new Date()
      };

      const res = await updateRainConfig(newConfig);
      if (res.success) {
        setCurrentConfig(newConfig);
        showToast('☀️ ĐÃ TẮT CHẾ ĐỘ MƯA. Tiền ship trở lại giá bình thường!', 'info', 6000);
        handleClose();
      }
    } catch (error) {
      showToast('Lỗi tắt chế độ mưa: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-md">
              <CloudRain size={24} className="text-white animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-wide">
                {reportData ? 'TÀI XẾ BÁO TRỜI MƯA!' : 'CẤU HÌNH PHỤ PHÍ MƯA'}
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                {currentConfig.isEnabled ? 'Chế độ mưa hiện đang BẬT' : 'Chế độ mưa hiện đang TẮT'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Thông tin tài xế báo mưa nếu có */}
          {reportData && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Thông tin tài xế báo</span>
                <span className="text-[11px] text-blue-600 font-semibold">
                  {new Date(reportData.reportedAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <div className="w-12 h-12 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-black text-lg shrink-0">
                  {reportData.driverName?.charAt(0)?.toUpperCase() || '👤'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-base">{reportData.driverName}</p>
                  <p className="text-xs text-slate-500 font-medium">
                    Mã TX: <span className="font-bold text-blue-600">{reportData.driverCode}</span> • SĐT: <a href={`tel:${reportData.driverPhone}`} className="font-bold text-blue-600 underline">{reportData.driverPhone}</a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Trạng thái hiện tại */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm">
            <span className="text-slate-600 font-bold">Trạng thái phụ phí mưa:</span>
            {currentConfig.isEnabled ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black">
                <CheckCircle size={14} /> ĐANG BẬT (+{(currentConfig.amount || 5000).toLocaleString('vi-VN')}đ)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">
                <XCircle size={14} /> ĐANG TẮT
              </span>
            )}
          </div>

          {/* Chọn mức phụ phí */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Mức phụ phí mưa cộng vào tiền ship (VNĐ)
            </label>
            <div className="relative">
              <input
                type="number"
                step="1000"
                min="0"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-black text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="5000"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                đ / đơn
              </span>
            </div>

            {/* Phím chọn nhanh */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[3000, 5000, 7000, 10000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                    amount === val
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  +{val.toLocaleString('vi-VN')}đ
                </button>
              ))}
            </div>
          </div>

          {/* Ghi chú cơ chế */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle size={14} className="shrink-0 text-amber-600" />
              Cơ chế tự động:
            </p>
            <p className="text-[11px] leading-relaxed">
              Khi bạn bấm <strong>Xác nhận có mưa</strong>, hệ thống sẽ cộng trực tiếp <strong>{Number(amount || 0).toLocaleString('vi-VN')}đ</strong> vào giá cước ship của tất cả đơn hàng mới để hỗ trợ tài xế chạy mưa.
            </p>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
          {currentConfig.isEnabled ? (
            <>
              <button
                type="button"
                onClick={handleTurnOffRain}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                ☀️ Tắt Chế Độ Mưa
              </button>
              <button
                type="button"
                onClick={handleConfirmRain}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                🌧️ Cập nhật (+{(Number(amount) || 0).toLocaleString('vi-VN')}đ)
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="py-3 px-4 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm transition-all"
              >
                {reportData ? 'Bỏ qua (Không mưa)' : 'Đóng'}
              </button>
              <button
                type="button"
                onClick={handleConfirmRain}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} />
                Xác nhận có mưa & Bật (+{(Number(amount) || 5000).toLocaleString('vi-VN')}đ)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
