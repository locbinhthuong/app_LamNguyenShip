import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import OrderDetail from './pages/OrderDetail';
import MyOrders from './pages/MyOrders';
import Profile from './pages/Profile';

const PrivateRoute = ({ children }) => {
  const { driver, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return driver ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/order/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
      <Route path="/my-orders" element={<PrivateRoute><MyOrders /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
