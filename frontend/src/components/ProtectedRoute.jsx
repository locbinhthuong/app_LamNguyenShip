import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem('customerToken');
  const userRole = localStorage.getItem('customerRole');
  const activeMode = localStorage.getItem('activeMode') || userRole;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Nếu user là SHOP, họ có quyền truy cập vào cả CUSTOMER routes, miễn là activeMode đang là CUSTOMER
  // Tuy nhiên, nếu user là CUSTOMER thì không bao giờ được phép truy cập SHOP routes
  if (allowedRole) {
    if (allowedRole === 'SHOP' && userRole !== 'SHOP') {
      return <Navigate to="/" replace />;
    }
    if (allowedRole === 'CUSTOMER' && activeMode === 'SHOP') {
      return <Navigate to="/shop" replace />;
    }
    if (allowedRole === 'SHOP' && activeMode === 'CUSTOMER') {
       return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
