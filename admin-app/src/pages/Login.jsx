import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../services/api';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [zaloLoading, setZaloLoading] = useState(false);
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
      const msg = err.response?.data?.message || err.message || 'Đăng nhập thất bại';
      const isNetwork = err.code === 'ERR_NETWORK' || msg === 'Network Error';
      setError(isNetwork
        ? 'Không kết nối được máy chủ. Kiểm tra backend đang chạy (port 5000) hoặc cấu hình VITE_API_URL.'
        : msg);
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập bằng Zalo Mini App SDK
  const handleZaloLogin = async () => {
    setError('');
    setZaloLoading(true);

    if (typeof window.ZaloSDK === 'undefined') {
      setError('Chưa tải được Zalo SDK. Hãy mở trong Zalo.');
      setZaloLoading(false);
      return;
    }

    try {
      const zaloAppId = import.meta.env.VITE_ZALO_APP_ID;
      if (!zaloAppId) {
        setError('Thiếu cấu hình Zalo App ID. Liên hệ quản lý.');
        setZaloLoading(false);
        return;
      }

      const oauth = window.ZaloSDK.OAuth;
      const authenResponse = await new Promise((resolve, reject) => {
        if (oauth && typeof oauth.authenticate === 'function') {
          oauth.authenticate(
            { appId: zaloAppId, redirectUri: window.location.href },
            (response) => {
              if (response?.code) resolve(response);
              else reject(new Error(response?.error || 'Không lấy được mã Zalo'));
            }
          );
        } else {
          reject(new Error('Zalo SDK không hỗ trợ trên nền tảng này'));
        }
      });

      const authCode = authenResponse.code;

      // Gửi code lên backend
      const response = await fetch(`${API_BASE_URL}/api/auth/zalo/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authCode })
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Đăng nhập Zalo thất bại');
      }

      const { token, driver } = result.data;
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_info', JSON.stringify(driver));
      navigate('/');
    } catch (err) {
      setError(err.message || 'Đăng nhập Zalo thất bại');
    } finally {
      setZaloLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center">
              <img src="/logoALOSHIPP.png" alt="AloShipp Logo" className="h-28 w-auto object-contain scale-125" />
            </div>
            <h1 className="hidden text-2xl font-bold text-slate-800">AloShipp</h1>
            <p className="text-slate-500 mt-1">Quản trị hệ thống</p>
          </div>

          <h2 className="text-lg font-bold text-slate-800 mb-6 border-t border-slate-100 pt-6">Đăng nhập Admin</h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Nút Zalo */}
          <button
            type="button"
            onClick={handleZaloLogin}
            disabled={zaloLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl mb-4 flex items-center justify-center gap-3 transition-colors active:scale-95"
          >
            {zaloLoading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang kết nối Zalo...
              </>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="24" fill="#0068FF"/>
                  <path d="M24 10C15.178 10 8 16.4 8 24c0 5.14 2.8 9.68 7 12.3V33l7.1-4c1.5.4 3 .6 4.9.6 8.82 0 16-6.4 16-14S32.82 10 24 10z" fill="#fff"/>
                </svg>
                Đăng nhập bằng Zalo
              </>
            )}
          </button>

          {/* Phân cách */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-600"></div>
            <span className="text-slate-500 text-sm">hoặc</span>
            <div className="flex-1 h-px bg-slate-600"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-600 text-sm font-medium mb-2">Số điện thoại</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0909123456" className="input-field" />
            </div>
            <div>
              <label className="block text-slate-600 text-sm font-medium mb-2">Mật khẩu</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-field" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-slate-500 text-sm">
          <p>Tài khoản demo: 0909123456 / admin123</p>
        </div>
      </div>
    </div>
  );
}
