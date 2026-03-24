import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrderById, acceptOrder, pickedUpOrder, deliveringOrder, completeOrder, cancelOrder } from '../services/api';

const STATUS_STEPS = ['ACCEPTED', 'PICKED_UP', 'DELIVERING', 'COMPLETED'];
const STATUS_LABELS = {
  PENDING: 'Chờ nhận',
  ACCEPTED: 'Đã nhận',
  PICKED_UP: 'Đã lấy hàng',
  DELIVERING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy'
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { driver } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showToast, setShowToast] = useState(null);

  const showNotification = (message, type = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const loadOrder = async () => {
    try {
      const response = await getOrderById(id);
      setOrder(response.data);
    } catch (err) {
      showNotification('Không tìm thấy đơn hàng', 'error');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      const actions = {
        accept: acceptOrder,
        pickup: pickedUpOrder,
        deliver: deliveringOrder,
        complete: completeOrder,
        cancel: cancelOrder
      };
      await actions[action](id);
      showNotification('Cập nhật thành công!');
      await loadOrder();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getActionButton = () => {
    if (!order) return null;
    if (order.status === 'PENDING' && !order.assignedTo) {
      return <button onClick={() => handleAction('accept')} disabled={actionLoading} className="btn-success">Nhận đơn này</button>;
    }
    if (order.assignedTo?._id === driver?._id || order.assignedTo === driver?._id) {
      if (order.status === 'ACCEPTED') return <button onClick={() => handleAction('pickup')} disabled={actionLoading} className="btn-warning">📦 Đã lấy hàng</button>;
      if (order.status === 'PICKED_UP') return <button onClick={() => handleAction('deliver')} disabled={actionLoading} className="btn-primary">🚚 Bắt đầu giao</button>;
      if (order.status === 'DELIVERING') return <button onClick={() => handleAction('complete')} disabled={actionLoading} className="btn-success">✅ Hoàn thành giao hàng</button>;
    }
    return null;
  };

  const currentStep = STATUS_STEPS.indexOf(order?.status);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-slate-900">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!order) return null;

  return (
    <div className="min-h-screen bg-slate-900 pb-32">
      {showToast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg text-white font-medium ${
          showToast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {showToast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-800 p-4 pt-8">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-white text-xl">←</button>
          <div>
            <h1 className="text-lg font-bold text-white">Chi tiết đơn hàng</h1>
            <p className="text-slate-400 text-sm">{order.orderCode || id?.slice(-8).toUpperCase()}</p>
          </div>
          <span className="ml-auto bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </div>

        {/* Progress */}
        {STATUS_STEPS.includes(order.status) && (
          <div className="flex gap-1 mb-4">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className={`flex-1 h-2 rounded-full ${i <= currentStep ? 'bg-green-500' : 'bg-slate-700'}`} />
            ))}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Addresses */}
        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <span className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 font-bold">📦</span>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">LẤY HÀNG</p>
              <p className="text-white font-medium">{order.pickupAddress}</p>
            </div>
          </div>
          <div className="border-l-2 border-dashed border-slate-600 ml-4 h-4 mb-4" />
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 font-bold">🏁</span>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">GIAO HÀNG</p>
              <p className="text-white font-medium">{order.deliveryAddress}</p>
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="card">
          <p className="text-xs text-slate-400 mb-2">THÔNG TIN KHÁCH HÀNG</p>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-white font-medium">{order.customerName}</p>
              <p className="text-slate-400 text-sm">{order.customerPhone}</p>
            </div>
            <a href={`tel:${order.customerPhone}`} className="bg-green-500 text-white px-4 py-2 rounded-full font-bold text-sm">
              📞 Gọi
            </a>
          </div>
        </div>

        {/* Order Info */}
        <div className="card">
          <p className="text-xs text-slate-400 mb-2">THÔNG TIN ĐƠN HÀNG</p>
          {order.items?.length > 0 && (
            <div className="mb-3">
              <p className="text-slate-400 text-xs mb-1">Hàng hóa:</p>
              {order.items.map((item, i) => (
                <p key={i} className="text-white text-sm">• {item}</p>
              ))}
            </div>
          )}
          {order.note && (
            <div className="bg-yellow-500/20 rounded-lg p-3 mb-3">
              <p className="text-yellow-300 text-sm">📝 {order.note}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-700 rounded-xl p-3">
              <p className="text-slate-400 text-xs">Phí giao hàng</p>
              <p className="text-green-400 font-bold text-lg">{order.deliveryFee?.toLocaleString()}đ</p>
            </div>
            <div className="bg-slate-700 rounded-xl p-3">
              <p className="text-slate-400 text-xs">Thu hộ (COD)</p>
              <p className="text-orange-400 font-bold text-lg">{order.codAmount?.toLocaleString()}đ</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        {order.acceptedAt && (
          <div className="card">
            <p className="text-xs text-slate-400 mb-3">TIMELINE</p>
            <div className="space-y-2">
              <div className="flex gap-3">
                <span className="text-green-400">✓</span>
                <div>
                  <p className="text-white text-sm">Nhận đơn</p>
                  <p className="text-slate-500 text-xs">{new Date(order.acceptedAt).toLocaleString('vi-VN')}</p>
                </div>
              </div>
              {order.pickedUpAt && (
                <div className="flex gap-3">
                  <span className="text-yellow-400">✓</span>
                  <div>
                    <p className="text-white text-sm">Lấy hàng</p>
                    <p className="text-slate-500 text-xs">{new Date(order.pickedUpAt).toLocaleString('vi-VN')}</p>
                  </div>
                </div>
              )}
              {order.deliveredAt && (
                <div className="flex gap-3">
                  <span className="text-blue-400">✓</span>
                  <div>
                    <p className="text-white text-sm">Giao hàng</p>
                    <p className="text-slate-500 text-xs">{new Date(order.deliveredAt).toLocaleString('vi-VN')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 p-4 border-t border-slate-700 max-w-[430px] mx-auto">
        {getActionButton()}
        {order.status === 'ACCEPTED' || order.status === 'PICKED_UP' || order.status === 'DELIVERING' ? (
          <button onClick={() => handleAction('cancel')} disabled={actionLoading} className="btn-danger mt-2">
            Hủy đơn
          </button>
        ) : null}
      </div>
    </div>
  );
}
