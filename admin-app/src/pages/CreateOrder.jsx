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
    adminBonus: '',
    scheduledPublishAt: ''
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
    
    let rawPickup = [];
    let rawDelivery = [];
    let rawNote = [];
    let rawName = '';

    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    const pickupKws = /^(?:(?:📍)?điểm lấy đơn|điểm lấy|lấy đơn tại|lấy hàng|lấy tại|lấy ở|nhận tại|địa chỉ lấy|nơi lấy|chỗ này lấy đơn|chỗ lấy|lấy chỗ này|lấy chỗ|lấy|từ)\s*:?(.*)$/i;
    const deliveryKws = /^(?:(?:📍)?điểm giao|giao đơn tại|giao hàng|giao tại|giao ở|giao tới|giao đến|giao chỗ này|giao|địa chỉ giao|nơi giao|chỗ giao|trực tiếp|gửi cho|ship qua|địa chỉ nhận|nơi nhận|đến)\s*:?(.*)$/i;
    const noteKws = /^(?:ghi chú|note)\s*:?(.*)$/i;
    const nameKws = /^(?:tên|tên khách|tên người nhận)\s*:?(.*)$/i;

    let currentMode = 'none';

    lines.forEach(line => {
        let processedLine = line;

        const codMatch = processedLine.match(/(?:tiền\s*)?(?:thu|cod)\s*:?\s*([0-9\.,]+[kK]?)/i);
        if (codMatch) {
            let codStr = codMatch[1].toLowerCase().replace(/[,.]/g, '');
            let cod = parseInt(codStr) || 0;
            if (codStr.includes('k')) cod = cod * 1000;
            else if (cod > 0 && cod < 1000) cod = cod * 1000;
            newForm.codAmount = cod;
            processedLine = processedLine.replace(codMatch[0], '');
        }

        const shipMatch = processedLine.match(/(?:tiền\s*)?(?:ship|phí ship|phí giao|cước)\s*:?\s*([0-9\.,]+)[&kK]?/i);
        if (shipMatch) {
            let shipStr = shipMatch[1].toLowerCase().replace(/[,.]/g, '');
            let ship = parseInt(shipStr) || 0;
            if (shipMatch[0].toLowerCase().includes('k') || shipMatch[0].includes('&')) ship = ship * 1000;
            else if (ship > 0 && ship < 1000) ship = ship * 1000;
            newForm.deliveryFee = ship;
            processedLine = processedLine.replace(shipMatch[0], '');
        }

        processedLine = processedLine.replace(/^[-,\s]+|[-,\s]+$/g, '');

        if (!processedLine) return;

        let match;
        if ((match = processedLine.match(pickupKws))) {
            currentMode = 'pickup';
            if (match[1].trim()) rawPickup.push(match[1].trim());
            return;
        }

        if ((match = processedLine.match(deliveryKws))) {
            currentMode = 'delivery';
            if (match[1].trim()) rawDelivery.push(match[1].trim());
            return;
        }

        if ((match = processedLine.match(noteKws))) {
            currentMode = 'note';
            if (match[1].trim()) rawNote.push(match[1].trim());
            return;
        }

        if ((match = processedLine.match(nameKws))) {
            currentMode = 'delivery';
            if (match[1].trim()) {
                rawName = match[1].trim();
            }
            return;
        }

        if (currentMode === 'pickup') rawPickup.push(processedLine);
        else if (currentMode === 'delivery') rawDelivery.push(processedLine);
        else if (currentMode === 'note') rawNote.push(processedLine);
        else {
            if (rawPickup.length === 0 && rawDelivery.length === 0) {
                rawPickup.push(processedLine);
            }
        }
    });

    const extractPhones = (linesArray) => {
        let textToParse = linesArray.join(' ');
        let allPhones = Array.from(textToParse.matchAll(/(?:sđt|sdt|đt|dt|phone)\s*:?\s*([0-9\.\s-]{8,12})/gi)).map(m => m[1].replace(/\D/g, ''));
        const loosePhones = (textToParse.match(/\b[0-9]{9,11}\b/g) || []);
        allPhones = [...new Set([...allPhones, ...loosePhones])].filter(p => p.length >= 9);
        
        textToParse = textToParse.replace(/(?:sđt|sdt|đt|dt|phone)\s*:?\s*[0-9\.\s-]+/gi, '')
                   .replace(/\b[0-9]{9,11}\b/g, '')
                   .replace(/[-,\s]+$/, '')
                   .replace(/\s{2,}/g, ' ')
                   .trim();
                   
        return { phones: allPhones, text: textToParse };
    };

    const pData = extractPhones(rawPickup);
    const dData = extractPhones(rawDelivery);

    if (pData.text) newForm.pickupAddress = pData.text;
    if (dData.text) newForm.deliveryAddress = dData.text;

    let pPhone = pData.phones.length > 0 ? pData.phones[0] : '';
    let dPhone = dData.phones.length > 0 ? dData.phones[0] : '';

    if (!pPhone && dData.phones.length >= 2) {
        pPhone = dData.phones[1];
    } else if (!dPhone && pData.phones.length >= 2) {
        dPhone = pData.phones[1];
    }
    
    if (!pPhone && !dPhone) {
        const allTextData = extractPhones([text]);
        if (allTextData.phones.length === 1) {
            pPhone = allTextData.phones[0];
        } else if (allTextData.phones.length >= 2) {
            pPhone = allTextData.phones[0];
            dPhone = allTextData.phones[allTextData.phones.length - 1];
        }
    }

    if (pPhone) newForm.pickupPhone = pPhone;
    if (dPhone) newForm.customerPhone = dPhone;
    
    if (rawName) {
        newForm.customerName = rawName;
    } else if (dPhone && !newForm.customerName) {
        newForm.customerName = 'Khách đặt qua Chat';
    }

    if (rawNote.length > 0) {
        newForm.note = rawNote.join(' | ');
    } else {
        newForm.note = '';
    }

    setForm(newForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerName || !form.customerPhone || !form.pickupAddress) {
      setError('Vui lòng điền những thông tin bắt buộc (*)');
      return;
    }

    if (form.scheduledPublishAt && (!form.deliveryFee || parseInt(form.deliveryFee) === 0)) {
       const confirmSchedule = window.confirm('Thông tin đơn có vẻ chưa đầy đủ (Cước xe đang là 0đ). Bạn có chắc chắn muốn Hẹn Giờ Lên Đơn không? \n\n(Bạn có thể sửa lại thông tin trước hoặc sau khi đơn được treo lên)');
       if (!confirmSchedule) return;
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
        adminBonus: form.adminBonus ? parseInt(form.adminBonus) : 0,
        scheduledPublishAt: form.scheduledPublishAt || undefined
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
            onClick={() => { setSmartText(''); setForm({ customerName: '', customerPhone: '', pickupPhone: '', pickupAddress: '', deliveryAddress: '', items: '', note: '', codAmount: '', deliveryFee: '', adminBonus: '', scheduledPublishAt: '' }); }}
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
          className="w-full rounded-xl border border-blue-200 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white placeholder-slate-400 font-mono"
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

          <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-200">
            <label className="block text-xs font-bold text-indigo-700 mb-1 flex items-center gap-1">⏰ HẸN GIỜ TREO ĐƠN TỰ ĐỘNG</label>
            <input 
              type="datetime-local" 
              name="scheduledPublishAt" 
              value={form.scheduledPublishAt} 
              onChange={handleChange} 
              className="w-full rounded-lg border border-indigo-300 p-2 text-sm bg-white font-bold text-indigo-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" 
            />
            <p className="text-[10px] text-indigo-500 mt-1 font-medium italic">
              * Khi hẹn giờ, đơn sẽ nằm ở mục "Đơn hẹn giờ" (DRAFT) và hệ thống sẽ tự động đẩy lên cho tài xế đúng giờ hẹn. Đơn hẹn giờ sẽ bỏ qua cảnh báo 5 phút.
            </p>
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
