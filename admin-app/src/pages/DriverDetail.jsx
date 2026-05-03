import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getDriverById, updateDriver, getDriverStatsAdmin, uploadDriverAvatar, getFullImageUrl } from '../services/api';

const STATUS_COLORS = {
  active: 'bg-green-500 text-slate-800',
  inactive: 'bg-gray-500 text-slate-800',
  banned: 'bg-red-500 text-slate-800',
};

const STATUS_LABELS = {
  active: 'Hoạt động',
  inactive: 'Tạm nghỉ',
  banned: 'BỊ KHOÁ',
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

export default function DriverDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [driver, setDriver] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Popup Sửa thông tin
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', vehicleType: '', licensePlate: '', avatar: '', commissionRate: 15 });
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [drRes, stRes] = await Promise.all([
        getDriverById(id),
        getDriverStatsAdmin(id)
      ]);
      setDriver(drRes.data);
      setStats(stRes.data);
      setEditForm({
        name: drRes.data.name || '',
        vehicleType: drRes.data.vehicleType || 'motorcycle',
        licensePlate: drRes.data.licensePlate || '',
        commissionRate: drRes.data.commissionRate || 15,
        avatar: drRes.data.avatar || '',
        cccd: drRes.data.cccd || '',
        gplx: drRes.data.gplx || ''
      });
      setAvatarPreview(drRes.data.avatar || null);
      setAvatarFile(null);
    } catch (err) {
      console.error(err);
      alert('Lỗi tải dữ liệu tài xế');
      navigate('/drivers');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleBan = async () => {
    if (!driver) return;
    const isBanning = driver.status !== 'banned';
    const confirmMsg = isBanning 
      ? 'KHOÁ TÀI KHOẢN này? Tài xế sẽ KHÔNG THỂ đăng nhập và chạy đơn được nữa!' 
      : 'Bỏ khoá tài khoản này?';
      
    if (!window.confirm(confirmMsg)) return;

    try {
      await updateDriver(id, { status: isBanning ? 'banned' : 'active' });
      alert(isBanning ? 'Đã khoá tài khoản!' : 'Đã mở khoá tài khoản!');
      loadData();
    } catch (err) {
      alert('Lỗi cập nhật trạng thái');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) return alert('Chọn file hình ảnh');
      if (file.size > 5 * 1024 * 1024) return alert('Kích thước ảnh ≤ 5MB');
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    let finalAvatarUrl = editForm.avatar;
    try {
      if (avatarFile) {
        const upRes = await uploadDriverAvatar(avatarFile);
        if (upRes.success && upRes.data?.url) {
          finalAvatarUrl = upRes.data.url;
        }
      }
      const submitData = { ...editForm, avatar: finalAvatarUrl };
      await updateDriver(id, submitData);
      alert('Cập nhật thành công!');
      setShowEdit(false);
      loadData();
    } catch (err) {
      alert('Cập nhật thất bại');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!driver || !stats) return null;

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 pb-20">
      {/* Nút Quay Lại */}
      <Link to="/drivers" className="mb-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500">
        ← Trở về Danh sách
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CỘT TRÁI: THÔNG TIN CƠ BẢN */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg relative overflow-hidden">
            {driver.status === 'banned' && (
               <div className="absolute top-4 right-[-35px] bg-red-600 text-white text-xs font-bold py-1 px-10 rotate-45 shadow-md">
                 BANNED
               </div>
            )}
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-600/20 text-4xl shadow-inner border border-blue-600/30">
              {driver.avatar ? <img src={getFullImageUrl(driver.avatar)} alt="Avatar" className="rounded-full w-full h-full object-cover" /> : '👤'}
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">{driver.name}</h2>
            <p className="text-blue-600 font-mono text-sm mb-3">{driver.phone}</p>
            
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLORS[driver.status]}`}>
              {STATUS_LABELS[driver.status]}
            </span>

            <div className="mt-6 border-t border-slate-200 pt-4 text-left text-sm space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Biển số:</span>
                <span className="text-slate-800 font-medium">{driver.licensePlate || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mức chiết khấu:</span>
                <span className="text-slate-800 font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">{driver.commissionRate || 15}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Loại xe:</span>
                <span className="text-slate-800 font-medium capitalize">{driver.vehicleType || 'Motorcycle'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số CCCD:</span>
                <span className="text-slate-800 font-medium">{driver.cccd || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số GPLX:</span>
                <span className="text-slate-800 font-medium">{driver.gplx || '—'}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button onClick={() => setShowEdit(true)} className="w-full rounded-xl bg-blue-50 hover:bg-blue-100 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-blue-200">
                ✏️ Sửa Thông Tin
              </button>
              
              <button 
                onClick={handleToggleBan} 
                className={`w-full rounded-xl py-2.5 text-sm font-bold transition shadow-lg ${
                  driver.status === 'banned' 
                    ? 'bg-green-600 text-white hover:bg-green-500 hover:shadow-green-500/20' 
                    : 'bg-red-600 text-white hover:bg-red-500 hover:shadow-red-500/20'
                }`}
              >
                {driver.status === 'banned' ? '🔓 MỞ KHOÁ TÀI KHOẢN' : '🔒 KHOÁ TÀI KHOẢN'}
              </button>
            </div>
          </div>
          
          {/* Cảnh báo Giam Tiền */}
          <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-5 shadow-xl">
             <h3 className="text-sm font-bold text-red-400 mb-1">Công nợ Phát Sinh Hôm Nay (15%)</h3>
             <p className="text-3xl font-black text-red-500 ">{formatCurrency(stats.totalDebt)}</p>
             <p className="text-xs text-red-400/80 mt-2 font-medium">Khoản này cần thu cuối ngày để đối soát.</p>
          </div>
        </div>

        {/* CỘT PHẢI: BÁO CÁO DOANH THU & ĐƠN */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>📊</span> Báo Cáo Hiệu Suất (Phí Vận Chuyển)
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white p-4 border border-slate-200">
               <p className="text-xs text-slate-500 mb-1">Hôm Nay</p>
               <p className="text-lg font-bold text-sky-600">{formatCurrency(stats.todayRevenue)}</p>
               <p className="text-[10px] text-slate-500 mt-1">{stats.todayOrders} đơn</p>
            </div>
            <div className="rounded-xl bg-white p-4 border border-slate-200">
               <p className="text-xs text-slate-500 mb-1">Tuần Này</p>
               <p className="text-lg font-bold text-sky-600">{formatCurrency(stats.weeklyRevenue)}</p>
            </div>
            <div className="rounded-xl bg-white p-4 border border-slate-200">
               <p className="text-xs text-slate-500 mb-1">Tháng Này</p>
               <p className="text-lg font-bold text-sky-600">{formatCurrency(stats.monthlyRevenue)}</p>
            </div>
            <div className="rounded-xl bg-white p-4 border border-slate-200">
               <p className="text-xs text-slate-500 mb-1">Tổng Lịch Sử</p>
               <p className="text-lg font-bold text-sky-600">{formatCurrency(stats.totalRevenue)}</p>
               <p className="text-[10px] text-slate-500 mt-1">{stats.totalOrders} đơn</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xl mt-6">
            <div className="bg-slate-50/50 p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Lịch sử {stats.recentOrders?.length || 0} Đơn Hàng Hoàn Thành Gần Đây</h3>
            </div>
            {stats.recentOrders?.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Tài xế chưa hoàn thành đơn nào.</div>
            ) : (
              <>
              {/* MOBILE VIEW LỊCH SỬ ĐƠN (CARDS) */}
              <div className="grid grid-cols-1 gap-3 p-4 sm:hidden">
                {stats.recentOrders.map(order => (
                  <div key={order.id} className="bg-white border text-sm border-slate-200 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                       <span className="font-mono font-bold text-blue-600 truncate">#{order.orderCode}</span>
                       <span className="font-bold text-sky-600">+{formatCurrency(order.deliveryFee)}</span>
                    </div>
                    <div>
                       <span className="text-xs text-slate-500 block uppercase font-semibold">Khách Hàng</span>
                       <span className="font-bold text-slate-800">{order.customerName}</span>
                    </div>
                    <div className="text-left">
                       <span className="text-xs text-slate-500 block uppercase font-semibold">Hoàn Thành Lúc</span>
                       <span className="text-sm font-medium text-slate-600">{new Date(order.date).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP VIEW LỊCH SỬ ĐƠN (TABLE) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-white/80 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Mã Đơn</th>
                      <th className="px-4 py-3">Khách Hàng</th>
                      <th className="px-4 py-3 text-right">Phí Giao</th>
                      <th className="px-4 py-3 text-right">Hoàn Thành Lúc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {stats.recentOrders.map(order => (
                      <tr key={order.id} className="hover:bg-blue-50 hover:bg-blue-100/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-blue-600">#{order.orderCode}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{order.customerName}</td>
                        <td className="px-4 py-3 text-right font-bold text-sky-600">+{formatCurrency(order.deliveryFee)}</td>
                        <td className="px-4 py-3 text-right text-xs text-slate-500">
                           {new Date(order.date).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Modal Sửa Thông Tin */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-slate-800 text-center">Chỉnh sửa hồ sơ</h3>
            <form onSubmit={handleUpdateInfo} className="space-y-4">
              
              {/* Khu vực chọn Ảnh đại diện mới */}
              <div className="flex flex-col items-center mb-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center mb-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors relative group"
                >
                  {avatarPreview ? (
                    <img src={getFullImageUrl(avatarPreview)} alt="Preview" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                  ) : (
                    <span className="text-2xl text-slate-400">📷</span>
                  )}
                  {avatarPreview && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xl">
                      📷
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
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Tên bác tài</label>
                <input 
                  required
                  type="text" 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-blue-50 hover:bg-blue-100 p-3 text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Biển số xe (nếu có)</label>
                <input 
                  type="text" 
                  value={editForm.licensePlate} 
                  onChange={e => setEditForm({...editForm, licensePlate: e.target.value})}
                  placeholder="51H-12345"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-blue-50 hover:bg-blue-100 p-3 text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Số Căn Cước Công Dân (CCCD)</label>
                <input 
                  type="text" 
                  value={editForm.cccd} 
                  onChange={e => setEditForm({...editForm, cccd: e.target.value})}
                  placeholder="Nhập 12 số CCCD"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-blue-50 hover:bg-blue-100 p-3 text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Số Giấy Phép Lái Xe (GPLX)</label>
                <input 
                  type="text" 
                  value={editForm.gplx} 
                  onChange={e => setEditForm({...editForm, gplx: e.target.value})}
                  placeholder="Nhập số GPLX"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-blue-50 hover:bg-blue-100 p-3 text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Phương Tiện</label>
                <select 
                  value={editForm.vehicleType} 
                  onChange={e => setEditForm({...editForm, vehicleType: e.target.value})}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-blue-50 hover:bg-blue-100 p-3 text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="motorcycle">Xe Máy (Motorcycle)</option>
                  <option value="car">Ô Tô (Car)</option>
                  <option value="bike">Xe Đạp (Bike)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Mức chiết khấu (%)</label>
                <select 
                  value={editForm.commissionRate} 
                  onChange={e => setEditForm({...editForm, commissionRate: Number(e.target.value)})}
                  className="mt-1 w-full rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 p-3 text-sky-800 font-bold focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
                >
                  <option value={15}>15% (Tiêu chuẩn)</option>
                  <option value={20}>20% (Cao cấp)</option>
                </select>
              </div>
              <div className="mt-6 flex gap-3 pt-2">
                <button type="button" disabled={isUploading} onClick={() => setShowEdit(false)} className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 py-3 font-bold text-slate-600 transition-colors disabled:opacity-50">
                  Trở lại
                </button>
                <button type="submit" disabled={isUploading} className="flex-1 rounded-xl bg-blue-600 py-3 flex items-center justify-center font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-colors disabled:opacity-50">
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Lưu hồ sơ'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
