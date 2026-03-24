import React, { useState, useEffect, useCallback } from 'react';
import { getOrders, createOrder } from '../services/api';

const Admin = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    pickupAddress: '',
    deliveryAddress: '',
    items: '',
    note: '',
  });

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getOrders();
      setOrders(response.data || []);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerPhone || !formData.pickupAddress || !formData.deliveryAddress) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const itemsArray = formData.items
        ? formData.items.split(',').map((item) => item.trim()).filter(Boolean)
        : [];

      const orderData = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        pickupAddress: formData.pickupAddress,
        deliveryAddress: formData.deliveryAddress,
        items: itemsArray,
        note: formData.note,
      };

      await createOrder(orderData);
      
      setSuccess('Tạo đơn hàng thành công!');
      setFormData({
        customerName: '',
        customerPhone: '',
        pickupAddress: '',
        deliveryAddress: '',
        items: '',
        note: '',
      });
      
      await loadOrders();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error creating order:', err);
      setError(err.message || 'Không thể tạo đơn hàng');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return { class: 'status-pending', text: '⏳ Chờ nhận' };
      case 'ACCEPTED':
        return { class: 'status-accepted', text: '🚚 Đã nhận' };
      case 'COMPLETED':
        return { class: 'status-completed', text: '✅ Hoàn thành' };
      case 'CANCELLED':
        return { class: 'status-cancelled', text: '❌ Đã hủy' };
      default:
        return { class: '', text: status };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4 pt-8">
        <h1 className="text-xl font-bold">⚙️ Admin Panel</h1>
        <p className="text-sm opacity-80">Tạo và quản lý đơn hàng</p>
      </div>

      {/* Create Order Form */}
      <div className="p-4">
        <div className="card mb-4">
          <h2 className="font-bold text-lg mb-4">📝 Tạo đơn hàng mới</h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên khách hàng *
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0909123456"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa chỉ lấy hàng *
                </label>
                <input
                  type="text"
                  name="pickupAddress"
                  value={formData.pickupAddress}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="123 Nguyễn Trãi, Quận 1, TP.HCM"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa chỉ giao hàng *
                </label>
                <input
                  type="text"
                  name="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="456 Lê Lợi, Quận 1, TP.HCM"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Items (phân cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  name="items"
                  value={formData.items}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="2x Bánh mì, 1x Trà sữa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  className="input-field resize-none"
                  rows="3"
                  placeholder="Giao nhanh giúp em..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary mt-6"
            >
              {submitting ? 'Đang tạo...' : 'Tạo đơn hàng'}
            </button>
          </form>
        </div>

        {/* Orders List */}
        <div className="card">
          <h2 className="font-bold text-lg mb-4">📋 Danh sách đơn hàng</h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : orders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Chưa có đơn hàng nào</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const statusBadge = getStatusBadge(order.status);
                return (
                  <div
                    key={order._id}
                    className="border border-gray-200 rounded-xl p-3"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {order.customerName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.customerPhone}
                        </p>
                      </div>
                      <span
                        className={`status-badge ${statusBadge.class}`}
                      >
                        {statusBadge.text}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      📦 {order.pickupAddress}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      📍 {order.deliveryAddress}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
