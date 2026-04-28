import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getDrivers, deleteDriver, resetDriverPassword, forceOfflineDriver } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import PromptModal from '../components/PromptModal';

import { useAuth } from '../context/AuthContext';

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
  const { admin } = useAuth();

  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [promptModal, setPromptModal] = useState({ isOpen: false });


  const load = useCallback(async () => {
    try {
      const params = {};
      if (filter === 'banned') params.status = 'banned';
      else if (filter === 'online') params.isOnline = 'true';
      else if (filter === 'offline') params.isOnline = 'false';
      if (search) params.search = search;
      const response = await getDrivers(params);
      setDrivers(response.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { 
    load(); 
    
    // Real-time socket for Online/Offline status
    const token = localStorage.getItem('admin_token');
    const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('driver_status_change', (data) => {
      setDrivers(prev => prev.map(d => {
        const targetId = data.driverId || data._id;
        if (d._id === targetId) {
          return { 
            ...d, 
            ...data, 
            isOnline: data.isOnline !== undefined ? data.isOnline : d.isOnline 
          };
        }
        return d;
      }));
    });

    return () => socket.disconnect();
  }, [load]);

  const requestDelete = (id, name) => {
    setConfirmModal({
      ...confirmModal,
      isOpen: true,
      data: id,
      name,
      title: 'Xóa tài khoản?',
      message: `Hành động thao tác xóa đối với tài xế "${name}" là không thể đảo ngược.`
    });
  };

  const handleConfirmDelete = async () => {
    const { data } = confirmModal;
    setConfirmModal({ ...confirmModal, isOpen: false });
    try {
      await deleteDriver(data);
      await load();
    } catch (err) {
      alert('Không thể xóa tài xế');
    }
  };

  const handleForceOffline = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn TẮT trạng thái hoạt động (Ép Offline) tài xế "${name}" không?`)) return;
    try {
      await forceOfflineDriver(id);
      // Socket sẽ tự cập nhật lại danh sách nhưng load luôn cho chắc
      await load();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    }
  };

  const requestResetPassword = (id, name) => {
    setPromptModal({
      isOpen: true,
      data: id,
      name,
      title: 'Khôi phục Mật khẩu',
      message: `Khôi phục tài khoản thủ công cho tài xế "${name}":`,
      placeholder: 'Gõ mật khẩu mới (ít nhất 6 ký tự)..'
    });
  };

  const handlePromptSubmit = async (newPass) => {
    const { data, name } = promptModal;
    if (!newPass || newPass.length < 6) return alert('Mật khẩu chưa đủ 6 ký tự!');
    setPromptModal({ ...promptModal, isOpen: false });
    try {
      await resetDriverPassword(data, newPass);
      alert(`Đã đổi mật khẩu thành công cho tài xế "${name}"!`);
    } catch (err) {
      alert('Không thể đổi mật khẩu, vui lòng thử lại.');
    }
  };

  const tabs = [
    { key: '', label: 'Tất cả' },
    { key: 'online', label: 'Online' },
    { key: 'offline', label: 'Offline' },
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
        <h1 className="text-lg font-bold text-slate-800 sm:text-2xl">🚗 Quản lý Tài Xế</h1>
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
                filter === tab.key ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-blue-50 hover:bg-blue-100'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : drivers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <p className="mb-2 text-5xl">🚗</p>
          <p className="text-sm text-slate-500">Chưa có tài xế nào</p>
          <Link to="/drivers/create" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Thêm tài xế đầu tiên
          </Link>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-0">
          {/* Mobile card list */}
          {drivers.map(driver => (
            <div key={driver._id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:hidden">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                  {driver.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{driver.name}</p>
                  <p className="text-xs text-slate-500">{VEHICLE_EMOJI[driver.vehicleType]} {driver.phone}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {driver.status === 'banned' ? (
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white bg-red-500">
                      🔒 Bị khóa
                    </span>
                  ) : driver.isOnline ? (
                    <span className="shrink-0 rounded-full bg-green-500/20 border border-green-500/50 px-2 py-0.5 text-[10px] font-bold text-green-600">
                      🟢 Online
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-slate-100 border border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      ⚫ Offline
                    </span>
                  )}
                </div>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-blue-50/50 p-2 text-center">
                  <p className="text-sm font-bold text-green-400">{driver.stats?.completedOrders || 0}</p>
                  <p className="text-[10px] text-slate-500">Hoàn thành</p>
                </div>
                <div className="rounded-xl bg-blue-50/50 p-2 text-center">
                  <p className="text-sm font-bold text-blue-600">{driver.driverCode}</p>
                  <p className="text-[10px] text-slate-500">Mã TX</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Link
                  to={`/drivers/${driver._id}`}
                  className="rounded-xl bg-blue-600/10 px-3 py-2 text-xs font-bold text-blue-600 text-center transition-all hover:bg-blue-600/20"
                >
                  👁️ Chi tiết
                </Link>
                
                {driver.isOnline && (
                  <button
                    onClick={() => handleForceOffline(driver._id, driver.name)}
                    className="rounded-xl bg-orange-500/10 px-3 py-2 text-xs font-bold text-orange-600 transition-all hover:bg-orange-500/20"
                  >
                    📴 Tắt Định Vị
                  </button>
                )}
                
                <button
                  onClick={() => requestResetPassword(driver._id, driver.name)}
                  className="rounded-xl bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-400 transition-all hover:bg-blue-500/20"
                >
                  🔑 Reset
                </button>
                
                {admin?.role === 'admin' && (
                  <button
                    onClick={() => requestDelete(driver._id, driver.name)}
                    className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 transition-all hover:bg-red-500/20"
                  >
                    🗑️ Xóa
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white sm:block">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="table-th">Tài xế</th>
                  <th className="table-th">Mã</th>
                  <th className="table-th">Xe</th>
                  <th className="table-th">Trạng thái</th>
                  <th className="table-th">Hoàn thành</th>
                  <th className="table-th">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(driver => (
                  <tr key={driver._id} className="hover:bg-blue-50/50">
                    <td className="table-td">
                      <p className="font-medium text-slate-800">{driver.name}</p>
                      <p className="text-slate-500 text-xs">{driver.phone}</p>
                    </td>
                    <td className="table-td font-mono text-blue-600">{driver.driverCode}</td>
                    <td className="table-td text-slate-600 text-sm">
                      {VEHICLE_EMOJI[driver.vehicleType]}
                      {driver.licensePlate && <span className="ml-1 text-xs">({driver.licensePlate})</span>}
                    </td>
                    <td className="table-td">
                      <div className="flex flex-col items-start gap-1">
                        {driver.status === 'banned' ? (
                          <span className="rounded-full px-2 py-1 text-xs font-bold text-white bg-red-500">
                            🔒 Bị khóa
                          </span>
                        ) : driver.isOnline ? (
                          <span className="rounded-full bg-green-500/20 border border-green-500/50 px-2 py-0.5 text-[10px] font-bold text-green-600">
                            🟢 Online
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 border border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                            ⚫ Offline
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-td font-bold text-green-400">{driver.stats?.completedOrders || 0}</td>
                    <td className="table-td">
                        <div className="flex gap-2 flex-wrap">
                          
                          {driver.isOnline && (
                            <button
                              onClick={() => handleForceOffline(driver._id, driver.name)}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 transition-colors"
                            >
                              📴 Tắt Định Vị
                            </button>
                          )}
                          
                          <button
                            onClick={() => requestResetPassword(driver._id, driver.name)}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          🔑 Reset Pass
                        </button>
                        <Link to={`/drivers/${driver._id}`}
                          className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          🔍 Chi tiết / Sửa
                        </Link>
                        {admin?.role === 'admin' && (
                          <button
                            onClick={() => requestDelete(driver._id, driver.name)}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-50 transition-colors"
                          >
                            🗑️ Xóa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tích hợp Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
      <PromptModal
        isOpen={promptModal.isOpen}
        title={promptModal.title}
        message={promptModal.message}
        placeholder={promptModal.placeholder}
        type="text"
        onSubmit={handlePromptSubmit}
        onCancel={() => setPromptModal({ ...promptModal, isOpen: false })}
      />
      

      
    </div>
  );
}
