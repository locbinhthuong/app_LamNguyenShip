import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Package, DollarSign } from 'lucide-react';
import LocationPicker from '../LocationPicker';
import CurrencyInput from '../CurrencyInput';
import AddressAutocompleteInput from '../AddressAutocompleteInput';
import { estimateFee } from '../../services/api';

export default function DeliveryForm({ onBooking, loading, defaultLocation, defaultPhone }) {
  const [form, setForm] = useState({
    senderName: '',
    customerPhone: defaultPhone || '',
    senderPhone: defaultPhone || '',
    pickupAddress: defaultLocation?.address || '',
    pickupCoordinates: defaultLocation && defaultLocation.lat ? { lat: defaultLocation.lat, lng: defaultLocation.lng } : null,
    
    receiverName: '',
    receiverPhone: '',
    receiverPhone2: '',
    deliveryAddress: '',
    deliveryCoordinates: null,

    note: '',
    codAmount: ''
  });

  const [mapConfig, setMapConfig] = useState(null); // null hoặc { type: 'pickup' | 'delivery', pos: [lat, lng] }
  const [estimatedFee, setEstimatedFee] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [estimating, setEstimating] = useState(false);

  useEffect(() => {
    if (defaultLocation?.address) {
      setForm(prev => ({ 
        ...prev, 
        pickupAddress: defaultLocation.address, 
        pickupCoordinates: defaultLocation.lat && defaultLocation.lng ? { lat: defaultLocation.lat, lng: defaultLocation.lng } : null 
      }));
    }
  }, [defaultLocation]);

  useEffect(() => {
    const fetchEstimate = async () => {
      if (form.pickupCoordinates && form.deliveryCoordinates && form.pickupCoordinates.lat && form.deliveryCoordinates.lat) {
        setEstimating(true);
        try {
          const res = await estimateFee({
            pickupCoordinates: form.pickupCoordinates,
            deliveryCoordinates: form.deliveryCoordinates,
            serviceType: 'GIAO_HANG'
          });
          if (res && res.data && res.data.deliveryFee !== null) {
            setEstimatedFee(res.data.deliveryFee);
            setDistanceKm(res.data.distanceKm);
          } else {
            setEstimatedFee(null);
            setDistanceKm(null);
          }
        } catch (error) {
          console.error('Lỗi tính phí:', error);
          setEstimatedFee(null);
          setDistanceKm(null);
        } finally {
          setEstimating(false);
        }
      } else {
        setEstimatedFee(null);
        setDistanceKm(null);
      }
    };
    
    // Thêm debounce nhẹ 500ms
    const timer = setTimeout(() => {
      fetchEstimate();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [form.pickupCoordinates, form.deliveryCoordinates]);

  const handleSubmit = (e) => {
    e.preventDefault();
    e.preventDefault();

    // Gửi payload lên Component Cha (BookingFlow)
    onBooking({
      serviceType: 'GIAO_HANG',
      senderName: form.senderName.trim() || 'Khách đặt qua App',
      customerPhone: defaultPhone || 'Khách Vãng Lai',
      senderPhone: form.senderPhone.trim() || defaultPhone,
      receiverName: form.receiverName.trim(),
      receiverPhone: form.receiverPhone.trim(),
      receiverPhone2: form.receiverPhone2.trim(),
      pickupAddress: form.pickupAddress.trim(),
      pickupCoordinates: form.pickupCoordinates || null, // Tọa độ thật hoặc rỗng
      deliveryAddress: form.deliveryAddress.trim(),
      deliveryCoordinates: form.deliveryCoordinates || null,
      note: form.note.trim(),
      codAmount: form.codAmount ? parseInt(form.codAmount) : 0,
      deliveryFee: estimatedFee || 0,
      packageDetails: {
        description: 'Giao hàng hóa/tài liệu',
        weight: '',
        isFragile: false,
        bulkyFee: 0
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-12">
      <div className="bg-white p-5 rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100/50 flex flex-col gap-6">
        
        {/* LẤY HÀNG (SENDER) */}
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center mt-1">
            <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
            </div>
            <div className="w-0.5 h-20 bg-gray-200 mt-1"></div>
          </div>
          <div className="flex-1 border-b border-gray-100 pb-4">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              ĐIỂM LẤY HÀNG (NGƯỜI GỬI)
            </label>
            <div className="flex flex-col gap-2 relative">
              <AddressAutocompleteInput 
                value={form.pickupAddress}
                onChangeText={txt => setForm(prev => ({...prev, pickupAddress: txt}))}
                onSelectCoordinates={coords => setForm(prev => ({...prev, pickupCoordinates: coords}))}
                placeholder="Nhập địa chỉ lấy hàng..."
                onClickMapIcon={(query) => setMapConfig({ type: 'pickup', pos: form.pickupCoordinates ? [form.pickupCoordinates.lat, form.pickupCoordinates.lng] : null, query })}
                className="bg-white border text-sm font-semibold border-gray-100 rounded-[16px] overflow-hidden focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100/50 transition-all duration-300"
              />
            </div>
            <div className="mt-2">
              <input 
                type="tel"
                placeholder="SĐT Lấy Hàng"
                className="w-full text-xs font-semibold text-blue-600 outline-none p-3 bg-gray-50/50 border border-gray-100 rounded-[16px] focus:border-blue-400 focus:ring-4 focus:ring-blue-100/50 transition-all duration-300"
                value={form.senderPhone} onChange={e => setForm({...form, senderPhone: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* GIAO HÀNG (RECEIVER) */}
        <div className="flex items-start gap-4 -mt-2">
          <div className="flex flex-col items-center mt-1">
            <div className="w-4 h-4 rounded-full bg-sky-100 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-600"></div>
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              ĐIỂM GIAO HÀNG (CÓ THỂ ĐỂ TRỐNG NẾU CHƯA CÓ)
            </label>
            <div className="flex flex-col gap-2 relative mb-2">
              <AddressAutocompleteInput 
                value={form.deliveryAddress}
                onChangeText={txt => setForm(prev => ({...prev, deliveryAddress: txt}))}
                onSelectCoordinates={coords => setForm(prev => ({...prev, deliveryCoordinates: coords}))}
                placeholder="Nhập địa chỉ nhận hoặc chừa trống..."
                onClickMapIcon={(query) => setMapConfig({ type: 'delivery', pos: form.deliveryCoordinates ? [form.deliveryCoordinates.lat, form.deliveryCoordinates.lng] : null, query })}
                className="bg-white border text-sm font-semibold border-gray-100 rounded-[16px] overflow-hidden focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100/50 transition-all duration-300"
              />
            </div>
            <div className="mt-2">
              <input 
                type="text" placeholder="Tên người nhận (Tùy chọn)"
                className="w-full mb-3 text-xs bg-gray-50/50 border border-gray-100 p-3 rounded-[16px] outline-none font-medium text-slate-800 focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 transition-all duration-300"
                value={form.receiverName} onChange={e => setForm({...form, receiverName: e.target.value})}
              />
              <div className="mt-2">
                <input 
                  type="tel" placeholder="SĐT Người Nhận"
                  className="w-full text-xs bg-gray-50/50 border border-gray-100 p-3 rounded-[16px] outline-none font-bold text-sky-600 focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 transition-all duration-300"
                  value={form.receiverPhone} onChange={e => setForm({...form, receiverPhone: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* THÔNG TIN BỔ SUNG */}
      <div className="bg-white p-5 rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100/50 space-y-5">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
            <DollarSign size={14} className="text-yellow-500" /> THU HỘ TIỀN HÀNG (COD)
          </label>
          <CurrencyInput 
            name="codAmount"
            placeholder="Ví dụ: 250.000"
            className="w-full text-sm font-bold text-gray-800 bg-gray-50/50 border border-gray-100 p-3.5 rounded-[16px] outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100/50 focus:bg-white transition-all duration-300"
            value={form.codAmount}
            onChange={e => setForm({...form, codAmount: e.target.value})}
          />
          <p className="text-[10px] text-gray-400 mt-1 ml-1">Nhập 0 hoặc bỏ trống nếu không cần thu hộ.</p>
        </div>

        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
            <Package size={14} className="text-blue-500" /> GHI CHÚ ĐƠN HÀNG
          </label>
          <textarea 
            rows="3"
            placeholder="Lưu ý cho tài xế (mặt hàng dễ vỡ, giao hẻm...)"
            className="w-full text-sm text-gray-800 bg-gray-50/50 border border-gray-100 p-3.5 rounded-[16px] outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100/50 focus:bg-white transition-all duration-300 resize-none"
            value={form.note}
            onChange={e => setForm({...form, note: e.target.value})}
          ></textarea>
        </div>
      </div>

      {/* KHUYẾN CÁO */}
      <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-2">
        <div className="text-blue-500 mt-0.5"><Navigation size={18} /></div>
        <p className="text-xs text-blue-800 leading-relaxed font-medium">
          {estimatedFee !== null ? (
            <>
              Cước tạm tính: <strong className="text-lg text-blue-600">{estimatedFee.toLocaleString('vi-VN')}đ</strong> {distanceKm ? `(~${distanceKm.toFixed(1)}km)` : ''}. Tổng đài có thể phụ thu thêm phí cồng kềnh (nếu có).
            </>
          ) : (
            'Tổng đài sẽ gọi điện báo cước Phí Ship và Phí Cồng Kềnh (Nếu có) sau khi bạn lên đơn.'
          )}
        </p>
      </div>

      {/* SUBMIT BUTTON */}
      <div className="mt-6">
        <button 
          disabled={loading}
          type="submit"
          className="w-full bg-blue-600 active:bg-blue-700 text-white font-bold text-sm sm:text-base py-3.5 sm:py-4 rounded-[16px] shadow-[0_8px_20px_rgba(37,99,235,0.24)] active:scale-[0.98] transition-transform duration-300 ease-out disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>ĐANG XỬ LÝ...</span>
            </>
          ) : (
            'TẠO ĐƠN GIAO HÀNG'
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
