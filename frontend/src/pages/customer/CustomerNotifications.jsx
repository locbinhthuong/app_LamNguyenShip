import React from 'react';
import { Bell, CheckCircle } from 'lucide-react';

const CustomerNotifications = () => {
  // Hardcode vài thông báo giả lập cho đẹp
  const notifications = [
    {
      id: 1,
      title: 'Chào mừng bạn đến với LamNguyenShip',
      message: 'Cảm ơn bạn đã sử dụng dịch vụ. Hãy trải nghiệm siêu ứng dụng giao hàng và đặt xe ngay hôm nay!',
      time: 'Vừa xong',
      read: false,
      icon: <Bell className="text-blue-500" size={20} />,
      bg: 'bg-blue-100'
    },
    {
       id: 2,
       title: 'Tặng bạn mã giảm 20K',
       message: 'Mã CHAO20K đã được thêm vào ví của bạn. Áp dụng cho đơn hàng đầu tiên!',
       time: '2 giờ trước',
       read: true,
       icon: <CheckCircle className="text-green-500" size={20} />,
       bg: 'bg-green-100'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20 font-sans relative">
      <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-40 flex items-center justify-center">
        <span className="font-bold text-gray-800 text-lg">Thông báo</span>
      </div>

      <div className="p-4 space-y-3">
        {notifications.map(noti => (
          <div key={noti.id} className={`bg-white rounded-2xl p-4 shadow-sm border ${noti.read ? 'border-gray-100 opacity-70' : 'border-blue-100'}`}>
            <div className="flex gap-3">
               <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${noti.bg}`}>
                  {noti.icon}
               </div>
               <div>
                 <div className="flex justify-between items-start mb-1">
                   <h3 className={`text-sm ${noti.read ? 'font-semibold text-gray-600' : 'font-bold text-gray-800'}`}>{noti.title}</h3>
                 </div>
                 <p className="text-xs text-gray-500 leading-relaxed mb-2">{noti.message}</p>
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
