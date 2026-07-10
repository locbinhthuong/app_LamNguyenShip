import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import ShopDashboard from './pages/shop/ShopDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import BookingFlow from './pages/customer/BookingFlow';
import ActivityList from './pages/customer/ActivityList';
import CustomerLayout from './components/CustomerLayout';
import ShopLayout from './components/ShopLayout';
import CustomerProfile from './pages/customer/CustomerProfile';
import CustomerNotifications from './pages/customer/CustomerNotifications';
import OrderDetail from './pages/customer/OrderDetail';
import AloFoodHome from './pages/customer/AloFoodHome';
import AloFoodRestaurantDetail from './pages/customer/AloFoodRestaurantDetail';
import AloFoodCheckout from './pages/customer/AloFoodCheckout';
import ShopBookingFlow from './pages/shop/ShopBookingFlow';
import ShopProfile from './pages/shop/ShopProfile';
import ShopActivity from './pages/shop/ShopActivity';
import ShopStatistics from './pages/shop/ShopStatistics';
import ShopMenuManager from './pages/shop/ShopMenuManager';
import ShopOrders from './pages/shop/ShopOrders';
import { useAuthSocket } from './hooks/useAuthSocket';
import ForceUpdateModal from './components/ForceUpdateModal';
import { getAppVersionConfig } from './services/api';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';

const compareVersions = (v1, v2) => {
  if (!v1 || !v2) return 0;
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
};

const IndexRoute = () => {
  const userRole = localStorage.getItem('customerRole');
  if (userRole === 'SHOP') {
    return <Navigate to="/shop" replace />;
  }
  return <CustomerDashboard />;
};

function App() {
  useAuthSocket();
  const location = useLocation();
  const [forceUpdateConfig, setForceUpdateConfig] = useState(null);

  useEffect(() => {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
      const timeElapsed = performance.now();
      const remainingTime = Math.max(0, 1500 - timeElapsed);
      setTimeout(() => {
        splashScreen.classList.add('fade-out');
        setTimeout(() => splashScreen.remove(), 400);
      }, remainingTime);
    }
    
    // Check App Version
    const checkAppVersion = async () => {
      try {
        const res = await getAppVersionConfig();
        if (res && res.data && res.data.value && res.data.value.customerApp) {
          const config = res.data.value.customerApp;
          if (Capacitor.isNativePlatform()) {
            const info = await CapacitorApp.getInfo();
            if (compareVersions(info.version, config.minVersion) < 0) {
              setForceUpdateConfig(config);
            }
          }
        }
      } catch (err) {
        console.error("Lỗi khi kiểm tra phiên bản app:", err);
      }
    };
    checkAppVersion();
  }, []);

  return (
    <>
      {forceUpdateConfig && <ForceUpdateModal config={forceUpdateConfig} />}
      <div className="h-[100dvh] bg-gray-50 flex flex-col font-sans overflow-hidden relative">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
          {/* Các màn hình con của Khách hàng (Được dính Footer Layout) */}
          <Route element={<CustomerLayout />}>
            {/* Trang chủ mặc định là màn hình 4 dịch vụ (Cho phép Guest xem, nhưng SHOP thì chuyển qua /shop) */}
            <Route path="/" element={<IndexRoute />} />
            
            <Route 
              path="/customer/activity" 
              element={
                <ProtectedRoute allowedRole="CUSTOMER">
                  <ActivityList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/customer/profile" 
              element={
                <ProtectedRoute allowedRole="CUSTOMER">
                  <CustomerProfile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/customer/notifications" 
              element={
                <ProtectedRoute allowedRole="CUSTOMER">
                  <CustomerNotifications />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/customer/book/:serviceType" 
              element={
                <ProtectedRoute allowedRole="CUSTOMER">
                  <BookingFlow />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/customer/order/:id" 
              element={
                <ProtectedRoute allowedRole="CUSTOMER">
                  <OrderDetail />
                </ProtectedRoute>
              } 
            />
          </Route>

          {/* AloFood Flow (Customer) */}
          <Route path="/alofood" element={
            <ProtectedRoute allowedRole="CUSTOMER">
              <AloFoodHome />
            </ProtectedRoute>
          } />
          <Route path="/alofood/restaurant/:id" element={
            <ProtectedRoute allowedRole="CUSTOMER">
              <AloFoodRestaurantDetail />
            </ProtectedRoute>
          } />
          <Route path="/alofood/checkout/:id" element={
            <ProtectedRoute allowedRole="CUSTOMER">
              <AloFoodCheckout />
            </ProtectedRoute>
          } />

          {/* Các màn hình KHÔNG có Footer (Ví dụ: Form Lên Đơn, Đăng nhập, Shop) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Cửa Hàng (Shop) */}
          <Route element={<ShopLayout />}>
            <Route path="/shop" element={
              <ProtectedRoute allowedRole="SHOP">
                <ShopDashboard />
              </ProtectedRoute>
            } />
            <Route path="/shop/activity" element={
              <ProtectedRoute allowedRole="SHOP">
                <ShopActivity />
              </ProtectedRoute>
            } />
            <Route path="/shop/statistics" element={
              <ProtectedRoute allowedRole="SHOP">
                <ShopStatistics />
              </ProtectedRoute>
            } />
            <Route path="/shop/notifications" element={
              <ProtectedRoute allowedRole="SHOP">
                <CustomerNotifications />
              </ProtectedRoute>
            } />
            <Route path="/shop/profile" element={
              <ProtectedRoute allowedRole="SHOP">
                <ShopProfile />
              </ProtectedRoute>
            } />
            <Route path="/shop/orders" element={
              <ProtectedRoute allowedRole="SHOP">
                <ShopOrders />
              </ProtectedRoute>
            } />
            <Route path="/shop/order/:id" element={
              <ProtectedRoute allowedRole="SHOP">
                <OrderDetail />
              </ProtectedRoute>
            } />
          </Route>

          <Route 
            path="/shop/book" 
            element={<Navigate to="/shop" replace />}
          />
          <Route 
            path="/shop/book/:serviceType" 
            element={
              <ProtectedRoute allowedRole="SHOP">
                <ShopBookingFlow />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/shop/menu" 
            element={
              <ProtectedRoute allowedRole="SHOP">
                <ShopMenuManager />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/shop/order/:id" 
            element={
              <ProtectedRoute allowedRole="SHOP">
                <OrderDetail />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AnimatePresence>
      </div>
    </>
  );
}

export default App;
