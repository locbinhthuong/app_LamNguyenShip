import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getOrders, deleteOrder } from '../services/api';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-500',
  ACCEPTED: 'bg-blue-500',
  PICKED_UP: 'bg-yellow-500',
  DELIVERING: 'bg-orange-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-red-500'
};

const STATUS_LABELS = {
  PENDING: 'Đang xử lí',
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

  const tabs = [
    { key: '', label: 'Tất cả' },
    { key: 'PENDING', label: 'Đang xử lí', color: 'yellow' },
    { key: 'ACCEPTED', label: 'Đã có tài xế nhận', color: 'blue' },
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
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('Xóa đơn hàng này?')) return;
    try {
      await deleteOrder(id);
      await load();
    } catch (err) {
      alert('Không thể xóa đơn hàng');
    }
  };

  const tabColorMap = {
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    orange: 'text-orange-400',
    green: 'text-green-400',
    red: 'text-red-400',
  };

  return (
    <div className="p-4 pb-8 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold text-white sm:text-2xl">📦 Quản lý Đơn hàng</h1>
        <Link to="/orders/create" className="btn-primary shrink-0 text-center text-sm sm:w-auto sm:px-6 sm:text-base">
          + Tạo đơn
        </Link>
      </div>

      {/* Header + Tabs */}
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold text-white sm:text-2xl">📦 Quản lý Đơn hàng</h1>
        <Link to="/orders/create" className="btn-primary shrink-0 text-center text-sm sm:w-auto sm:px-6 sm:text-base">
          + Tạo đơn
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const isActive = filter === tab.key;
          const colorClass = tab.color ? tabColorMap[tab.color] : 'text-gray-300';
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all sm:px-4 sm:py-2 sm:text-sm ${
                isActive
                  ? 'bg-orange-500 text-white'
                  : `bg-gray-800 ${colorClass} hover:bg-gray-700`
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
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-700 bg-gray-800 py-16 text-center">
          <p className="mb-2 text-5xl">📦</p>
          <p className="text-sm text-gray-500">Chưa có đơn hàng nào</p>
          <Link to="/orders/create" className="mt-3 inline-block text-sm text-orange-400 hover:underline">
            Tạo đơn hàng đầu tiên
          </Link>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-0">
          {orders.map(order => (
            <div key={order._id} className="rounded-2xl border border-gray-700 bg-gray-800 p-4 sm:hidden">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="font-mono text-sm font-bold text-orange-400">
                  #{order.orderCode || order._id?.slice(-8).toUpperCase()}
                </p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${STATUS_COLORS[order.status]}`}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
              <p className="mb-1 text-sm font-medium text-white">{order.customerName}</p>
              <p className="mb-1 text-xs text-gray-400">{order.customerPhone}</p>
              <p className="mb-2 truncate text-xs text-gray-500">{order.deliveryAddress}</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-orange-400">{order.codAmount?.toLocaleString()}đ</p>
                <button
                  onClick={() => handleDelete(order._id)}
                  className="rounded-lg px-3 py-1 text-xs text-red-400 hover:bg-red-500/10"
                >
                  🗑️ Xóa
                </button>
              </div>
            </div>
          ))}

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-gray-700 bg-gray-800 sm:block">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="table-th">Mã</th>
                  <th className="table-th">Khách hàng</th>
                  <th className="table-th">Địa chỉ giao</th>
                  <th className="table-th">Tài xế</th>
                  <th className="table-th">Trạng thái</th>
                  <th className="table-th">COD</th>
                  <th className="table-th">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order._id} className="hover:bg-gray-700/50">
                    <td className="table-td font-mono text-orange-400">{order.orderCode || order._id?.slice(-8).toUpperCase()}</td>
                    <td className="table-td">
                      <p className="text-white">{order.customerName}</p>
                      <p className="text-gray-500 text-xs">{order.customerPhone}</p>
                    </td>
                    <td className="table-td max-w-xs truncate text-gray-300 text-xs">{order.deliveryAddress}</td>
                    <td className="table-td text-gray-300 text-sm">{order.assignedTo?.name || '—'}</td>
                    <td className="table-td">
                      <span className={`rounded-full px-2 py-1 text-xs font-bold text-white ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="table-td font-bold text-orange-400">{order.codAmount?.toLocaleString()}đ</td>
                    <td className="table-td">
                      <button onClick={() => handleDelete(order._id)} className="text-sm text-red-400 hover:text-red-300">🗑️ Xóa</button>
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
