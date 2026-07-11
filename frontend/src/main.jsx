import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { ToastProvider } from './context/ToastContext';

// Bỏ qua lỗi hiển thị từ Extension MetaMask của trình duyệt
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason.toString === 'function' && event.reason.toString().includes('MetaMask')) {
    event.preventDefault();
  }
  if (event.reason && event.reason.message && event.reason.message.includes('MetaMask')) {
    event.preventDefault();
  }
});
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ToastProvider>
      <App />
    </ToastProvider>
  </BrowserRouter>
);
