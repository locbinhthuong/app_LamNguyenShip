import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDriver } from '../services/api';

export default function CreateDriver() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    vehicleType: 'motorcycle',
    licensePlate: '',
    commissionRate: 15
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.password) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (form.password.length < 6) {
      setError('Mật khẩu phải ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createDriver(form);
      alert('Thêm tài xế thành công!');
      navigate('/drivers');
    } catch (err) {
      setError(err.response?.data?.message || 'Thêm tài xế thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl p-4 pb-8 sm:p-6">
      <h1 className="mb-5 text-lg font-bold text-slate-800 sm:mb-6 sm:text-2xl">👤 Thêm Tài Xế Mới</h1>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/50 bg-red-500/20 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Họ tên <span className="text-red-400">*</span></label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Trần Văn Tài"
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Số điện thoại <span className="text-red-400">*</span></label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="0911111111"
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Mật khẩu <span className="text-red-400">*</span></label>
            <input
              name="password"
              value={form.password}
              onChange={handleChange}
              type="password"
              placeholder="Ít nhất 6 ký tự"
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Loại xe</label>
            <select name="vehicleType" value={form.vehicleType} onChange={handleChange} className="input-field">
              <option value="motorcycle">🏍️ Xe máy</option>
              <option value="car">🚗 Ô tô</option>
              <option value="bike">🚴 Xe đạp</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Biển số xe</label>
            <input
              name="licensePlate"
              value={form.licensePlate}
              onChange={handleChange}
              placeholder="59P1-12345"
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Mức chiết khấu (% Lợi nhuận Công ty thu)</label>
            <select name="commissionRate" value={form.commissionRate} onChange={handleChange} className="input-field font-bold text-slate-700 bg-sky-50 border-sky-200">
              <option value={15}>15% (Tiêu chuẩn)</option>
              <option value={20}>20% (Cao cấp)</option>
            </select>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/drivers')}
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
                  Đang thêm...
                </>
              ) : '✅ Thêm tài xế'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
