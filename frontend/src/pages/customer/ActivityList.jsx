import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, PackageCheck, Truck, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, connectSocket, disconnectSocket } from '../../services/api';

const ActivityList = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/customer/my');
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

    const token = localStorage.getItem('customerToken');
    if (token) {
      // Vì role đã được nhúng trong token, ta truyền tạm 'customer' 
      const socket = connectSocket(token, 'customer');

      const events = [
        'new_order', 'order_accepted', 'order_picked_up', 
        'order_delivering', 'order_completed', 'order_cancelled', 'order_updated'
      ];
      events.forEach(event => socket.on(event, fetchOrders));

      return () => {
        events.forEach(event => socket.off(event, fetchOrders));
        disconnectSocket();
      };
    }
  }, []);

  const getStatusConfig = (status) => {
    switch(status) {
      case 'DRAFT': return { text: 'Đang Tính Phí', color: 'text-purple-500', bg: 'bg-purple-50', icon: <Clock size={16}/> };
      case 'PENDING': return { text: 'Đang chờ xế', color: 'text-orange-500', bg: 'bg-orange-50', icon: <Clock size={16}/> };
      case 'ACCEPTED': return { text: 'Đã có xế nhận', color: 'text-blue-500', bg: 'bg-blue-50', icon: <Truck size={16}/> };
      case 'PICKED_UP': return { text: 'Xế đã lấy hàng', color: 'text-indigo-500', bg: 'bg-indigo-50', icon: <PackageCheck size={16}/> };
      case 'DELIVERING': return { text: 'Đang trên đường giao', color: 'text-blue-600', bg: 'bg-blue-100', icon: <Truck size={16}/> };
      case 'COMPLETED': return { text: 'Đã hoàn thành', color: 'text-green-500', bg: 'bg-green-50', icon: <CheckCircle size={16}/> };
      case 'CANCELLED': return { text: 'Đã hủy', color: 'text-red-500', bg: 'bg-red-50', icon: <XCircle size={16}/> };
      default: return { text: 'Không rõ', color: 'text-gray-500', bg: 'bg-gray-100', icon: <Clock size={16}/> };
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20 font-sans relative">
      <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-40 flex items-center justify-center">
        <span className="font-bold text-gray-800 text-lg">Hoạt động của tôi</span>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 mt-10">Đang tải lịch sử...</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 flex flex-col items-center">
            <span className="text-4xl mb-3">📭</span>
            <p>Bạn chưa có đơn hàng nào.</p>
            <button onClick={() => navigate('/')} className="mt-4 bg-blue-100 text-blue-600 px-4 py-2 rounded-full font-bold">Đặt đơn mới</button>
          </div>
        ) : (
          orders.map((order) => {
            const statusCfg = getStatusConfig(order.status);
            return (
              <div key={order._id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                {/* Status Bar */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${statusCfg.bg.replace('bg-', 'bg-').replace('-50', '-500')}`}></div>
                
                <div className="flex justify-between items-center mb-3 pl-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800">{order.serviceType === 'GIAO_HANG' ? 'Giao Hàng' : (order.serviceType === 'DAT_XE' ? 'Đặt Xe' : 'Mua Hộ')}</span>
                    <span className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${statusCfg.bg} ${statusCfg.color}`}>
                    {statusCfg.icon}
                    {statusCfg.text}
                  </div>
                </div>

                <div className="space-y-2 pl-2 border-t border-gray-50 pt-3">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></div>
                    <p className="text-xs text-gray-600 line-clamp-1 flex-1 font-medium">{order.pickupAddress}</p>
                  </div>
                  {order.deliveryAddress && (
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5"></div>
                      <p className="text-xs text-gray-600 line-clamp-1 flex-1 font-medium">{order.deliveryAddress}</p>
                    </div>
                  )}
                </div>

                {order.assignedTo && order.status !== 'CANCELLED' && (
                  <div className="mt-4 bg-blue-50/50 rounded-xl p-3 border border-blue-50 flex items-center justify-between ml-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center text-xl text-blue-700">🧔</div>
                      <div>
                        <p className="text-[11px] font-bold text-gray-700">{order.assignedTo.name}</p>
                        <p className="text-[10px] text-gray-500">Tài xế nhận đơn</p>
                      </div>
                    </div>
                    <button className="bg-white border border-blue-200 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm">
                      Gọi Tài Xế
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ActivityList;
