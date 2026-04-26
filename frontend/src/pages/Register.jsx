import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { registerCustomer } from '../services/api';
import LocationPicker from '../components/LocationPicker';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    role: 'CUSTOMER',
    shopName: '',
    shopName: '',
    shopAddress: '',
    defaultLocation: null
  });
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

  return (
    <div className="flex flex-col items-center min-h-screen p-4 bg-blue-50 pt-10 pb-10">
      <div className="w-full max-w-sm bg-white p-6 sm:p-8 rounded-3xl shadow-xl transition-all">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Tạo tài khoản</h1>
          <p className="text-sm text-gray-500 mt-1">Cùng trải nghiệm giao hàng thần tốc</p>
        </div>

        {/* Chọn Vai Trò */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => handleRoleSelect('CUSTOMER')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              formData.role === 'CUSTOMER' ? 'bg-white text-blue-600' : 'text-gray-500'
            }`}
          >
            Khách Cá Nhân
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('SHOP')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              formData.role === 'SHOP' ? 'bg-white text-blue-600' : 'text-gray-500'
            }`}
          >
            Chủ Cửa Hàng
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tôi cần gọi bạn là gì?</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Ví dụ: Anh Tiến Đẹp Trai"
              required
            />
          </div>

          {formData.role === 'SHOP' && (
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-3">
              <h3 className="font-semibold text-blue-800 text-sm">Thông tin Cửa Hàng (Bắt buộc)</h3>
              <div>
                <input
                  type="text"
                  name="shopName"
                  value={formData.shopName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-blue-200 focus:border-blue-500 outline-none text-sm"
                  placeholder="Tên shop/quán ăn (Vd: Quán Ốc 99)"
                />
              </div>
              <div className="relative">
                <input
                  type="text"
                  name="shopAddress"
                  value={formData.shopAddress}
                  onChange={handleInputChange}
                  className="w-full pl-3 pr-24 py-2.5 rounded-xl border border-blue-200 focus:border-blue-500 outline-none text-sm"
                  placeholder="Địa chỉ quán cố định lấy hàng"
                />
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-blue-200 active:scale-95 transition-all"
                >
                  <MapPin size={14} /> Bản đồ
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại đăng nhập</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Ví dụ: 0901234567"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu (ít nhất 6 ký tự)</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Nhập mật khẩu"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 mt-4 rounded-xl text-white font-semibold flex justify-center items-center shadow-md active:scale-95 transition-all ${
              loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-500'
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
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>

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
    </div>
  );
};

export default Register;
