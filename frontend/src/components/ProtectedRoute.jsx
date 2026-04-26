import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem('customerToken');
  const userRole = localStorage.getItem('customerRole');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && userRole !== allowedRole) {
    return <Navigate to={userRole === 'SHOP' ? '/shop' : '/'} replace />;
  }

  return children;
};

export default ProtectedRoute;
