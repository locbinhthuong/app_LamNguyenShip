import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Package, DollarSign } from 'lucide-react';
import LocationPicker from '../LocationPicker';

export default function DeliveryForm({ onBooking, loading, defaultLocation, defaultPhone }) {
  const [form, setForm] = useState({
    senderName: '',
    senderPhone: defaultPhone || '',
    pickupAddress: defaultLocation?.address || '',
    pickupCoordinates: defaultLocation?.coordinates || null,
    
    receiverName: '',
    receiverPhone: '',
    deliveryAddress: '',
    deliveryCoordinates: null,

    note: '',
    codAmount: ''
  });

  const [mapConfig, setMapConfig] = useState(null); // null hoặc { type: 'pickup' | 'delivery', pos: [lat, lng] }

  useEffect(() => {
    if (defaultLocation?.address) {
      setForm(prev => ({ ...prev, pickupAddress: defaultLocation.address, pickupCoordinates: defaultLocation.coordinates }));
    }
  }, [defaultLocation]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.pickupAddress.trim() && !form.deliveryAddress.trim()) {
      return alert('Vui lòng chọn hoặc nhập ít nhất Điểm Lấy Hàng hoặc Điểm Giao Hàng!');
    }
    if (!form.receiverName.trim() || !form.receiverPhone.trim()) return alert('Vui lòng nhập đầy đủ Tên và SĐT Người Nhận!');

    // Gửi payload lên Component Cha (BookingFlow)
    onBooking({
      serviceType: 'GIAO_HANG',
      senderName: form.senderName.trim() || 'Khách đặt qua App',
      senderPhone: form.senderPhone.trim() || defaultPhone,
      receiverName: form.receiverName.trim(),
      receiverPhone: form.receiverPhone.trim(),
      pickupAddress: form.pickupAddress.trim(),
      pickupCoordinates: form.pickupCoordinates || { lat: 10.045, lng: 105.746 }, // Tọa độ mẫu ngã 4 Vĩnh Long
      deliveryAddress: form.deliveryAddress.trim(),
      deliveryCoordinates: form.deliveryCoordinates || { lat: 10.050, lng: 105.750 },
      note: form.note.trim(),
      codAmount: form.codAmount ? parseInt(form.codAmount) : 0,
      packageDetails: {
        description: 'Giao hàng hóa/tài liệu',
        weight: '',
        isFragile: false,
        bulkyFee: 0
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-28">
      {/* KHUYẾN CÁO */}
      <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-2">
        <div className="text-blue-500 mt-0.5"><Navigation size={18} /></div>
        <p className="text-xs text-blue-800 leading-relaxed font-medium">
          Tổng đài sẽ gọi điện báo cước Phí Ship và Phí Cồng Kềnh (Nếu có) sau khi bạn lên đơn. 
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-5">
        
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
            <div className="flex items-center mb-2 bg-white border border-gray-100 rounded-xl overflow-hidden focus-within:border-blue-300">
              <input 
                type="text"
                placeholder="Nhập địa chỉ lấy hàng..."
                className="flex-1 text-sm font-semibold text-gray-800 outline-none p-3 bg-transparent"
                value={form.pickupAddress}
                onChange={e => setForm({...form, pickupAddress: e.target.value})}
              />
              <div 
                className="bg-blue-50 p-3 text-blue-600 cursor-pointer active:bg-blue-100 flex items-center justify-center border-l border-blue-100"
                onClick={() => setMapConfig({ type: 'pickup', pos: form.pickupCoordinates ? [form.pickupCoordinates.lat, form.pickupCoordinates.lng] : null })}
              >
                <MapPin size={20} />
              </div>
            </div>
            <div className="mt-2">
              <input 
                type="tel" placeholder="SĐT Của Bạn / Người gửi (Tùy chọn)"
                className="w-full text-xs bg-gray-50 border border-gray-100 p-2.5 rounded-xl outline-none font-medium"
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
            <div className="flex items-center mb-2 bg-white border border-gray-100 rounded-xl overflow-hidden focus-within:border-sky-300">
              <input 
                type="text"
                placeholder="Nhập địa chỉ nhận hoặc chừa trống..."
                className="flex-1 text-sm font-semibold text-gray-800 outline-none p-3 bg-transparent"
                value={form.deliveryAddress}
                onChange={e => setForm({...form, deliveryAddress: e.target.value})}
              />
              <div 
                className="bg-sky-50 p-3 text-sky-600 cursor-pointer active:bg-sky-100 flex items-center justify-center border-l border-sky-100"
                onClick={() => setMapConfig({ type: 'delivery', pos: form.deliveryCoordinates ? [form.deliveryCoordinates.lat, form.deliveryCoordinates.lng] : null })}
              >
                <MapPin size={20} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="text" placeholder="Tên người nhận (* Bắt buộc)"
                className="text-xs bg-gray-50 border border-gray-100 p-2.5 rounded-xl outline-none font-medium text-slate-800"
                value={form.receiverName} onChange={e => setForm({...form, receiverName: e.target.value})}
              />
              <input 
                type="tel" placeholder="SĐT người nhận (* Bắt buộc)"
                className="text-xs bg-gray-50 border border-gray-100 p-2.5 rounded-xl outline-none font-bold text-blue-600"
                value={form.receiverPhone} onChange={e => setForm({...form, receiverPhone: e.target.value})}
              />
            </div>
          </div>
        </div>

      </div>

      {/* THÔNG TIN BỔ SUNG */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
            <DollarSign size={14} className="text-yellow-500" /> THU HỘ TIỀN HÀNG (COD)
          </label>
          <input 
            type="number"
            placeholder="Ví dụ: 250000"
            className="w-full text-sm font-bold text-gray-800 bg-gray-50 border border-gray-100 p-3 rounded-xl outline-none focus:border-blue-200 focus:bg-white transition-colors"
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
            'TẠO ĐƠN GIAO HÀNG'
          )}
        </button>
      </div>

      <LocationPicker 
        isOpen={mapConfig !== null}
        onClose={() => setMapConfig(null)}
        initialPosition={mapConfig?.pos}
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
