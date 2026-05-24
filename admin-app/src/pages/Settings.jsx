import { useState, useEffect } from 'react';
import { getPricingConfig, updatePricingConfig } from '../services/configService';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [config, setConfig] = useState({
    tiers: [
      { maxKm: 3, price: 17000, type: 'fixed' },
      { maxKm: 4, price: 20000, type: 'fixed' },
      { maxKm: 5, price: 22000, type: 'fixed' },
      { maxKm: 6, price: 25000, type: 'fixed' },
      { maxKm: 8, price: 27000, type: 'fixed' },
      { maxKm: 10, price: 35000, type: 'fixed' },
      { maxKm: 99999, price: 5000, type: 'per_km' }
    ]
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await getPricingConfig();
      if (res.success && res.data && res.data.value && Array.isArray(res.data.value.tiers)) {
        setConfig(res.data.value);
      }
    } catch (err) {
      setErrorMsg('Không thể tải cấu hình giá');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTierChange = (index, field, value) => {
    const newTiers = [...config.tiers];
    newTiers[index] = {
      ...newTiers[index],
      [field]: Number(value) || 0
    };
    setConfig({ tiers: newTiers });
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

  // Calculate example 12km
  const tiers = config.tiers || [];
  let exampleFee = 0;
  let exampleText = [];
  if (tiers.length > 0) {
    const distanceKm = 12;
    let appliedTier = tiers.find(t => distanceKm <= t.maxKm) || tiers[tiers.length - 1];
    if (appliedTier.type === 'fixed') {
      exampleFee = appliedTier.price;
      exampleText.push(`- Rơi vào khung đến ${appliedTier.maxKm} km: Giá ${appliedTier.price.toLocaleString()}đ`);
    } else {
      const prevTierIndex = tiers.indexOf(appliedTier) - 1;
      const prevTier = prevTierIndex >= 0 ? tiers[prevTierIndex] : null;
      if (prevTier) {
        const extraKm = Math.max(0, distanceKm - prevTier.maxKm);
        exampleFee = prevTier.price + (extraKm * appliedTier.price);
        exampleText.push(`- Tiền khung cơ bản (${prevTier.maxKm} km): ${prevTier.price.toLocaleString()}đ`);
        exampleText.push(`- Tiền phụ trội (${extraKm} km x ${appliedTier.price.toLocaleString()}đ): ${(extraKm * appliedTier.price).toLocaleString()}đ`);
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Cấu Hình Tính Tiền Theo Quãng Đường</h1>
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
            <div className="space-y-4">
              <div className="hidden md:grid grid-cols-12 gap-6 items-center bg-slate-50 p-4 rounded-lg border border-slate-200 font-bold text-slate-700 text-sm">
                <div className="col-span-1 text-center">BẬC</div>
                <div className="col-span-6 text-center">KHOẢNG CÁCH MAX (KM)</div>
                <div className="col-span-5 text-center">GIÁ TIỀN GIAO MỨC NÀY</div>
              </div>
              
              {config.tiers?.map((tier, index) => {
                const isLast = index === config.tiers.length - 1;
                const prevTier = index > 0 ? config.tiers[index - 1] : null;
                const prevKm = prevTier ? (Number(prevTier.maxKm) + 0.1).toFixed(1) : 0;
                
                const distanceLabel = isLast 
                  ? `Áp dụng từ ${prevKm} km trở lên` 
                  : `(Áp dụng từ ${prevKm} km đến dưới mức này)`;
                
                return (
                  <div key={index} className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-6 items-start md:items-center p-4 md:p-3 bg-white md:bg-transparent hover:bg-slate-50 rounded-xl transition-colors border border-slate-200 md:border-slate-100 shadow-sm md:shadow-none relative">
                    <div className="w-full md:w-auto md:col-span-1 font-black text-slate-300 text-lg md:text-2xl border-b md:border-b-0 border-slate-100 pb-2 md:pb-0 mb-2 md:mb-0 flex justify-between md:block">
                      <span className="md:hidden text-slate-400">BẬC</span>
                      <span>{index + 1}</span>
                    </div>
                    
                    <div className="w-full md:col-span-6 flex flex-col">
                      <label className="text-xs font-bold text-blue-600 mb-1.5 md:hidden">{isLast ? 'KHOẢNG CÁCH' : 'KHOẢNG CÁCH MAX (KM)'}</label>
                      {isLast ? (
                         <div className="w-full text-center py-3 bg-amber-50 border border-amber-200 border-dashed rounded-xl text-amber-700 font-bold text-sm md:text-base">
                           {distanceLabel}
                         </div>
                      ) : (
                         <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={tier.maxKm}
                            onChange={(e) => handleTierChange(index, 'maxKm', e.target.value)}
                            className="w-full pl-4 md:pl-6 pr-12 py-3 md:py-4 bg-slate-50 md:bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-black text-lg md:text-xl text-blue-900"
                            required
                          />
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                            <span className="text-slate-400 font-bold">Km</span>
                          </div>
                          <div className="hidden md:block absolute -top-3 left-4 px-2 bg-white text-[10px] md:text-xs text-blue-600 font-bold rounded-full border border-blue-100">{distanceLabel}</div>
                        </div>
                      )}
                      <div className="md:hidden mt-1 text-[11px] text-slate-500 font-medium italic">{distanceLabel}</div>
                    </div>

                    <div className="w-full md:col-span-5 flex flex-col mt-2 md:mt-0">
                      <label className="text-xs font-bold text-emerald-600 mb-1.5 md:hidden">GIÁ TIỀN GIAO MỨC NÀY</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={tier.price}
                          onChange={(e) => handleTierChange(index, 'price', e.target.value)}
                          className="w-full pl-4 md:pl-6 pr-20 py-3 md:py-4 bg-emerald-50/50 md:bg-emerald-50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-black text-emerald-700 text-lg md:text-xl"
                          required
                        />
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                          <span className="text-emerald-600/70 text-xs md:text-sm font-black">{isLast ? 'đ / 1Km' : 'VNĐ'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-10 py-4 bg-blue-600 text-white font-black text-lg rounded-2xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition-all flex items-center shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    ĐANG LƯU...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    LƯU BẢNG GIÁ
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50 rounded-2xl p-8 shadow-sm">
        <h3 className="text-blue-900 font-black text-lg mb-4 flex items-center gap-3">
          <span className="bg-blue-200 w-8 h-8 rounded-full flex items-center justify-center text-xl">💡</span> 
          Ví dụ Thuật Toán Tính Tiền (Theo Cách B)
        </h3>
        <p className="text-blue-800 font-medium mb-4">
          Nếu khách mua bánh nhà cách Cửa hàng đúng <strong className="bg-blue-200 px-2 py-0.5 rounded text-blue-900">12 km</strong>:
        </p>
        <ul className="text-sm text-blue-800 space-y-3 font-mono bg-white/60 p-5 rounded-xl border border-blue-200/50">
          {exampleText.map((text, i) => (
             <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                {text}
             </li>
          ))}
          <li className="font-black text-rose-600 border-t-2 border-dashed border-blue-200 pt-4 text-xl mt-4">
            💸 TỔNG TIỀN SHIP: {exampleFee.toLocaleString()} đ
          </li>
        </ul>
      </div>

    </div>
  );
}
