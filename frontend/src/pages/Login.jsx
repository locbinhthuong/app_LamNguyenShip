import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginCustomer } from '../services/api';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await loginCustomer({ phone, password });
      
      if (response.success) {
        const { token, user } = response.data;
        // Lưu thông tin đăng nhập
        localStorage.setItem('customerToken', token);
        localStorage.setItem('customerRole', user.role);
        localStorage.setItem('customerData', JSON.stringify(user));

        // Điều hướng dựa trên role
        if (user.role === 'SHOP') {
          navigate('/shop', { replace: true });
        } else {
          const intended = localStorage.getItem('intendedService');
          if (intended) {
            localStorage.removeItem('intendedService');
            // Sau này sẽ navigate('/customer/book/' + intended)
            navigate('/');
          } else {
            navigate('/');
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đăng nhập. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-orange-50">
      <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl transition-all">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/logoALOSHIPP.png" alt="AloShipp Logo" className="h-32 w-auto drop-shadow-sm scale-125" />
          </div>
          <h1 className="hidden">AloShipp</h1>
          <p className="text-sm text-gray-500 mt-1">Nhanh chóng & An toàn</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
              placeholder="Nhập số điện thoại"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 mt-2 rounded-xl text-white font-semibold flex justify-center items-center shadow-md active:scale-95 transition-all ${
              loading ? 'bg-orange-400' : 'bg-orange-600 hover:bg-orange-500'
            }`}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Đăng Nhập'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-orange-600 font-semibold hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
