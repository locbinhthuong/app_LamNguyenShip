import React, { createContext, useContext, useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const audioCtxRef = React.useRef(null);
  const intervalRef = React.useRef(null);

  const stopAlarm = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startAlarm = () => {
    stopAlarm();
    const playTelephoneRing = () => {
       try {
           if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
           if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();

           // Tạo âm thanh Dual-Tone (440Hz + 480Hz) đặc trưng của Điện Thoại Quay Số
           const osc1 = audioCtxRef.current.createOscillator();
           const osc2 = audioCtxRef.current.createOscillator();
           const masterGain = audioCtxRef.current.createGain();
           const lfo = audioCtxRef.current.createOscillator();
           const lfoGain = audioCtxRef.current.createGain();

           // Set Tần số
           osc1.frequency.value = 440;
           osc2.frequency.value = 480;
           osc1.type = 'sine';
           osc2.type = 'sine';

           // Set LFO băm sóng rung chóp chép (Reng Reng Reng) ở tốc độ 20 rung/giây
           lfo.frequency.value = 20;
           lfo.type = 'square';
           
           lfo.connect(lfoGain);
           lfoGain.connect(masterGain.gain);
           
           osc1.connect(masterGain);
           osc2.connect(masterGain);
           masterGain.connect(audioCtxRef.current.destination);

           // Nén âm lượng
           masterGain.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
           lfoGain.gain.value = 0.5;

           // Phát âm trong 2 giây rồi ngắt (Đổ 1 hồi chuông dài)
           masterGain.gain.setTargetAtTime(0.5, audioCtxRef.current.currentTime, 0.01);
           
           osc1.start();
           osc2.start();
           lfo.start();
           
           masterGain.gain.setTargetAtTime(0, audioCtxRef.current.currentTime + 1.5, 0.01);
           
           osc1.stop(audioCtxRef.current.currentTime + 2);
           osc2.stop(audioCtxRef.current.currentTime + 2);
           lfo.stop(audioCtxRef.current.currentTime + 2);
       } catch (e) {}
    };
    
    // Đổ 1 hồi ngay rồi lặp lại mỗi 3.5 giây
    playTelephoneRing();
    intervalRef.current = setInterval(playTelephoneRing, 3500);
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
