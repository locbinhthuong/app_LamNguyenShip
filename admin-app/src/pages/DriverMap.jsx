import { useState, useEffect, useCallback, useRef } from 'react';
// KHÔNG dùng react-leaflet để tránh lỗi tương thích Vite Production
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getDrivers, getOrders, getDriverById, getFullImageUrl, forceOfflineDriver } from '../services/api';

// Hàm tạo Icon thuần có Badge số dư động
const getMotorbikeIcon = (activeOrderCount, status, avatar) => {
    let badgeHtml = '';
    let borderColor = '#10b981'; // Green for online but no order
    if (activeOrderCount > 0) {
        let bgColor = '#3b82f6'; // Xanh biển mặc định (Đang giao)
        borderColor = '#3b82f6';
        if (status === 'ACCEPTED') {
            bgColor = '#f97316'; // Cam (Đang lấy)
            borderColor = '#f97316';
        }
        badgeHtml = `<div style="position: absolute; top: -14px; right: -24px; background: ${bgColor}; color: white; border-radius: 12px; padding: 3px 6px; font-size: 10px; font-weight: black; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); z-index: 1000; white-space: nowrap;">${activeOrderCount} ĐƠN</div>`;
    }

    const imgHtml = avatar 
        ? `<img src="${getFullImageUrl(avatar)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" crossorigin="anonymous" />` 
        : `<span style="font-size: 22px;">🛵</span>`;

    return L.divIcon({
        className: 'custom-driver-marker',
        html: `
            <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background-color: white; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid ${borderColor};">
                ${imgHtml}
                ${badgeHtml}
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
};

export default function DriverMap() {
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);
  
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  
  // Lưu trữ state cho map để render marker (Ref để tránh re-render bản đồ liên tục)
  const dataRef = useRef({
      drivers: {},
      orders: {}
  });

  // Hàm vẽ/cập nhật Markers thuần túy
  const updateMapMarkers = useCallback(() => {
    if (!mapInstance.current) return;
    const { drivers, orders } = dataRef.current;
    
    setOnlineCount(Object.keys(drivers).length);

    const groups = {};
    Object.values(drivers).forEach(driver => {
      const latR = Number(driver.lat).toFixed(4);
      const lngR = Number(driver.lng).toFixed(4);
      const key = `${latR},${lngR}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(driver);
    });

    const newMarkerKeys = new Set();

    Object.keys(groups).forEach(key => {
      newMarkerKeys.add(key);
      const groupDrivers = groups[key];
      const latlng = key.split(',').map(Number);
      
      let totalActiveJobs = 0;
      let firstOrderStatus = null;
      let groupJobsHtml = '';

      groupDrivers.forEach(driver => {
        const activeJobs = orders[driver.id] || [];
        totalActiveJobs += activeJobs.length;
        if (!firstOrderStatus && activeJobs.length > 0) firstOrderStatus = activeJobs[0].status;

        let jobsHtml = '';
        if (activeJobs.length > 0) {
          jobsHtml = activeJobs.map((job, idx) => `
            <div style="background: #fff7ed; padding: 8px; border-radius: 4px; border: 1px solid #fed7aa; margin-bottom: ${idx < activeJobs.length - 1 ? '6px' : '0'};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <p style="margin: 0; font-size: 10px; font-weight: bold; color: ${job.status === 'ACCEPTED' ? '#f97316' : '#2563eb'}; text-transform: uppercase;">
                        ${job.status === 'ACCEPTED' ? 'Đang đi lấy' : 'Đang chở hàng'}
                    </p>
                    <span style="font-size: 9px; padding: 2px 4px; background: #fdba74; border-radius: 4px; color: #fff; font-weight: bold;">${job.orderCode ? job.orderCode.slice(-6) : 'ORDER'}</span>
                </div>
                <p style="margin: 0 0 2px 0; font-size: 12px; font-weight: 600;">👤 ${job.customerName}</p>
                <p style="margin: 0 0 4px 0; font-size: 11px; color: #4b5563;">🏠 ${job.deliveryAddress}</p>
                <p style="margin: 0; font-size: 12px; font-weight: bold; color: #16a34a;">💰 COD: ${job.codAmount?.toLocaleString()}đ</p>
            </div>
          `).join('');
        } else {
          jobsHtml = `
            <div style="background: #f3f4f6; padding: 8px; border-radius: 4px;">
                <p style="margin: 0; font-size: 11px; color: #6b7280; font-style: italic;">🚦 Đang chạy rỗng chờ đơn</p>
            </div>
          `;
        }

        groupJobsHtml += `
          <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <h3 style="margin: 0; color: #ea580c; font-weight: bold; font-size: 16px;">${driver.name}</h3>
                  <div style="display: flex; gap: 4px; align-items: center;">
                      ${activeJobs.length > 0 ? `<span style="font-size: 10px; background: #ef4444; color: white; padding: 2px 6px; border-radius: 10px; font-weight: bold;">${activeJobs.length} ĐƠN</span>` : ''}
                      <button onclick="window.handleForceOffline('${driver.id}')" style="background: #ef4444; color: white; border: none; padding: 2px 6px; border-radius: 4px; font-size: 10px; cursor: pointer; font-weight: bold;" title="Tắt định vị">🔴 TẮT ĐỊNH VỊ</button>
                  </div>
              </div>
              ${driver.phone ? `<p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">📞 ${driver.phone}</p>` : ''}
              ${jobsHtml}
              <p style="margin: 4px 0 0 0; font-size: 10px; color: #9ca3af; text-align: right;">Cập nhật: ${new Date(driver.updatedAt).toLocaleTimeString()}</p>
          </div>
        `;
      });

      let headerHtml = '';
      if (groupDrivers.length > 1) {
          headerHtml = `<div style="background: #ef4444; color: white; padding: 6px; text-align: center; font-weight: bold; font-size: 12px; border-radius: 4px; margin-bottom: 8px;">📍 CÓ ${groupDrivers.length} TÀI XẾ Ở ĐÂY</div>`;
      }

      // Nội dung Popup
      const popupHtml = `
        <div style="padding: 4px; min-width: 250px; max-height: 300px; overflow-y: auto; font-family: sans-serif;">
            ${headerHtml}
            ${groupJobsHtml}
        </div>
      `;

      // Icon (nếu nhiều tài xế thì hiện số lượng thay vì số đơn)
      // Mẹo: Tái sử dụng getMotorbikeIcon. activeOrderCount có thể hiện số tài xế.
      let currentIcon;
      if (groupDrivers.length > 1) {
          currentIcon = getMotorbikeIcon(groupDrivers.length + ' TX', null, null); // "X TX" string won't break anything, just a badge
      } else {
          currentIcon = getMotorbikeIcon(totalActiveJobs, firstOrderStatus, groupDrivers[0].avatar);
      }

      if (markersRef.current[key]) {
        // Đã có marker, chỉ cần dời vị trí và cập nhật popup và icon tĩnh
        markersRef.current[key].setLatLng(latlng);
        markersRef.current[key].setIcon(currentIcon);
        markersRef.current[key].getPopup().setContent(popupHtml);
      } else {
        // Tạo marker mới
        const marker = L.marker(latlng, { icon: currentIcon }).addTo(mapInstance.current);
        marker.bindPopup(popupHtml);
        markersRef.current[key] = marker;
      }
    });

    Object.keys(markersRef.current).forEach(key => {
        if (!newMarkerKeys.has(key)) {
            mapInstance.current.removeLayer(markersRef.current[key]);
            delete markersRef.current[key];
        }
    });

    // Căn giữa bản đồ nếu có tài xế và chưa từng căn
    if (Object.keys(drivers).length > 0 && mapInstance.current._hasCentered !== true) {
      const firstDriver = Object.values(drivers)[0];
      mapInstance.current.setView([firstDriver.lat, firstDriver.lng], 14);
      mapInstance.current._hasCentered = true;
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [resDrivers, resOrders] = await Promise.all([
          getDrivers(),
          getOrders({ status: 'ACCEPTED,PICKED_UP,DELIVERING' })
      ]);

      const allDrivers = resDrivers.data || [];
      const onlineDrivers = allDrivers.filter(d => d.isOnline && d.currentLocation?.lat);

      const driversObj = {};
      onlineDrivers.forEach(d => {
        driversObj[d._id] = {
          id: d._id,
          name: d.name,
          phone: d.phone,
          avatar: d.avatar,
          lat: d.currentLocation.lat,
          lng: d.currentLocation.lng,
          updatedAt: d.currentLocation.updatedAt
        };
      });

      const ordersObj = {};
      (resOrders.orders || []).forEach(o => {
        if (o.assignedTo) {
          const driverId = o.assignedTo._id || o.assignedTo;
          if (!ordersObj[driverId]) ordersObj[driverId] = [];
          ordersObj[driverId].push(o); 
        }
      });

      // Ghi vào Ref để render
      dataRef.current = { drivers: driversObj, orders: ordersObj };
      updateMapMarkers();

    } catch (err) {
      console.error('Lỗi lấy dữ liệu bản đồ:', err);
    } finally {
      setLoading(false);
    }
  }, [updateMapMarkers]);

  useEffect(() => {
    // 0. Tạo hàm Global cho onClick của popup
    window.handleForceOffline = async (driverId) => {
        if (!window.confirm('Bạn có chắc muốn ép Tắt Định Vị tài xế này?')) return;
        try {
            await forceOfflineDriver(driverId);
            alert('Đã tắt định vị thành công!');
        } catch(e) {
            alert('Lỗi khi tắt định vị!');
        }
    };

    // 1. Khởi tạo bản đồ thuần Túy
    if (mapRef.current && !mapInstance.current) {
        mapInstance.current = L.map(mapRef.current).setView([10.762622, 106.660172], 13); // TPHCM Mặc định
        const tileLayer = L.tileLayer('https://mt0.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}', {
            attribution: '&copy; Google Maps',
            maxZoom: 22,
            maxNativeZoom: 20
        }).addTo(mapInstance.current);

        // Hệ thống chống cháy: Chuyển qua bản đồ Free (OSM) nếu Google sập / hết requests
        tileLayer.once('tileerror', function() {
            console.warn('Google Maps tile load error, falling back to OpenStreetMap...');
            tileLayer.setUrl('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
        });
    }

    loadInitialData();

    // 2. Lắng nghe Socket Realtime qua biến toàn cục window
    // Lắng nghe Tọa độ Realme
    const handleLocationUpdate = async (e) => {
      const data = e.detail;
      const _id = data.driverId;
      const existing = dataRef.current.drivers[_id] || {};
      
      dataRef.current.drivers[_id] = {
          ...existing,
          id: _id,
          name: data.name || existing.name || 'Đang tải tên...',
          avatar: data.avatar || existing.avatar,
          lat: data.lat,
          lng: data.lng,
          updatedAt: data.timestamp
      };
      updateMapMarkers();

      // Nếu tài xế vừa lên mạng mà API chưa kịp lấy Tên, gọi bù thêm
      if (!existing.name) {
          try {
             const apiData = await getDriverById(_id);
             if (apiData?.success && apiData?.data) {
                // Kiểm tra xem xe này có đang chạy không để ghi đè (vì await có khi mất vị trí nếu họ ngắt kết nối)
                if (dataRef.current.drivers[_id]) {
                  dataRef.current.drivers[_id] = {
                     ...dataRef.current.drivers[_id],
                     name: apiData.data.name,
                     phone: apiData.data.phone,
                     avatar: apiData.data.avatar
                  };
                  updateMapMarkers();
                }
             }
          } catch(e) {}
      }
    };
    window.addEventListener('driver_location_update', handleLocationUpdate);

    // Lắng nghe thay đổi trạng thái Online/Offline để gỡ/thêm marker
    const handleStatusChange = async (e) => {
      const data = e.detail;
      const _id = data.driverId;
      if (!data.isOnline || !data.lat || !data.lng) {
        delete dataRef.current.drivers[_id];
        updateMapMarkers();
      } else {
        const existing = dataRef.current.drivers[_id] || {};
        dataRef.current.drivers[_id] = {
            ...existing,
            id: _id,
            avatar: data.avatar || existing.avatar,
            lat: data.lat,
            lng: data.lng,
            updatedAt: data.updatedAt
        };
        updateMapMarkers();

        // Tương tự, nếu socket báo ON mà chưa có tên, tải bù ngay lập tức
        try {
           const apiData = await getDriverById(_id);
           if (apiData?.success && apiData?.data && dataRef.current.drivers[_id]) {
              dataRef.current.drivers[_id] = {
                 ...dataRef.current.drivers[_id],
                 name: apiData.data.name,
                 phone: apiData.data.phone,
                 avatar: apiData.data.avatar
              };
              updateMapMarkers();
           }
        } catch(e) {}
      }
    };
    window.addEventListener('driver_status_change', handleStatusChange);

    // Lắng nghe thay đổi trạng thái đơn
    const reloadOrders = () => loadInitialData();
    window.addEventListener('refresh_admin_orders', reloadOrders);

    return () => {
      window.removeEventListener('driver_location_update', handleLocationUpdate);
      window.removeEventListener('driver_status_change', handleStatusChange);
      window.removeEventListener('refresh_admin_orders', reloadOrders);
      // Xóa bản đồ khi tắt trang
      if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
      }
    };
  }, [loadInitialData, updateMapMarkers]);

  return (
    <div className="flex flex-col h-full w-full p-4 sm:p-6" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">🗺️ Bản Đồ Theo Dõi Tài Xế</h1>
        <div className="flex gap-2">
            <button 
              onClick={loadInitialData}
              className="rounded-lg bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-200 transition-colors flex items-center gap-2"
              title="Tải lại dữ liệu bản đồ khi mạng chập chờn"
            >
              🔄 Làm mới
            </button>
            <div className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-green-500 shadow-sm border border-slate-200 flex items-center">
              🟢 Đang gửi vị trí: {onlineCount}
            </div>
        </div>
      </div>
      
      <div className="relative z-0 flex-1 w-full overflow-hidden rounded-2xl border-4 border-slate-200 shadow-xl" style={{ minHeight: '500px' }}>
        {/* Vùng chứa bản đồ thuần */}
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        )}
        <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>
      </div>
    </div>
  );
}
