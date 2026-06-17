import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Package, Check, DollarSign, Navigation } from 'lucide-react';
import LocationPicker from '../LocationPicker';
import AddressAutocompleteInput from '../AddressAutocompleteInput';
import CurrencyInput from '../CurrencyInput';
import { estimateFee } from '../../services/api';

export default function BatchedDeliveryForm({ onBooking, loading, defaultLocation, defaultPhone, shopName }) {
  const [pickup, setPickup] = useState({
    address: defaultLocation?.address || '',
    coordinates: defaultLocation && defaultLocation.lat ? { lat: defaultLocation.lat, lng: defaultLocation.lng } : null,
    phone: defaultPhone || ''
  });

  const [deliveries, setDeliveries] = useState([
    { id: 1, address: '', coordinates: null, receiverName: '', receiverPhone: '', codAmount: '', note: '', fee: 0, distanceKm: 0 }
  ]);

  const [mapConfig, setMapConfig] = useState(null); // { type: 'pickup' | 'delivery', id?: number, pos: any, query: string }

  useEffect(() => {
    if (defaultLocation?.address) {
      setPickup(prev => ({ 
        ...prev, 
        address: defaultLocation.address, 
        coordinates: defaultLocation.lat && defaultLocation.lng ? { lat: defaultLocation.lat, lng: defaultLocation.lng } : null 
      }));
    }
  }, [defaultLocation]);

  // Calculate fee automatically when address changes
  useEffect(() => {
    const fetchFee = async (index, point) => {
      if (pickup.coordinates?.lat && point.coordinates?.lat) {
        try {
          const res = await estimateFee({
            pickupCoordinates: pickup.coordinates,
            deliveryCoordinates: point.coordinates,
            serviceType: 'GIAO_HANG'
          });
          if (res && res.data && res.data.deliveryFee !== null) {
            setDeliveries(prev => {
              const newD = [...prev];
              if (newD[index]) {
                newD[index].fee = res.data.deliveryFee;
                newD[index].distanceKm = res.data.distanceKm;
              }
              return newD;
            });
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setDeliveries(prev => {
          const newD = [...prev];
          if (newD[index]) {
            newD[index].fee = 0;
            newD[index].distanceKm = 0;
          }
          return newD;
        });
      }
    };

    deliveries.forEach((d, index) => {
      fetchFee(index, d);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup.coordinates, deliveries.map(d => d.coordinates?.lat).join(',')]);

  const handleAddDelivery = () => {
    setDeliveries(prev => [
      ...prev,
      { id: Date.now(), address: '', coordinates: null, receiverName: '', receiverPhone: '', codAmount: '', note: '', fee: 0, distanceKm: 0 }
    ]);
  };

  const handleRemoveDelivery = (index) => {
    if (deliveries.length <= 1) return;
    setDeliveries(prev => prev.filter((_, i) => i !== index));
  };

  const updateDelivery = (index, field, value) => {
    setDeliveries(prev => {
      const newD = [...prev];
      newD[index][field] = value;
      return newD;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!pickup.address || !pickup.phone) {
      return alert("Vui lòng nhập đầy đủ thông tin điểm lấy hàng!");
    }

    // Validate all deliveries
    for (let i = 0; i < deliveries.length; i++) {
      const d = deliveries[i];
      if (!d.address || !d.receiverName || !d.receiverPhone) {
        return alert(`Vui lòng nhập đầy đủ Tên, SĐT và Địa chỉ ở Điểm giao thứ ${i + 1}`);
      }
    }

    // Prepare payload array
    const payloads = deliveries.map(d => ({
      serviceType: 'GIAO_HANG',
      senderName: shopName || 'Cửa hàng',
      customerPhone: pickup.phone, // Dùng tạm phone cửa hàng làm customer phone (để shop dễ quản lý)
      senderPhone: pickup.phone,
      receiverName: d.receiverName.trim(),
      receiverPhone: d.receiverPhone.trim(),
      receiverPhone2: '',
      pickupAddress: pickup.address.trim(),
      pickupCoordinates: pickup.coordinates || null,
      deliveryAddress: d.address.trim(),
      deliveryCoordinates: d.coordinates || null,
      note: d.note.trim() + (d.note ? ' - (Đơn ghép)' : '(Đơn ghép)'),
      codAmount: d.codAmount ? parseInt(d.codAmount) : 0,
      deliveryFee: d.fee || 0,
      packageDetails: {
        description: 'Giao hàng hóa/tài liệu (Đơn ghép)',
        weight: '',
        isFragile: false,
        bulkyFee: 0
      }
    }));

    onBooking(payloads);
  };

  const totalFee = deliveries.reduce((sum, d) => sum + (d.fee || 0), 0);
  const totalCod = deliveries.reduce((sum, d) => sum + (d.codAmount ? parseInt(d.codAmount) : 0), 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-12">
      
      {/* THÔNG TIN LẤY HÀNG (SHOP) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
        <h4 className="text-xs font-extrabold text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <MapPin size={16} className="text-blue-500" /> ĐIỂM LẤY HÀNG CHUNG
        </h4>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">ĐỊA CHỈ LẤY HÀNG</label>
            <AddressAutocompleteInput 
              value={pickup.address}
              onChangeText={txt => setPickup(prev => ({...prev, address: txt}))}
              onSelectCoordinates={coords => setPickup(prev => ({...prev, coordinates: coords}))}
              placeholder="VD: Nhập địa chỉ cửa hàng..."
              onClickMapIcon={(query) => setMapConfig({ type: 'pickup', pos: pickup.coordinates ? [pickup.coordinates.lat, pickup.coordinates.lng] : null, query })}
              className="bg-gray-50 border text-[13px] font-bold border-gray-100 rounded-xl focus-within:border-blue-300"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">SĐT LIÊN HỆ LẤY HÀNG</label>
            <input 
              type="tel"
              placeholder="SĐT Cửa Hàng"
              className="w-full text-[13px] font-bold text-blue-600 outline-none p-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:border-blue-300 transition-colors"
              value={pickup.phone}
              onChange={e => setPickup({...pickup, phone: e.target.value})}
            />
          </div>
        </div>
      </div>

      {/* DANH SÁCH ĐIỂM GIAO */}
      <div className="space-y-4">
        {deliveries.map((delivery, index) => (
          <div key={delivery.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <h4 className="text-xs font-extrabold text-gray-800 uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-[10px]">{index + 1}</div>
                ĐIỂM GIAO SỐ {index + 1}
              </h4>
              {deliveries.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => handleRemoveDelivery(index)}
                  className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                >
                  <Trash2 size={14} /> Xóa
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Người nhận */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input 
                    type="text"
                    placeholder="Tên khách nhận"
                    className="w-full text-[13px] font-semibold text-slate-800 p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-sky-300"
                    value={delivery.receiverName}
                    onChange={e => updateDelivery(index, 'receiverName', e.target.value)}
                  />
                </div>
                <div>
                  <input 
                    type="tel"
                    placeholder="SĐT khách nhận"
                    className="w-full text-[13px] font-semibold text-sky-600 p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-sky-300"
                    value={delivery.receiverPhone}
                    onChange={e => updateDelivery(index, 'receiverPhone', e.target.value)}
                  />
                </div>
              </div>

              {/* Địa chỉ */}
              <div>
                <AddressAutocompleteInput 
                  value={delivery.address}
                  onChangeText={txt => updateDelivery(index, 'address', txt)}
                  onSelectCoordinates={coords => updateDelivery(index, 'coordinates', coords)}
                  placeholder="Nhập địa chỉ điểm giao..."
                  onClickMapIcon={(query) => setMapConfig({ type: 'delivery', id: delivery.id, pos: delivery.coordinates ? [delivery.coordinates.lat, delivery.coordinates.lng] : null, query })}
                  className="bg-gray-50 border text-[13px] font-semibold border-gray-100 rounded-xl focus-within:border-sky-300"
                />
              </div>

              {/* Phí dự kiến */}
              {delivery.fee > 0 && (
                <div className="bg-sky-50 text-sky-700 text-[11px] font-bold px-3 py-2 rounded-lg flex items-center justify-between">
                  <span>Dự kiến phí ship:</span>
                  <span>{delivery.fee.toLocaleString('vi-VN')}đ {delivery.distanceKm ? `(${delivery.distanceKm.toFixed(1)}km)` : ''}</span>
                </div>
              )}

              {/* Thu hộ và Ghi chú */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <DollarSign size={12} className="text-yellow-500" /> THU HỘ (COD)
                  </label>
                  <CurrencyInput 
                    name={`codAmount_${index}`}
                    placeholder="VD: 250.000"
                    className="w-full text-[13px] font-bold text-slate-800 p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-yellow-400"
                    value={delivery.codAmount}
                    onChange={e => updateDelivery(index, 'codAmount', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <Package size={12} className="text-blue-500" /> GHI CHÚ
                  </label>
                  <input 
                    type="text"
                    placeholder="Lưu ý: Dễ vỡ, gọi trước..."
                    className="w-full text-[13px] text-slate-800 p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-blue-300"
                    value={delivery.note}
                    onChange={e => updateDelivery(index, 'note', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* THÊM ĐIỂM GIAO */}
      <button 
        type="button"
        onClick={handleAddDelivery}
        className="w-full border-2 border-dashed border-sky-200 text-sky-600 bg-sky-50 font-bold text-sm py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-sky-100 transition-colors active:scale-95"
      >
        <Plus size={18} /> THÊM ĐIỂM GIAO HÀNG
      </button>

      {/* TỔNG KẾT & SUBMIT BUTTON */}
      <div className="mt-8 bg-blue-50 border border-blue-100 p-4 rounded-2xl">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-blue-800">Tổng điểm giao:</span>
          <span className="text-sm font-extrabold text-blue-900">{deliveries.length} điểm</span>
        </div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-blue-800">Tổng phí dự kiến:</span>
          <span className="text-sm font-extrabold text-blue-900">{totalFee.toLocaleString('vi-VN')}đ</span>
        </div>
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-blue-200/50">
          <span className="text-xs font-bold text-blue-800">Tổng tiền thu hộ (COD):</span>
          <span className="text-sm font-extrabold text-yellow-600">{totalCod.toLocaleString('vi-VN')}đ</span>
        </div>
        
        <button 
          disabled={loading}
          type="submit"
          className="w-full bg-blue-600 active:bg-blue-700 text-white font-extrabold text-[15px] sm:text-base py-4 rounded-xl shadow-[0_8px_20px_rgba(37,99,235,0.24)] active:scale-[0.98] transition-transform duration-300 ease-out disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>ĐANG XỬ LÝ {deliveries.length} ĐƠN...</span>
            </>
          ) : (
            <>
              <Check size={20} />
              <span>TẠO {deliveries.length} ĐƠN GHÉP NGAY</span>
            </>
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
            setPickup({ ...pickup, address: loc.address, coordinates: { lat: loc.lat, lng: loc.lng } });
          } else if (mapConfig?.type === 'delivery') {
            const index = deliveries.findIndex(d => d.id === mapConfig.id);
            if (index !== -1) {
              updateDelivery(index, 'address', loc.address);
              updateDelivery(index, 'coordinates', { lat: loc.lat, lng: loc.lng });
            }
          }
        }}
      />
    </form>
  );
}
