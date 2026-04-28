import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Speaker } from 'lucide-react';
import { getActiveAnnouncements } from '../../services/api';

const CustomerNotifications = () => {
  // Hardcode vài thông báo giả lập cho đẹp
  const notifications = [
    {
      id: 1,
      title: 'Chào mừng bạn đến với AloShipp',
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

  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await getActiveAnnouncements();
        if (res.success && res.data) {
          const annNotis = res.data
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
          setAnnouncements(annNotis);
        }
      } catch (err) {
        console.error('Lỗi lấy bảng tin thông báo', err);
      }
    };
    fetchAnnouncements();
  }, []);

  const allNotifications = [...announcements, ...notifications];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20 font-sans relative">
      <div className="bg-white px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] sticky top-0 z-40 flex items-center justify-center">
        <span className="font-bold text-gray-800 text-lg">Thông báo</span>
      </div>

      <div className="p-4 space-y-3">
        {allNotifications.map(noti => (
          <div key={noti.id} className={`bg-white rounded-2xl p-4 border ${noti.read ? 'border-gray-100 opacity-70' : 'border-blue-100'}`}>
            <div className="flex gap-3">
               <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${noti.bg}`}>
                  {noti.icon}
               </div>
               <div className="flex-1 min-w-0">
                 <div className="flex justify-between items-start mb-1">
                   <h3 className={`text-sm line-clamp-2 ${noti.read ? 'font-semibold text-gray-600' : 'font-bold text-gray-800'}`}>{noti.title}</h3>
                 </div>
                 <p className="text-xs text-gray-500 leading-relaxed mb-2 whitespace-pre-wrap line-clamp-4">{noti.message}</p>
                 
                 {/* Nếu có đính kèm ảnh thì hiển thị thu nhỏ */}
                 {noti.imageUrl && !noti.videoUrl && (
                   <img src={`https://api.aloshipp.com${noti.imageUrl}`} alt="đính kèm" className="w-full h-32 object-cover rounded-lg mb-2 border border-blue-100" />
                 )}
                 {noti.videoUrl && (
                   <video src={`https://api.aloshipp.com${noti.videoUrl}`} className="w-full h-32 object-cover rounded-lg mb-2 border border-blue-100" muted autoPlay playsInline loop></video>
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
