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
    licensePlate: ''
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
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold text-white mb-6">👤 Thêm Tài Xế Mới</h1>

      <div className="card">
        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Họ tên *</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Trần Văn Tài" className="input-field" />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Số điện thoại *</label>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="0911111111" className="input-field" />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Mật khẩu *</label>
            <input name="password" value={form.password} onChange={handleChange} type="password" placeholder="Ít nhất 6 ký tự" className="input-field" />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Loại xe</label>
            <select name="vehicleType" value={form.vehicleType} onChange={handleChange} className="input-field">
              <option value="motorcycle">🏍️ Xe máy</option>
              <option value="car">🚗 Ô tô</option>
              <option value="bike">🚴 Xe đạp</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Biển số xe</label>
            <input name="licensePlate" value={form.licensePlate} onChange={handleChange} placeholder="59P1-12345" className="input-field" />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Đang thêm...' : '✅ Thêm tài xế'}
            </button>
            <button type="button" onClick={() => navigate('/drivers')} className="btn-secondary px-6">Hủy</button>
          </div>
        </form>
      </div>
    </div>
  );
}
