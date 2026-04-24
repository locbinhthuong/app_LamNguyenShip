import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [zaloLoading, setZaloLoading] = useState(false);
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

  // Đăng nhập bằng Zalo Mini App SDK
  const handleZaloLogin = async () => {
    setError('');
    setZaloLoading(true);

    // Kiểm tra SDK Zalo đã load chưa
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

      // Sử dụng Zalo SDK để lấy OAuth code
      const oauth = window.ZaloSDK.OAuth;
      const authenResponse = await new Promise((resolve, reject) => {
        if (oauth && typeof oauth.authenticate === 'function') {
          oauth.authenticate(
            { appId: zaloAppId, redirectUri: window.location.href },
            (response) => {
              if (response?.code) {
                resolve(response);
              } else {
                reject(new Error(response?.error || 'Không lấy được mã Zalo'));
              }
            }
          );
        } else {
          reject(new Error('Zalo SDK không hỗ trợ OAuth trên nền tảng này'));
        }
      });

      const authCode = authenResponse.code;

      if (!authCode) {
        throw new Error('Không lấy được mã xác thực từ Zalo');
      }

      // Gửi code lên backend để lấy thông tin user
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/zalo/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authCode })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Đăng nhập Zalo thất bại');
      }

      const { token, driver } = result.data;
      localStorage.setItem('driver_token', token);
      localStorage.setItem('driver_info', JSON.stringify(driver));

      if (driver.isNewUser) {
        navigate('/profile');
      } else {
        navigate('/');
      }
    } catch (err) {
      const msg = err.message || 'Đăng nhập Zalo thất bại';
      if (msg.includes('SDK') || msg.includes('Zalo')) {
        setError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setZaloLoading(false);
    }
  };

  // Fallback: Web Zalo OAuth (chạy trên trình duyệt)
  const handleZaloWebLogin = () => {
    const appId = import.meta.env.VITE_ZALO_APP_ID;
    const redirectUri = encodeURIComponent(window.location.origin + '/zalo-callback');
    const oauthUrl = `https://oauth.zaloapp.com/v4/oauth/authorize?app_id=${appId}&redirect_uri=${redirectUri}&state=lamnguyenship_driver`;
    window.location.href = oauthUrl;
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 pt-[max(4rem,env(safe-area-inset-top))] text-center">
        <div className="w-36 h-36 bg-white/25 backdrop-blur-md border border-white/40 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-xl p-4">
          <img 
            src="/logoALOSHIPP.png" 
            alt="AloShipp Logo" 
            className="w-full h-full object-contain drop-shadow-md"
          />
        </div>
        <h1 className="text-3xl font-bold text-slate-800">AloShipp</h1>
        <p className="text-blue-200 mt-2">Ứng dụng dành cho Tài Xế</p>
      </div>

      {/* Form */}
      <div className="-mt-6 flex-1 p-4 pb-8 sm:p-6">
        <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Đăng Nhập</h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Nút đăng nhập Zalo */}
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
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
