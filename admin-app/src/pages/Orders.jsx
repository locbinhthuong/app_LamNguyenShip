import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getOrders, deleteOrder, updateOrder, cancelOrder, cleanupOldOrders, bulkDeleteOrders } from '../services/api';
import EditOrderModal from '../components/EditOrderModal';
import ConfirmModal from '../components/ConfirmModal';
import CancelRecallModal from '../components/CancelRecallModal';

const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;

const STATUS_COLORS = {
  DRAFT: 'bg-slate-500',
  PENDING: 'bg-yellow-500',
  ACCEPTED: 'bg-blue-500',
  PICKED_UP: 'bg-yellow-500',
  DELIVERING: 'bg-blue-600',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-red-500'
};

const STATUS_LABELS = {
  DRAFT: 'Chờ báo giá',
  PENDING: 'Chờ tài xế',
  ACCEPTED: 'Đã nhận',
  PICKED_UP: 'Đã lấy',
  DELIVERING: 'Đang giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy'
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [tabCounts, setTabCounts] = useState({});
  const [editingOrder, setEditingOrder] = useState(null);
  
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [cancelModal, setCancelModal] = useState({ isOpen: false, order: null });
  const [cleanupModal, setCleanupModal] = useState(false);
  const [cleanupStartDate, setCleanupStartDate] = useState('');
  const [cleanupEndDate, setCleanupEndDate] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const [selectedOrders, setSelectedOrders] = useState([]);

  const tabs = [
    { key: '', label: 'Tất cả' },
    { key: 'DRAFT', label: 'Chờ báo giá', color: 'purple' },
    { key: 'SCHEDULED', label: 'Đơn hẹn giờ', color: 'indigo' },
    { key: 'PENDING', label: 'Chờ tài xế', color: 'yellow' },
    { key: 'ACCEPTED', label: 'Đã nhận', color: 'blue' },
    { key: 'PICKED_UP,DELIVERING', label: 'Đang giao', color: 'orange' },
    { key: 'COMPLETED', label: 'Đã hoàn tất', color: 'green' },
    { key: 'CANCELLED', label: 'Đã hủy', color: 'red' },
  ];

  const load = useCallback(async (pageToLoad = 1) => {
    try {
      const params = { page: pageToLoad, limit: 50 };
      if (filter) params.status = filter;
      if (globalSearch) params.search = globalSearch;
      
      const { orders: list, pagination: pageData } = await getOrders(params);
      setOrders(list);
      setSelectedOrders([]); // Reset selection when loading new page
      if (pageData) setPagination(pageData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter, globalSearch]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      load(1);
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Dùng currentPage hiện tại thay vì reset về 1
      setPagination(prev => {
        load(prev.currentPage);
        return prev;
      });
    }, 30000);

    const handleRefresh = () => {
      setPagination(prev => {
        load(prev.currentPage);
        return prev;
      });
    };
    
    window.addEventListener('refresh_admin_orders', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh_admin_orders', handleRefresh);
    };
  }, [load]);

  const openDeleteConfirm = (id) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      data: id,
      title: 'Xóa đơn hàng?',
      message: 'Hành động này sẽ xóa vĩnh viễn đơn hàng khỏi hệ thống. Bạn có chắc chắn không?',
      isDestructive: true
    });
  };

  const openPublishConfirm = (id) => {
    setConfirmModal({
      isOpen: true,
      type: 'publish',
      data: id,
      title: 'Phát lệnh Đăng Đơn?',
      message: 'Sau khi đã cập nhật Phí Giao Hàng, bạn có chắc muốn truyền đơn hàng này tới thiết bị của tất cả tài xế không?',
      isDestructive: false,
      confirmText: '🚀 Đăng đơn'
    });
  };

  const handleConfirmAction = async () => {
    const { type, data } = confirmModal;
    setConfirmModal({ isOpen: false });
    
    if (type === 'delete') {
      try {
        await deleteOrder(data);
        await load();
      } catch (err) {
        alert('Không thể xóa đơn hàng');
      }
    } else if (type === 'publish') {
      try {
        await updateOrder(data, { status: 'PENDING' });
        await load();
      } catch (err) {
        alert('Lỗi đẩy đơn lên chợ');
      }
    }
  };

  const handleCancelAction = async (actionType, reason) => {
    const id = cancelModal.order._id;
    setCancelModal({ isOpen: false, order: null });

    if (actionType === 'CANCELLED') {
      try {
        await cancelOrder(id, reason);
        await load();
      } catch (err) {
        alert('Lỗi hủy đơn');
      }
    } else if (actionType === 'DRAFT') {
      try {
        await updateOrder(id, { status: 'DRAFT' });
        await load();
      } catch (err) {
        alert('Lỗi thu hồi đơn');
      }
    }
  };

  const saveEdit = async (id, updatedData) => {
    try {
      await updateOrder(id, updatedData);
      setEditingOrder(null);
      await load(pagination.currentPage);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      alert(`Lỗi sửa đơn: ${msg}`);
      console.error('Lỗi chi tiết:', err.response?.data || err);
    }
  };

  const handleCleanup = async () => {
    if (!cleanupStartDate || !cleanupEndDate) {
      alert('Vui lòng chọn Từ ngày và Đến ngày');
      return;
    }
    
    try {
      setLoading(true);
      const res = await cleanupOldOrders(cleanupStartDate, cleanupEndDate);
      alert(res.message);
      setCleanupModal(false);
      await load(1);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi dọn dẹp dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o._id));
    }
  };

  const toggleSelectOrder = (id) => {
    if (selectedOrders.includes(id)) {
      setSelectedOrders(selectedOrders.filter(orderId => orderId !== id));
    } else {
      setSelectedOrders([...selectedOrders, id]);
    }
  };

  const handleBulkDelete = () => {
    setConfirmModal({
      isOpen: true,
      type: 'bulk_delete',
      data: selectedOrders,
      title: `Xóa ${selectedOrders.length} đơn hàng?`,
      message: `Hành động này sẽ xóa vĩnh viễn ${selectedOrders.length} đơn hàng đã chọn khỏi hệ thống. Bạn có chắc chắn không?`,
      isDestructive: true
    });
  };

  // Add bulk_delete case to handleConfirmAction
  // Cần ghi đè lại handleConfirmAction
  const enhancedHandleConfirmAction = async () => {
    const { type, data } = confirmModal;
    setConfirmModal({ isOpen: false });
    
    if (type === 'delete') {
      try {
        await deleteOrder(data);
        await load(pagination.currentPage);
      } catch (err) {
        alert('Không thể xóa đơn hàng');
      }
    } else if (type === 'publish') {
      try {
        await updateOrder(data, { status: 'PENDING' });
        await load(pagination.currentPage);
      } catch (err) {
        alert('Lỗi đẩy đơn lên chợ');
      }
    } else if (type === 'bulk_delete') {
      try {
        setLoading(true);
        const res = await bulkDeleteOrders(data);
        alert(res.message);
        setSelectedOrders([]);
        await load(pagination.currentPage);
      } catch (err) {
        alert('Không thể xóa hàng loạt đơn hàng');
      } finally {
        setLoading(false);
      }
    }
  };

  const tabColorMap = {
    slate: 'text-slate-600',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    orange: 'text-blue-600',
    green: 'text-green-400',
    red: 'text-red-400',
  };

  return (
    <div className="p-4 pb-8 sm:p-6">
      {/* Header + Tabs + Search */}
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold text-slate-800 sm:text-2xl">📦 Quản lý Đơn hàng</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-2 sm:mt-0 items-center">
          <input 
            type="text" 
            placeholder="🔍 Tìm Mã đơn, Tên, Số điện thoại..." 
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-full sm:w-64 focus:outline-none focus:border-blue-500"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
          />
          <button 
            onClick={() => setCleanupModal(true)} 
            className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-1.5 text-sm font-bold hover:bg-red-100 transition-colors"
          >
            🧹 Dọn dẹp
          </button>
          <Link to="/orders/create" className="btn-primary shrink-0 text-center text-sm font-bold px-4 py-1.5 rounded-lg">
            + Tạo đơn
          </Link>
        </div>
      </div>
      
      {selectedOrders.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="text-sm font-medium">Đã chọn <span className="font-bold">{selectedOrders.length}</span> đơn hàng.</div>
          <button onClick={handleBulkDelete} className="bg-red-600 text-white px-4 py-1.5 rounded text-sm font-bold shadow hover:bg-red-700 transition">
            🗑️ Xóa các mục đã chọn
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const isActive = filter === tab.key;
          const colorClass = tab.color ? tabColorMap[tab.color] : 'text-slate-600';
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all sm:px-4 sm:py-2 sm:text-sm ${
                isActive
                  ? 'bg-blue-600 text-slate-800'
                  : `bg-white ${colorClass} hover:bg-blue-50 hover:bg-blue-100`
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <p className="mb-2 text-5xl">📦</p>
          <p className="text-sm text-slate-500">Chưa có đơn hàng nào</p>
          <Link to="/orders/create" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Tạo đơn hàng đầu tiên
          </Link>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-0">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="table-th w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={orders.length > 0 && selectedOrders.length === orders.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="table-th">Mã</th>
                  <th className="table-th">Khách hàng</th>
                  <th className="table-th">Lộ trình / Địa chỉ giao</th>
                  <th className="table-th">Tài xế</th>
                  <th className="table-th">Thời gian</th>
                  <th className="table-th">Trạng thái</th>
                  <th className="table-th">PHÍ & THƯỞNG</th>
                  <th className="table-th">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order._id} className={`hover:bg-blue-50/50 ${selectedOrders.includes(order._id) ? 'bg-blue-50' : ''}`}>
                    <td className="table-td text-center border-r border-slate-100">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={selectedOrders.includes(order._id)}
                        onChange={() => toggleSelectOrder(order._id)}
                      />
                    </td>
                    <td className="table-td text-left">
                      <p className="font-mono text-sm font-bold text-blue-600">{order.orderCode || order._id?.slice(-8).toUpperCase()}</p>
                      <div className="mt-1">
                        {order.serviceType === 'DAT_XE' ? (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 whitespace-nowrap">
                            {order.subServiceType === 'XE_OM' ? '🛵 XE ÔM' : order.subServiceType === 'LAI_HO_XE_MAY' ? '🔑 LÁI HỘ (MÁY)' : order.subServiceType === 'LAI_HO_OTO' ? '🚗 LÁI HỘ (ÔTÔ)' : '🛵 ĐẶT XE'}
                          </span>
                        ) : order.serviceType === 'DIEU_PHOI' ? (
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 whitespace-nowrap">
                            {order.subServiceType === 'NAP_TIEN' ? '🏦 NẠP TIỀN' : order.subServiceType === 'RUT_TIEN' ? '💵 RÚT TIỀN' : '🛠️ ĐIỀU PHỐI'}
                          </span>
                        ) : order.serviceType === 'MUA_HO' ? (
                          <span className="text-[10px] font-bold bg-lime-100 text-lime-700 px-1.5 py-0.5 rounded border border-lime-200 whitespace-nowrap">🛒 MUA HỘ</span>
                        ) : (
                          <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200 whitespace-nowrap">📦 GIAO HÀNG</span>
                        )}
                      </div>
                    </td>
                    <td className="table-td">
                      <p className="text-slate-800">{order.customerName}</p>
                      <p className="text-slate-500 text-xs">{order.customerPhone}</p>
                    </td>
                    <td className="table-td max-w-xs text-slate-600 text-xs">
                       {order.serviceType === 'DAT_XE' ? (
                          <div className="flex flex-col gap-1">
                             <div className="flex items-start gap-1"><span className="text-orange-500 font-bold shrink-0">📍 Đón:</span> <span className="truncate">{order.pickupAddress}</span></div>
                             <div className="flex items-start gap-1"><span className="text-blue-500 font-bold shrink-0">🏁 Đến:</span> <span className="truncate">{order.deliveryAddress}</span></div>
                          </div>
                       ) : (
                          <div className="flex flex-col gap-1">
                             <span className="truncate block"><span className="font-bold text-slate-800">Từ:</span> {order.pickupAddress}</span>
                             <span className="truncate block"><span className="font-bold text-slate-800">Đến:</span> {order.deliveryAddress}</span>
                             {(order.packageDetails?.description || order.note) && (
                                <span className="truncate block text-[10px] text-blue-600 font-bold bg-blue-50 rounded px-1 py-0.5 mt-0.5">Mô tả: {order.packageDetails?.description || order.note}</span>
                             )}
                          </div>
                       )}
                    </td>
                    <td className="table-td text-slate-600 text-sm">{order.assignedTo?.name || '—'}</td>
                    <td className="table-td text-[11px] text-slate-500 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div><span className="font-bold text-slate-700">Tạo:</span> {formatTime(order.createdAt)}</div>
                        {order.acceptedAt && <div><span className="font-bold text-primary-600 inline-block text-blue-600">Nhận:</span> {formatTime(order.acceptedAt)}</div>}
                        {order.deliveredAt && <div><span className="font-bold inline-block text-emerald-600">Hoàn thành:</span> {formatTime(order.deliveredAt)}</div>}
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${order.status === 'DRAFT' && order.scheduledPublishAt ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : `text-slate-800 ${STATUS_COLORS[order.status]}`}`}>
                          {order.status === 'DRAFT' && order.scheduledPublishAt ? `⏳ Hẹn: ${formatTime(order.scheduledPublishAt)}` : (STATUS_LABELS[order.status] || order.status)}
                        </span>
                        {order.status === 'PENDING' && order.cancelReason && (
                          <div className="text-[10px] bg-red-500/20 text-red-400 rounded py-0.5 px-1.5 font-medium border border-red-500/30 max-w-[120px] truncate" title={order.cancelReason}>
                            ⚠️ Bị từ chối: {order.cancelReason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-td">
                       <p className="font-bold text-blue-600 text-sm whitespace-nowrap">{order.deliveryFee?.toLocaleString()}đ</p>
                       {(order.kpiBonus > 0 || order.adminBonus > 0) && (
                         <div className="flex flex-col items-start gap-1 mt-1">
                           {order.adminBonus > 0 && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 whitespace-nowrap">+ {order.adminBonus.toLocaleString()}đ (Độc quyền)</span>}
                           {order.kpiBonus > 0 && <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200 whitespace-nowrap">+ {order.kpiBonus.toLocaleString()}đ (KPI)</span>}
                         </div>
                       )}
                    </td>
                    <td className="table-td text-right">
                      <div className="flex items-center gap-3">
                        {order.status !== 'CANCELLED' && (
                          <button onClick={() => setEditingOrder(order)} className="text-sm font-bold text-orange-500 hover:text-orange-600">✏️ Sửa</button>
                        )}
                        {order.status === 'DRAFT' && (
                          <button onClick={() => openPublishConfirm(order._id)} className="text-sm font-bold text-blue-600 hover:text-blue-700">🚀 Treo Lại</button>
                        )}
                        {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && order.status !== 'DRAFT' && (
                          <button onClick={() => setCancelModal({ isOpen: true, order })} className="text-sm font-medium text-blue-600 hover:text-blue-500">🔄 Thu hồi</button>
                        )}
                        <button onClick={() => openDeleteConfirm(order._id)} className="text-sm font-medium text-red-400 hover:text-red-300">🗑️ Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
              <div className="text-sm text-slate-500 hidden sm:block">
                Hiển thị <span className="font-bold">{orders.length}</span> / <span className="font-bold">{pagination.totalItems}</span> đơn hàng
              </div>
              <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <button 
                  disabled={pagination.currentPage <= 1}
                  onClick={() => load(pagination.currentPage - 1)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50"
                >
                  ← Trang trước
                </button>
                <div className="px-4 py-2 text-sm font-bold text-slate-800 bg-slate-100 rounded-lg">
                  {pagination.currentPage} / {pagination.totalPages}
                </div>
                <button 
                  disabled={pagination.currentPage >= pagination.totalPages}
                  onClick={() => load(pagination.currentPage + 1)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50"
                >
                  Trang sau →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tích hợp Modals */}
      <EditOrderModal 
        isOpen={!!editingOrder} 
        order={editingOrder} 
        onClose={() => setEditingOrder(null)} 
        onSave={saveEdit} 
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isDestructive={confirmModal.isDestructive}
        onConfirm={enhancedHandleConfirmAction}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />

      <CancelRecallModal
        isOpen={cancelModal.isOpen}
        order={cancelModal.order}
        onClose={() => setCancelModal({ isOpen: false, order: null })}
        onAction={handleCancelAction}
      />

      {/* Modal dọn dẹp dữ liệu */}
      {cleanupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">🧹 Dọn dẹp dữ liệu cũ</h3>
            <p className="text-sm text-slate-600 mb-4">
              Xóa các đơn hàng <span className="font-bold text-red-600">Đã Hoàn Tất</span> hoặc <span className="font-bold text-red-600">Đã Hủy</span> để giảm tải máy chủ. Không thể khôi phục!
            </p>
            <div className="mb-6 flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Từ ngày:</label>
                <input 
                  type="date"
                  value={cleanupStartDate} 
                  onChange={(e) => setCleanupStartDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Đến ngày:</label>
                <input 
                  type="date"
                  value={cleanupEndDate} 
                  onChange={(e) => setCleanupEndDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setCleanupModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleCleanup}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Tiến hành Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
