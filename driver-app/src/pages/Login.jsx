import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(phone, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 pt-16 text-center">
        <div className="w-20 h-20 bg-white rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-xl">
          <span className="text-4xl">🚚</span>
        </div>
        <h1 className="text-3xl font-bold text-white">LamNguyenShip</h1>
        <p className="text-blue-200 mt-2">Ứng dụng dành cho Tài Xế</p>
      </div>

      {/* Form */}
      <div className="flex-1 p-6 -mt-6">
        <div className="bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Đăng Nhập</h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Số điện thoại</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại"
                className="input-field"
                autoComplete="tel"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="input-field pr-12"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang đăng nhập...
                </span>
              ) : 'Đăng Nhập'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Liên hệ quản lý nếu chưa có tài khoản
        </p>
      </div>
    </div>
  );
}
