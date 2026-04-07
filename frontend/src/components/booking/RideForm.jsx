import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Bike, Car, Key, Shield } from 'lucide-react';
import LocationPicker from '../LocationPicker';
import AddressAutocompleteInput from '../AddressAutocompleteInput';

export default function RideForm({ onBooking, loading, defaultLocation, defaultPhone, customerData }) {
  const [subType, setSubType] = useState('XE_OM'); // XE_OM, LAI_HO_XE_MAY, LAI_HO_OTO
  const [vehicleClass, setVehicleClass] = useState('TAY_GA'); // TAY_GA, XE_SO, CON_TAY

  const [form, setForm] = useState({
    customerName: customerData?.name || '',
    customerPhone: defaultPhone || '',
    pickupAddress: defaultLocation?.address || '',
    pickupCoordinates: defaultLocation?.coordinates || null,
    senderPhone: defaultPhone || '',
    deliveryAddress: '',
    deliveryCoordinates: null,
    receiverPhone: '',
    receiverPhone2: '',
    note: ''
  });

  const [mapConfig, setMapConfig] = useState(null);

  useEffect(() => {
    if (defaultLocation?.address) {
      setForm(prev => ({ ...prev, pickupAddress: defaultLocation.address, pickupCoordinates: defaultLocation.coordinates }));
    }
  }, [defaultLocation]);

  useEffect(() => {
    if (customerData) {
      setForm(prev => ({
        ...prev,
        customerName: prev.customerName || customerData.name || '',
        customerPhone: prev.customerPhone || defaultPhone || customerData.phone || ''
      }));
    }
  }, [customerData, defaultPhone]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      return alert('Vui lòng nhập Tên và SĐT để tài xế liên hệ!');
    }

    onBooking({
      serviceType: 'DAT_XE',
      subServiceType: subType, // XE_OM, LAI_HO_XE_MAY, LAI_HO_OTO
      customerName: form.customerName.trim() || customerData?.name || 'Khách Vãng Lai',
      customerPhone: defaultPhone || 'Chưa rõ',
      pickupAddress: form.pickupAddress.trim(),
      pickupCoordinates: form.pickupCoordinates || { lat: 10.045, lng: 105.746 }, 
      deliveryAddress: form.deliveryAddress.trim(),
      deliveryCoordinates: form.deliveryCoordinates || { lat: 10.050, lng: 105.750 },
      note: form.note.trim(),
      senderPhone: form.senderPhone.trim() || defaultPhone,
      receiverPhone: '',
      receiverPhone2: form.receiverPhone2.trim(),
      rideDetails: {
        vehicleType: subType === 'LAI_HO_OTO' ? 'OTO' : 'XE_MAY',
        vehicleClass: (subType === 'LAI_HO_XE_MAY' || subType === 'LAI_HO_OTO') ? vehicleClass : '',
        passengerCount: 1,
        surcharge: 0 // Admin/Tài xế báo phụ phí sau
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-28">
      
      {/* LOẠI DỊCH VỤ */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-3 gap-2">
        <button 
          type="button"
          onClick={() => { setSubType('XE_OM'); setVehicleClass(''); }}
          className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-colors ${subType === 'XE_OM' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Bike size={20} />
          <span className="text-[10px] sm:text-xs font-bold text-center">Gọi Xe Ôm</span>
        </button>
        <button 
          type="button"
          onClick={() => { setSubType('LAI_HO_XE_MAY'); setVehicleClass('TAY_GA'); }}
          className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-colors ${subType === 'LAI_HO_XE_MAY' ? 'bg-teal-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Key size={20} />
          <span className="text-[10px] sm:text-xs font-bold text-center">Lái Hộ Xe Máy</span>
        </button>
        <button 
          type="button"
          onClick={() => { setSubType('LAI_HO_OTO'); setVehicleClass(''); }}
          className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-colors ${subType === 'LAI_HO_OTO' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Car size={20} />
          <span className="text-[10px] sm:text-xs font-bold text-center">Lái Hộ Ôtô</span>
        </button>
      </div>

      {subType === 'LAI_HO_XE_MAY' && (
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-teal-100 animate-fadeIn">
          <label className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block mb-2 text-center">LOẠI XE BẠN ĐANG MANG</label>
          <div className="flex gap-2">
            {['TAY_GA', 'XE_SO', 'CON_TAY'].map(type => (
              <button 
                key={type} type="button" 
                onClick={() => setVehicleClass(type)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${vehicleClass === type ? 'bg-teal-50 text-teal-700 border-2 border-teal-500' : 'bg-gray-50 text-gray-400 border-2 border-transparent'}`}
              >
                {type === 'TAY_GA' ? 'Tay Ga' : type === 'XE_SO' ? 'Xe Số' : 'Côn Tay'}
              </button>
            ))}
          </div>
        </div>
      )}

      {subType === 'LAI_HO_OTO' && (
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-indigo-100 animate-fadeIn">
          <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-2 text-center">DÒNG XE BẠN ĐANG ĐI</label>
          <div>
            <input 
              type="text" 
              placeholder="VD: Mazda 3 số tự động / Everest 7 chỗ..."
              className="w-full text-sm font-semibold bg-gray-50 border border-indigo-100 p-3 rounded-xl outline-none text-indigo-800 focus:border-indigo-300 transition-colors"
              value={vehicleClass === 'TAY_GA' || vehicleClass === 'XE_SO' || vehicleClass === 'CON_TAY' ? '' : vehicleClass}
              onChange={e => setVehicleClass(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* KHUYẾN CÁO */}
      <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-2">
        <div className="text-blue-500 mt-0.5"><Navigation size={18} /></div>
        <p className="text-xs text-blue-800 leading-relaxed font-medium">
          {subType === 'XE_OM' 
            ? "Đưa đón tận nơi, an toàn trên mọi nẻo đường. Giá sẽ được báo trước khi xe chạy."
            : "Chỉ nhậu không lái, bảo vệ bản thân và túi tiền. Tài xế sẽ gọi điện chốt giá trước khi đến đón."}
        </p>
      </div>

      {/* THÔNG TIN HÀNH TRÌNH */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
        
        {/* ĐIỂM ĐÓN */}
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center mt-1">
            <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
            </div>
            <div className="w-0.5 h-10 bg-gray-200 mt-1"></div>
          </div>
          <div className="flex-1 border-b border-gray-100 pb-3">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              ĐIỂM ĐÓN (BẠN ĐANG Ở ĐÂU)
            </label>
            <div className="flex flex-col gap-2 relative">
              <AddressAutocompleteInput 
                value={form.pickupAddress}
                onChangeText={txt => setForm(prev => ({...prev, pickupAddress: txt}))}
                onSelectCoordinates={coords => setForm(prev => ({...prev, pickupCoordinates: coords}))}
                placeholder="Nhập địa chỉ đón..."
                onClickMapIcon={(query) => setMapConfig({ type: 'pickup', pos: form.pickupCoordinates ? [form.pickupCoordinates.lat, form.pickupCoordinates.lng] : null, query })}
                className="bg-white border text-sm font-semibold border-gray-100 rounded-xl overflow-hidden focus-within:border-blue-300 shadow-sm"
              />
              <div className="mt-2">
                <input 
                  type="tel"
                  placeholder="SĐT Đón Khách (Điền vào nếu đặt dùm)"
                  className="w-full text-xs font-semibold text-blue-600 outline-none p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-blue-300"
                  value={form.senderPhone}
                  onChange={e => setForm({...form, senderPhone: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ĐIỂM ĐẾN */}
        <div className="flex items-start gap-4 -mt-1">
          <div className="flex flex-col items-center mt-1">
            <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              ĐIỂM ĐẾN (BẠN MUỐN ĐI ĐÂU)
            </label>
            <div className="flex flex-col gap-2 relative mt-1">
              <AddressAutocompleteInput 
                value={form.deliveryAddress}
                onChangeText={txt => setForm(prev => ({...prev, deliveryAddress: txt}))}
                onSelectCoordinates={coords => setForm(prev => ({...prev, deliveryCoordinates: coords}))}
                placeholder="Nhập địa chỉ đến..."
                onClickMapIcon={(query) => setMapConfig({ type: 'delivery', pos: form.deliveryCoordinates ? [form.deliveryCoordinates.lat, form.deliveryCoordinates.lng] : null, query })}
                className="bg-white border text-sm font-semibold border-gray-100 rounded-xl overflow-hidden focus-within:border-red-300 shadow-sm"
              />

            </div>
          </div>
        </div>

      </div>

      {/* GHI CHÚ CHUYẾN ĐI */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">GHI CHÚ CHUYẾN ĐI</label>
        <div>
          <textarea 
            rows="2"
            placeholder="Ghi chú thêm (VD: Áo đen, đang đứng trước cổng...)"
            className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-100 p-3 rounded-xl outline-none focus:border-blue-200 focus:bg-white transition-colors resize-none"
            value={form.note}
            onChange={e => setForm({...form, note: e.target.value})}
          ></textarea>
        </div>
      </div>

      {/* FLOAT BUTTON */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-50 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button 
          disabled={loading}
          type="submit"
          className="w-full bg-blue-600 active:bg-blue-700 text-white font-bold text-sm sm:text-base py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>ĐANG XỬ LÝ...</span>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Shield size={20} />
              <span>{subType === 'XE_OM' ? 'TÌM XE ÔM NGAY' : 'TÌM TÀI XẾ LÁI HỘ NGAY'}</span>
            </div>
          )}
        </button>
      </div>

      <LocationPicker 
        isOpen={mapConfig !== null}
        onClose={() => setMapConfig(null)}
        initialPosition={mapConfig?.pos}
        initialSearchQuery={mapConfig?.query}
        onSelect={(loc) => {
          if (mapConfig?.type === 'pickup') {
            setForm({ ...form, pickupAddress: loc.address, pickupCoordinates: { lat: loc.lat, lng: loc.lng } });
          } else if (mapConfig?.type === 'delivery') {
            setForm({ ...form, deliveryAddress: loc.address, deliveryCoordinates: { lat: loc.lat, lng: loc.lng } });
          }
        }}
      />
    </form>
  );
}
