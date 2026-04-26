import { Routes, Route, Navigate } from 'react-router-dom';
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
import ShopBookingFlow from './pages/shop/ShopBookingFlow';
import ShopProfile from './pages/shop/ShopProfile';
import ShopActivity from './pages/shop/ShopActivity';
import { useAuthSocket } from './hooks/useAuthSocket';

import { useEffect } from 'react';

function App() {
  useAuthSocket();

  useEffect(() => {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
      setTimeout(() => {
        splashScreen.classList.add('fade-out');
        setTimeout(() => splashScreen.remove(), 500);
      }, 1500);
    }
  }, []);

  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col font-sans overflow-hidden relative">
      <Routes>
        {/* Các màn hình con của Khách hàng (Được dính Footer Layout) */}
        <Route element={<CustomerLayout />}>
          {/* Trang chủ mặc định là màn hình 4 dịch vụ (Cho phép Guest xem) */}
          <Route path="/" element={<CustomerDashboard />} />
          
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
          <Route path="/shop/order/:id" element={
            <ProtectedRoute allowedRole="SHOP">
              <OrderDetail />
            </ProtectedRoute>
          } />
        </Route>

        <Route 
          path="/shop/book" 
          element={
            <ProtectedRoute allowedRole="SHOP">
              <ShopBookingFlow />
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
    </div>
  );
}

export default App;
