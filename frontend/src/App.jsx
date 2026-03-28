import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import ShopDashboard from './pages/shop/ShopDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import BookingFlow from './pages/customer/BookingFlow';
import ActivityList from './pages/customer/ActivityList';
import CustomerLayout from './components/CustomerLayout';
import CustomerProfile from './pages/customer/CustomerProfile';
import CustomerNotifications from './pages/customer/CustomerNotifications';

function App() {
  return (
    <div className="mobile-container min-h-screen bg-gray-50 flex flex-col font-sans">
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
        </Route>

        {/* Các màn hình KHÔNG có Footer (Ví dụ: Form Lên Đơn, Đăng nhập, Shop) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Cửa Hàng (Shop) - Bắt buộc Đăng nhập */}
        <Route 
          path="/shop/*" 
          element={
            <ProtectedRoute allowedRole="SHOP">
              <ShopDashboard />
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
      </Routes>
    </div>
  );
}

export default App;
