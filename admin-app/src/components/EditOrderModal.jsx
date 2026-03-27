import { useState, useEffect } from 'react';

export default function EditOrderModal({ isOpen, onClose, order, onSave }) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    pickupAddress: '',
    deliveryAddress: '',
    codAmount: 0,
    deliveryFee: 0,
    note: ''
  });

  useEffect(() => {
    if (order) {
      setFormData({
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        pickupAddress: order.pickupAddress || '',
        deliveryAddress: order.deliveryAddress || '',
        codAmount: order.codAmount || 0,
        deliveryFee: order.deliveryFee || 0,
        note: order.note || ''
      });
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'codAmount' || name === 'deliveryFee' ? Number(value) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(order._id, formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Cập nhật Đơn #{order.orderCode || order._id.slice(-8)}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 rounded-lg p-2 bg-slate-100 font-bold">✕ Đóng</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tên khách hàng</label>
              <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Số điện thoại</label>
              <input type="text" name="customerPhone" value={formData.customerPhone} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Địa chỉ lấy hàng</label>
            <input type="text" name="pickupAddress" value={formData.pickupAddress} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none" />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Địa chỉ giao hàng</label>
            <input type="text" name="deliveryAddress" value={formData.deliveryAddress} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tiền thu hộ (COD)</label>
              <input type="number" name="codAmount" value={formData.codAmount} onChange={handleChange} min="0" className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cước phí giao hàng</label>
              <input type="number" name="deliveryFee" value={formData.deliveryFee} onChange={handleChange} min="0" required className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú</label>
            <textarea name="note" value={formData.note} onChange={handleChange} rows="2" className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none" placeholder="Lưu ý khi giao..."></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 transition-colors">Hủy</button>
            <button type="submit" className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">Lưu thay đổi</button>
          </div>
        </form>
      </div>
    </div>
  );
}
