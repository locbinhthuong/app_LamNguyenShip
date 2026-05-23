import { useState, useEffect } from 'react';
import { getPricingConfig, updatePricingConfig } from '../services/configService';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [config, setConfig] = useState({
    basePrice: 15000,
    baseDistance: 2,
    pricePerKm: 5000
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await getPricingConfig();
      if (res.success && res.data && res.data.value) {
        setConfig(res.data.value);
      }
    } catch (err) {
      setErrorMsg('Không thể tải cấu hình giá');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: Number(value) || 0
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await updatePricingConfig(config);
      if (res.success) {
        setSuccessMsg('Đã lưu cấu hình thành công!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setErrorMsg('Lỗi khi lưu cấu hình');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Cấu Hình Tính Tiền (App Bán Bánh)</h1>
      </div>

      {successMsg && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMsg}</p>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Giá Mở Cửa (VNĐ)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="basePrice"
                    value={config.basePrice}
                    onChange={handleChange}
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-sm">VNĐ</span>
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-500">Số tiền cố định cho khoảng cách ban đầu</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Khoảng Cách Cơ Bản (Km)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    name="baseDistance"
                    value={config.baseDistance}
                    onChange={handleChange}
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-sm">Km</span>
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-500">Bao nhiêu km đầu tiên sẽ tính giá mở cửa?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Giá Mỗi Km Tiếp Theo (VNĐ)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="pricePerKm"
                    value={config.pricePerKm}
                    onChange={handleChange}
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-sm">VNĐ</span>
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-500">Số tiền cộng thêm cho mỗi 1km vượt mức cơ bản</p>
              </div>

            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition-colors flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Lưu Cấu Hình
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
        <h3 className="text-blue-800 font-semibold mb-2">Ví dụ Công Thức Tính Tiền</h3>
        <p className="text-blue-700 text-sm mb-4">
          Nếu khoảng cách từ Cửa hàng bánh đến nhà Khách là <strong>5.5 km</strong>.
        </p>
        <ul className="text-sm text-blue-800 space-y-2 font-mono">
          <li>- Phí mở cửa ({config.baseDistance} km): {config.basePrice.toLocaleString()}đ</li>
          <li>- Phí km vượt quá ({Math.max(0, 5.5 - config.baseDistance)} km): {Math.max(0, 5.5 - config.baseDistance)} * {config.pricePerKm.toLocaleString()}đ = {(Math.max(0, 5.5 - config.baseDistance) * config.pricePerKm).toLocaleString()}đ</li>
          <li className="font-bold border-t border-blue-200 pt-2">- Tổng tiền ship: {(config.basePrice + Math.max(0, 5.5 - config.baseDistance) * config.pricePerKm).toLocaleString()}đ</li>
        </ul>
      </div>

    </div>
  );
}
