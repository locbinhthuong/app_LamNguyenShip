import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Home } from 'lucide-react';
import { registerCustomer, getRegionConfig } from '../services/api';
import LocationPicker from '../components/LocationPicker';
import { motion, AnimatePresence } from 'framer-motion';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    role: 'CUSTOMER',
    region: '',
    shopName: '',
    shopAddress: '',
    defaultLocation: null
  });
  const [regions, setRegions] = useState([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRegions();
  }, []);

  const fetchRegions = async () => {
    try {
      const res = await getRegionConfig();
      if (res && res.success && res.data && Array.isArray(res.data.value)) {
        setRegions(res.data.value);
        if (res.data.value.length > 0) {
          setFormData(prev => ({ ...prev, region: res.data.value[0] }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch regions', err);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleSelect = (selectedRole) => {
    setFormData({ ...formData, role: selectedRole });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate
    if (formData.role === 'SHOP' && !formData.shopName) {
      setError('Vui lòng nhập tên cửa hàng');
      setLoading(false);
      return;
    }

    try {
      const response = await registerCustomer(formData);
      
      if (response.success) {
        const { token, user } = response.data;
        localStorage.setItem('customerToken', token);
        localStorage.setItem('customerRole', user.role);
        localStorage.setItem('customerData', JSON.stringify(user));
        localStorage.setItem('activeMode', user.role);

        if (user.role === 'SHOP') {
          navigate('/shop', { replace: true });
        } else {
          const intended = localStorage.getItem('intendedService');
          if (intended) {
            localStorage.removeItem('intendedService');
            navigate('/');
          } else {
            navigate('/');
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đăng ký. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const fadeUpVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-blue-50 to-white relative overflow-hidden py-12">
      {/* Background decoration */}
      <div className="absolute top-[10%] left-[-10%] w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-[20%] right-[-10%] w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm bg-white/80 backdrop-blur-xl p-8 rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-white relative z-10"
      >
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[28px] font-extrabold text-slate-800 tracking-tight"
          >
            Tạo tài khoản
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[13px] font-medium text-slate-500 mt-2 tracking-wide"
          >
            Cùng trải nghiệm giao hàng thần tốc
          </motion.p>
        </div>

        {/* Chọn Vai Trò */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex gap-2 mb-8 bg-[#f0f4ff] p-1.5 rounded-[20px]"
        >
          <button
            type="button"
            onClick={() => handleRoleSelect('CUSTOMER')}
            className={`flex-1 py-3 rounded-[16px] text-[13px] font-bold transition-all relative ${
              formData.role === 'CUSTOMER' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Khách Cá Nhân
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('SHOP')}
            className={`flex-1 py-3 rounded-[16px] text-[13px] font-bold transition-all relative ${
              formData.role === 'SHOP' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Chủ Cửa Hàng
          </button>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3 bg-red-50/80 border border-red-100 text-red-600 rounded-2xl text-sm text-center font-medium"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleRegister} className="space-y-4">
          <motion.div variants={fadeUpVariant} initial="hidden" animate="visible" transition={{ delay: 0.4 }}>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Tôi cần gọi bạn là gì?</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3.5 bg-[#f0f4ff] rounded-2xl border-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
              placeholder="Ví dụ: Anh Tiến Đẹp Trai"
              required
            />
          </motion.div>

          <motion.div variants={fadeUpVariant} initial="hidden" animate="visible" transition={{ delay: 0.45 }} className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Khu vực hoạt động</label>
            <select
              name="region"
              value={formData.region}
              onChange={handleInputChange}
              className="w-full px-4 py-3.5 bg-[#f0f4ff] rounded-2xl border-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium outline-none transition-all cursor-pointer appearance-none"
              required
            >
              {regions.length > 0 ? (
                regions.map((reg, idx) => (
                  <option key={idx} value={reg}>{reg}</option>
                ))
              ) : (
                <option value="" disabled>Chưa có khu vực (Vui lòng thêm ở Admin)</option>
              )}
            </select>
            {/* Custom arrow for select */}
            <div className="absolute right-4 top-[44px] pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {formData.role === 'SHOP' && (
              <motion.div 
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                className="p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-2xl border border-blue-100 space-y-3 overflow-hidden"
              >
                <h3 className="font-bold text-blue-800 text-[13px] mb-2">Thông tin Cửa Hàng (Bắt buộc)</h3>
                <div>
                  <input
                    type="text"
                    name="shopName"
                    value={formData.shopName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white rounded-xl border border-blue-100 focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium outline-none transition-all placeholder:text-slate-400 placeholder:font-normal text-[13px]"
                    placeholder="Tên shop/quán ăn (Vd: Quán Ốc 99)"
                  />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    name="shopAddress"
                    value={formData.shopAddress}
                    onChange={handleInputChange}
                    className="w-full pl-4 pr-24 py-3 bg-white rounded-xl border border-blue-100 focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium outline-none transition-all placeholder:text-slate-400 placeholder:font-normal text-[13px]"
                    placeholder="Địa chỉ lấy hàng"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-blue-100/80 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-blue-200 active:scale-95 transition-all"
                  >
                    <MapPin size={14} /> Bản đồ
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={fadeUpVariant} initial="hidden" animate="visible" transition={{ delay: 0.5 }}>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Số điện thoại đăng nhập</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-4 py-3.5 bg-[#f0f4ff] rounded-2xl border-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
              placeholder="Ví dụ: 0901234567"
              required
            />
          </motion.div>

          <motion.div variants={fadeUpVariant} initial="hidden" animate="visible" transition={{ delay: 0.6 }}>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Mật khẩu (ít nhất 6 ký tự)</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-3.5 bg-[#f0f4ff] rounded-2xl border-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
              placeholder="Nhập mật khẩu"
              required
              minLength={6}
            />
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className={`w-full py-4 mt-6 rounded-2xl text-white font-bold text-[15px] flex justify-center items-center shadow-[0_8px_20px_rgba(37,99,235,0.2)] transition-all ${
              loading ? 'bg-blue-400' : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:shadow-[0_8px_25px_rgba(37,99,235,0.3)]'
            }`}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Tham Gia Ngay'
            )}
          </motion.button>
        </form>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 space-y-5"
        >
          <p className="text-center text-[13px] text-slate-500">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-blue-600 font-bold hover:text-blue-700 transition-colors">
              Đăng nhập
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

      <AnimatePresence>
        {showLocationPicker && (
          <LocationPicker
            onLocationSelect={(loc) => {
              setFormData({
                ...formData,
                shopAddress: loc.address,
                defaultLocation: loc
              });
              setShowLocationPicker(false);
            }}
            onClose={() => setShowLocationPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Register;
