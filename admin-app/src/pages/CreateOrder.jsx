import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder, getDrivers } from '../services/api';
import CurrencyInput from '../components/CurrencyInput';

export default function CreateOrder() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    serviceType: 'GIAO_HANG',
    subServiceType: '',
    customerName: '',
    customerPhone: '',
    pickupPhone: '',
    pickupAddress: '',
    deliveryAddress: '',
    items: '',
    note: '',
    driverReminder: '',
    codAmount: '',
    deliveryFee: '',
    adminBonus: '',
    scheduledPublishAt: '',
    forceAssignDriverId: '',
    commissionRate: null,
    vehicleClass: 'TAY_GA',
    bankName: '',
    bankAccount: '',
    bankAccountName: '',
    transactionAmount: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [history, setHistory] = useState({
    customerNames: [],
    customerPhones: [],
    pickupAddresses: [],
    pickupPhones: [],
    deliveryAddresses: []
  });

  useEffect(() => {
    fetchDrivers();
    try {
      const saved = localStorage.getItem('orderFormHistory');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Lỗi đọc lịch sử', e);
    }
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await getDrivers();
      setDrivers(response.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách tài xế', err);
    }
  };

  const [smartText, setSmartText] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const saveToHistory = (newForm) => {
    try {
      const addUnique = (arr, val) => {
        if (!val || typeof val !== 'string') return arr;
        const trimmed = val.trim();
        if (!trimmed) return arr;
        const newArr = arr.filter(item => item !== trimmed);
        newArr.unshift(trimmed);
        return newArr.slice(0, 50); // Giữ lại 50 mục gần nhất
      };

      const newHistory = {
        customerNames: addUnique(history.customerNames, newForm.customerName),
        customerPhones: addUnique(history.customerPhones, newForm.customerPhone),
        pickupAddresses: addUnique(history.pickupAddresses, newForm.pickupAddress),
        pickupPhones: addUnique(history.pickupPhones, newForm.pickupPhone),
        deliveryAddresses: addUnique(history.deliveryAddresses, newForm.deliveryAddress)
      };

      setHistory(newHistory);
      localStorage.setItem('orderFormHistory', JSON.stringify(newHistory));
    } catch (e) {
      console.error('Lỗi lưu lịch sử', e);
    }
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
        newForm.note = rawNote.join('\n');
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
      let rideDetails = undefined;
      let financialDetails = undefined;
      let packageDetails = undefined;
      
      if (form.serviceType === 'DAT_XE') {
        rideDetails = {
          vehicleType: form.subServiceType === 'LAI_HO_OTO' ? 'OTO' : 'XE_MAY',
          vehicleClass: (form.subServiceType === 'LAI_HO_XE_MAY' || form.subServiceType === 'LAI_HO_OTO') ? form.vehicleClass : '',
          passengerCount: 1,
          surcharge: 0
        };
      } else if (form.serviceType === 'DIEU_PHOI') {
        let title = '[GẶP ĐIỀU PHỐI VIÊN]';
        if (form.subServiceType === 'NAP_TIEN') title = `[NẠP TIỀN NGÂN HÀNG ${form.bankName.toUpperCase()}]`;
        if (form.subServiceType === 'RUT_TIEN') title = `[RÚT TIỀN MẶT]`;
        
        packageDetails = { description: title };
        
        if (form.subServiceType === 'NAP_TIEN' || form.subServiceType === 'RUT_TIEN') {
          financialDetails = {
            bankName: form.bankName.trim(),
            bankAccount: form.bankAccount.trim(),
            bankAccountName: form.bankAccountName.trim().toUpperCase(),
            transactionAmount: form.transactionAmount ? parseInt(form.transactionAmount.toString().replace(/[,.]/g, '')) : 0
          };
        }
      } else if (form.serviceType === 'MUA_HO') {
        packageDetails = { description: 'MUA HỘ' };
      }

      await createOrder({
        serviceType: form.serviceType,
        subServiceType: form.subServiceType || undefined,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        pickupPhone: form.pickupPhone,
        pickupAddress: form.pickupAddress,
        deliveryAddress: form.deliveryAddress,
        items,
        note: form.note,
        driverReminder: form.driverReminder,
        codAmount: form.codAmount ? parseInt(form.codAmount) : 0,
        deliveryFee: form.deliveryFee ? parseInt(form.deliveryFee) : 0,
        adminBonus: form.adminBonus ? parseInt(form.adminBonus) : 0,
        scheduledPublishAt: form.scheduledPublishAt || undefined,
        forceAssignDriverId: form.forceAssignDriverId || undefined,
        commissionRate: form.commissionRate,
        senderPhone: form.pickupPhone,
        rideDetails,
        financialDetails,
        packageDetails
      });
      saveToHistory(form);
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
            onClick={() => { setSmartText(''); setForm(prev => ({ ...prev, customerName: '', customerPhone: '', pickupPhone: '', pickupAddress: '', deliveryAddress: '', items: '', note: '', driverReminder: '', codAmount: '', deliveryFee: '', adminBonus: '', scheduledPublishAt: '', forceAssignDriverId: '', commissionRate: null })); }}
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
        {/* TABS CHỌN DỊCH VỤ */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 border-b border-slate-100">
          {[
            { id: 'GIAO_HANG', label: '📦 Giao hàng' },
            { id: 'DAT_XE', label: '🛵 Đặt xe' },
            { id: 'MUA_HO', label: '🛒 Mua hộ' },
            { id: 'DIEU_PHOI', label: '🏦 Nạp/Rút Tiền' }
          ].map(svc => (
            <button
              key={svc.id}
              type="button"
              onClick={() => setForm(prev => ({ ...prev, serviceType: svc.id, subServiceType: svc.id === 'DAT_XE' ? 'XE_OM' : svc.id === 'DIEU_PHOI' ? 'GAP_TRUC_TIEP' : svc.id === 'MUA_HO' ? 'MUA_HO' : '' }))}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-all border ${
                form.serviceType === svc.id 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {svc.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/50 bg-red-500/20 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {form.serviceType === 'DAT_XE' && (
            <div className="mb-4">
              <div className="flex gap-2 overflow-x-auto mb-3">
                {[
                  { id: 'XE_OM', label: '🛵 Xe Ôm' },
                  { id: 'LAI_HO_XE_MAY', label: '🔑 Lái hộ (Máy)' },
                  { id: 'LAI_HO_OTO', label: '🚗 Lái hộ (Ôtô)' }
                ].map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setForm({ ...form, subServiceType: sub.id, vehicleClass: sub.id === 'LAI_HO_XE_MAY' ? 'TAY_GA' : '' })}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold border ${
                      form.subServiceType === sub.id 
                        ? 'bg-orange-500 text-white border-orange-500' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
              {form.subServiceType === 'LAI_HO_XE_MAY' && (
                <div className="flex gap-2 animate-fadeIn">
                  {['TAY_GA', 'XE_SO', 'CON_TAY'].map(type => (
                    <button 
                      key={type} type="button" 
                      onClick={() => setForm({ ...form, vehicleClass: type })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${form.vehicleClass === type ? 'bg-teal-50 text-teal-700 border-2 border-teal-500' : 'bg-gray-50 text-gray-400 border-2 border-transparent'}`}
                    >
                      {type === 'TAY_GA' ? 'Tay Ga' : type === 'XE_SO' ? 'Xe Số' : 'Côn Tay'}
                    </button>
                  ))}
                </div>
              )}
              {form.subServiceType === 'LAI_HO_OTO' && (
                <div className="animate-fadeIn">
                  <input 
                    type="text" 
                    placeholder="Dòng xe (VD: Mazda 3 số tự động...)"
                    className="w-full text-sm font-semibold bg-gray-50 border border-indigo-100 p-3 rounded-xl outline-none text-indigo-800 focus:border-indigo-300"
                    value={form.vehicleClass === 'TAY_GA' || form.vehicleClass === 'XE_SO' || form.vehicleClass === 'CON_TAY' ? '' : form.vehicleClass}
                    onChange={e => setForm({...form, vehicleClass: e.target.value})}
                  />
                </div>
              )}
            </div>
          )}

          {form.serviceType === 'DIEU_PHOI' && (
            <div className="mb-4 space-y-3">
              <div className="flex gap-2 overflow-x-auto">
                {[
                  { id: 'GAP_TRUC_TIEP', label: '🤝 Gặp Trực Tiếp' },
                  { id: 'NAP_TIEN', label: '🏦 Khách Nạp Tiền' },
                  { id: 'RUT_TIEN', label: '💵 Khách Rút Tiền' }
                ].map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setForm({ ...form, subServiceType: sub.id })}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold border ${
                      form.subServiceType === sub.id 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {(form.subServiceType === 'NAP_TIEN' || form.subServiceType === 'RUT_TIEN') && (
                <div className={`p-4 rounded-xl border animate-fadeIn ${form.subServiceType === 'NAP_TIEN' ? 'bg-blue-50/50 border-blue-200' : 'bg-orange-50/50 border-orange-200'} space-y-3`}>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-2">THÔNG TIN TÀI KHOẢN GIAO DỊCH</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" placeholder="Ngân Hàng (VD: VCB)"
                      className="input-field bg-white"
                      value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})}
                    />
                    <input 
                      type="text" placeholder="Tên Chủ TK"
                      className="input-field bg-white uppercase"
                      value={form.bankAccountName} onChange={e => setForm({...form, bankAccountName: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div>
                    <input 
                      type="text" placeholder="Số Tài Khoản"
                      className="input-field bg-white text-blue-600 font-bold tracking-wider"
                      value={form.bankAccount} onChange={e => setForm({...form, bankAccount: e.target.value})}
                    />
                  </div>
                  <div>
                    <CurrencyInput 
                      name="transactionAmount"
                      placeholder={`Số Tiền ${form.subServiceType === 'NAP_TIEN' ? 'Nạp' : 'Rút'} (VD: 50.000)`}
                      className="input-field font-bold text-gray-800 bg-white"
                      value={form.transactionAmount} onChange={handleChange}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Tên khách hàng <span className="text-red-400">*</span></label>
              <input
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
                className="input-field"
                list="customerNameList"
                autoComplete="off"
              />
              <datalist id="customerNameList">
                {history.customerNames.map((item, index) => <option key={index} value={item} />)}
              </datalist>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">{form.serviceType === 'GIAO_HANG' ? 'SĐT Khách Nhận (Giao đến)' : 'SĐT Khách hàng'} <span className="text-red-400">*</span></label>
              <input
                name="customerPhone"
                value={form.customerPhone}
                onChange={handleChange}
                placeholder="0909123456"
                className="input-field"
                list="customerPhoneList"
                autoComplete="off"
              />
              <datalist id="customerPhoneList">
                {history.customerPhones.map((item, index) => <option key={index} value={item} />)}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">{form.serviceType === 'DAT_XE' ? 'Điểm đón' : form.serviceType === 'DIEU_PHOI' ? 'Địa chỉ khách' : form.serviceType === 'MUA_HO' ? 'Nơi mua hàng' : 'Địa chỉ lấy hàng (Shop)'} <span className="text-red-400">*</span></label>
              <input
                name="pickupAddress"
                value={form.pickupAddress}
                onChange={handleChange}
                placeholder="123 Nguyễn Trãi, Quận 1, TP.HCM"
                className="input-field"
                list="pickupAddressList"
                autoComplete="off"
              />
              <datalist id="pickupAddressList">
                {history.pickupAddresses.map((item, index) => <option key={index} value={item} />)}
              </datalist>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">{form.serviceType === 'DAT_XE' ? 'SĐT Điểm đón (Tùy chọn)' : form.serviceType === 'DIEU_PHOI' ? 'SĐT Khác (Tùy chọn)' : form.serviceType === 'MUA_HO' ? 'SĐT Nơi mua (Tùy chọn)' : 'SĐT Điểm lấy (Shop)'}</label>
              <input
                name="pickupPhone"
                value={form.pickupPhone}
                onChange={handleChange}
                placeholder="0911222333"
                className="input-field"
                list="pickupPhoneList"
                autoComplete="off"
              />
              <datalist id="pickupPhoneList">
                {history.pickupPhones.map((item, index) => <option key={index} value={item} />)}
              </datalist>
            </div>
          </div>

          {form.serviceType !== 'DIEU_PHOI' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">{form.serviceType === 'DAT_XE' ? 'Điểm đến (Tùy chọn)' : form.serviceType === 'MUA_HO' ? 'Nơi giao hàng (Tùy chọn)' : 'Địa chỉ giao hàng (Tùy chọn)'}</label>
              <input
                name="deliveryAddress"
                value={form.deliveryAddress}
                onChange={handleChange}
                placeholder="456 Lê Lợi, Quận 1, TP.HCM"
                className="input-field"
                list="deliveryAddressList"
                autoComplete="off"
              />
              <datalist id="deliveryAddressList">
                {history.deliveryAddresses.map((item, index) => <option key={index} value={item} />)}
              </datalist>
            </div>
          )}

          {form.serviceType !== 'DAT_XE' && form.serviceType !== 'DIEU_PHOI' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">{form.serviceType === 'MUA_HO' ? 'Hàng hóa cần mua (mỗi dòng 1 món)' : 'Hàng hóa (mỗi dòng 1 món)'} <span className="text-slate-500">(mỗi dòng 1 món)</span></label>
              <textarea
                name="items"
                value={form.items}
                onChange={handleChange}
                rows={3}
                placeholder={"2x Bánh mì thịt\n1x Trà sữa"}
                className="input-field resize-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Ghi chú (Nội bộ / Khách)</label>
            <textarea
              name="note"
              value={form.note}
              onChange={handleChange}
              rows={2}
              placeholder="Giao nhanh giúp em"
              className="input-field resize-y whitespace-pre-wrap"
            />
          </div>


          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">{form.serviceType === 'MUA_HO' ? 'Tạm ứng (COD)' : form.serviceType === 'DIEU_PHOI' ? 'Số tiền (Giao dịch)' : 'Thu hộ (COD)'}</label>
              <CurrencyInput
                name="codAmount"
                value={form.codAmount}
                onChange={handleChange}
                placeholder="75000"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">{form.serviceType === 'DAT_XE' ? 'Cước phí xe' : form.serviceType === 'DIEU_PHOI' ? 'Phí dịch vụ' : 'Phí giao hàng'}</label>
              <CurrencyInput
                name="deliveryFee"
                value={form.deliveryFee}
                onChange={handleChange}
                placeholder="20.000"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-red-600">Nhắc nhở Tài xế (Ghim đầu Đơn)</label>
            <textarea
              name="driverReminder"
              value={form.driverReminder}
              onChange={handleChange}
              rows={2}
              placeholder="Thu đủ tiền nhé, cẩn thận hàng dễ vỡ..."
              className="input-field resize-y whitespace-pre-wrap border-red-200 bg-red-50 focus:border-red-500 focus:bg-white text-red-700 placeholder-red-300"
            />
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

          <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 relative overflow-hidden mb-4">
             <div className="absolute -right-2 -top-2 text-6xl opacity-5">🎯</div>
             <label className="block text-xs font-bold text-purple-700 uppercase mb-2 tracking-wider relative z-10">
               👨‍✈️ ĐIỀU PHỐI / GÁN TÀI XẾ MỚI
             </label>
             <select 
                name="assignOption" 
                value={form.forceAssignDriverId ? `${form.forceAssignDriverId}|` : `|${form.commissionRate == null ? '' : form.commissionRate}`}
                onChange={(e) => {
                   const [driverId, rate] = e.target.value.split('|');
                   setForm(prev => ({
                     ...prev, 
                     forceAssignDriverId: driverId, 
                     commissionRate: rate ? Number(rate) : null
                   }));
                }} 
                className="w-full rounded-lg border border-purple-300 p-2.5 text-sm bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none font-medium relative z-10 appearance-none"
             >
                <option value="|">-- Đơn tự do (Mặc định - Tất cả tài xế) --</option>
                <option value="|15">-- Đơn tự do (Chỉ dành cho Tài xế 15%) --</option>
                <option value="|20">-- Đơn tự do (Chỉ dành cho Tài xế 20%) --</option>
                {drivers.sort((a,b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0)).map(d => (
                  <option key={d._id} value={`${d._id}|`}>
                    {d.isOnline ? '🟢 [ONLINE]' : '🔴 [OFFLINE]'} - {d.name} ({d.phone})
                  </option>
                ))}
             </select>
             <p className="text-[10px] text-purple-600 mt-1.5 font-medium italic relative z-10">
               * Hệ thống sẽ đánh giá công nợ của tài xế trước khi chốt gán đơn.
             </p>
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
