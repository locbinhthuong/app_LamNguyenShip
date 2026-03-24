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

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const params = filter ? { status: filter } : {};
      const response = await getOrders(params);
      setOrders(response.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); const interval = setInterval(load, 10000); return () => clearInterval(interval); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('Xóa đơn hàng này?')) return;
    try {
      await deleteOrder(id);
      await load();
    } catch (err) {
      alert('Không thể xóa đơn hàng');
    }
  };

  const tabs = [
    { key: '', label: 'Tất cả' },
    { key: 'PENDING', label: 'Chờ nhận' },
    { key: 'ACCEPTED', label: 'Đã nhận' },
    { key: 'COMPLETED', label: 'Hoàn thành' },
    { key: 'CANCELLED', label: 'Đã hủy' }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">📦 Quản lý Đơn hàng</h1>
        <Link to="/orders/create" className="btn-primary px-6">+ Tạo đơn</Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              filter === tab.key ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p className="text-5xl mb-4">📦</p>
          <p>Chưa có đơn hàng nào</p>
          <Link to="/orders/create" className="text-orange-400 mt-2 inline-block">Tạo đơn hàng đầu tiên</Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
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
                  <td className="table-td text-gray-300 text-xs max-w-xs truncate">{order.deliveryAddress}</td>
                  <td className="table-td text-gray-300 text-sm">{order.assignedTo?.name || '—'}</td>
                  <td className="table-td">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="table-td text-orange-400 font-bold">{order.codAmount?.toLocaleString()}đ</td>
                  <td className="table-td">
                    <button onClick={() => handleDelete(order._id)} className="text-red-400 hover:text-red-300 text-sm">🗑️ Xóa</button>
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
