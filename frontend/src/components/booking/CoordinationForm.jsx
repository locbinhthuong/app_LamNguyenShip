import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Wallet, Landmark, Handshake, CreditCard, DollarSign } from 'lucide-react';
import LocationPicker from '../LocationPicker';

export default function CoordinationForm({ onBooking, loading, defaultLocation, defaultPhone, customerData }) {
  const [subType, setSubType] = useState('GAP_TRUC_TIEP'); // NAP_TIEN, RUT_TIEN, GAP_TRUC_TIEP

  const [form, setForm] = useState({
    customerName: customerData?.name || '',
    customerPhone: defaultPhone || '',
    pickupAddress: defaultLocation?.address || '',
    pickupCoordinates: defaultLocation?.coordinates || null,
    bankName: '',
    bankAccount: '',
    bankAccountName: '',
    note: ''
  });

  const [mapConfig, setMapConfig] = useState(null);

  useEffect(() => {
    if (defaultLocation?.address) {
      setForm(prev => ({ ...prev, pickupAddress: defaultLocation.address, pickupCoordinates: defaultLocation.coordinates }));
    }
  }, [defaultLocation]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.pickupAddress.trim()) return alert('Vui lòng chọn hoặc nhập Vị Trí Giao Dịch!');
    // Lấy thông tin từ Account, không cần bắt nhập tay
    // if (!form.customerName.trim() || !form.customerPhone.trim()) { ... }

    if (subType === 'NAP_TIEN' || subType === 'RUT_TIEN') {
      if (!form.bankName.trim() || !form.bankAccount.trim() || !form.bankAccountName.trim()) {
        return alert('Vui lòng nhập Đầy đủ Tên Ngân Hàng, Số Tài Khoản và Tên Chủ Tài Khoản!');
      }
      if (!form.transactionAmount || parseInt(form.transactionAmount) <= 0) {
        return alert('Vui lòng nhập Số Tiền hợp lệ!');
      }
    }

    // Xác định Tiêu đề Note
    let title = '';
    if (subType === 'NAP_TIEN') title = `[NẠP TIỀN NGÂN HÀNG ${form.bankName.toUpperCase()}]`;
    if (subType === 'RUT_TIEN') title = `[RÚT TIỀN MẶT]`;
    if (subType === 'GAP_TRUC_TIEP') title = `[GẶP ĐIỀU PHỐI VIÊN]`;

    onBooking({
      serviceType: 'DIEU_PHOI',
      subServiceType: subType, // NAP_TIEN, RUT_TIEN, GAP_TRUC_TIEP
      customerName: customerData?.name || form.customerName,
      customerPhone: defaultPhone || form.customerPhone,
      pickupAddress: form.pickupAddress.trim(),
      pickupCoordinates: form.pickupCoordinates || { lat: 10.045, lng: 105.746 }, 
      deliveryAddress: '', // Điều phối thường chỉ cần 1 điểm (Nơi khách đứng)
      deliveryCoordinates: null,
      note: form.note.trim(),
      packageDetails: {
        description: title
      },
      financialDetails: {
        bankName: (subType === 'NAP_TIEN' || subType === 'RUT_TIEN') ? form.bankName.trim() : '',
        bankAccount: (subType === 'NAP_TIEN' || subType === 'RUT_TIEN') ? form.bankAccount.trim() : '',
        bankAccountName: (subType === 'NAP_TIEN' || subType === 'RUT_TIEN') ? form.bankAccountName.trim() : '',
        transactionAmount: (subType === 'NAP_TIEN' || subType === 'RUT_TIEN') ? parseInt(form.transactionAmount) : 0
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-28">
      
      {/* LOẠI DỊCH VỤ */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-2">
        <button 
          type="button"
          onClick={() => setSubType('GAP_TRUC_TIEP')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-colors ${subType === 'GAP_TRUC_TIEP' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Handshake size={20} />
          <span className="text-[10px] sm:text-xs font-bold text-center">Gặp Trực Tiếp</span>
        </button>
        <button 
          type="button"
          onClick={() => setSubType('NAP_TIEN')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-colors ${subType === 'NAP_TIEN' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Landmark size={20} />
          <span className="text-[10px] sm:text-xs font-bold text-center">Nạp Tiền (CK)</span>
        </button>
        <button 
          type="button"
          onClick={() => setSubType('RUT_TIEN')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-colors ${subType === 'RUT_TIEN' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Wallet size={20} />
          <span className="text-[10px] sm:text-xs font-bold text-center">Rút Tiền Mặt</span>
        </button>
      </div>

      {/* KHUYẾN CÁO */}
      <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-2">
        <div className="text-blue-500 mt-0.5"><Navigation size={18} /></div>
        <p className="text-xs text-blue-800 leading-relaxed font-medium">
          {subType === 'GAP_TRUC_TIEP' 
            ? "Tài xế/Điều phối sẽ chạy trực tiếp đến gặp bạn. Vui lòng ghi chú rõ lý do nếu có."
            : subType === 'NAP_TIEN' 
            ? "Đưa tiền mặt cho tài xế, tài xế sẽ bắn khoản tiền đó vào Số Tài Khoản bạn cung cấp. Chi phí thực hiện sẽ báo trước."
            : "Chuyển tiền vào tài khoản AloShipp, tài xế sẽ mang Tiền Mặt đến tận tay cho bạn."}
        </p>
      </div>

      {/* THÔNG TIN HÀNH TRÌNH CHỈ HIỂN THỊ KHI NẠP/RÚT */}
      {subType !== 'GAP_TRUC_TIEP' && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
          {/* ĐỊA ĐIỂM */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center mt-1">
              <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                BẠN ĐANG Ở ĐÂU VÀ MUỐN GẶP Ở ĐÂU?
              </label>
              <div className="flex items-center mb-2 bg-white border border-gray-100 rounded-xl overflow-hidden focus-within:border-indigo-300">
                <input 
                  type="text"
                  placeholder="Nhập địa chỉ giao dịch..."
                  className="flex-1 text-sm font-semibold text-gray-800 outline-none p-3 bg-transparent"
                  value={form.pickupAddress}
                  onChange={e => setForm({...form, pickupAddress: e.target.value})}
                />
                <div 
                  className="bg-indigo-50 p-3 text-indigo-600 cursor-pointer active:bg-indigo-100 flex items-center justify-center border-l border-indigo-100"
                  onClick={() => setMapConfig({ type: 'pickup', pos: form.pickupCoordinates ? [form.pickupCoordinates.lat, form.pickupCoordinates.lng] : null })}
                >
                  <MapPin size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DATA NẠP / RÚT */}
      {(subType === 'NAP_TIEN' || subType === 'RUT_TIEN') && (
        <div className={`bg-white p-4 rounded-2xl shadow-sm border space-y-3 animate-fadeIn ${subType === 'NAP_TIEN' ? 'border-blue-100' : 'border-orange-100'}`}>
          <label className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${subType === 'NAP_TIEN' ? 'text-blue-500' : 'text-orange-500'}`}>
             {subType === 'NAP_TIEN' ? <Landmark size={14} /> : <DollarSign size={14} />} 
             CUNG CẤP TÀI KHOẢN {subType === 'NAP_TIEN' ? 'NHẬN TIỀN' : 'RÚT TIỀN'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input 
              type="text" placeholder="Tên Ngân Hàng (VD: VCB)"
              className={`text-sm border-b p-2 outline-none font-medium text-gray-800 ${subType === 'NAP_TIEN' ? 'border-blue-100' : 'border-orange-100'}`}
              value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})}
            />
            <input 
              type="text" placeholder="Tên Chủ Tài Khoản"
              className={`text-sm border-b p-2 outline-none font-bold text-gray-800 uppercase ${subType === 'NAP_TIEN' ? 'border-blue-100' : 'border-orange-100'}`}
              value={form.bankAccountName} onChange={e => setForm({...form, bankAccountName: e.target.value.toUpperCase()})}
            />
          </div>
          <div>
            <input 
              type="text" placeholder="Số Tài Khoản"
              className={`w-full text-base border-b p-2 pb-3 mb-2 outline-none font-bold tracking-wider ${subType === 'NAP_TIEN' ? 'border-blue-100 text-blue-600' : 'border-orange-100 text-orange-600'}`}
              value={form.bankAccount} onChange={e => setForm({...form, bankAccount: e.target.value})}
            />
          </div>
          <div>
            <input 
              type="number" placeholder={`Số Tiền Cần ${subType === 'NAP_TIEN' ? 'Nạp' : 'Rút'} (VD: 500000)`}
              className={`w-full text-base font-bold text-gray-800 border p-3 rounded-xl outline-none ${subType === 'NAP_TIEN' ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}
              value={form.transactionAmount} onChange={e => setForm({...form, transactionAmount: e.target.value})}
            />
          </div>
        </div>
      )}

      {/* THÔNG TIN KHÁCH HÀNG ĐÃ ĐƯỢC ẨN VÌ TỰ LẤY TỪ ACCOUNT DỮ LIỆU CHÍNH */}
      {subType !== 'GAP_TRUC_TIEP' && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
          <div>
            <textarea 
              rows="2"
              placeholder="Ghi chú thêm cho bộ phận Điều Phối"
              className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-100 p-3 rounded-xl outline-none focus:border-blue-200 focus:bg-white transition-colors resize-none"
              value={form.note}
              onChange={e => setForm({...form, note: e.target.value})}
            ></textarea>
          </div>
        </div>
      )}

      {/* FLOAT BUTTON / UI TỔNG ĐÀI THEO LOẠI */}
      {subType === 'GAP_TRUC_TIEP' ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 flex flex-col items-center justify-center text-center space-y-4 mb-4 mt-6 animate-fadeIn">
          <div className="w-32 h-32 mb-2 bg-indigo-50 rounded-2xl p-2 border border-indigo-100 flex items-center justify-center shadow-inner">
             <img src="https://img.vietqr.io/image/970422-0827758062-compact.jpg?amount=0&addInfo=AloShipp%20Lien%20He&accountName=LAM%20NGUYEN" alt="QR" className="w-full h-full object-contain rounded-xl" />
          </div>
          <p className="text-indigo-900 font-bold text-lg mb-1 tracking-tight">Tổng đài Điều Phối AloShipp</p>
          <p className="text-slate-500 text-sm mb-4 leading-relaxed px-2 font-medium">Quét mã QR qua Zalo hoặc bấm gọi trực tiếp để kết nối nhanh nhất với bộ phận điều phối.</p>
          <div className="flex gap-3 w-full">
            <a href="tel:0827758062" className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold rounded-xl py-3.5 shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform flex items-center justify-center gap-2">
              <span className="text-xl">📞</span> Trực Tiếp
            </a>
            <a href="https://zalo.me/0827758062" target="_blank" rel="noopener noreferrer" className="flex-1 bg-gradient-to-r from-blue-400 to-blue-500 text-white font-bold rounded-xl py-3.5 shadow-lg shadow-blue-500/30 active:scale-95 transition-transform flex items-center justify-center gap-2">
              <span className="text-xl">💬</span> Zalo
            </a>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-50 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button 
          disabled={loading}
          type="submit"
          className="w-full bg-indigo-600 active:bg-indigo-700 text-white font-bold text-sm sm:text-base py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>ĐANG XỬ LÝ...</span>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Navigation size={20} />
              <span>GỞI YÊU CẦU ĐIỀU PHỐI</span>
            </div>
          )}
        </button>
      </div>
      )}

      <LocationPicker 
        isOpen={mapConfig !== null}
        onClose={() => setMapConfig(null)}
        initialPosition={mapConfig?.pos}
        onSelect={(loc) => {
          if (mapConfig?.type === 'pickup') {
            setForm({ ...form, pickupAddress: loc.address, pickupCoordinates: { lat: loc.lat, lng: loc.lng } });
          }
        }}
      />
    </form>
  );
}
