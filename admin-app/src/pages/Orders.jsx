import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getOrders, deleteOrder, updateOrder, cancelOrder } from '../services/api';
import EditOrderModal from '../components/EditOrderModal';
import ConfirmModal from '../components/ConfirmModal';
import CancelRecallModal from '../components/CancelRecallModal';
import { io } from 'socket.io-client';

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

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [tabCounts, setTabCounts] = useState({});
  const [editingOrder, setEditingOrder] = useState(null);
  
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [cancelModal, setCancelModal] = useState({ isOpen: false, order: null });

  const tabs = [
    { key: '', label: 'Tất cả' },
    { key: 'DRAFT', label: 'Chờ báo giá', color: 'purple' },
    { key: 'PENDING', label: 'Chờ tài xế', color: 'yellow' },
    { key: 'ACCEPTED', label: 'Đã nhận', color: 'blue' },
    { key: 'PICKED_UP,DELIVERING', label: 'Đang giao', color: 'orange' },
    { key: 'COMPLETED', label: 'Đã hoàn tất', color: 'green' },
    { key: 'CANCELLED', label: 'Đã hủy', color: 'red' },
  ];

  const load = useCallback(async () => {
    try {
      const params = filter ? { status: filter } : {};
      const { orders: list } = await getOrders(params);
      setOrders(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    load();
    const interval = setInterval(load, 30000); // Tăng lên 30s vì đã có Realtime

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('new_order', load);
    socket.on('order_accepted', load);
    socket.on('order_picked_up', load);
    socket.on('order_delivering', load);
    socket.on('order_completed', load);
    socket.on('order_cancelled', load);
    socket.on('order_updated', load);

    return () => {
      clearInterval(interval);
      socket.disconnect();
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
      await load();
    } catch (err) {
      alert('Lỗi sửa đơn');
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
      {/* Header + Tabs */}
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold text-slate-800 sm:text-2xl">📦 Quản lý Đơn hàng</h1>
        <Link to="/orders/create" className="btn-primary shrink-0 text-center text-sm sm:w-auto sm:px-6 sm:text-base">
          + Tạo đơn
        </Link>
      </div>

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
          {orders.map(order => (
            <div key={order._id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:hidden">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="font-mono text-sm font-bold text-blue-600">
                  #{order.orderCode || order._id?.slice(-8).toUpperCase()}
                </p>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-800 ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
              </div>
              {order.status === 'PENDING' && order.cancelReason && (
                <div className="mb-2 bg-red-500/20 text-red-400 rounded-md py-1 px-2 text-xs font-medium border border-red-500/30">
                  ⚠️ Bị từ chối: {order.cancelReason}
                </div>
              )}
              <p className="mb-1 text-sm font-medium text-slate-800">{order.customerName}</p>
              <p className="mb-1 text-xs text-slate-500">{order.customerPhone}</p>
              <p className="mb-2 truncate text-xs text-slate-500">{order.deliveryAddress}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <p className="text-sm font-bold text-blue-600 mr-auto">Phí giao: {order.deliveryFee?.toLocaleString()}đ</p>
                {(order.status === 'DRAFT' || order.status === 'COMPLETED') && (
                  <button onClick={() => setEditingOrder(order)} className="rounded-lg bg-orange-100 px-2 py-1 text-xs font-bold text-orange-600 hover:bg-orange-200">
                    ✏️ Sửa
                  </button>
                )}
                {order.status === 'DRAFT' && (
                  <button onClick={() => openPublishConfirm(order._id)} className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-bold text-white hover:bg-blue-700 shadow shadow-blue-500/30">
                    🚀 Tiếp tục treo
                  </button>
                )}
                {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && order.status !== 'DRAFT' && (
                  <button onClick={() => setCancelModal({ isOpen: true, order })} className="rounded-lg bg-blue-600/10 px-2 py-1 text-xs text-blue-600 hover:bg-blue-600/20">
                    🔄 Thu hồi
                  </button>
                )}
                <button
                  onClick={() => openDeleteConfirm(order._id)}
                  className="rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                >
                  🗑️ Xóa
                </button>
              </div>
            </div>
          ))}

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white sm:block">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="table-th">Mã</th>
                  <th className="table-th">Khách hàng</th>
                  <th className="table-th">Địa chỉ giao</th>
                  <th className="table-th">Tài xế</th>
                  <th className="table-th">Trạng thái</th>
                  <th className="table-th">PHÍ GIAO HÀNG</th>
                  <th className="table-th">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order._id} className="hover:bg-blue-50/50">
                    <td className="table-td font-mono text-blue-600">{order.orderCode || order._id?.slice(-8).toUpperCase()}</td>
                    <td className="table-td">
                      <p className="text-slate-800">{order.customerName}</p>
                      <p className="text-slate-500 text-xs">{order.customerPhone}</p>
                    </td>
                    <td className="table-td max-w-xs truncate text-slate-600 text-xs">{order.deliveryAddress}</td>
                    <td className="table-td text-slate-600 text-sm">{order.assignedTo?.name || '—'}</td>
                    <td className="table-td">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold text-slate-800 ${STATUS_COLORS[order.status]}`}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                        {order.status === 'PENDING' && order.cancelReason && (
                          <div className="text-[10px] bg-red-500/20 text-red-400 rounded py-0.5 px-1.5 font-medium border border-red-500/30 max-w-[120px] truncate" title={order.cancelReason}>
                            ⚠️ Bị từ chối: {order.cancelReason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-td font-bold text-blue-600">{order.deliveryFee?.toLocaleString()}đ</td>
                    <td className="table-td text-right">
                      <div className="flex items-center gap-3">
                        {(order.status === 'DRAFT' || order.status === 'COMPLETED') && (
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
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />

      <CancelRecallModal
        isOpen={cancelModal.isOpen}
        order={cancelModal.order}
        onClose={() => setCancelModal({ isOpen: false, order: null })}
        onAction={handleCancelAction}
      />
    </div>
  );
}
