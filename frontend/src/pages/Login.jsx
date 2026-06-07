import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { loginCustomer } from '../services/api';
import { motion } from 'framer-motion';

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
      let msg = err.response?.data?.message || 'Không thể đăng nhập. Vui lòng thử lại.';
      if (msg === 'Sai tài khoản hoặc mật khẩu') {
        msg = 'Sai tài khoản hoặc mật khẩu (Invalid credentials)';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-blue-50 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm bg-white/80 backdrop-blur-xl p-8 rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-white relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
            className="inline-flex items-center justify-center mb-2"
          >
            <img src="/logoALOSHIPP.png" alt="AloShipp Logo" className="w-56 object-contain" />
          </motion.div>
          <h1 className="hidden">AloShipp</h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[13px] font-medium text-slate-500 mt-2 tracking-wide"
          >
            Nhanh chóng & An toàn
          </motion.p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-5 p-3 bg-red-50/80 border border-red-100 text-red-600 rounded-2xl text-sm text-center font-medium"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Số điện thoại</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#f0f4ff] rounded-2xl border-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
              placeholder="Nhập số điện thoại"
              required
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#f0f4ff] rounded-2xl border-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
              placeholder="Nhập mật khẩu"
              required
            />
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className={`w-full py-4 mt-4 rounded-2xl text-white font-bold text-[15px] flex justify-center items-center shadow-[0_8px_20px_rgba(37,99,235,0.2)] transition-all ${loading ? 'bg-blue-400' : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:shadow-[0_8px_25px_rgba(37,99,235,0.3)]'
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
          </motion.button>
        </form>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 space-y-5"
        >
          <p className="text-center text-[13px] text-slate-500">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-blue-600 font-bold hover:text-blue-700 transition-colors">
              Đăng ký ngay
            </Link>
          </p>
          <div className="flex justify-center border-t border-slate-100 pt-5">
            <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-semibold text-sm bg-slate-50 px-4 py-2 rounded-full">
              <Home size={16} />
              <span>Trang chủ</span>
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
