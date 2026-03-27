import { useState, useEffect } from 'react';

export default function PromptModal({ isOpen, title, message, placeholder, type = "text", submitText, cancelText, onSubmit, onCancel }) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(inputValue);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
            {message && <p className="text-sm text-slate-500 font-medium mb-4">{message}</p>}
            
            <input
              type={type}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder || "Nhập giá trị..."}
              className="w-full rounded-xl border border-slate-300 p-3 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              autoFocus
            />
          </div>
          <div className="flex gap-3 px-6 pb-6 w-full">
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              {cancelText || 'Hủy bỏ'}
            </button>
            <button 
              type="submit"
              className="flex-1 rounded-xl py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
            >
              {submitText || 'Xác nhận'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
