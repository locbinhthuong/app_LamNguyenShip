import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  getActiveAnnouncements,
  uploadDriverAvatar,
  getFullImageUrl,
  deleteMyAccount,
  updateMyProfile
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import {
  User,
  Phone,
  Bike,
  Car,
  Edit3,
  ScrollText,
  ShieldCheck,
  Headphones,
  Trash2,
  Camera,
  Inbox,
  AlertTriangle,
  LogOut,
  Trophy,
  Flame,
  Clock,
  Sparkles,
  RefreshCw,
  Zap,
  Home as HomeIcon,
  ClipboardList,
  BarChart3
} from 'lucide-react';

export default function Profile() {
  const { driver, logout, loadProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef(null);

  const [showToast, setShowToast] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const [termsData, setTermsData] = useState([]);
  const [termsTitle, setTermsTitle] = useState('');
  const [loadingTerms, setLoadingTerms] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  const [formData, setFormData] = useState({
    name: '',
    vehicleType: 'motorcycle',
    licensePlate: '',
    avatar: '',
    cccd: '',
    gplx: '',
    password: ''
  });

  const showNotification = (message, type = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  useEffect(() => {
    loadProfile();
    const handleTierUpdated = () => loadProfile();
    window.addEventListener('driver_tier_upgraded_event', handleTierUpdated);
    window.addEventListener('driver_weekly_reset_event', handleTierUpdated);
    window.addEventListener('driver_updated', handleTierUpdated);
    window.addEventListener('refresh_data', handleTierUpdated);
    return () => {
      window.removeEventListener('driver_tier_upgraded_event', handleTierUpdated);
      window.removeEventListener('driver_weekly_reset_event', handleTierUpdated);
      window.removeEventListener('driver_updated', handleTierUpdated);
      window.removeEventListener('refresh_data', handleTierUpdated);
    };
  }, [loadProfile]);

  useEffect(() => {
    if (driver && !isEditing) {
      setFormData({
        name: driver.name || '',
        vehicleType: driver.vehicleType || 'motorcycle',
        licensePlate: driver.licensePlate || '',
        avatar: driver.avatar || '',
        cccd: driver.cccd || '',
        gplx: driver.gplx || '',
        password: ''
      });
      setAvatarPreview(driver.avatar || null);
      setAvatarFile(null);
    }
  }, [driver, isEditing]);

  // Đếm ngược thời gian còn lại đến hết tuần (23:59:59 Chủ Nhật VN)
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const vnNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
      const day = vnNow.getDay(); // 0 là Chủ Nhật, 1 là Thứ 2
      const daysUntilSunday = (7 - day) % 7;
      const endOfWeek = new Date(vnNow);
      endOfWeek.setDate(vnNow.getDate() + daysUntilSunday);
      endOfWeek.setHours(23, 59, 59, 999);
      const diff = Math.max(0, endOfWeek.getTime() - vnNow.getTime());

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft({ days: d, hours: h, minutes: m });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file hình ảnh hợp lệ!');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước ảnh không được vượt quá 5MB.');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    let finalAvatarUrl = formData.avatar;

    try {
      if (avatarFile) {
        const result = await uploadDriverAvatar(avatarFile);
        if (result.success && result.data?.url) {
          finalAvatarUrl = result.data.url;
        }
      }

      const submissionData = { ...formData, avatar: finalAvatarUrl };
      await updateMyProfile(submissionData);
      showNotification('Cập nhật hồ sơ thành công!');
      setIsEditing(false);
      setTimeout(() => loadProfile(), 300);
    } catch (error) {
      console.error('Update Profile Error:', error);
      showNotification(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ!', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleShowTerms = async (type, title) => {
    setShowTerms(true);
    setTermsTitle(title);
    setLoadingTerms(true);
    try {
      const res = await getActiveAnnouncements();
      if (res.success) {
        setTermsData(res.data.filter((item) => item.type === type));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTerms(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      const res = await deleteMyAccount();
      if (res.success) {
        alert('Tài khoản của bạn đã được đánh dấu xoá thành công.');
        logout();
      }
    } catch (error) {
      console.error('Lỗi khi xoá tài khoản:', error);
      alert('Không thể thực hiện yêu cầu xoá tài khoản. Vui lòng thử lại sau.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const VEHICLE_EMOJI = {
    motorcycle: (
      <>
        <Bike size={16} /> Xe máy
      </>
    ),
    bike: (
      <>
        <Bike size={16} /> Xe đạp
      </>
    ),
    car: (
      <>
        <Car size={16} /> Ô tô
      </>
    )
  };

  const currentTier = driver?.driverTier || 1;
  const points = driver?.weeklyPoints || 0;
  const isCustom = driver?.isCustomCommission;
  const commission = driver?.commissionRate || 15;
  const thresholds = driver?.tierInfo?.thresholds || { TIER_1_MAX: 10, TIER_2_MAX: 55, TIER_3_MIN: 56 };

  const tierThemes = {
    1: {
      name: 'Cấp 1 - Đồng',
      bgGradient: 'from-amber-700 via-orange-600 to-amber-800',
      icon: '🥉',
      glowColor: 'shadow-amber-500/20',
      nextTierName: 'Cấp 2 - Bạc',
      nextTierPoints: thresholds.TIER_1_MAX + 1,
      nextTierCommission: 15,
      needed: Math.max(0, thresholds.TIER_1_MAX + 1 - points),
      progressMax: thresholds.TIER_1_MAX + 1
    },
    2: {
      name: 'Cấp 2 - Bạc',
      bgGradient: 'from-slate-600 via-cyan-700 to-blue-700',
      icon: '🥈',
      glowColor: 'shadow-cyan-500/20',
      nextTierName: 'Cấp 3 - Vàng',
      nextTierPoints: thresholds.TIER_3_MIN,
      nextTierCommission: 10,
      needed: Math.max(0, thresholds.TIER_3_MIN - points),
      progressMax: thresholds.TIER_3_MIN
    },
    3: {
      name: 'Cấp 3 - Vàng',
      bgGradient: 'from-amber-500 via-yellow-500 to-amber-600',
      icon: '🥇',
      glowColor: 'shadow-yellow-500/30',
      nextTierName: null,
      nextTierPoints: null,
      nextTierCommission: 10,
      needed: 0,
      progressMax: thresholds.TIER_3_MIN
    }
  };

  const theme = tierThemes[currentTier] || tierThemes[1];
  const progressPercent = theme.nextTierPoints
    ? Math.min(100, Math.round((points / theme.progressMax) * 100))
    : 100;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 sm:pb-28">
      {/* Toast */}
      {showToast && (
        <div
          className={`fixed safe-top left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg text-white font-medium ${
            showToast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`}
        >
          {showToast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-blue-600 px-4 py-4 safe-pt text-white shadow-md">
        <div className="mx-auto max-w-lg sm:max-w-xl flex items-center justify-between">
          <h1 className="font-bold text-lg tracking-wide">
            {isEditing ? 'Cập nhật hồ sơ' : 'Thông tin cá nhân'}
          </h1>
          {isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors"
            >
              Trở lại
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-lg p-4 sm:max-w-xl space-y-5">
        {!isEditing ? (
          <>
            {/* Khung Hồ Sơ Tài Xế */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="flex flex-col items-center mb-5">
                <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-blue-50 overflow-hidden flex items-center justify-center mb-3 shadow-inner">
                  {driver?.avatar ? (
                    <img
                      src={getFullImageUrl(driver.avatar)}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-blue-500">
                      {driver?.name?.charAt(0).toUpperCase() || <User size={40} />}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-800">{driver?.name}</h3>
                <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full mt-1">
                  {driver?.driverCode}
                </span>
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Số điện thoại</p>
                    <p className="text-sm font-bold text-slate-800">{driver?.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    {driver?.vehicleType === 'car' ? <Car size={20} /> : <Bike size={20} />}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Phương tiện</p>
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-1">
                      {VEHICLE_EMOJI[driver?.vehicleType]}{' '}
                      {driver?.licensePlate && `- ${driver.licensePlate}`}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-3.5 rounded-xl font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors border-2 border-transparent hover:border-blue-200 flex items-center justify-center gap-2"
              >
                <Edit3 size={18} /> Chỉnh sửa hồ sơ
              </button>
            </div>

            {/* ===================== CẤP HẠNG TÀI XẾ (TUẦN) ===================== */}
            <div className="space-y-4">
              {/* Card cấp hạng chính */}
              <div
                className={`rounded-3xl bg-gradient-to-br ${theme.bgGradient} p-6 shadow-xl ${theme.glowColor} relative overflow-hidden text-white`}
              >
                <div className="absolute right-0 top-0 opacity-10">
                  <Trophy size={160} />
                </div>

                {/* Top bar: Tuần & Đồng hồ đếm ngược */}
                <div className="flex items-center justify-between relative z-10 mb-4">
                  <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold">
                    <Flame size={14} className="text-amber-300 animate-pulse" />
                    <span>Xếp Hạng Tuần Này</span>
                  </div>
                  <div className="flex items-center gap-1 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-amber-200">
                    <Clock size={12} />
                    <span>
                      Còn {timeLeft.days}n {timeLeft.hours}g {timeLeft.minutes}p
                    </span>
                  </div>
                </div>

                {/* Huy hiệu & Cấp bậc */}
                <div className="flex items-center gap-4 relative z-10 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-3xl shadow-inner">
                    {theme.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black">{theme.name}</h2>
                      {currentTier === 3 && (
                        <span className="bg-yellow-300 text-yellow-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                          VIP
                        </span>
                      )}
                    </div>
                    <p className="text-xs opacity-90 mt-0.5">
                      Chiết khấu: <span className="text-lg font-black text-yellow-200">{commission}%</span>
                      {isCustom && <span className="ml-1 text-[11px] opacity-75">(Cố định bởi Admin)</span>}
                    </p>
                  </div>
                </div>

                {/* Điểm tích lũy */}
                <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-4 relative z-10 border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-white/90">Số đơn hoàn thành tuần này:</span>
                    <span className="text-xl font-black text-yellow-300">
                      {points} <span className="text-xs font-bold text-white/80">đơn (điểm)</span>
                    </span>
                  </div>

                  {/* Thanh tiến trình */}
                  <div className="w-full bg-black/30 rounded-full h-3 overflow-hidden p-0.5">
                    <div
                      className="bg-gradient-to-r from-yellow-300 to-amber-200 h-full rounded-full transition-all duration-500 shadow"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Thông báo tiến độ */}
                  <div className="mt-2 text-xs flex items-center justify-between">
                    {theme.nextTierName ? (
                      <>
                        <span className="opacity-80">
                          Mục tiêu {theme.nextTierName}: {theme.nextTierPoints} đơn
                        </span>
                        <span className="font-bold text-yellow-200">
                          Cần thêm {theme.needed} đơn ({theme.nextTierCommission}%)
                        </span>
                      </>
                    ) : (
                      <span className="w-full text-center font-bold text-yellow-200 flex items-center justify-center gap-1">
                        <Sparkles size={14} /> Bạn đã đạt cấp bậc cao nhất với chiết khấu 10%!
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* THÀNH TÍCH TUẦN TRƯỚC */}
              <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                    {driver?.lastWeekTier === 3 ? '🥇' : driver?.lastWeekTier === 2 ? '🥈' : '🥉'}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Thành tích tuần trước</p>
                    <p className="text-sm font-bold text-slate-800">
                      {driver?.lastWeekTier === 3
                        ? 'Cấp 3 - Vàng'
                        : driver?.lastWeekTier === 2
                          ? 'Cấp 2 - Bạc'
                          : 'Cấp 1 - Đồng'}
                      <span className="text-xs text-slate-500 font-normal ml-1">
                        ({driver?.lastWeekPoints || 0} đơn)
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => loadProfile()}
                  className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                  title="Làm mới dữ liệu"
                >
                  <RefreshCw size={18} />
                </button>
              </div>

              {/* BẢNG MỐC CẤP BẬC VÀ QUYỀN LỢI CHIẾT KHẤU */}
              <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="text-blue-600" size={20} />
                  <h3 className="font-bold text-slate-800 text-sm">Bảng Mốc Cấp Bậc & Chiết Khấu</h3>
                </div>

                <div className="space-y-2.5">
                  {/* Cấp 1 */}
                  <div
                    className={`p-3 rounded-xl border transition-all ${
                      currentTier === 1
                        ? 'border-amber-400 bg-amber-50/70 shadow-sm'
                        : 'border-slate-100 bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">🥉</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">Cấp 1 - Đồng</span>
                            {currentTier === 1 && (
                              <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Cấp hiện tại
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">Mốc: 0 - {thresholds.TIER_1_MAX} đơn/tuần</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-amber-700">20%</span>
                        <p className="text-[10px] text-slate-400">Chiết khấu</p>
                      </div>
                    </div>
                  </div>

                  {/* Cấp 2 */}
                  <div
                    className={`p-3 rounded-xl border transition-all ${
                      currentTier === 2
                        ? 'border-cyan-400 bg-cyan-50/70 shadow-sm'
                        : 'border-slate-100 bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">🥈</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">Cấp 2 - Bạc</span>
                            {currentTier === 2 && (
                              <span className="bg-cyan-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Cấp hiện tại
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            Mốc: {thresholds.TIER_1_MAX + 1} - {thresholds.TIER_2_MAX} đơn/tuần
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-blue-600">15%</span>
                        <p className="text-[10px] text-emerald-600 font-semibold">Giảm 5% phí</p>
                      </div>
                    </div>
                  </div>

                  {/* Cấp 3 */}
                  <div
                    className={`p-3 rounded-xl border transition-all ${
                      currentTier === 3
                        ? 'border-amber-400 bg-amber-50/90 shadow-sm ring-1 ring-amber-400/50'
                        : 'border-slate-100 bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">🥇</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">Cấp 3 - Vàng</span>
                            {currentTier === 3 && (
                              <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Cấp hiện tại
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">Mốc: Trên {thresholds.TIER_2_MAX} đơn/tuần</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-amber-600">10%</span>
                        <p className="text-[10px] text-emerald-600 font-semibold">Ưu đãi nhất (-10%)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* THỂ LỆ & QUY TẮC RESET */}
              <div className="rounded-2xl bg-blue-50/60 border border-blue-100 p-4 text-xs text-slate-600 space-y-2">
                <p className="font-bold text-blue-900 flex items-center gap-1.5 text-sm">
                  <Zap size={16} className="text-blue-600" />
                  Quy Tắc Xếp Hạng & Chiết Khấu
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                  <li>
                    <strong>1 đơn hoàn thành = 1 điểm:</strong> Càng giao nhiều đơn, cấp bậc càng cao.
                  </li>
                  <li>
                    <strong>Tự động giảm chiết khấu ngay lập tức:</strong> Khi đạt đủ số đơn, hệ thống sẽ tự động hạ mức phí cho các đơn tiếp theo.
                  </li>
                  <li>
                    <strong>Reset chu kỳ tuần:</strong> Đúng 00:00 sáng Thứ Hai hàng tuần, điểm tuần sẽ được đặt lại từ đầu để bắt đầu cuộc đua mới.
                  </li>
                </ul>
              </div>
            </div>

            {/* ===================== CÁC NÚT CHỨC NĂNG & ĐĂNG XUẤT ===================== */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
              <button
                onClick={() => handleShowTerms('TERMS_DRIVER_USAGE', 'Điều khoản sử dụng')}
                className="w-full py-3.5 rounded-xl font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors border-2 border-transparent hover:border-purple-200 flex items-center justify-center gap-2"
              >
                <ScrollText size={18} /> Điều khoản sử dụng
              </button>
              <button
                onClick={() => handleShowTerms('TERMS_DRIVER_PRIVACY', 'Chính sách bảo mật')}
                className="w-full py-3.5 rounded-xl font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border-2 border-transparent hover:border-indigo-200 flex items-center justify-center gap-2"
              >
                <ShieldCheck size={18} /> Chính sách bảo mật
              </button>
              <button
                onClick={() => handleShowTerms('SUPPORT_CONTACT', 'Trung Tâm Hỗ Trợ')}
                className="w-full py-3.5 rounded-xl font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors border-2 border-transparent hover:border-emerald-200 flex items-center justify-center gap-2"
              >
                <Headphones size={18} /> Hỗ trợ / Liên hệ
              </button>
              <button
                onClick={() => setLogoutModal(true)}
                className="w-full py-3.5 rounded-xl font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors border-2 border-transparent hover:border-amber-200 flex items-center justify-center gap-2"
              >
                <LogOut size={18} /> Đăng xuất
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3.5 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors border-2 border-transparent hover:border-red-200 flex items-center justify-center gap-2"
              >
                <Trash2 size={18} /> Yêu cầu Xoá tài khoản
              </button>
            </div>
          </>
        ) : (
          /* Khung sửa thông tin */
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Khu vực chọn Ảnh đại diện mới */}
              <div className="flex flex-col items-center mb-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center mb-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors relative group"
                >
                  {avatarPreview ? (
                    <img
                      src={getFullImageUrl(avatarPreview)}
                      alt="Preview"
                      className="w-full h-full object-cover group-hover:opacity-50 transition-opacity"
                    />
                  ) : (
                    <span className="text-2xl text-slate-400">
                      <Camera size={24} />
                    </span>
                  )}
                  {avatarPreview && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xl text-white">
                      <Camera size={24} />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Đổi ảnh đại diện
                </button>
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Số điện thoại (Tài khoản đăng nhập)
                </label>
                <input
                  type="text"
                  value={driver?.phone || ''}
                  disabled
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Họ và Tên</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phương tiện</label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="motorcycle">Xe máy</option>
                  <option value="bike">Xe đạp</option>
                  <option value="car">Ô tô</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Biển số xe (nếu có)
                </label>
                <input
                  type="text"
                  name="licensePlate"
                  value={formData.licensePlate}
                  onChange={handleChange}
                  placeholder="VD: 59A1-12345"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Số Căn Cước Công Dân (CCCD)
                </label>
                <input
                  type="text"
                  name="cccd"
                  value={formData.cccd}
                  onChange={handleChange}
                  placeholder="Nhập 12 số CCCD"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Số Giấy Phép Lái Xe (GPLX)
                </label>
                <input
                  type="text"
                  name="gplx"
                  value={formData.gplx}
                  onChange={handleChange}
                  placeholder="Nhập số GPLX"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="border-t border-slate-200 my-4 pt-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Mật khẩu mới (Tùy chọn)
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Để trống nếu không muốn đổi"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isUploading}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Trở lại
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center disabled:opacity-50"
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Lưu hồ sơ'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="bottom-nav-safe">
        <div className="mx-auto flex max-w-xl justify-around py-3 bg-white border-t border-slate-200">
          <Link to="/" className="flex flex-col items-center text-slate-400 hover:text-slate-600 transition-colors">
            <HomeIcon size={24} strokeWidth={1.5} />
            <span className="text-xs mt-1 font-medium">Trang chủ</span>
          </Link>
          <Link to="/my-orders" className="flex flex-col items-center text-slate-400 hover:text-slate-600 transition-colors">
            <ClipboardList size={24} strokeWidth={1.5} />
            <span className="text-xs mt-1 font-medium">Đơn của tôi</span>
          </Link>
          <Link to="/earnings" className="flex flex-col items-center text-slate-400 hover:text-slate-600 transition-colors">
            <BarChart3 size={24} strokeWidth={1.5} />
            <span className="text-xs mt-1 font-medium">Thống kê</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center text-slate-800">
            <User size={24} strokeWidth={1.5} />
            <span className="text-xs mt-1 font-bold">Thông tin cá nhân</span>
          </Link>
        </div>
      </div>

      {/* Modal hiện Điều khoản T.X */}
      {showTerms && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl h-[80vh] sm:h-[80vh] flex flex-col overflow-hidden animate-slideUp">
            <div className="bg-purple-600 p-4 shrink-0 flex justify-between items-center text-white relative">
              <h2 className="font-bold text-lg flex items-center gap-2">
                {termsTitle === 'Chính sách bảo mật' ? <ShieldCheck size={20} /> : <ScrollText size={20} />}
                {termsTitle}
              </h2>
              <button
                onClick={() => setShowTerms(false)}
                className="rounded-full bg-black/10 hover:bg-black/20 p-2 border-0 w-8 h-8 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
              {loadingTerms ? (
                <div className="flex justify-center items-center h-full">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : termsData.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-full text-slate-400">
                  <span className="mb-3">
                    <Inbox size={48} strokeWidth={1} />
                  </span>
                  <p className="font-medium">Chưa có điều khoản nào được đăng.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {termsData.map((term) => (
                    <div key={term._id} className="bg-white rounded-2xl p-5 border border-slate-100">
                      <h3 className="font-bold text-lg text-slate-800 mb-2">{term.title}</h3>
                      <div className="text-xs text-slate-400 mb-3 bg-slate-100 inline-block px-2 py-1 rounded">
                        Cập nhật: {new Date(term.updatedAt || term.createdAt).toLocaleDateString('vi-VN')}
                      </div>

                      {term.imageUrl && (
                        <img
                          src={getFullImageUrl(term.imageUrl)}
                          alt="Term Banner"
                          className="w-full rounded-xl mb-3"
                        />
                      )}

                      {term.videoUrl && (
                        <video src={getFullImageUrl(term.videoUrl)} controls className="w-full rounded-xl mb-3" />
                      )}

                      <div className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">
                        {term.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Logout Modal */}
      <ConfirmModal
        isOpen={logoutModal}
        title="Xác nhận đăng xuất"
        message="Phiên làm việc hiện tại của bạn sẽ bị kết thúc. Bạn có chắc chắn muốn thoát ra không?"
        onConfirm={() => {
          setLogoutModal(false);
          logout();
        }}
        onCancel={() => setLogoutModal(false)}
        confirmText="Đăng xuất"
        isDestructive={true}
      />

      {/* Confirm Delete Account Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slideUp text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
              <span className="text-3xl">
                <AlertTriangle size={32} />
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Xoá tài khoản?</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xoá tài khoản? Hành động này sẽ vô hiệu hoá tài khoản của bạn, và bạn sẽ{' '}
              <b>KHÔNG THỂ</b> nhận đơn hàng mới hay tiếp tục sử dụng ứng dụng.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30 flex items-center justify-center disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Đồng ý Xoá'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
