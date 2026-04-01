import React, { createContext, useContext, useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const audioRef = React.useRef(null);
  const timerRef = React.useRef(null);

  // Tạo sẵn đối tượng Audio để giảm thiểu delay khi reo chuông cực mượt
  useEffect(() => {
    if (!audioRef.current) {
        audioRef.current = new Audio('/chuong.mp3');
        audioRef.current.load();
    }
  }, []);

  const stopAlarm = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const startAlarm = () => {
    stopAlarm();
    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.currentTime = 0;
      
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
         playPromise.catch(e => console.error("AutoPlay Blocked by Browser:", e));
      }

      // Giới hạn thời gian kêu 30 giây (Sếp yêu cầu)
      timerRef.current = setTimeout(() => {
          stopAlarm();
      }, 30000);
    }
  };

  const showToast = (message, type = 'info', duration = 4000) => {
    setToast({ message, type, id: Date.now(), duration });
  };

  useEffect(() => {
    // Sound & Persistent Logic
    if (toast && toast.duration === 30000 && toast.type === 'warning') {
      startAlarm();
    } else {
      stopAlarm();
    }

    let timer;
    if (toast && toast.duration > 0) {
      timer = setTimeout(() => {
        setToast(null);
      }, toast.duration);
    }

    return () => {
      clearTimeout(timer);
      stopAlarm(); // Cleanup sound on unmount or toast change
    };
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
        <div className="fixed top-4 right-4 z-[9999] px-4 flex justify-end w-full max-w-sm ml-auto pointer-events-none animate-[slideDown_0.3s_ease-out]">
          <div 
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border-2 w-full bg-opacity-95 cursor-pointer
              ${bgColors[toast.type]} 
              ${toast.duration === 0 ? 'animate-pulse ring-4 ring-orange-500/50 border-orange-500 scale-105 transition-transform' : ''}
            `}
            onClick={() => setToast(null)}
          >
            <div className={`shrink-0 mt-0.5 ${toast.duration === 0 ? 'animate-bounce' : ''}`}>
              {icons[toast.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 leading-snug break-words">
                {toast.message}
              </p>
              {toast.duration === 30000 && (
                <p className="text-[10px] text-red-500 font-extrabold mt-1 uppercase animate-pulse">
                  Nhấn vào đây để xác nhận!
                </p>
              )}
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setToast(null); }}
              className="shrink-0 text-gray-400 hover:text-gray-900 outline-none p-1 rounded-full hover:bg-black/10 bg-white/50"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};
