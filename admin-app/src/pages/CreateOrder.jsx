import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '../services/api';
import CurrencyInput from '../components/CurrencyInput';

export default function CreateOrder() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    pickupPhone: '',
    pickupAddress: '',
    deliveryAddress: '',
    items: '',
    note: '',
    codAmount: '',
    deliveryFee: '',
    adminBonus: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [smartText, setSmartText] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSmartPaste = (e) => {
    const text = e.target.value;
    setSmartText(text);
    if (!text.trim()) return;

    const newForm = { ...form };

    // 1. Phân tích Điểm Lấy (Thêm nhiều cụm từ linh hoạt như khách hay nhắn)
    const pickupMatch = text.match(/(?:📍?Điểm Lấy Đơn:|Điểm Lấy:|Từ:|Lấy đơn tại:|Lấy hàng:|Lấy tại:|Nhận tại:|Địa chỉ lấy:|Nơi lấy:|Chỗ lấy:|Chỗ này lấy đơn:|Lấy chỗ này:|Lấy chỗ:)\s*([^\n]+)/i);
    let rawPickup = pickupMatch ? pickupMatch[1].trim() : '';

    // 2. Phân tích Điểm Giao (Thêm nhiều cụm từ linh hoạt)
    const deliveryMatch = text.match(/(?:Điểm Giao:|Đến:|Giao:|Giao đơn tại:|Giao hàng:|Giao tại:|Giao đến:|Địa chỉ giao:|Nơi giao:|Chỗ giao:|Giao chỗ này:|Trực tiếp:|Gửi cho:|Ship qua:)\s*([^\n]+)/i);
    let rawDelivery = deliveryMatch ? deliveryMatch[1].trim() : '';

    // 3. Phân tích SĐT
    let pPhone = '';
    const pMatch = rawPickup.match(/(0\d{9,10})/);
    if (pMatch) { 
      pPhone = pMatch[1]; 
      rawPickup = rawPickup.replace(pMatch[1], '').replace(/[-,\s]+$/, '').trim(); 
    }

    let dPhone = '';
    const dMatch = rawDelivery.match(/(0\d{9,10})/);
    if (dMatch) { 
      dPhone = dMatch[1]; 
      rawDelivery = rawDelivery.replace(dMatch[1], '').replace(/[-,\s]+$/, '').trim(); 
    }

    const allPhones = text.match(/0\d{9,10}/g) || [];
    if (!pPhone && allPhones.length > 0) pPhone = allPhones[0];

    const deliveryIndex = text.toLowerCase().indexOf('điểm giao');
    if (!dPhone && deliveryIndex !== -1) {
       const textAfter = text.substring(deliveryIndex);
       const phonesAfter = textAfter.match(/0\d{9,10}/g);
       if (phonesAfter && phonesAfter.length > 0) dPhone = phonesAfter[0];
    }
    if (!dPhone && allPhones.length > 1) dPhone = allPhones[allPhones.length - 1];

    if (rawPickup) newForm.pickupAddress = rawPickup;
    if (pPhone) newForm.pickupPhone = pPhone;
    if (rawDelivery) newForm.deliveryAddress = rawDelivery;
    if (dPhone) newForm.customerPhone = dPhone; 
    if (dPhone && !newForm.customerName) newForm.customerName = 'Khách đặt qua Chat';

    // 4. Phân tích COD
    const codMatch = text.match(/Thu\s*([0-9\.,]+[kK]?)/i);
    if (codMatch) {
       let codStr = codMatch[1].toLowerCase().replace(/[,.]/g, '');
       let cod = 0;
       if (codStr.includes('k')) cod = parseInt(codStr.replace('k', '')) * 1000;
       else cod = parseInt(codStr);
       if (cod > 0 && cod < 1000) cod = cod * 1000;
       newForm.codAmount = cod;
    }

    // 5. Phân tích Ship
    const shipMatch = text.match(/Ship:\s*([0-9\.,]+[kK]?)/i);
    if (shipMatch) {
       let shipStr = shipMatch[1].toLowerCase().replace(/[,.]/g, '');
       let ship = 0;
       if (shipStr.includes('k')) ship = parseInt(shipStr.replace('k', '')) * 1000;
       else ship = parseInt(shipStr);
       if (ship > 0 && ship < 1000) ship = ship * 1000;
       newForm.deliveryFee = ship;
    }

    // 6. Trích xuất ghi chú
    const noteLines = text.split('\n').map(l => l.trim()).filter(l => {
       if (!l) return false;
       if (l.match(/^(📍?Điểm Lấy Đơn:|Điểm Lấy:|Từ:|Lấy đơn|Lấy hàng|Lấy tại|Nơi lấy|Chỗ lấy|Điểm Giao:|Đến:|Giao:|Giao đơn|Giao hàng|Nơi giao|Chỗ giao|Ship:)/i)) return false;
       if (l.match(/^0\d{9,10}$/)) return false; 
       if (l.match(/^Thu\s*([0-9\.,]+[kK]?)$/i)) return false; // Chỉ bỏ qua nếu dòng CHỈ chứa mệnh giá thu
       return true;
    });
    const parsedNote = noteLines.join(' | ');
    if (parsedNote) {
       newForm.note = newForm.note ? newForm.note + ' | ' + parsedNote : parsedNote;
    }

    setForm(newForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerName || !form.customerPhone || !form.pickupAddress) {
      setError('Vui lòng điền những thông tin bắt buộc (*)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const items = form.items ? form.items.split('\n').filter(i => i.trim()) : [];
      await createOrder({
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        pickupPhone: form.pickupPhone,
        pickupAddress: form.pickupAddress,
        deliveryAddress: form.deliveryAddress,
        items,
        note: form.note,
        codAmount: form.codAmount ? parseInt(form.codAmount) : 0,
        deliveryFee: form.deliveryFee ? parseInt(form.deliveryFee) : 0,
        adminBonus: form.adminBonus ? parseInt(form.adminBonus) : 0
      });
      alert('Tạo đơn hàng thành công!');
      navigate('/orders');
    } catch (err) {
      setError(err.response?.data?.message || 'Tạo đơn thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4 pb-8 sm:p-6">
      <h1 className="mb-5 text-lg font-bold text-slate-800 sm:mb-6 sm:text-2xl">📦 Tạo Đơn hàng Mới</h1>

      {/* TẠO ĐƠN THÔNG MINH */}
      <div className="mb-6 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-4">
        <label className="mb-2 block text-sm font-bold text-blue-800 flex items-center justify-between">
          <span>🤖 Dán Nhanh Đơn Zalo / Facebook</span>
          <button 
            type="button" 
            onClick={() => { setSmartText(''); setForm({ customerName: '', customerPhone: '', pickupPhone: '', pickupAddress: '', deliveryAddress: '', items: '', note: '', codAmount: '', deliveryFee: '', adminBonus: '' }); }}
            className="text-[10px] bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
          >
            🔄 Tạo Mới Lại
          </button>
        </label>
        <textarea
          value={smartText}
          onChange={handleSmartPaste}
          rows={4}
          placeholder="Dán nguyên văn tin nhắn của khách vào đây...&#10;Ví dụ:&#10;📍Điểm Lấy: 120 Tân An 0788123123&#10;Điểm Giao: 132 Hùng Vương 0367123123&#10;Thu 425k - Ship 17k"
          className="w-full rounded-xl border border-blue-200 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white placeholder-slate-400 font-mono shadow-sm"
        />
        <p className="mt-2 text-xs text-blue-600 font-medium">Hệ thống sẽ tự động bắt chữ và điền xuống các ô bên dưới giúp bạn!</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/50 bg-red-500/20 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Tên khách hàng <span className="text-red-400">*</span></label>
              <input
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">SĐT Khách Nhận (Giao đến) <span className="text-red-400">*</span></label>
              <input
                name="customerPhone"
                value={form.customerPhone}
                onChange={handleChange}
                placeholder="0909123456"
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Địa chỉ lấy hàng (Shop) <span className="text-red-400">*</span></label>
              <input
                name="pickupAddress"
                value={form.pickupAddress}
                onChange={handleChange}
                placeholder="123 Nguyễn Trãi, Quận 1, TP.HCM"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">SĐT Điểm lấy (Shop)</label>
              <input
                name="pickupPhone"
                value={form.pickupPhone}
                onChange={handleChange}
                placeholder="0911222333"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Địa chỉ giao hàng (Tùy chọn)</label>
            <input
              name="deliveryAddress"
              value={form.deliveryAddress}
              onChange={handleChange}
              placeholder="456 Lê Lợi, Quận 1, TP.HCM"
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Hàng hóa <span className="text-slate-500">(mỗi dòng 1 món)</span></label>
            <textarea
              name="items"
              value={form.items}
              onChange={handleChange}
              rows={3}
              placeholder={"2x Bánh mì thịt\n1x Trà sữa"}
              className="input-field resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Ghi chú</label>
            <input
              name="note"
              value={form.note}
              onChange={handleChange}
              placeholder="Giao nhanh giúp em"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Thu hộ (COD)</label>
              <CurrencyInput
                name="codAmount"
                value={form.codAmount}
                onChange={handleChange}
                placeholder="75000"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Phí giao hàng</label>
              <CurrencyInput
                name="deliveryFee"
                value={form.deliveryFee}
                onChange={handleChange}
                placeholder="20.000"
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-emerald-600">Thưởng tài xế (Admin Bonus)</label>
              <CurrencyInput
                name="adminBonus"
                value={form.adminBonus}
                onChange={handleChange}
                placeholder="VD: 5.000 (Sẽ trừ vào ví Kế toán)"
                className="input-field border-emerald-200 bg-emerald-50 focus:border-emerald-500 focus:bg-white text-emerald-700"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="btn-secondary w-full px-6 sm:w-auto"
            >
              ← Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang tạo...
                </>
              ) : '✅ Tạo đơn hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
