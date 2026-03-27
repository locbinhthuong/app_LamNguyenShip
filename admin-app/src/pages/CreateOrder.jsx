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
    <div className="mx-auto max-w-3xl p-4 pb-8 sm:p-6">
      <h1 className="mb-5 text-lg font-bold text-slate-800 sm:mb-6 sm:text-2xl">📦 Tạo Đơn hàng Mới</h1>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/50 bg-red-500/20 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Tên khách hàng <span className="text-red-400">*</span></label>
              <input
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Số điện thoại <span className="text-red-400">*</span></label>
              <input
                name="customerPhone"
                value={form.customerPhone}
                onChange={handleChange}
                placeholder="0909123456"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Địa chỉ lấy hàng <span className="text-red-400">*</span></label>
            <input
              name="pickupAddress"
              value={form.pickupAddress}
              onChange={handleChange}
              placeholder="123 Nguyễn Trãi, Quận 1, TP.HCM"
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Địa chỉ giao hàng <span className="text-red-400">*</span></label>
            <input
              name="deliveryAddress"
              value={form.deliveryAddress}
              onChange={handleChange}
              placeholder="456 Lê Lợi, Quận 1, TP.HCM"
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Hàng hóa <span className="text-slate-500">(mỗi dòng 1 món)</span></label>
            <textarea
              name="items"
              value={form.items}
              onChange={handleChange}
              rows={3}
              placeholder={"2x Bánh mì thịt\n1x Trà sữa"}
              className="input-field resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Ghi chú</label>
            <input
              name="note"
              value={form.note}
              onChange={handleChange}
              placeholder="Giao nhanh giúp em"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Thu hộ (COD)</label>
              <input
                name="codAmount"
                value={form.codAmount}
                onChange={handleChange}
                type="number"
                placeholder="75000"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Phí giao hàng</label>
              <input
                name="deliveryFee"
                value={form.deliveryFee}
                onChange={handleChange}
                type="number"
                placeholder="20000"
                className="input-field"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="btn-secondary w-full px-6 sm:w-auto"
            >
              ← Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang tạo...
                </>
              ) : '✅ Tạo đơn hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
