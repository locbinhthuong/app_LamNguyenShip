import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getDrivers, deleteDriver, resetDriverPassword } from '../services/api';

const STATUS_COLORS = {
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  banned: 'bg-red-500'
};

const STATUS_LABELS = {
  active: 'Hoạt động',
  inactive: 'Không hoạt động',
  banned: 'Bị khóa'
};

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const params = {};
      if (filter) params.status = filter;
      if (search) params.search = search;
      const response = await getDrivers(params);
      setDrivers(response.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!confirm(`Xóa tài xế "${name}"?`)) return;
    try {
      await deleteDriver(id);
      await load();
    } catch (err) {
      alert('Không thể xóa tài xế');
    }
  };

  const handleResetPassword = async (id, name) => {
    const newPass = prompt(`Reset mật khẩu cho "${name}":\nNhập mật khẩu mới (ít nhất 6 ký tự):`);
    if (!newPass || newPass.length < 6) return;
    try {
      await resetDriverPassword(id, newPass);
      alert(`Đã reset mật khẩu cho "${name}"\nMật khẩu mới: ${newPass}`);
    } catch (err) {
      alert('Không thể reset mật khẩu');
    }
  };

  const tabs = [
    { key: '', label: 'Tất cả' },
    { key: 'active', label: 'Hoạt động' },
    { key: 'inactive', label: 'Không hoạt động' },
    { key: 'banned', label: 'Bị khóa' }
  ];

  const VEHICLE_EMOJI = {
    motorcycle: '🏍️',
    car: '🚗',
    bike: '🚴'
  };

  return (
    <div className="p-4 pb-8 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold text-white sm:text-2xl">🚗 Quản lý Tài Xế</h1>
        <Link to="/drivers/create" className="btn-primary shrink-0 text-center text-sm sm:w-auto sm:px-6 sm:text-base">
          + Thêm tài xế
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm tài xế..."
          className="input-field w-full lg:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all sm:px-4 sm:py-2 sm:text-sm ${
                filter === tab.key ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      ) : drivers.length === 0 ? (
        <div className="rounded-2xl border border-gray-700 bg-gray-800 py-16 text-center">
          <p className="mb-2 text-5xl">🚗</p>
          <p className="text-sm text-gray-500">Chưa có tài xế nào</p>
          <Link to="/drivers/create" className="mt-3 inline-block text-sm text-orange-400 hover:underline">
            Thêm tài xế đầu tiên
          </Link>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-0">
          {/* Mobile card list */}
          {drivers.map(driver => (
            <div key={driver._id} className="rounded-2xl border border-gray-700 bg-gray-800 p-4 sm:hidden">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500 font-bold text-white">
                  {driver.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{driver.name}</p>
                  <p className="text-xs text-gray-400">{VEHICLE_EMOJI[driver.vehicleType]} {driver.phone}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${STATUS_COLORS[driver.status]}`}>
                  {STATUS_LABELS[driver.status]}
                </span>
              </div>
              <div className="mb-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-gray-700/50 p-2 text-center">
                  <p className="text-sm font-bold text-green-400">{driver.stats?.completedOrders || 0}</p>
                  <p className="text-[10px] text-gray-400">Hoàn thành</p>
                </div>
                <div className="rounded-xl bg-gray-700/50 p-2 text-center">
                  <p className="text-sm font-bold text-yellow-400">{driver.stats?.rating || 0}⭐</p>
                  <p className="text-[10px] text-gray-400">Đánh giá</p>
                </div>
                <div className="rounded-xl bg-gray-700/50 p-2 text-center">
                  <p className="text-sm font-bold text-orange-400">{driver.driverCode}</p>
                  <p className="text-[10px] text-gray-400">Mã TX</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleResetPassword(driver._id, driver.name)}
                  className="flex-1 rounded-xl bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-400 transition-all hover:bg-blue-500/20"
                >
                  🔑 Reset MK
                </button>
                <button
                  onClick={() => handleDelete(driver._id, driver.name)}
                  className="flex-1 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 transition-all hover:bg-red-500/20"
                >
                  🗑️ Xóa
                </button>
              </div>
            </div>
          ))}

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-gray-700 bg-gray-800 sm:block">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="table-th">Tài xế</th>
                  <th className="table-th">Mã</th>
                  <th className="table-th">Xe</th>
                  <th className="table-th">Trạng thái</th>
                  <th className="table-th">Hoàn thành</th>
                  <th className="table-th">Đánh giá</th>
                  <th className="table-th">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(driver => (
                  <tr key={driver._id} className="hover:bg-gray-700/50">
                    <td className="table-td">
                      <p className="font-medium text-white">{driver.name}</p>
                      <p className="text-gray-500 text-xs">{driver.phone}</p>
                    </td>
                    <td className="table-td font-mono text-orange-400">{driver.driverCode}</td>
                    <td className="table-td text-gray-300 text-sm">
                      {VEHICLE_EMOJI[driver.vehicleType]}
                      {driver.licensePlate && <span className="ml-1 text-xs">({driver.licensePlate})</span>}
                    </td>
                    <td className="table-td">
                      <span className={`rounded-full px-2 py-1 text-xs font-bold text-white ${STATUS_COLORS[driver.status]}`}>
                        {STATUS_LABELS[driver.status]}
                      </span>
                    </td>
                    <td className="table-td font-bold text-green-400">{driver.stats?.completedOrders || 0}</td>
                    <td className="table-td text-yellow-400">{driver.stats?.rating || 0}⭐</td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        <button onClick={() => handleResetPassword(driver._id, driver.name)} className="text-xs text-blue-400 hover:text-blue-300">🔑 Reset MK</button>
                        <button onClick={() => handleDelete(driver._id, driver.name)} className="text-xs text-red-400 hover:text-red-300">🗑️ Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
