import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { driver, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 pt-12 text-center">
        <div className="w-20 h-20 bg-white/20 rounded-full mx-auto flex items-center justify-center mb-3">
          <span className="text-4xl">👤</span>
        </div>
        <h1 className="text-xl font-bold text-white">{driver?.name}</h1>
        <p className="text-blue-200 text-sm">{driver?.phone}</p>
        <span className="inline-block mt-2 bg-white/20 px-3 py-1 rounded-full text-white text-xs font-bold">
          🚗 {driver?.vehicleType === 'motorcycle' ? 'Xe máy' : driver?.vehicleType === 'car' ? 'Ô tô' : 'Xe đạp'}
          {driver?.licensePlate && ` • ${driver.licensePlate}`}
        </span>
      </div>

      {/* Stats */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800 rounded-2xl p-4 text-center border border-slate-700">
            <p className="text-2xl font-bold text-green-400">{driver?.stats?.completedOrders || 0}</p>
            <p className="text-slate-400 text-xs mt-1">Hoàn thành</p>
          </div>
          <div className="bg-slate-800 rounded-2xl p-4 text-center border border-slate-700">
            <p className="text-2xl font-bold text-yellow-400">{driver?.stats?.rating || 0}⭐</p>
            <p className="text-slate-400 text-xs mt-1">Đánh giá</p>
          </div>
          <div className="bg-slate-800 rounded-2xl p-4 text-center border border-slate-700">
            <p className="text-2xl font-bold text-blue-400">{driver?.completionRate || 0}%</p>
            <p className="text-slate-400 text-xs mt-1">Tỷ lệ</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="p-4 space-y-3">
        <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
          <div className="p-4 flex justify-between items-center border-b border-slate-700">
            <span className="text-white">Mã tài xế</span>
            <span className="text-blue-400 font-bold">{driver?.driverCode}</span>
          </div>
          <div className="p-4 flex justify-between items-center border-b border-slate-700">
            <span className="text-white">Biển số xe</span>
            <span className="text-slate-300">{driver?.licensePlate || 'Chưa cập nhật'}</span>
          </div>
          <div className="p-4 flex justify-between items-center">
            <span className="text-white">Trạng thái</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              driver?.isOnline ? 'bg-green-500 text-white' : 'bg-slate-600 text-slate-300'
            }`}>
              {driver?.isOnline ? '🟢 Online' : '⚫ Offline'}
            </span>
          </div>
        </div>

        <button
          onClick={() => { if (confirm('Đăng xuất?')) logout(); }}
          className="w-full bg-red-500/20 text-red-400 py-4 rounded-2xl font-bold border border-red-500/30"
        >
          🚪 Đăng xuất
        </button>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 max-w-[430px] mx-auto">
        <div className="flex justify-around py-3">
          <Link to="/" className="flex flex-col items-center text-slate-400">
            <span className="text-xl">🏠</span>
            <span className="text-xs mt-1">Trang chủ</span>
          </Link>
          <Link to="/my-orders" className="flex flex-col items-center text-slate-400">
            <span className="text-xl">📋</span>
            <span className="text-xs mt-1">Đơn của tôi</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center text-blue-400">
            <span className="text-xl">👤</span>
            <span className="text-xs mt-1">Cá nhân</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
