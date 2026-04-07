import React, { useState, useEffect } from 'react';
import { MapPin, ShoppingBag, Navigation } from 'lucide-react';
import LocationPicker from '../LocationPicker';
import AddressAutocompleteInput from '../AddressAutocompleteInput';

export default function PurchaseForm({ onBooking, loading, defaultLocation, defaultPhone, customerData }) {
  const [form, setForm] = useState({
    customerName: customerData?.name || '',
    customerPhone: defaultPhone || '',
    pickupAddress: '', // Tiệm/Quán
    pickupCoordinates: null,
    senderPhone: defaultPhone || '', // SĐT tiệm quán
    deliveryAddress: defaultLocation?.address || '', // Giao cho khách
    deliveryCoordinates: defaultLocation?.coordinates || null,
    receiverPhone: '', // SĐT người nhận (không bắt buộc)
    receiverPhone2: '', // SĐT người nhận phụ
    itemsToBuy: '',
    note: ''
  });

  const [mapConfig, setMapConfig] = useState(null);

  useEffect(() => {
    if (defaultLocation?.address) {
      setForm(prev => ({ ...prev, deliveryAddress: defaultLocation.address, deliveryCoordinates: defaultLocation.coordinates }));
    }
  }, [defaultLocation]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Không cần bắt buộc điểm lấy hoặc điểm giao, để trống cũng được
    // Không cần validate tên/SĐT nữa vì Backend/App đã tự móc ra từ phiên Đăng nhập
    // if (!form.customerName.trim() || !form.customerPhone.trim()) { ... }

    onBooking({
      serviceType: 'MUA_HO',
      customerName: customerData?.name || 'Khách Vãng Lai',
      customerPhone: defaultPhone || 'Chưa rõ',
      pickupAddress: form.pickupAddress.trim(),
      pickupCoordinates: form.pickupCoordinates || { lat: 10.045, lng: 105.746 }, 
      deliveryAddress: form.deliveryAddress.trim(),
      deliveryCoordinates: form.deliveryCoordinates || { lat: 10.050, lng: 105.750 },
      note: form.note.trim(),
      senderPhone: form.senderPhone.trim() || defaultPhone,
      receiverPhone: '',
      receiverPhone2: '',
      packageDetails: {
        description: 'MUA HỘ',
        itemsToBuy: []
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-28">
      
      {/* KHUYẾN CÁO */}
      <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-2">
        <div className="text-blue-500 mt-0.5"><Navigation size={18} /></div>
        <p className="text-xs text-blue-800 leading-relaxed font-medium">
          Bạn chỉ trả tiền sau khi nhận được hàng. Giá món đồ và Phí đi lấy sẽ được Tổng đài báo qua số điện thoại để bạn xác nhận.
        </p>
      </div>

      {/* THÔNG TIN HÀNH TRÌNH */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
        
        {/* ĐIỂM MUA HÀNG (QUÁN) */}
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center mt-1">
            <div className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-600"></div>
            </div>
            <div className="w-0.5 h-10 bg-gray-200 mt-1"></div>
          </div>
          <div className="flex-1 border-b border-gray-100 pb-3">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              MUA Ở ĐÂU (ĐỂ TRỐNG NẾU MUA NHIỀU NƠI)
            </label>
            <div className="flex flex-col gap-2 relative">
              <AddressAutocompleteInput 
                value={form.pickupAddress}
                onChangeText={txt => setForm({...form, pickupAddress: txt})}
                onSelectCoordinates={coords => setForm({...form, pickupCoordinates: coords})}
                placeholder="VD: Để trống nếu mua nhiều nơi..."
                onClickMapIcon={() => setMapConfig({ type: 'pickup', pos: form.pickupCoordinates ? [form.pickupCoordinates.lat, form.pickupCoordinates.lng] : null })}
                className="bg-white border text-sm font-semibold border-gray-100 rounded-xl overflow-hidden focus-within:border-orange-300 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* ĐIỂM GIAO ĐẾN */}
        <div className="flex items-start gap-4 -mt-1">
          <div className="flex flex-col items-center mt-1">
            <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              GIAO ĐẾN ĐÂU (CÓ THỂ ĐỂ TRỐNG)
            </label>
            <div className="flex flex-col gap-2 relative mt-1">
                <AddressAutocompleteInput 
                  value={form.deliveryAddress}
                  onChangeText={txt => setForm({...form, deliveryAddress: txt})}
                  onSelectCoordinates={coords => setForm({...form, deliveryCoordinates: coords})}
                  placeholder="Nhập địa chỉ nhận hoặc để trống..."
                  onClickMapIcon={() => setMapConfig({ type: 'delivery', pos: form.deliveryCoordinates ? [form.deliveryCoordinates.lat, form.deliveryCoordinates.lng] : null })}
                  className="bg-white border text-sm font-semibold border-gray-100 rounded-xl overflow-hidden focus-within:border-sky-300 shadow-sm"
                />
            </div>
          </div>
        </div>

      </div>



      {/* GHI CHÚ MUA HỘ MÓN GÌ */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">GHI CHÚ / MUA MÓN GÌ?</label>
        <div>
          <textarea 
            rows="3"
            placeholder="VD: Mua 1 ly trà sữa truyền thống (ít đá, nhiều ngọt)..."
            className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-100 p-3 rounded-xl outline-none focus:border-blue-200 focus:bg-white transition-colors resize-none"
            value={form.note}
            onChange={e => setForm({...form, note: e.target.value})}
          ></textarea>
        </div>
      </div>
      
      {/* THÔNG TIN KHÁCH HÀNG */}
      {/* ĐÃ ẨN KHỐI THÔNG TIN KHÁCH HÀNG - LẤY TỰ ĐỘNG TỪ ACCOUNT */}

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
              <ShoppingBag size={20} />
              <span>GỞI ĐƠN MUA HỘ</span>
            </div>
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
