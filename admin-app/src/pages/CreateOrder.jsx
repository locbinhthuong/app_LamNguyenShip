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

    // 1. Phân tích Điểm Lấy (Cho phép có khoảng trắng trước dấu : hoặc bỏ qua dấu :)
    const pickupRegex = /(?:📍?điểm lấy đơn|điểm lấy|từ|lấy đơn tại|lấy hàng|lấy tại|nhận tại|địa chỉ lấy|nơi lấy|chỗ lấy|chỗ này lấy đơn|lấy chỗ này|lấy chỗ)\s*:?\s*([^\n]+)/i;
    const pickupMatch = text.match(pickupRegex);
    let rawPickup = pickupMatch ? pickupMatch[1].trim() : '';

    // 2. Phân tích Điểm Giao
    const deliveryRegex = /(?:📍?điểm giao|đến|giao|giao đơn tại|giao hàng|giao tại|giao đến|địa chỉ giao|nơi giao|chỗ giao|giao chỗ này|trực tiếp|gửi cho|ship qua|địa chỉ nhận|nơi nhận)\s*:?\s*([^\n]+)/i;
    const deliveryMatch = text.match(deliveryRegex);
    let rawDelivery = deliveryMatch ? deliveryMatch[1].trim() : '';

    // 3. Phân tích SĐT
    // Quét tìm cụm Sdt/Phone trước
    let allPhones = Array.from(text.matchAll(/(?:sđt|sdt|đt|dt|phone)\s*:?\s*([0-9\.\s-]{8,12})/gi)).map(m => m[1].replace(/\D/g, ''));
    // Quét tìm tất cả các chuỗi số 8-11 chữ số bắt đầu bằng 0
    const loosePhones = (text.match(/\b0[0-9]{7,10}\b/g) || []);
    allPhones = [...new Set([...allPhones, ...loosePhones])].filter(p => p.length >= 8);

    let pPhone = '';
    let dPhone = '';

    if (allPhones.length === 1) {
       pPhone = allPhones[0]; // Chỉ có 1 sđt thì mặc định là của điểm lấy
    } else if (allPhones.length >= 2) {
       pPhone = allPhones[0]; // SĐT đầu tiên thường là điểm lấy
       dPhone = allPhones[allPhones.length - 1]; // SĐT cuối cùng thường là khách nhận
    }

    // Xóa sdt rác dính trong chuỗi địa chỉ
    const removePhoneFromAddress = (addr) => {
        return addr.replace(/(?:sđt|sdt|đt|dt|phone)\s*:?\s*[0-9\.\s-]+/i, '')
                   .replace(/\b0[0-9]{7,10}\b/g, '')
                   .replace(/[-,\s]+$/, '').trim();
    };

    if (rawPickup) newForm.pickupAddress = removePhoneFromAddress(rawPickup);
    if (pPhone) newForm.pickupPhone = pPhone;
    if (rawDelivery) newForm.deliveryAddress = removePhoneFromAddress(rawDelivery);
    if (dPhone) newForm.customerPhone = dPhone; 
    if (dPhone && !newForm.customerName) newForm.customerName = 'Khách đặt qua Chat';

    // 4. Phân tích COD
    const codMatch = text.match(/Thu\s*:?\s*([0-9\.,]+[kK]?)/i);
    if (codMatch) {
       let codStr = codMatch[1].toLowerCase().replace(/[,.]/g, '');
       let cod = 0;
       if (codStr.includes('k')) cod = parseInt(codStr.replace('k', '')) * 1000;
       else cod = parseInt(codStr);
       if (cod > 0 && cod < 1000) cod = cod * 1000;
       newForm.codAmount = cod;
    }

    // 5. Phân tích Ship
    const shipMatch = text.match(/Ship\s*:?\s*([0-9\.,]+[kK]?)/i);
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
       if (l.match(/^(?:📍?điểm lấy đơn|điểm lấy|từ|lấy đơn tại|lấy hàng|lấy tại|nhận tại|địa chỉ lấy|nơi lấy|chỗ lấy|chỗ này lấy đơn|lấy chỗ này|lấy chỗ)/i)) return false;
       if (l.match(/^(?:📍?điểm giao|đến|giao|giao đơn tại|giao hàng|giao tại|giao đến|địa chỉ giao|nơi giao|chỗ giao|giao chỗ này|trực tiếp|gửi cho|ship qua|địa chỉ nhận|nơi nhận)/i)) return false;
       if (l.match(/^(?:sđt|sdt|đt|dt|phone)/i)) return false;
       if (l.match(/^0[0-9]{7,10}$/)) return false; // Chỉ có số đt
       if (l.match(/^Thu\s*:?\s*([0-9\.,]+[kK]?)$/i)) return false; // Dòng chỉ chứa COD
       if (l.match(/^Ship\s*:?\s*([0-9\.,]+[kK]?)$/i)) return false; // Dòng chỉ chứa Ship
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
