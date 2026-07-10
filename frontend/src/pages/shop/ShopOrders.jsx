import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, Store, XCircle, FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

const ShopOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Huỷ đơn
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchOrders = async () => {
    try {
      const res = await api.get('/shop/orders');
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const handleRefresh = () => fetchOrders();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchOrders();
    };

    window.addEventListener('refresh_orders_data', handleRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('refresh_orders_data', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const getStatusConfig = (status) => {
    switch(status) {
      case 'WAITING_SHOP': return { text: 'Chờ quán nhận', color: 'text-amber-600', bg: 'bg-amber-100', icon: <Clock size={16}/> };
      case 'DRAFT': return { text: 'Chờ thanh toán', color: 'text-purple-500', bg: 'bg-purple-50', icon: <Clock size={16}/> };
      case 'PENDING': return { text: 'Đang chờ xế', color: 'text-blue-500', bg: 'bg-blue-50', icon: <Clock size={16}/> };
      case 'ACCEPTED': return { text: 'Xế đang đến lấy', color: 'text-indigo-500', bg: 'bg-indigo-50', icon: <Store size={16}/> };
      case 'PICKED_UP': return { text: 'Đang giao cho khách', color: 'text-orange-500', bg: 'bg-orange-50', icon: <Store size={16}/> };
      case 'DELIVERING': return { text: 'Đang giao cho khách', color: 'text-blue-600', bg: 'bg-blue-100', icon: <Store size={16}/> };
      case 'COMPLETED': return { text: 'Hoàn thành', color: 'text-green-500', bg: 'bg-green-50', icon: <CheckCircle size={16}/> };
      case 'CANCELLED': return { text: 'Đã hủy', color: 'text-red-500', bg: 'bg-red-50', icon: <XCircle size={16}/> };
      default: return { text: 'Không rõ', color: 'text-gray-500', bg: 'bg-gray-100', icon: <Clock size={16}/> };
    }
  };

  const renderOrder = (order) => {
    const statusCfg = getStatusConfig(order.status);
    const alofoodDetails = order.alofoodDetails;

    return (
      <div 
        key={order._id} 
        className="bg-white p-4 rounded-2xl border border-gray-100 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all mb-4 shadow-sm"
        onClick={() => navigate(`/shop/order/${order._id}`)}
      >
        <div className={`absolute top-0 left-0 w-1.5 h-full ${statusCfg.bg.replace('bg-', 'bg-').replace('-50', '-500')}`}></div>
        
        <div className="flex justify-between items-center mb-3 pl-2">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-800">
              Đơn Khách Đặt #{order.orderCode || order._id.slice(-6).toUpperCase()}
            </span>
            <span className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${statusCfg.bg} ${statusCfg.color}`}>
            {statusCfg.icon}
            {statusCfg.text}
          </div>
        </div>

        <div className="space-y-2 pl-2 border-t border-gray-50 pt-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
               <p className="text-xs text-gray-600 font-medium">Khách hàng: <span className="font-bold text-gray-800">{order.customerName}</span></p>
               <p className="text-xs text-gray-500">{order.customerPhone}</p>
            </div>
            <div className="text-right">
               <p className="text-sm font-bold text-blue-600">{(alofoodDetails?.foodTotal || 0).toLocaleString('vi-VN')}đ</p>
               <p className="text-[10px] text-gray-400">{alofoodDetails?.cartItems?.length || 0} món</p>
            </div>
          </div>
          
          {alofoodDetails?.cartItems?.length > 0 && (
            <div className="mt-2 bg-gray-50 p-2 rounded-lg space-y-1">
              {alofoodDetails.cartItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-xs">
                  <div className="flex-1 pr-2">
                    <span className="font-bold text-gray-700">{item.quantity}x</span> <span className="text-gray-600">{item.name}</span>
                    {item.note && <p className="text-[10px] text-orange-600 italic mt-0.5">Note: {item.note}</p>}
                  </div>
                  <span className="text-gray-500 font-medium">{(item.price * item.quantity).toLocaleString()}đ</span>
                </div>
              ))}
            </div>
          )}

          {order.note && (
            <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg mt-2">Ghi chú: {order.note}</p>
          )}
          {order.status === 'CANCELLED' && order.cancelReason && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mt-2 font-medium">Lý do hủy: {order.cancelReason}</p>
          )}
        </div>

        {order.status === 'WAITING_SHOP' && (
          <div className="mt-3 flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); setCancellingOrderId(order._id); setCancelReason(''); setCancelModalVisible(true); }}
              className="flex-1 bg-red-50 text-red-600 font-bold py-2 rounded-xl text-sm hover:bg-red-100 transition-colors"
            >
              Hủy đơn
            </button>
            <button 
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const res = await api.put(`/shop/orders/${order._id}/accept`);
                  if (res.data.success) {
                    fetchOrders();
                  }
                } catch (err) {
                  alert(err.response?.data?.message || 'Lỗi server');
                }
              }}
              className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl text-sm hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
            >
              Nhận đơn
            </button>
          </div>
        )}

        <div className="mt-3 border-t border-gray-50 pt-3 flex justify-between items-center pl-2">
           <span className="text-xs text-blue-500 font-bold flex items-center gap-1">
              <FileText size={14}/> Xem chi tiết
           </span>
           <ChevronRight size={16} className="text-gray-300" />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-gray-50 font-sans overflow-hidden">
      <div className="shrink-0 bg-white px-4 py-3 safe-pt relative z-40 flex items-center justify-center border-b border-gray-100 shadow-sm">
        <span className="font-bold text-gray-800 text-lg">Đơn Khách Đặt (AloFood)</span>
      </div>
      
      <div className="flex-1 w-full overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-gray-500 mt-10">Đang tải...</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 flex flex-col items-center">
            <span className="text-4xl mb-3">📋</span>
            <p>Chưa có đơn khách đặt nào.</p>
          </div>
        ) : (
          orders.map(renderOrder)
        )}
      </div>

      {/* Modal Hủy Đơn */}
      {cancelModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Hủy đơn hàng</h3>
            <p className="text-sm text-gray-600 mb-4">Vui lòng nhập lý do hủy để thông báo cho khách hàng.</p>
            <textarea
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 min-h-[100px]"
              placeholder="Ví dụ: Hết nguyên liệu, Quán quá tải..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            ></textarea>
            <div className="flex gap-3">
              <button 
                onClick={() => setCancelModalVisible(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Đóng
              </button>
              <button 
                onClick={async () => {
                  if (!cancelReason.trim()) return alert('Vui lòng nhập lý do');
                  try {
                    const res = await api.put(`/shop/orders/${cancellingOrderId}/reject`, { cancelReason });
                    if (res.data.success) {
                      setCancelModalVisible(false);
                      fetchOrders();
                    }
                  } catch (err) {
                    alert(err.response?.data?.message || 'Lỗi server');
                  }
                }}
                className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Xác nhận Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopOrders;
