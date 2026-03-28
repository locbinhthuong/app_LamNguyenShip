import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Package, StickyNote, Banknote, Navigation } from 'lucide-react';
import { api } from '../../services/api';

const BookingFlow = () => {
  const navigate = useNavigate();
  const { serviceType } = useParams(); // Lấy loại dịch vụ từ URL (VD: GIAO_HANG)
  const isAuthenticated = !!localStorage.getItem('customerToken');

  // Nếu khách chưa Đăng Nhập mà nhảy lén vào đây, đuổi về Login
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const [loading, setLoading] = useState(false);
  const [dieuPhoiType, setDieuPhoiType] = useState('NAP_TIEN'); // 'NAP_TIEN', 'RUT_TIEN', 'LAI_HO'
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    receiverName: '',
    receiverPhone: '',
    pickupAddress: '', // Đọc từ savedLocation
    pickupCoordinates: null,
    dropoffAddress: '', // Khách tự nhập
    packageDescription: '',
    codAmount: '',
    note: ''
  });

  // Tự động load Tên và SĐT của người đang Đăng Nhập
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/customer/me');
        if (res.data.success) {
          setForm(prev => ({
            ...prev,
            customerName: res.data.data.name,
            customerPhone: res.data.data.phone
          }));
        }
      } catch (err) {
         console.log('Lấy profile lỗi');
      }
    };
    fetchProfile();

    // Lấy định vị đã ghim
    const saved = localStorage.getItem('savedLocation');
    if (saved) {
      const loc = JSON.parse(saved);
      setForm(prev => ({
        ...prev,
        pickupAddress: loc.address,
        pickupCoordinates: { lat: loc.lat, lng: loc.lng }
      }));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.pickupAddress.trim() || !form.pickupCoordinates) return alert('Vui lòng quay lại Trang Chủ, kéo ghim để xác định toạ độ Điểm Lấy Hàng của bạn!');
    if (serviceType !== 'DIEU_PHOI' && !form.dropoffAddress.trim()) return alert('Vui lòng nhập Điểm Giao Hàng/Đến Đâu!');
    if (serviceType === 'GIAO_HANG' && (!form.receiverName.trim() || !form.receiverPhone.trim())) {
      return alert('Vui lòng nhập đầy đủ Tên và SĐT của Người nhận hàng!');
    }
    
    // Điều Phối validation
    if (serviceType === 'DIEU_PHOI') {
      if (dieuPhoiType === 'LAI_HO' && !form.dropoffAddress.trim()) {
        return alert('Vui lòng nhập Điểm Về (Bạn muốn về đâu)!');
      }
      if ((dieuPhoiType === 'NAP_TIEN' || dieuPhoiType === 'RUT_TIEN') && (!form.codAmount || parseInt(form.codAmount) <= 0)) {
        return alert('Vui lòng nhập Số tiền cần giao dịch!');
      }
    }

    setLoading(true);
    try {
      let modifiedPackage = form.packageDescription;
      
      if (serviceType === 'DIEU_PHOI') {
        if (dieuPhoiType === 'NAP_TIEN') {
          modifiedPackage = `[NẠP TIỀN] ${form.codAmount}đ`;
        } else if (dieuPhoiType === 'RUT_TIEN') {
          modifiedPackage = `[RÚT TIỀN] ${form.codAmount}đ`;
        } else if (dieuPhoiType === 'LAI_HO') {
          modifiedPackage = `[LÁI HỘ XE MÁY] Chở người và xe`;
        }
      }

      const payload = {
        serviceType: serviceType || 'GIAO_HANG',
        customerName: serviceType === 'GIAO_HANG' ? form.receiverName.trim() : form.customerName,
        customerPhone: serviceType === 'GIAO_HANG' ? form.receiverPhone.trim() : form.customerPhone,
        pickupPhone: form.customerPhone, // Khách đặt đơn là người gửi
        pickupAddress: form.pickupAddress.trim(),
        pickupCoordinates: form.pickupCoordinates || { lat: 10.045, lng: 105.746 }, 
        packageDetails: { description: modifiedPackage },
        note: form.note,
        codAmount: form.codAmount ? parseInt(form.codAmount) : 0,
      };

      if (serviceType !== 'DIEU_PHOI' || dieuPhoiType === 'LAI_HO') {
        payload.deliveryAddress = form.dropoffAddress.trim();
        payload.deliveryCoordinates = { lat: 10.050, lng: 105.750 };
      }

      const res = await api.post('/orders/customer', payload);
      if (res.data.success) {
        alert('Tạo đơn hàng thành công! Đơn hàng đang gửi Tổng đài định giá Phí Ship. Xin vui lòng đợi ít phút.');
        navigate('/customer/activity'); // Chuyển sang Trang Lịch Sử
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi tạo đơn hàng: ' + (error.response?.data?.message || 'Vui lòng thử lại.'));
    } finally {
      setLoading(false);
    }
  };

  // Ánh xạ Tên Dịch Vụ
  const getServiceName = () => {
    switch(serviceType) {
      case 'GIAO_HANG': return 'Dịch vụ Giao Hàng';
      case 'DAT_XE': return 'Dịch vụ Đặt Xe';
      case 'MUA_HO': return 'Dịch vụ Mua Hộ';
      case 'DIEU_PHOI': return 'Điều Phối Tổng Đài';
      default: return 'Tạo Đơn Hàng';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24 font-sans relative">
      {/* HEADER */}
      <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-40 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 active:scale-90 transition-transform">
          <ArrowLeft size={22} />
        </button>
        <span className="font-bold text-gray-800 flex-1 text-center pr-8">{getServiceName()}</span>
      </div>

      <div className="p-4 space-y-4">
        
        {/* NẾU LÀ ĐIỀU PHỐI -> HIỂN THỊ CÁC TAB CHỌN LOẠI */}
        {serviceType === 'DIEU_PHOI' && (
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-2">
            <button 
              onClick={() => setDieuPhoiType('NAP_TIEN')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${dieuPhoiType === 'NAP_TIEN' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Nạp Tiền
            </button>
            <button 
              onClick={() => setDieuPhoiType('RUT_TIEN')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${dieuPhoiType === 'RUT_TIEN' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Rút Tiền
            </button>
            <button 
              onClick={() => setDieuPhoiType('LAI_HO')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${dieuPhoiType === 'LAI_HO' ? 'bg-teal-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Lái Xe Máy
            </button>
          </div>
        )}

        {/* KHUYẾN CÁO */}
        <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-2">
          <div className="text-blue-500 mt-0.5"><Navigation size={18} /></div>
          <p className="text-xs text-blue-800 leading-relaxed font-medium">
            Giá cước sẽ được Tài Xế / Tổng đài gọi điện thoả thuận. Bạn chỉ cần nhập rõ điểm đến và ghi chú (nếu có).
          </p>
        </div>

        {/* CONTAINER NHẬP ĐỊA CHỈ (TIMELINE) */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-5">
          {/* LẤY HÀNG */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center mt-1">
              <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
              </div>
              <div className="w-0.5 h-12 bg-gray-200 mt-1"></div>
            </div>
            <div className="flex-1 border-b border-gray-100 pb-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                {serviceType === 'DAT_XE' ? 'ĐIỂM ĐÓN BẠN' : (serviceType === 'MUA_HO' ? 'MUA Ở ĐÂU (TIỆM / QUÁN)' : (serviceType === 'DIEU_PHOI' && dieuPhoiType !== 'LAI_HO' ? 'NƠI BẠN ĐANG ĐỨNG (GIAO DỊCH)' : 'ĐIỂM LẤY HÀNG (BẠN ĐANG Ở)'))}
              </label>
              <div className="flex items-center">
                <input 
                  type="text"
                  placeholder="Nhập chi tiết số nhà, tên đường..."
                  className="flex-1 text-sm font-semibold text-gray-800 outline-none pr-3"
                  value={form.pickupAddress}
                  onChange={e => setForm({...form, pickupAddress: e.target.value})}
                />
                <div className="bg-gray-100 p-2 rounded-full text-gray-600"><MapPin size={18} /></div>
              </div>
            </div>
          </div>

          {/* GIAO ĐẾN */}
          {(serviceType !== 'DIEU_PHOI' || dieuPhoiType === 'LAI_HO') && (
            <div className="flex items-start gap-4 -mt-2">
              <div className="flex flex-col items-center mt-1">
                <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  {serviceType === 'DAT_XE' ? 'BẠN MUỐN ĐI ĐÂU' : 'GIAO ĐẾN ĐÂU'}
                </label>
                <div className="flex items-center">
                  <input 
                    type="text"
                    placeholder="Nhập địa chỉ đến..."
                    className="flex-1 text-sm font-semibold text-gray-800 outline-none pr-3"
                    value={form.dropoffAddress}
                    onChange={e => setForm({...form, dropoffAddress: e.target.value})}
                  />
                  <div className="bg-sky-50 p-2 rounded-full text-sky-600 border border-sky-100"><MapPin size={18} /></div>
                </div>
              </div>
            </div>
          )}

          {/* NHẬP NGƯỜI NHẬN CHO GIAO HÀNG */}
          {serviceType === 'GIAO_HANG' && (
            <div className="flex items-start gap-4 -mt-2">
              <div className="flex flex-col items-center mt-1">
                <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                </div>
              </div>
              <div className="flex-1 border-t border-gray-100 pt-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  THÔNG TIN NGƯỜI NHẬN HÀNG
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="text"
                    placeholder="Tên người nhận *"
                    className="flex-1 text-sm font-semibold text-gray-800 outline-none border-b border-gray-200 pb-2"
                    value={form.receiverName}
                    onChange={e => setForm({...form, receiverName: e.target.value})}
                  />
                  <input 
                    type="tel"
                    placeholder="SĐT người nhận *"
                    className="flex-1 text-sm font-semibold text-gray-800 outline-none border-b border-gray-200 pb-2"
                    value={form.receiverPhone}
                    onChange={e => setForm({...form, receiverPhone: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* THÔNG TIN CHI TIẾT */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-5">
          <h3 className="font-bold text-sm text-gray-800 border-b border-gray-100 pb-2">Thông tin chi tiết</h3>
          
          {serviceType === 'DIEU_PHOI' && (dieuPhoiType === 'NAP_TIEN' || dieuPhoiType === 'RUT_TIEN') && (
            <div className="flex items-center gap-3">
              <div className="text-gray-400"><Banknote size={20} /></div>
              <input 
                type="number" 
                placeholder={dieuPhoiType === 'NAP_TIEN' ? "Nhập số tiền bạn muốn nạp (VNĐ)" : "Nhập số tiền bạn muốn rút (VNĐ)"} 
                className="flex-1 text-sm font-bold text-blue-700 outline-none border-b border-gray-200 pb-1"
                value={form.codAmount}
                onChange={e => setForm({...form, codAmount: e.target.value})}
              />
            </div>
          )}

          {serviceType !== 'DAT_XE' && serviceType !== 'DIEU_PHOI' && (
            <div className="flex items-center gap-3">
              <div className="text-gray-400"><Package size={20} /></div>
              <input 
                type="text" 
                placeholder={serviceType === 'MUA_HO' ? "Bạn muốn mua gì? (Ví dụ: 2 ly trà sữa ít đá)" : "Bạn muốn gửi cái gì? (Gói hàng, đồ ăn...)"}
                className="flex-1 text-sm outline-none border-b border-gray-200 pb-1"
                value={form.packageDescription}
                onChange={e => setForm({...form, packageDescription: e.target.value})}
              />
            </div>
          )}

          {(serviceType === 'GIAO_HANG' || serviceType === 'MUA_HO') && (
            <div className="flex items-center gap-3">
              <div className="text-gray-400"><Banknote size={20} /></div>
              <input 
                type="number" 
                placeholder="Tiền thu hộ COD (VNĐ) - Nếu có" 
                className="flex-1 text-sm outline-none border-b border-gray-200 pb-1"
                value={form.codAmount}
                onChange={e => setForm({...form, codAmount: e.target.value})}
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="text-gray-400"><StickyNote size={20} /></div>
            <input 
              type="text" 
              placeholder={serviceType === 'DIEU_PHOI' ? (dieuPhoiType === 'NAP_TIEN' ? "Tên Ngân Hàng, STK, Tên Người Nhận (Bắt buộc)" : dieuPhoiType === 'LAI_HO' ? "Xe Yamaha hay Honda? Biển số xe?" : "Ghi chú thêm cho tài xế...") : (serviceType === 'DAT_XE' ? "Mặc áo màu gì, đợi ở góc nào..." : "Ghi chú cho Tài xế: Số nhà, dặn dò...")}
              className="flex-1 text-sm outline-none border-b border-gray-200 pb-1"
              value={form.note}
              onChange={e => setForm({...form, note: e.target.value})}
            />
          </div>
        </div>
      </div>

      {/* FOOTER BUTTON */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-40">
        <button 
          onClick={handleSubmit} 
          disabled={loading}
          className={`w-full py-3.5 rounded-2xl font-bold text-white shadow-xl flex items-center justify-center transition-all ${loading ? 'bg-blue-300' : 'bg-blue-600 active:scale-[0.98]'}`}
        >
          {loading ? 'Đang gửi yêu cầu...' : 'GỬI TỔNG ĐÀI ĐỊNH GIÁ'}
        </button>
      </div>
    </div>
  );
};

export default BookingFlow;
