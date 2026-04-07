import React, { createContext, useContext, useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const audioCtxRef = React.useRef(null);
  const audioBufferRef = React.useRef(null);
  const sourceNodeRef = React.useRef(null);
  const timerRef = React.useRef(null);

  // Tạo sẵn đối tượng Audio để giảm thiểu delay và giấu khỏi Màn Hình Khóa bằng WebAudio API
  useEffect(() => {
    const initSilentAudio = async () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
        
        const response = await fetch('/chuong.mp3');
        const arrayBuffer = await response.arrayBuffer();
        const decodedBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
        audioBufferRef.current = decodedBuffer;
      } catch (e) {
        console.error("Lỗi buffer mp3:", e);
      }
    };
    initSilentAudio();
  }, []);

  const stopAlarm = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
  };

  const startAlarm = () => {
    stopAlarm();
    
    if (audioCtxRef.current && audioBufferRef.current) {
      if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
      }
      
      const source = audioCtxRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioCtxRef.current.destination);
      source.loop = true;
      source.start(0);
      sourceNodeRef.current = source;

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
    // Removed internal broken audio logic because useAdminSocket.jsx handles sound playback properly

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
            onClick={() => {
              setToast(null);
              if (window.stopAdminAlarm) window.stopAdminAlarm();
            }}
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
                  Nhấn vào đây để xem rỏ hơn!
                </p>
              )}
            </div>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                setToast(null); 
                if (window.stopAdminAlarm) window.stopAdminAlarm();
              }}
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
