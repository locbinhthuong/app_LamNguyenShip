import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, Speaker, Truck, Clock, XCircle, ChevronRight } from 'lucide-react';
import { getActiveAnnouncements, getMyOrders, getFullImageUrl } from '../../services/api';

const CustomerNotifications = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [orderNotis, setOrderNotis] = useState([]);
  const activeMode = localStorage.getItem('activeMode') || localStorage.getItem('customerRole') || 'CUSTOMER';

  const welcomeNotification = {
    id: 'welcome-aloshipp',
    title: 'Chào mừng bạn đến với AloShipp',
    message: 'Cảm ơn bạn đã đồng hành cùng AloShipp. Đặt giao hàng, gọi xe và đặt món AloFood nhanh chóng mọi lúc mọi nơi!',
    time: 'Hệ thống AloShipp',
    read: true,
    icon: <Bell className="text-blue-500" size={20} />,
    bg: 'bg-blue-100'
  };

  useEffect(() => {
    const fetchAllNotifications = async () => {
      try {
        const [annRes, ordersRes] = await Promise.allSettled([
          getActiveAnnouncements(),
          getMyOrders()
        ]);

        if (annRes.status === 'fulfilled' && annRes.value?.success && annRes.value?.data) {
          const annList = annRes.value.data
            .filter(ann => ann.type === 'NOTIFICATION' || !ann.type)
            .map(ann => ({
              id: ann._id,
              title: '📣 ' + ann.title,
              message: ann.content,
              time: new Date(ann.createdAt).toLocaleString('vi-VN'),
              read: false,
              icon: <Speaker className="text-blue-500" size={20} />,
              bg: 'bg-blue-100',
              imageUrl: ann.imageUrl,
              videoUrl: ann.videoUrl
            }));
          setAnnouncements(annList);
        }

        if (ordersRes.status === 'fulfilled' && ordersRes.value?.success && Array.isArray(ordersRes.value?.data)) {
          const recentOrders = ordersRes.value.data.slice(0, 10).map(order => {
            const code = order.orderCode || order._id.slice(-6).toUpperCase();
            let title = `Đơn hàng #${code}`;
            let message = `Điểm đến: ${order.deliveryAddress || order.pickupAddress}`;
            let icon = <Clock className="text-blue-500" size={20} />;
            let bg = 'bg-blue-50';
            let read = true;

            if (order.status === 'DRAFT' && order.adminReviewed && order.deliveryFee > 0) {
              title = `💰 Đơn #${code} đã có báo giá cước!`;
              message = `Phí cước: ${order.deliveryFee.toLocaleString('vi-VN')}đ. Bấm vào đây để xác nhận đặt đơn.`;
              bg = 'bg-amber-100';
              read = false;
            } else if (order.status === 'ACCEPTED') {
              title = `🛵 Tài xế đã nhận đơn #${code}`;
              message = `Tài xế ${order.assignedTo?.name || ''} đang di chuyển đến điểm nhận.`;
              icon = <Truck className="text-indigo-600" size={20} />;
              bg = 'bg-indigo-100';
              read = false;
            } else if (order.status === 'PICKED_UP' || order.status === 'DELIVERING') {
              title = `🚀 Đơn #${code} đang trên đường thực hiện`;
              message = `Tài xế ${order.assignedTo?.name || ''} đang thực hiện lộ trình.`;
              icon = <Truck className="text-orange-600" size={20} />;
              bg = 'bg-orange-100';
              read = false;
            } else if (order.status === 'COMPLETED') {
              title = `✅ Đơn #${code} đã hoàn thành`;
              icon = <CheckCircle className="text-emerald-600" size={20} />;
              bg = 'bg-emerald-50';
            } else if (order.status === 'CANCELLED') {
              title = `❌ Đơn #${code} đã hủy`;
              message = order.cancelReason ? `Lý do: ${order.cancelReason}` : message;
              icon = <XCircle className="text-red-500" size={20} />;
              bg = 'bg-red-50';
            }

            return {
              id: `order-${order._id}`,
              orderId: order._id,
              title,
              message,
              time: new Date(order.updatedAt || order.createdAt).toLocaleString('vi-VN'),
              read,
              icon,
              bg
            };
          });
          setOrderNotis(recentOrders);
        }
      } catch (err) {
        console.error('Lỗi lấy thông báo:', err);
      }
    };

    fetchAllNotifications();
    window.addEventListener('refresh_orders_data', fetchAllNotifications);
    return () => window.removeEventListener('refresh_orders_data', fetchAllNotifications);
  }, []);

  const allNotifications = [...announcements, ...orderNotis, welcomeNotification];

  const handleNotificationClick = (noti) => {
    if (noti.orderId) {
      const targetPrefix = activeMode === 'SHOP' ? '/shop/order/' : '/customer/order/';
      navigate(`${targetPrefix}${noti.orderId}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24 font-sans relative">
      <div className="bg-white px-4 py-3 safe-pt sticky top-0 z-40 flex items-center justify-center border-b border-gray-100 shadow-sm">
        <span className="font-bold text-gray-800 text-lg">Thông báo</span>
      </div>

      <div className="p-4 space-y-3 max-w-2xl mx-auto w-full">
        {allNotifications.map(noti => (
          <div
            key={noti.id}
            onClick={() => handleNotificationClick(noti)}
            className={`bg-white rounded-2xl p-4 border transition-all ${
              noti.orderId ? 'cursor-pointer active:scale-[0.99] hover:border-blue-200' : ''
            } ${noti.read ? 'border-gray-100 opacity-85' : 'border-blue-200 shadow-sm'}`}
          >
            <div className="flex gap-3 items-start">
              <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${noti.bg}`}>
                {noti.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h3 className={`text-sm line-clamp-2 ${noti.read ? 'font-semibold text-gray-700' : 'font-bold text-gray-900'}`}>
                    {noti.title}
                  </h3>
                  {noti.orderId && <ChevronRight size={16} className="text-gray-400 shrink-0 mt-0.5" />}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-2 whitespace-pre-wrap">{noti.message}</p>

                {noti.imageUrl && !noti.videoUrl && (
                  <img src={getFullImageUrl(noti.imageUrl)} alt="đính kèm" className="w-full h-auto max-h-48 object-contain rounded-lg mb-2 border border-blue-50 bg-gray-50/50 p-1" />
                )}
                {noti.videoUrl && (
                  <video src={getFullImageUrl(noti.videoUrl)} className="w-full h-auto max-h-48 object-contain rounded-lg mb-2 border border-blue-50 bg-black" muted autoPlay playsInline loop controls></video>
                )}

                <span className="text-[10px] text-gray-400 font-medium">{noti.time}</span>
              </div>
            </div>
          </div>
        ))}

        <div className="text-center mt-6">
          <span className="text-xs text-gray-400">Bạn đã xem hết thông báo</span>
        </div>
      </div>
    </div>
  );
};

export default CustomerNotifications;
