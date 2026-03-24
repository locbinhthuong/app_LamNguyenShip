import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || !password) { setError('Nhập đầy đủ thông tin'); return; }
    setLoading(true);
    setError('');
    try {
      await login(phone, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">🚚</span>
          </div>
          <h1 className="text-2xl font-bold text-white">LamNguyenShip</h1>
          <p className="text-gray-400 mt-1">Quản trị hệ thống</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-white mb-6">Đăng nhập Admin</h2>
          {error && <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Số điện thoại</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0909123456" className="input-field" />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Mật khẩu</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-field" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-gray-500 text-sm">
          <p>Tài khoản demo: 0909123456 / admin123</p>
        </div>
      </div>
    </div>
  );
}
