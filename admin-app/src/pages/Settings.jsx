import { useState, useEffect } from 'react';
import { getPricingConfig, updatePricingConfig, getRegionConfig, updateRegionConfig, getAppVersionConfig, updateAppVersionConfig, getLateNightConfig, updateLateNightConfig } from '../services/configService';
import { getAdminProfile, updateAdminProfile } from '../services/api';
import { Trash2, Plus, Eye, EyeOff } from 'lucide-react';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [regions, setRegions] = useState([]);
  const [newRegion, setNewRegion] = useState('');

  const [appVersion, setAppVersion] = useState({
    driverApp: { minVersion: "1.0.0", storeUrlAndroid: "", storeUrlIos: "" },
    customerApp: { minVersion: "1.0.0", storeUrlAndroid: "", storeUrlIos: "" }
  });

  const [lateNightConfig, setLateNightConfig] = useState({
    level1: { time: "22:30", amount: 3000 },
    level2: { time: "23:30", amount: 5000 },
    endTime: "06:00"
  });

  const [adminProfile, setAdminProfile] = useState({ name: '', phone: '', oldPassword: '', password: '' });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);


  const [config, setConfig] = useState({
    tiers: [
      { maxKm: 3, price: 17000, type: 'fixed' },
      { maxKm: 4, price: 20000, type: 'fixed' },
      { maxKm: 5, price: 22000, type: 'fixed' },
      { maxKm: 6, price: 25000, type: 'fixed' },
      { maxKm: 8, price: 27000, type: 'fixed' },
      { maxKm: 10, price: 35000, type: 'fixed' },
      { maxKm: 99999, price: 5000, type: 'per_km' }
    ],
    xeOm: { pricePerKm: 5000 },
    laiHoXeMay: { initialKm: 2, initialPrice: 50000, pricePerKm: 10000 },
    laiHoOto: { initialKm: 2, initialPrice: 100000, pricePerKm: 20000 }
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const [pricingRes, regionRes, appVersionRes, adminProfileRes, lateNightRes] = await Promise.all([
        getPricingConfig(),
        getRegionConfig().catch(() => null),
        getAppVersionConfig().catch(() => null),
        getAdminProfile().catch(() => null),
        getLateNightConfig().catch(() => null)
      ]);

      if (pricingRes.success && pricingRes.data && pricingRes.data.value && Array.isArray(pricingRes.data.value.tiers)) {
        setConfig({
          tiers: pricingRes.data.value.tiers,
          xeOm: pricingRes.data.value.xeOm || { pricePerKm: 5000 },
          laiHoXeMay: pricingRes.data.value.laiHoXeMay || { initialKm: 2, initialPrice: 50000, pricePerKm: 10000 },
          laiHoOto: pricingRes.data.value.laiHoOto || { initialKm: 2, initialPrice: 100000, pricePerKm: 20000 }
        });
      }

      if (regionRes && regionRes.success && regionRes.data && Array.isArray(regionRes.data.value)) {
        setRegions(regionRes.data.value);
      } else {
        setRegions(['Cần Thơ', 'Vĩnh Long']);
      }

      if (appVersionRes && appVersionRes.success && appVersionRes.data && appVersionRes.data.value) {
        setAppVersion({
          driverApp: appVersionRes.data.value.driverApp || { minVersion: "1.0.0", storeUrlAndroid: "", storeUrlIos: "" },
          customerApp: appVersionRes.data.value.customerApp || { minVersion: "1.0.0", storeUrlAndroid: "", storeUrlIos: "" }
        });
      }

      if (lateNightRes && lateNightRes.success && lateNightRes.data && lateNightRes.data.value) {
        setLateNightConfig(lateNightRes.data.value);
      }

      if (adminProfileRes && adminProfileRes.success && adminProfileRes.data) {
        setAdminProfile({
          name: adminProfileRes.data.name || '',
          phone: adminProfileRes.data.phone || '',
          oldPassword: '',
          password: ''
        });
      }

    } catch (err) {
      setErrorMsg('Không thể tải cấu hình');
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
    setConfig({ ...config, tiers: newTiers });
  };

  const handleServiceChange = (service, field, value) => {
    setConfig({
      ...config,
      [service]: {
        ...config[service],
        [field]: Number(value) || 0
      }
    });
  };

  const handleAddRegion = () => {
    if (newRegion.trim() && !regions.includes(newRegion.trim())) {
      setRegions([...regions, newRegion.trim()]);
      setNewRegion('');
    }
  };

  const handleRemoveRegion = (index) => {
    const updated = [...regions];
    updated.splice(index, 1);
    setRegions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await updatePricingConfig(config);
      await updateRegionConfig(regions);
      await updateAppVersionConfig(appVersion);
      await updateLateNightConfig(lateNightConfig);
      
      const updateData = {};
      if (adminProfile.name) updateData.name = adminProfile.name;
      if (adminProfile.phone) updateData.phone = adminProfile.phone;
      if (adminProfile.password) {
        updateData.oldPassword = adminProfile.oldPassword;
        updateData.password = adminProfile.password;
      }
      
      if (Object.keys(updateData).length > 0) {
        try {
          await updateAdminProfile(updateData);
        } catch (adminErr) {
          setErrorMsg(adminErr.response?.data?.message || 'Lỗi khi cập nhật thông tin Admin');
          setSaving(false);
          return;
        }
      }
      
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
                  <div key={index} className="grid grid-cols-2 md:grid-cols-12 gap-x-3 gap-y-2 md:gap-6 items-start md:items-center p-3 md:p-3 bg-white md:bg-transparent hover:bg-slate-50 rounded-xl transition-colors border border-slate-200 md:border-slate-100 shadow-sm md:shadow-none relative">
                    <div className="col-span-2 md:col-span-1 font-black text-slate-300 text-sm md:text-2xl border-b md:border-b-0 border-slate-100 pb-1 md:pb-0 flex justify-between md:block">
                      <span className="md:hidden text-slate-400">BẬC</span>
                      <span className="text-lg md:text-2xl">{index + 1}</span>
                    </div>
                    
                    <div className="col-span-1 md:col-span-6 flex flex-col">
                      <label className="text-[10px] md:text-xs font-bold text-blue-600 mb-1 md:hidden whitespace-nowrap">{isLast ? 'TỪ' : 'ĐẾN (KM)'}</label>
                      {isLast ? (
                         <div className="w-full text-center py-2 md:py-3 bg-amber-50 border border-amber-200 border-dashed rounded-lg text-amber-700 font-bold text-xs md:text-base flex items-center justify-center h-[42px] md:h-auto">
                           {prevKm} km
                         </div>
                      ) : (
                         <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={tier.maxKm}
                            onChange={(e) => handleTierChange(index, 'maxKm', e.target.value)}
                            className="w-full pl-2 md:pl-6 pr-8 md:pr-12 py-2 md:py-4 bg-slate-50 md:bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-black text-base md:text-xl text-blue-900"
                            required
                          />
                          <div className="absolute inset-y-0 right-0 pr-2 md:pr-4 flex items-center pointer-events-none">
                            <span className="text-slate-400 font-bold text-xs md:text-base">Km</span>
                          </div>
                          <div className="hidden md:block absolute -top-3 left-4 px-2 bg-white text-[10px] md:text-xs text-blue-600 font-bold rounded-full border border-blue-100">{distanceLabel}</div>
                        </div>
                      )}
                    </div>

                    <div className="col-span-1 md:col-span-5 flex flex-col">
                      <label className="text-[10px] md:text-xs font-bold text-emerald-600 mb-1 md:hidden whitespace-nowrap">GIÁ (VNĐ)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={tier.price}
                          onChange={(e) => handleTierChange(index, 'price', e.target.value)}
                          className="w-full pl-2 md:pl-6 pr-12 md:pr-20 py-2 md:py-4 bg-emerald-50/50 md:bg-emerald-50 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-black text-emerald-700 text-base md:text-xl"
                          required
                        />
                        <div className="absolute inset-y-0 right-0 pr-2 md:pr-4 flex items-center pointer-events-none">
                          <span className="text-emerald-600/70 text-[10px] md:text-sm font-black whitespace-nowrap">{isLast ? 'đ/Km' : 'VNĐ'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-2 md:hidden mt-1 text-[10px] text-slate-500 font-medium italic text-center bg-slate-50 py-1 rounded">
                      {distanceLabel}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-6 border-t border-slate-100 mt-8">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Cấu Hình Giá Xe Ôm</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Giá mỗi km (VNĐ)</label>
                  <input
                    type="number"
                    value={config.xeOm?.pricePerKm || ''}
                    onChange={(e) => handleServiceChange('xeOm', 'pricePerKm', e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-8">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Cấu Hình Giá Lái Hộ Xe Máy</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Số km đầu</label>
                  <input
                    type="number" step="0.1"
                    value={config.laiHoXeMay?.initialKm || ''}
                    onChange={(e) => handleServiceChange('laiHoXeMay', 'initialKm', e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                  />
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Giá cho km đầu (VNĐ)</label>
                  <input
                    type="number"
                    value={config.laiHoXeMay?.initialPrice || ''}
                    onChange={(e) => handleServiceChange('laiHoXeMay', 'initialPrice', e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                  />
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Giá mỗi km sau đó (VNĐ)</label>
                  <input
                    type="number"
                    value={config.laiHoXeMay?.pricePerKm || ''}
                    onChange={(e) => handleServiceChange('laiHoXeMay', 'pricePerKm', e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-8">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Cấu Hình Giá Lái Hộ Ô Tô</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Số km đầu</label>
                  <input
                    type="number" step="0.1"
                    value={config.laiHoOto?.initialKm || ''}
                    onChange={(e) => handleServiceChange('laiHoOto', 'initialKm', e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Giá cho km đầu (VNĐ)</label>
                  <input
                    type="number"
                    value={config.laiHoOto?.initialPrice || ''}
                    onChange={(e) => handleServiceChange('laiHoOto', 'initialPrice', e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Giá mỗi km sau đó (VNĐ)</label>
                  <input
                    type="number"
                    value={config.laiHoOto?.pricePerKm || ''}
                    onChange={(e) => handleServiceChange('laiHoOto', 'pricePerKm', e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-8">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Quản Lý Khu Vực Hoạt Động</h3>
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="flex gap-3 mb-6">
                  <input
                    type="text"
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    placeholder="Nhập tên khu vực mới (VD: Cần Thơ)"
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddRegion}
                    className="px-6 py-3 bg-blue-100 text-blue-700 font-bold rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                  >
                    <Plus size={18} /> Thêm
                  </button>
                </div>

                {regions.length === 0 ? (
                  <p className="text-slate-500 italic">Chưa có khu vực nào.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {regions.map((region, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-blue-50 text-blue-800 px-4 py-2 rounded-full border border-blue-100">
                        <span className="font-bold">{region}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRegion(idx)}
                          className="text-blue-400 hover:text-red-500 transition-colors p-1"
                          title="Xóa khu vực"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Cấu Hình Bắt Buộc Cập Nhật Ứng Dụng</h3>
              <p className="text-sm text-slate-500 mb-6">Tính năng Ép Buộc Cập Nhật: Nếu phiên bản app trên điện thoại của Tài xế thấp hơn "Mã Phiên Bản Bắt Buộc", app sẽ bị khóa và bắt buộc họ phải tải bản mới từ App Store/CH Play.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
                {/* Driver App */}
                <div className="space-y-4">
                  <h4 className="font-bold text-blue-800 text-lg flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 p-2 rounded-lg">🛵</span> App Tài Xế (Driver)
                  </h4>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Mã Phiên Bản Bắt Buộc (VD: 1.0.0)</label>
                    <input
                      type="text"
                      value={appVersion?.driverApp?.minVersion || ''}
                      onChange={(e) => setAppVersion({ ...appVersion, driverApp: { ...appVersion.driverApp, minVersion: e.target.value } })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Link tải Android (CH Play)</label>
                    <input
                      type="text"
                      value={appVersion?.driverApp?.storeUrlAndroid || ''}
                      onChange={(e) => setAppVersion({ ...appVersion, driverApp: { ...appVersion.driverApp, storeUrlAndroid: e.target.value } })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Link tải iOS (App Store)</label>
                    <input
                      type="text"
                      value={appVersion?.driverApp?.storeUrlIos || ''}
                      onChange={(e) => setAppVersion({ ...appVersion, driverApp: { ...appVersion.driverApp, storeUrlIos: e.target.value } })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-slate-600"
                    />
                  </div>
                </div>

                {/* Customer App */}
                <div className="space-y-4">
                  <h4 className="font-bold text-emerald-800 text-lg flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">👤</span> App Khách Hàng (Customer)
                  </h4>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Mã Phiên Bản Bắt Buộc (VD: 1.0.0)</label>
                    <input
                      type="text"
                      value={appVersion?.customerApp?.minVersion || ''}
                      onChange={(e) => setAppVersion({ ...appVersion, customerApp: { ...appVersion.customerApp, minVersion: e.target.value } })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Link tải Android (CH Play)</label>
                    <input
                      type="text"
                      value={appVersion?.customerApp?.storeUrlAndroid || ''}
                      onChange={(e) => setAppVersion({ ...appVersion, customerApp: { ...appVersion.customerApp, storeUrlAndroid: e.target.value } })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Link tải iOS (App Store)</label>
                    <input
                      type="text"
                      value={appVersion?.customerApp?.storeUrlIos || ''}
                      onChange={(e) => setAppVersion({ ...appVersion, customerApp: { ...appVersion.customerApp, storeUrlIos: e.target.value } })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm text-slate-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-8">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">🌙</span> Phụ Phí Giờ Khuya
              </h3>
              <p className="text-sm text-slate-500 mb-6">Tự động cộng thêm phụ phí vào phí giao hàng khi đặt đơn vào khung giờ khuya.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-lg border-b pb-2">Mức 1</h4>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Bắt đầu từ (VD: 22:30)</label>
                    <input
                      type="time"
                      value={lateNightConfig?.level1?.time || ''}
                      onChange={(e) => setLateNightConfig({ ...lateNightConfig, level1: { ...lateNightConfig.level1, time: e.target.value } })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Số tiền phụ phí (VNĐ)</label>
                    <input
                      type="number"
                      value={lateNightConfig?.level1?.amount || 0}
                      onChange={(e) => setLateNightConfig({ ...lateNightConfig, level1: { ...lateNightConfig.level1, amount: Number(e.target.value) } })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-lg border-b pb-2">Mức 2</h4>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Bắt đầu từ (VD: 23:30)</label>
                    <input
                      type="time"
                      value={lateNightConfig?.level2?.time || ''}
                      onChange={(e) => setLateNightConfig({ ...lateNightConfig, level2: { ...lateNightConfig.level2, time: e.target.value } })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Số tiền phụ phí (VNĐ)</label>
                    <input
                      type="number"
                      value={lateNightConfig?.level2?.amount || 0}
                      onChange={(e) => setLateNightConfig({ ...lateNightConfig, level2: { ...lateNightConfig.level2, amount: Number(e.target.value) } })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-lg border-b pb-2">Kết Thúc</h4>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Kết thúc phụ phí (VD: 06:00)</label>
                    <input
                      type="time"
                      value={lateNightConfig?.endTime || ''}
                      onChange={(e) => setLateNightConfig({ ...lateNightConfig, endTime: e.target.value })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                    <p className="text-xs text-slate-500 mt-2">Sau thời gian này, phí giao hàng trở về bình thường.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-8">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Tài Khoản Quản Trị (Admin)</h3>
              <p className="text-sm text-slate-500 mb-6">Thay đổi thông tin liên hệ và mật khẩu đăng nhập của tài khoản Admin.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
                {/* Dummy inputs to prevent aggressive Chrome autofill */}
                <input type="text" name="fakeusernameremembered" className="hidden" aria-hidden="true" />
                <input type="password" name="fakepasswordremembered" className="hidden" aria-hidden="true" />

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Tên Admin</label>
                    <input
                      type="text"
                      value={adminProfile.name}
                      onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Số điện thoại đăng nhập</label>
                    <input
                      type="text"
                      value={adminProfile.phone}
                      onChange={(e) => setAdminProfile({ ...adminProfile, phone: e.target.value })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Mật khẩu cũ (Bắt buộc khi đổi mật khẩu mới)</label>
                    <div className="relative">
                      <input
                        type={showOldPassword ? "text" : "password"}
                        value={adminProfile.oldPassword}
                        onChange={(e) => setAdminProfile({ ...adminProfile, oldPassword: e.target.value })}
                        placeholder="••••••••"
                        autoComplete="off"
                        className="w-full p-3 pr-10 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                      >
                        {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Mật khẩu mới (Để trống nếu không đổi)</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={adminProfile.password}
                        onChange={(e) => setAdminProfile({ ...adminProfile, password: e.target.value })}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full p-3 pr-10 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
