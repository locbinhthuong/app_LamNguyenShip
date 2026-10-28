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
  const lastCoordsRef = useRef(null);
  const driverRef = useRef(driver);

  useEffect(() => {
    driverRef.current = driver;
  }, [driver]);

  const startNativePersistentService = () => {
    try {
      if (typeof window !== 'undefined' && window.AndroidNativeGps) {
        const token = localStorage.getItem('driver_token') || '';
        const rawUrl = import.meta.env.VITE_API_URL;
        const apiUrl = (typeof rawUrl === 'string' && rawUrl.trim() !== '') ? rawUrl.trim() : 'https://api.aloshipp.com';
        if (token) {
          window.AndroidNativeGps.startService(apiUrl, token);
        }
      }
    } catch (err) {
      console.warn('Không thể bật AndroidNativeGps:', err);
    }
  };

  const stopNativePersistentService = () => {
    try {
      if (typeof window !== 'undefined' && window.AndroidNativeGps) {
        window.AndroidNativeGps.stopService();
      }
    } catch (err) {
      console.warn('Không thể tắt AndroidNativeGps:', err);
    }
  };

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
    startNativePersistentService();

    if (Capacitor.isNativePlatform() && BackgroundGeolocation) {
      BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: "Vị trí vẫn hoạt động kể cả khi ẩn/đóng app. Bấm Offline để tắt.",
          backgroundTitle: "AloShipp Định Vị Xe (Đang Online)",
          requestPermissions: true,
          stale: true,
          distanceFilter: 0 // Quét liên tục kể cả khi xe đứng yên chờ đơn dưới nền
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

  const stopGpsTracking = (shouldStopPersistent = false) => {
    if (shouldStopPersistent) {
      stopNativePersistentService();
    }
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
      // Chỉ tắt hẳn dịch vụ chạy ngầm nếu tài xế đã Offline
      releaseWakeLock();
      stopGpsTracking(!driver?.isOnline);
      if (!driver?.isOnline && gpsStatus !== 'OFF') {
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
        
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        lastCoordsRef.current = { lat, lng };

        const now = Date.now();
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
          lastCoordsRef.current = { lat, lng };
          
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
    else if (!driver?.isOnline) {
      releaseWakeLock();
      stopGpsTracking(true);
      if (gpsStatus !== 'OFF') {
        setGpsStatus('OFF');
        if (window.driverSocket && window.driverSocket.connected) {
          window.driverSocket.emit('stop_location');
        }
      }
    }
  }, [driver?.isOnline]);

  // Heartbeat định vị (Mỗi 6s) - Hoạt động cả khi app chạy ngầm / tắt màn hình / xe đứng yên
  useEffect(() => {
    if (gpsStatus === 'TRACKING' && driver?.isOnline) {
      const sendHeartbeatCoords = (lat, lng) => {
        const now = Date.now();
        lastCoordsRef.current = { lat, lng };
        if (now - lastLocationEmitRef.current < 5500) return;
        lastLocationEmitRef.current = now;
        if (window.driverSocket && window.driverSocket.connected && !document.hidden) {
          window.driverSocket.emit('update_location', { lat, lng });
        } else {
          updateDriverLocationApi(lat, lng).catch(() => {});
        }
      };

      const heartbeatTimer = setInterval(() => {
        if (!document.hidden && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              sendHeartbeatCoords(pos.coords.latitude, pos.coords.longitude);
            },
            () => {
              if (lastCoordsRef.current) {
                sendHeartbeatCoords(lastCoordsRef.current.lat, lastCoordsRef.current.lng);
              }
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 3000 }
          );
        } else if (lastCoordsRef.current) {
          sendHeartbeatCoords(lastCoordsRef.current.lat, lastCoordsRef.current.lng);
        }
      }, 6000);
      return () => clearInterval(heartbeatTimer);
    }
  }, [gpsStatus, driver?.isOnline]);

  // Dọn dẹp khi unmount: Nếu tài xế vẫn đang Online và còn token thì giữ nguyên Native Service chạy ngầm
  useEffect(() => {
    return () => {
      releaseWakeLock();
      const stillOnline = Boolean(driverRef.current?.isOnline && localStorage.getItem('driver_token'));
      stopGpsTracking(!stillOnline);
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
