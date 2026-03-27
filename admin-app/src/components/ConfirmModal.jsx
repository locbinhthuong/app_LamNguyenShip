export default function ConfirmModal({ isOpen, title, message, confirmText, cancelText, onConfirm, onCancel, isDestructive }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-4 ${isDestructive ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'}`}>
            {isDestructive ? '🗑️' : '❓'}
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 font-medium">{message}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6 w-full mt-2">
          <button 
            onClick={onCancel}
            className="flex-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            {cancelText || 'Hủy bỏ'}
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 font-bold text-white transition-colors shadow-lg ${
              isDestructive ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
            }`}
          >
            {confirmText || 'Đồng ý'}
          </button>
        </div>
      </div>
    </div>
  );
}
