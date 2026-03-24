import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getDrivers, deleteDriver, resetDriverPassword } from '../services/api';

const STATUS_COLORS = {
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  banned: 'bg-red-500'
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">🚗 Quản lý Tài Xế</h1>
        <Link to="/drivers/create" className="btn-primary px-6">+ Thêm tài xế</Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tài xế..." className="input-field max-w-xs" />
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === tab.key ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : drivers.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p className="text-5xl mb-4">🚗</p>
          <p>Chưa có tài xế nào</p>
          <Link to="/drivers/create" className="text-orange-400 mt-2 inline-block">Thêm tài xế đầu tiên</Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
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
                    <p className="text-white font-medium">{driver.name}</p>
                    <p className="text-gray-500 text-xs">{driver.phone}</p>
                  </td>
                  <td className="table-td font-mono text-orange-400">{driver.driverCode}</td>
                  <td className="table-td text-gray-300 text-sm">
                    {driver.vehicleType === 'motorcycle' ? '🏍️ Xe máy' : driver.vehicleType === 'car' ? '🚗 Ô tô' : '🚴 Xe đạp'}
                    {driver.licensePlate && <span className="ml-1 text-xs">({driver.licensePlate})</span>}
                  </td>
                  <td className="table-td">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${STATUS_COLORS[driver.status]}`}>
                      {driver.status === 'active' ? '🟢 Hoạt động' : driver.status === 'inactive' ? '⚫ Không hoạt động' : '🔴 Bị khóa'}
                    </span>
                  </td>
                  <td className="table-td text-green-400 font-bold">{driver.stats?.completedOrders || 0}</td>
                  <td className="table-td text-yellow-400">{driver.stats?.rating || 0}⭐</td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      <button onClick={() => handleResetPassword(driver._id, driver.name)} className="text-blue-400 hover:text-blue-300 text-xs">🔑 Reset MK</button>
                      <button onClick={() => handleDelete(driver._id, driver.name)} className="text-red-400 hover:text-red-300 text-xs">🗑️ Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
