import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import CreateOrder from './pages/CreateOrder';
import Drivers from './pages/Drivers';
import CreateDriver from './pages/CreateDriver';
import DriverMap from './pages/DriverMap';
import Revenue from './pages/Revenue';
import DriverDetail from './pages/DriverDetail';
import Announcements from './pages/Announcements';
import Finance from './pages/Finance';
import Customers from './pages/Customers';
import Dispatchers from './pages/Dispatchers';
import Layout from './components/Layout';

const PrivateRoute = ({ children }) => {
  const { admin, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-50"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!admin) return <Navigate to="/login" />;
  return children;
};

import { useEffect } from 'react';

export default function App() {
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
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/create" element={<CreateOrder />} />
        <Route path="driver-map" element={<DriverMap />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="drivers/create" element={<CreateDriver />} />
        <Route path="drivers/:id" element={<DriverDetail />} />
        <Route path="finance" element={<Finance />} />
        <Route path="revenue" element={<Revenue />} />
        <Route path="customers" element={<Customers />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="dispatchers" element={<Dispatchers />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
