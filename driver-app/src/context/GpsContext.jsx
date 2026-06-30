import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { updateDriverLocationApi } from '../services/api';
import { Capacitor, registerPlugin } from '@capacitor/core';

let BackgroundGeolocation = null;
if (Capacitor.isNativePlatform()) {
  BackgroundGeolocation = registerPlugin("BackgroundGeolocation");
}

// WakeLock Helper (Only needed on Web, Native doesn't sleep if Background is running)
let wakeLock = null;
const requestWakeLock = async () => {
  if (!Capacitor.isNativePlatform() && 'wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {
      console.warn('Wake Lock error:', err);
    }
  }
};

const releaseWakeLock = async () => {
  if (wakeLock !== null) {
    try {
      await wakeLock.release();
      wakeLock = null;
    } catch (err) {
      console.warn('Release Wake Lock error:', err);
    }
  }
};

const GpsContext = createContext();

export const GpsProvider = ({ children }) => {
  const { driver } = useAuth();
  
  const [gpsStatus, setGpsStatus] = useState('OFF'); // 'OFF', 'FINDING', 'TRACKING', 'ERROR'
  const [isToggling, setIsToggling] = useState(false);
  const [showLocationDisclosure, setShowLocationDisclosure] = useState(false);
  const [pendingGpsAction, setPendingGpsAction] = useState(null);
  
  const watchIdRef = useRef(null);
  const lastLocationEmitRef = useRef(0);

  // XỬ LÝ CHÍNH SÁCH GOOGLE: PROMINENT DISCLOSURE
  const requestGpsWithDisclosure = (actionCallback) => {
    if (localStorage.getItem('location_disclosure_accepted') === 'true') {
      actionCallback();
    } else {
      setPendingGpsAction(() => actionCallback);
      setShowLocationDisclosure(true);
    }
  };

  const handleAcceptDisclosure = () => {
    localStorage.setItem('location_disclosure_accepted', 'true');
    setShowLocationDisclosure(false);
    if (pendingGpsAction) {
      pendingGpsAction();
      setPendingGpsAction(null);
    }
  };

  const handleDeclineDisclosure = () => {
    setShowLocationDisclosure(false);
    setPendingGpsAction(null);
    // showNotification('Bạn cần cấp quyền vị trí để nhận và giao đơn hàng', 'error');
  };

  // VŨ KHÍ HẠNG NẶNG: Định vị Background Ngầm
  const startGpsTracking = (onSuccess, onError) => {
    if (Capacitor.isNativePlatform() && BackgroundGeolocation) {
      BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: "Ứng dụng đang lấy vị trí ngầm...",
          backgroundTitle: "AloShipp Định Vị Xe",
          requestPermissions: true,
          stale: false,
          distanceFilter: 3 // Chỉ quét khi xe di chuyển xấp xỉ 3 mét
        },
        (location, error) => {
          if (error) {
            if (error.code === "NOT_AUTHORIZED") {
              console.error("KHÔNG ĐƯỢC CẤP QUYỀN CHẠY NGẦM", error);
            }
            onError(error);
            return;
          }
          if (location) {
            onSuccess({ coords: { latitude: location.latitude, longitude: location.longitude } });
          }
        }
      ).then((watcherId) => {
        watchIdRef.current = watcherId;
      }).catch(onError);
    } else {
      // Bản Web - Đã bị ép sáng màn hình bởi WakeLock
      watchIdRef.current = navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }
  };

  const stopGpsTracking = () => {
    if (watchIdRef.current !== null) {
      if (Capacitor.isNativePlatform() && BackgroundGeolocation) {
        BackgroundGeolocation.removeWatcher({ id: watchIdRef.current });
      } else if (navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    }
  };

  const toggleGPS = () => {
    if (isToggling) return;
    setIsToggling(true);
    setTimeout(() => setIsToggling(false), 800);

    if (gpsStatus !== 'OFF' || !driver?.isOnline) {
      // Tắt GPS
      releaseWakeLock();
      stopGpsTracking();
      if (gpsStatus !== 'OFF') {
        if (window.driverSocket && window.driverSocket.connected) {
          window.driverSocket.emit('stop_location');
        }
      }
      setGpsStatus('OFF');
      return;
    }

    if (!Capacitor.isNativePlatform() && !navigator.geolocation) {
      setGpsStatus('ERROR');
      return;
    }

    const executeGps = () => {
      setGpsStatus('FINDING');

      const handleSuccess = (pos) => {
        setGpsStatus('TRACKING');
        requestWakeLock();
        
        const now = Date.now();
        if (now - lastLocationEmitRef.current >= 6000) {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          
          if (window.driverSocket && window.driverSocket.connected && !document.hidden) {
            window.driverSocket.emit('update_location', { lat, lng });
          } else {
            updateDriverLocationApi(lat, lng).catch(e => console.error("Lỗi đồng bộ GPS API", e));
          }
          lastLocationEmitRef.current = now;
        }
      };

      const handleError = (err) => {
        setGpsStatus('ERROR');
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(handleSuccess, (err) => console.warn("Lỗi Get nhanh:", err), { 
          enableHighAccuracy: true, timeout: 5000, maximumAge: 0 
        });
      }

      startGpsTracking(handleSuccess, handleError);
    };

    requestGpsWithDisclosure(executeGps);
  };

  // Tự động bật/tắt GPS theo trạng thái Online của Tài Xế
  useEffect(() => {
    if (driver?.isOnline && gpsStatus === 'OFF' && watchIdRef.current === null) {
      if (!Capacitor.isNativePlatform() && !navigator.geolocation) {
        setGpsStatus('ERROR');
        return;
      }
      
      const executeAutoGps = () => {
        setGpsStatus('FINDING');

        const handleSuccess = (pos) => {
          setGpsStatus('TRACKING');
          requestWakeLock();
          
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          
          const now = Date.now();
          // Rate limit: Chỉ cập nhật lên máy chủ mỗi 6 giây
          if (now - lastLocationEmitRef.current >= 6000) {
            if (window.driverSocket && window.driverSocket.connected && !document.hidden) {
              window.driverSocket.emit('update_location', { lat, lng });
            } else {
              updateDriverLocationApi(lat, lng).catch(e => console.error("Lỗi đồng bộ GPS API", e));
            }
            lastLocationEmitRef.current = now;
          }
        };

        const handleError = (err) => {
          console.error("GPS Error:", err);
          setGpsStatus('ERROR');
        };

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(handleSuccess, (err) => console.warn("Lỗi Get nhanh tự động:", err), { 
            enableHighAccuracy: true, timeout: 5000, maximumAge: 0 
          });
        }

        startGpsTracking(handleSuccess, handleError);
      };

      requestGpsWithDisclosure(executeAutoGps);
    } 
    else if (!driver?.isOnline && gpsStatus !== 'OFF') {
      releaseWakeLock();
      stopGpsTracking();
      setGpsStatus('OFF');
      if (window.driverSocket && window.driverSocket.connected) {
        window.driverSocket.emit('stop_location');
      }
    }
  }, [driver?.isOnline]);

  // Heartbeat định vị (Mỗi 30s)
  useEffect(() => {
    if (gpsStatus === 'TRACKING' && driver?.isOnline) {
      const heartbeatTimer = setInterval(() => {
        if (!document.hidden && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              if (window.driverSocket && window.driverSocket.connected) {
                window.driverSocket.emit('update_location', { lat, lng });
              }
            },
            (err) => console.warn("⚠️ [Heartbeat] Lỗi lấy vị trí ngầm:", err.message),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
          );
        }
      }, 30000);
      return () => clearInterval(heartbeatTimer);
    }
  }, [gpsStatus, driver?.isOnline]);

  // Dọn dẹp khi unmount (Lúc Logout)
  useEffect(() => {
    return () => {
      releaseWakeLock();
      stopGpsTracking();
    };
  }, []);

  return (
    <GpsContext.Provider value={{ gpsStatus, toggleGPS, isToggling, showLocationDisclosure, handleAcceptDisclosure, handleDeclineDisclosure }}>
      {children}
    </GpsContext.Provider>
  );
};

export const useGps = () => {
  return useContext(GpsContext);
};
