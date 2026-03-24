import React from 'react';

const OrderCard = ({ order, onAccept, onComplete, currentShipperId }) => {
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCall = () => {
    const phone = order.customerPhone;
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const statusBadge = getStatusBadge(order.status);
  const isMyOrder = order.acceptedBy === currentShipperId;
  const canAccept = order.status === 'PENDING';
  const canComplete = order.status === 'ACCEPTED' && isMyOrder;

  return (
    <div className="card mb-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{order.customerName}</h3>
          <p className="text-sm text-gray-500">{order.customerPhone}</p>
        </div>
        <span className={`status-badge ${statusBadge.class}`}>
          {statusBadge.text}
        </span>
      </div>

      {/* Addresses */}
      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <span className="text-orange-500 mt-0.5">📦</span>
          <div className="flex-1">
            <p className="text-xs text-gray-400">Lấy hàng</p>
            <p className="text-sm text-gray-700">{order.pickupAddress}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-green-500 mt-0.5">📍</span>
          <div className="flex-1">
            <p className="text-xs text-gray-400">Giao hàng</p>
            <p className="text-sm text-gray-700">{order.deliveryAddress}</p>
          </div>
        </div>
      </div>

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Items</p>
          <p className="text-sm text-gray-700">{order.items.join(', ')}</p>
        </div>
      )}

      {/* Note */}
      {order.note && (
        <div className="mb-3 text-sm text-gray-600 italic">
          📝 {order.note}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
        <span>{formatDate(order.createdAt)}</span>
        {order.acceptedAt && (
          <span>Nhận lúc: {formatDate(order.acceptedAt)}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {canAccept && (
          <button
            onClick={() => onAccept(order._id)}
            className="btn-primary"
          >
            Nhận đơn
          </button>
        )}
        {canComplete && (
          <button
            onClick={() => onComplete(order._id)}
            className="btn-success"
          >
            Hoàn thành
          </button>
        )}
        {(order.status === 'ACCEPTED' || order.status === 'COMPLETED') && (
          <button
            onClick={handleCall}
            className="btn-secondary"
          >
            📞 Gọi
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderCard;
