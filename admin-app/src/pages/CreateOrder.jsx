import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '../services/api';

export default function CreateOrder() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    pickupAddress: '',
    deliveryAddress: '',
    items: '',
    note: '',
    codAmount: '',
    deliveryFee: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerName || !form.customerPhone || !form.pickupAddress || !form.deliveryAddress) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const items = form.items ? form.items.split('\n').filter(i => i.trim()) : [];
      await createOrder({
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        pickupAddress: form.pickupAddress,
        deliveryAddress: form.deliveryAddress,
        items,
        note: form.note,
        codAmount: form.codAmount ? parseInt(form.codAmount) : 0,
        deliveryFee: form.deliveryFee ? parseInt(form.deliveryFee) : 0
      });
      alert('Tạo đơn hàng thành công!');
      navigate('/orders');
    } catch (err) {
      setError(err.response?.data?.message || 'Tạo đơn thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-6">📦 Tạo Đơn hàng Mới</h1>

      <div className="card">
        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Tên khách hàng *</label>
              <input name="customerName" value={form.customerName} onChange={handleChange} placeholder="Nguyễn Văn A" className="input-field" />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Số điện thoại *</label>
              <input name="customerPhone" value={form.customerPhone} onChange={handleChange} placeholder="0909123456" className="input-field" />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Địa chỉ lấy hàng *</label>
            <input name="pickupAddress" value={form.pickupAddress} onChange={handleChange} placeholder="123 Nguyễn Trãi, Quận 1, TP.HCM" className="input-field" />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Địa chỉ giao hàng *</label>
            <input name="deliveryAddress" value={form.deliveryAddress} onChange={handleChange} placeholder="456 Lê Lợi, Quận 1, TP.HCM" className="input-field" />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Hàng hóa (mỗi dòng 1 món)</label>
            <textarea name="items" value={form.items} onChange={handleChange} rows={3}
              placeholder={"2x Bánh mì thịt\n1x Trà sữa"} className="input-field resize-none" />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Ghi chú</label>
            <input name="note" value={form.note} onChange={handleChange} placeholder="Giao nhanh giúp em" className="input-field" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Thu hộ (COD)</label>
              <input name="codAmount" value={form.codAmount} onChange={handleChange} type="number" placeholder="75000" className="input-field" />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Phí giao hàng</label>
              <input name="deliveryFee" value={form.deliveryFee} onChange={handleChange} type="number" placeholder="20000" className="input-field" />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Đang tạo...' : '✅ Tạo đơn hàng'}
            </button>
            <button type="button" onClick={() => navigate('/orders')} className="btn-secondary px-6">Hủy</button>
          </div>
        </form>
      </div>
    </div>
  );
}
