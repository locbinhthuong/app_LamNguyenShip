import React, { useState, useEffect } from 'react';
import { X, MapPin, Phone, User, Package, DollarSign, StickyNote, Banknote, Navigation } from 'lucide-react';
import { api } from '../services/api';
import LocationPicker from './LocationPicker';
import AddressAutocompleteInput from './AddressAutocompleteInput';

const ShopCreateOrderModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = React.useRef(false);
  const [mapConfig, setMapConfig] = useState(null);
  
  // Dữ liệu Shop mặc định (Từ LocalStorage)
  const savedShopAddress = localStorage.getItem('shopAddress') || '';
  const savedShopPhone = localStorage.getItem('shopPhone') || '';
  
  const [form, setForm] = useState({
    pickupAddress: localStorage.getItem('savedShopLocation') ? JSON.parse(localStorage.getItem('savedShopLocation')).address : (localStorage.getItem('shopAddress') || ''),
    pickupPhone: savedShopPhone,
    receiverName: '', // Tên khách nhận (Chuẩn form backend)
    receiverPhone: '', // SĐT khách nhận (Chuẩn form backend)
    deliveryAddress: '', // Giao đến đâu
    deliveryCoordinates: null, // Toạ độ khách nhận
    packageDescription: '',
    codAmount: '',
    note: ''
  });

  // Reset form nhưng giữ lại địa chỉ shop nếu có thay đổi từ bên ngoài
  useEffect(() => {
    if (isOpen) {
      setForm(prev => ({
        ...prev,
        pickupAddress: localStorage.getItem('savedShopLocation') ? JSON.parse(localStorage.getItem('savedShopLocation')).address : (localStorage.getItem('shopAddress') || prev.pickupAddress),
        pickupPhone: localStorage.getItem('shopPhone') || prev.pickupPhone,
      }));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    
    if (!form.pickupAddress.trim() || !form.pickupPhone.trim()) {
      return alert('Vui lòng nhập Địa chỉ và SĐT cửa hàng (Nơi lấy hàng)');
    }
    
    const savedLocStr = localStorage.getItem('savedShopLocation');
    if (!savedLocStr) {
      return alert('Vui lòng tắt form này, chạm vào thanh "Kéo ghim toạ độ" ở trang chủ để định vị chính xác vị trí Cửa hàng của bạn trước khi lên đơn!');
    }
    const savedLoc = JSON.parse(savedLocStr);

    if (!form.receiverName.trim() || !form.receiverPhone.trim() || !form.deliveryAddress.trim()) {
      return alert('Vui lòng nhập đầy đủ Tên, SĐT Khách nhận và Địa chỉ giao hàng!');
    }

    let isSuccess = false;
    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const payload = {
        serviceType: 'GIAO_HANG',
        senderName: localStorage.getItem('shopName') || 'Cửa hàng',
        senderPhone: form.pickupPhone.trim(),
        receiverName: form.receiverName.trim(),
        receiverPhone: form.receiverPhone.trim(),
        pickupPhone: form.pickupPhone.trim(), // Lưu lại thêm để chắc chắn SĐT đặt cuốc
        pickupAddress: form.pickupAddress.trim(),
        deliveryAddress: form.deliveryAddress.trim(),
        pickupCoordinates: { lat: savedLoc.lat, lng: savedLoc.lng }, 
        deliveryCoordinates: form.deliveryCoordinates || null,
        packageDetails: { description: form.packageDescription },
        note: form.note,
        codAmount: form.codAmount ? parseInt(form.codAmount) : 0,
      };

      const res = await api.post('/orders/customer', payload);
      
      if (res.data.success) {
        isSuccess = true;
        // Chỉ lưu lại làm mặc định nếu đây là lần đầu tiên tạo đơn
        if (!localStorage.getItem('shopAddress')) localStorage.setItem('shopAddress', form.pickupAddress.trim());
        if (!localStorage.getItem('shopPhone')) localStorage.setItem('shopPhone', form.pickupPhone.trim());
        
        alert('Tạo đơn hàng thành công! Đơn hàng đang được Tổng Đài báo giá phí giao và điều phối xe.');
        
        // Reset form sạch bong (Trừ thông tin Shop)
        setForm(prev => ({
          ...prev,
          receiverName: '',
          receiverPhone: '',
          deliveryAddress: '',
          deliveryCoordinates: null,
          packageDescription: '',
          codAmount: '',
          note: ''
        }));

        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi tạo đơn: ' + (error.response?.data?.message || 'Vui lòng thử lại.'));
    } finally {
      if (!isSuccess) {
        isSubmittingRef.current = false;
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity">
      {/* Nền bấm để đóng */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="bg-slate-50 w-full max-w-lg rounded-t-[32px] shadow-2xl relative flex flex-col max-h-[90vh] animate-slide-up pb-safe">
        
        {/* Header Modal */}
        <div className="bg-white px-6 py-5 rounded-t-[32px] border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Tạo Đơn Giao Hàng</h2>
            <p className="text-xs text-blue-500 font-semibold mt-1 bg-blue-50 inline-block px-2 py-0.5 rounded-full">Dành cho Shop</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full active:scale-90 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto p-5 space-y-4 hide-scrollbar">
          
          {/* Thông tin Cửa hàng */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group focus-within:border-blue-200 focus-within:shadow-md transition-all">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center"><MapPin size={12} className="text-slate-500"/></span>
              Nơi Lấy Hàng (Shop)
            </h3>
            
            <div className="space-y-4">
              <input 
                type="text" name="pickupAddress" value={form.pickupAddress} onChange={handleChange}
                placeholder="Số nhà, Tên đường cửa hàng..."
                className="w-full text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2 focus:border-blue-500 outline-none transition-colors placeholder-slate-300"
              />
              <input 
                type="tel" name="pickupPhone" value={form.pickupPhone} onChange={handleChange}
                placeholder="SĐT Cửa hàng..."
                className="w-full text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2 focus:border-blue-500 outline-none transition-colors placeholder-slate-300"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 italic flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-blue-400"></span>Sửa đổi tại đây chỉ áp dụng cho riêng đơn này</p>
          </div>

          {/* Thông tin Khách nhận */}
          <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group focus-within:border-blue-300 focus-within:shadow-md transition-all">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center"><User size={12} className="text-blue-600"/></span>
              Khách Nhận (Giao Đến)
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" name="receiverName" value={form.receiverName} onChange={handleChange}
                  placeholder="Tên người nhận *"
                  className="w-full text-sm font-medium text-slate-800 border-b border-slate-200 pb-2 focus:border-blue-500 outline-none transition-colors placeholder-slate-300"
                />
                <input 
                  type="tel" name="receiverPhone" value={form.receiverPhone} onChange={handleChange}
                  placeholder="SĐT Khách *"
                  className="w-full text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 focus:border-blue-500 outline-none transition-colors placeholder-slate-400"
                />
              </div>
              <div className="flex items-center bg-white border-b border-slate-200 focus-within:border-blue-500 transition-colors pb-1">
                <AddressAutocompleteInput 
                  value={form.deliveryAddress}
                  onChangeText={txt => setForm(prev => ({...prev, deliveryAddress: txt}))}
                  onSelectCoordinates={coords => setForm(prev => ({...prev, deliveryCoordinates: coords}))}
                  placeholder="Địa chỉ giao đến *"
                  onClickMapIcon={(query) => setMapConfig({ type: 'delivery', pos: form.deliveryCoordinates ? [form.deliveryCoordinates.lat, form.deliveryCoordinates.lng] : null, query })}
                  className="w-full font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Thông tin Hàng & Tiền */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-slate-400 bg-slate-50 p-2 rounded-lg"><Package size={18}/></div>
              <input 
                type="text" name="packageDescription" value={form.packageDescription} onChange={handleChange}
                placeholder="Giao món gì? (Vd: 2 Cơm, 1 Nước)"
                className="flex-1 text-sm font-medium text-slate-700 border-b border-slate-100 pb-2 focus:border-blue-400 outline-none placeholder-slate-300"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="text-blue-500 bg-blue-50 p-2 rounded-lg"><Banknote size={18}/></div>
              <input 
                type="number" name="codAmount" value={form.codAmount} onChange={handleChange}
                placeholder="Tiền thu hộ COD (VNĐ)"
                className="flex-1 text-sm font-bold text-blue-600 border-b border-slate-100 pb-2 focus:border-blue-400 outline-none placeholder-slate-300"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="text-slate-400 bg-slate-50 p-2 rounded-lg"><StickyNote size={18}/></div>
              <input 
                type="text" name="note" value={form.note} onChange={handleChange}
                placeholder="Ghi chú thêm cho Tài xế..."
                className="flex-1 text-sm font-medium text-slate-700 border-b border-slate-100 pb-2 focus:border-blue-400 outline-none placeholder-slate-300"
              />
            </div>
          </div>

        </div>

        {/* Nút Tạo Đơn */}
        <div className="bg-white p-5 border-t border-slate-100 mt-auto sticky bottom-0">
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-extrabold text-white text-base shadow-lg flex items-center justify-center gap-2 transition-all ${loading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-blue-500/30'}`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Đang lên đơn...
              </span>
            ) : (
              <>
                <Navigation size={20} className="mr-1" />
                HOÀN TẤT LÊN ĐƠN
              </>
            )}
          </button>
        </div>

      </div>

      <LocationPicker 
        isOpen={mapConfig !== null}
        onClose={() => setMapConfig(null)}
        initialPosition={mapConfig?.pos}
        initialSearchQuery={mapConfig?.query}
        onSelect={(loc) => {
          if (mapConfig?.type === 'delivery') {
            setForm({ ...form, deliveryAddress: loc.address, deliveryCoordinates: { lat: loc.lat, lng: loc.lng } });
          }
        }}
      />
    </div>
  );
};

export default ShopCreateOrderModal;
