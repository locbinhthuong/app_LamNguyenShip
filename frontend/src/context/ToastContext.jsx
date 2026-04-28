import React, { createContext, useContext, useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info', duration = 4000) => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(current => current?.id === toast?.id ? null : current);
    }, duration);
  };

  useEffect(() => {
    let timer;
    if (toast) {
      timer = setTimeout(() => {
        setToast(null);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [toast]);

  const icons = {
    success: <CheckCircle className="text-green-500" size={24} />,
    error: <XCircle className="text-red-500" size={24} />,
    info: <Info className="text-blue-500" size={24} />,
    warning: <Bell className="text-orange-500" size={24} />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-orange-50 border-orange-200'
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast UI */}
      {toast && (
        <div className="fixed safe-pt left-0 right-0 z-[9999] px-4 flex justify-center w-full max-w-md mx-auto pointer-events-none animate-[slideDown_0.3s_ease-out]">
          <div className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-lg border ${bgColors[toast.type]} w-full backdrop-blur-sm bg-opacity-95`}>
            <div className="shrink-0 mt-0.5 animate-bounce">{icons[toast.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 leading-snug break-words">
                {toast.message}
              </p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="shrink-0 text-gray-400 hover:text-gray-600 outline-none p-1 rounded-full hover:bg-black/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};
