import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder, getDrivers, searchSavedPlaces, matchSavedPlace, upsertSavedPlace } from '../services/api';
import CurrencyInput from '../components/CurrencyInput';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function PureMapPreview({ lat, lng, onLocationChange }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, { preferCanvas: true }).setView([lat, lng], 16);
      const googleSubdomains = ['mt0', 'mt1', 'mt2', 'mt3'];
      const tileLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}', {
          subdomains: googleSubdomains,
          attribution: '&copy; Google Maps',
          maxZoom: 22,
          maxNativeZoom: 20,
          keepBuffer: 4,
          updateWhenIdle: false
      }).addTo(mapInstance.current);

      let consecutiveTileErrors = 0;
      tileLayer.on('tileload', () => {
          consecutiveTileErrors = 0;
      });

      tileLayer.on('tileerror', function(evt) {
          const tile = evt?.tile;
          if (tile && (!tile.dataset.retryCount || Number(tile.dataset.retryCount) < 3)) {
              const retry = Number(tile.dataset.retryCount || 0) + 1;
              tile.dataset.retryCount = String(retry);
              const nextSub = googleSubdomains[retry % googleSubdomains.length];
              const currentSrc = tile.src || '';
              if (currentSrc.includes('.google.com')) {
                  setTimeout(() => {
                      tile.src = currentSrc.replace(/mt[0-3]\.google\.com/, `${nextSub}.google.com`) + `&retry=${retry}`;
                  }, 300 * retry);
                  return;
              }
          }
          consecutiveTileErrors++;
          if (consecutiveTileErrors >= 12 && !tileLayer._hasSwitchedFallback) {
              tileLayer._hasSwitchedFallback = true;
              console.warn('Google Maps tile load error persisted, falling back to OpenStreetMap...');
              tileLayer.options.maxNativeZoom = 19;
              tileLayer.options.subdomains = ['a', 'b', 'c'];
              tileLayer.setUrl('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
          }
      });
      
      const customIcon = L.divIcon({
          className: 'custom-preview-marker',
          html: `<div style="font-size: 28px; text-align: center; margin-top: -14px; text-shadow: 0 4px 6px rgba(0,0,0,0.5); cursor: grab;">📍</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28]
      });
      
      markerInstance.current = L.marker([lat, lng], { 
        icon: customIcon,
        draggable: true 
      }).addTo(mapInstance.current);

      markerInstance.current.on('dragend', function (event) {
        const marker = event.target;
        const position = marker.getLatLng();
        if (onLocationChange) {
          onLocationChange({ lat: position.lat, lng: position.lng });
        }
      });

      setTimeout(() => {
        if (mapInstance.current) mapInstance.current.invalidateSize();
      }, 150);
    } else {
      mapInstance.current.setView([lat, lng], 16);
      if (markerInstance.current) {
        markerInstance.current.setLatLng([lat, lng]);
      }
      mapInstance.current.invalidateSize();
    }

    return () => {
      // Don't destroy the map immediately to prevent flickering on quick updates
    };
  }, [lat, lng, onLocationChange]);

  useEffect(() => {
    let resizeObserver = null;
    if (mapRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapRef.current);
    }
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 0 }}></div>;
}

export default function CreateOrder() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    serviceType: 'GIAO_HANG',
    subServiceType: '',
    customerName: '',
    customerPhone: '',
    pickupPhone: '',
    pickupAddress: '',
    pickupCoordinates: null,
    deliveryAddress: '',
    deliveryCoordinates: null,
    items: '',
    note: '',
    driverReminder: '',
    codAmount: '',
    deliveryFee: '',
    feePaidBy: 'RECEIVER',
    extraSurcharge: '',
    bulkyFee: '',
    adminBonus: '',
    scheduledPublishAt: '',
    forceAssignDriverId: '',
    autoAssignNearest: true,
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
    pickupPhones: [],
    pickupAddresses: [],
    deliveryAddresses: [],
    driverReminders: [],
    senders: []
  });

  // State cho Sổ địa chỉ điểm lấy / Quán quen
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [showSavedPlaceDropdown, setShowSavedPlaceDropdown] = useState(false);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [matchedPlaceMsg, setMatchedPlaceMsg] = useState('');

  // Debounced search quán quen khi gõ pickupAddress
  useEffect(() => {
    if (!form.pickupAddress || form.pickupAddress.trim().length < 2) {
      setSavedPlaces([]);
      setShowSavedPlaceDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingPlaces(true);
        const res = await searchSavedPlaces(form.pickupAddress.trim());
        if (res?.data && res.data.length > 0) {
          setSavedPlaces(res.data);
          setShowSavedPlaceDropdown(true);
        } else {
          setSavedPlaces([]);
          setShowSavedPlaceDropdown(false);
        }
      } catch (e) {
        console.error('Lỗi tìm kiếm quán quen:', e);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [form.pickupAddress]);

  const handleSelectSavedPlace = (place) => {
    setForm(prev => ({
      ...prev,
      pickupAddress: place.address,
      pickupPhone: place.phone || prev.pickupPhone,
      pickupCoordinates: { ...place.coordinates }
    }));
    setShowSavedPlaceDropdown(false);
  };

  const geocodeAddress = async (address, type) => {
    if (!address || address.length < 5) return;
    try {
      const res = await fetch(`https://rsapi.goong.io/geocode?address=${encodeURIComponent(address)}&api_key=2OlStVgXqfhCduMBb8isHpudl5S8kLYzrxUPTT5d`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const lat = data.results[0].geometry.location.lat;
          const lon = data.results[0].geometry.location.lng;
          if (type === 'pickup') {
            setForm(prev => ({...prev, pickupCoordinates: {lat, lng: lon}}));
          } else {
            setForm(prev => ({...prev, deliveryCoordinates: {lat, lng: lon}}));
          }
          return;
        }
      }
      
      // Fallback to nominatim if Goong fails
      const res2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=vn&accept-language=vi`);
      const nomData = await res2.json();
      if (nomData && nomData.length > 0) {
        const lat = parseFloat(nomData[0].lat);
        const lon = parseFloat(nomData[0].lon);
        if (type === 'pickup') {
          setForm(prev => ({...prev, pickupCoordinates: {lat, lng: lon}}));
        } else {
          setForm(prev => ({...prev, deliveryCoordinates: {lat, lng: lon}}));
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.pickupAddress) {
        if (!form.pickupCoordinates) {
           geocodeAddress(form.pickupAddress, 'pickup');
        }
      } else {
        setForm(prev => ({...prev, pickupCoordinates: null}));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [form.pickupAddress, form.pickupCoordinates]);

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
    const { name, value } = e.target;
    setForm(prev => {
      const newForm = { ...prev, [name]: value };
      if (name === 'pickupAddress') {
        newForm.pickupCoordinates = null;
      }
      if (name === 'deliveryAddress') {
        newForm.deliveryCoordinates = null;
      }
      return newForm;
    });
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

    if (pData.text) {
      newForm.pickupAddress = pData.text;
      newForm.pickupCoordinates = null; // Reset coord when paste
    }
    if (dData.text) {
      newForm.deliveryAddress = dData.text;
      newForm.deliveryCoordinates = null;
    }

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

    if (/(?:shop\s*trả\s*(?:ship|cước)|người\s*gửi\s*trả|trừ\s*ship)/i.test(text)) {
        newForm.feePaidBy = 'SENDER';
    } else if (/(?:khách\s*trả\s*(?:ship|cước)|người\s*nhận\s*trả)/i.test(text)) {
        newForm.feePaidBy = 'RECEIVER';
    }

    if (rawNote.length > 0) {
        newForm.note = rawNote.join('\n');
    } else {
        newForm.note = '';
    }

    setMatchedPlaceMsg('');
    setForm(newForm);

    // Tự động kiểm tra xem điểm lấy này đã từng lưu/ghim định vị trong Database chưa
    if (newForm.pickupAddress || newForm.pickupPhone) {
      matchSavedPlace({ address: newForm.pickupAddress, phone: newForm.pickupPhone })
        .then(res => {
          if (res?.matched && res?.data?.coordinates?.lat != null) {
            const place = res.data;
            setForm(prev => ({
              ...prev,
              pickupCoordinates: place.coordinates,
              pickupAddress: place.address || prev.pickupAddress,
              pickupPhone: place.phone || prev.pickupPhone
            }));
            setMatchedPlaceMsg(`🎯 Đã tự động khớp toạ độ đã ghim: "${place.name || place.address}"`);
          }
        })
        .catch(err => console.warn('Lỗi tự động khớp điểm lấy:', err));
    }
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
      
      if (form.bulkyFee && parseInt(form.bulkyFee) > 0) {
        if (!packageDetails) packageDetails = {};
        packageDetails.bulkyFee = parseInt(form.bulkyFee);
      }

      await createOrder({
        serviceType: form.serviceType,
        subServiceType: form.subServiceType || undefined,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        pickupPhone: form.pickupPhone,
        pickupAddress: form.pickupAddress,
        deliveryAddress: form.deliveryAddress,
        pickupCoordinates: form.pickupCoordinates || undefined,
        deliveryCoordinates: form.deliveryCoordinates || undefined,
        items,
        note: form.note,
        driverReminder: form.driverReminder,
        codAmount: form.codAmount ? parseInt(form.codAmount) : 0,
        deliveryFee: form.deliveryFee ? parseInt(form.deliveryFee) : 0,
        feePaidBy: form.feePaidBy || 'RECEIVER',
        extraSurcharge: form.extraSurcharge ? parseInt(form.extraSurcharge) : 0,
        adminBonus: form.adminBonus ? parseInt(form.adminBonus) : 0,
        scheduledPublishAt: form.scheduledPublishAt || undefined,
        forceAssignDriverId: form.forceAssignDriverId || undefined,
        autoAssignNearest: form.autoAssignNearest,
        commissionRate: form.commissionRate,
        senderPhone: form.pickupPhone,
        rideDetails,
        financialDetails,
        packageDetails
      });
      saveToHistory(form);

      // Tự động lưu hoặc cập nhật quán / điểm lấy vào cơ sở dữ liệu nếu có toạ độ
      if (form.pickupAddress && form.pickupCoordinates?.lat && form.pickupCoordinates?.lng) {
        upsertSavedPlace({
          name: form.pickupAddress.split(',')[0].trim() || form.pickupAddress.trim(),
          address: form.pickupAddress.trim(),
          phone: form.pickupPhone ? form.pickupPhone.trim() : '',
          coordinates: form.pickupCoordinates
        }).catch(err => console.warn('Không thể tự động lưu điểm lấy:', err));
      }

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
            onClick={() => { 
              setSmartText(''); 
              setMatchedPlaceMsg('');
              setForm(prev => ({ ...prev, customerName: '', customerPhone: '', pickupPhone: '', pickupAddress: '', pickupCoordinates: null, deliveryAddress: '', deliveryCoordinates: null, items: '', note: '', driverReminder: '', codAmount: '', deliveryFee: '', feePaidBy: 'RECEIVER', adminBonus: '', scheduledPublishAt: '', forceAssignDriverId: '', commissionRate: null })); 
            }}
            className="text-[10px] bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-bold"
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
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-blue-600 font-medium">Hệ thống sẽ tự động bắt chữ và điền xuống các ô bên dưới giúp bạn!</p>
          {matchedPlaceMsg && (
            <div className="rounded-lg bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-xs font-bold text-emerald-800 animate-fadeIn flex items-center gap-1.5 shadow-xs">
              {matchedPlaceMsg}
            </div>
          )}
        </div>
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
            <div className="relative">
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                {form.serviceType === 'DAT_XE' ? 'Điểm đón' : form.serviceType === 'DIEU_PHOI' ? 'Địa chỉ khách' : form.serviceType === 'MUA_HO' ? 'Nơi mua hàng' : 'Địa chỉ lấy hàng (Shop)'} 
                <span className="text-red-400">*</span>
                {form.pickupCoordinates && (
                  <span className="ml-2 text-green-600 text-[10px] bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1" title="Hệ thống đã nhận diện toạ độ">
                    📍 Đã có toạ độ chuẩn
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  name="pickupAddress"
                  value={form.pickupAddress}
                  onChange={handleChange}
                  onFocus={() => { if (savedPlaces.length > 0) setShowSavedPlaceDropdown(true); }}
                  placeholder="Gõ tên quán hoặc địa chỉ lấy hàng..."
                  className="input-field"
                  autoComplete="off"
                />
                {isSearchingPlaces && (
                  <div className="absolute right-3 top-3 text-xs text-slate-400">Đang tìm...</div>
                )}
              </div>

              {/* DROPDOWN QUÁN QUEN / ĐIỂM LẤY ĐÃ LƯU */}
              {showSavedPlaceDropdown && savedPlaces.length > 0 && (
                <div 
                  className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto rounded-xl bg-white p-1.5 shadow-xl border border-blue-200 text-sm"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 rounded mb-1 flex items-center justify-between">
                    <span>🏪 QUÁN QUEN / ĐIỂM LẤY ĐÃ LƯU TỌA ĐỘ</span>
                    <button 
                      type="button" 
                      onClick={() => setShowSavedPlaceDropdown(false)} 
                      className="text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  </div>
                  {savedPlaces.map((place) => (
                    <div
                      key={place._id}
                      onClick={() => handleSelectSavedPlace(place)}
                      className="cursor-pointer rounded-lg px-2.5 py-2 hover:bg-blue-50 transition border-b border-slate-50 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          📍 {place.name}
                        </span>
                        {place.usageCount > 1 && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                            {place.usageCount} lần
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">{place.address}</div>
                      {place.phone && <div className="text-[10px] text-blue-600 font-mono">📞 {place.phone}</div>}
                    </div>
                  ))}
                </div>
              )}
              {form.pickupCoordinates && (
                <div className="mt-2 w-full rounded-lg overflow-hidden border border-slate-200">
                  <div className="bg-indigo-50 px-2 py-1.5 border-b border-indigo-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-700 uppercase">Kéo thả kim đỏ để chỉnh lại nếu hệ thống quét sai</span>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded text-slate-500 border border-slate-200 font-mono">{form.pickupCoordinates.lat.toFixed(5)}, {form.pickupCoordinates.lng.toFixed(5)}</span>
                  </div>
                  <div className="h-44 relative z-0">
                    <PureMapPreview 
                      lat={form.pickupCoordinates.lat} 
                      lng={form.pickupCoordinates.lng} 
                      onLocationChange={(coords) => setForm(prev => ({...prev, pickupCoordinates: coords}))}
                    />
                  </div>
                </div>
              )}
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
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                {form.serviceType === 'DAT_XE' ? 'Điểm đến (Tùy chọn)' : form.serviceType === 'MUA_HO' ? 'Nơi giao hàng (Tùy chọn)' : 'Địa chỉ giao hàng (Tùy chọn)'}
              </label>
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

          {form.serviceType !== 'DAT_XE' && form.serviceType !== 'DIEU_PHOI' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                💳 Hình thức thanh toán phí ship (Người trả ship):
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, feePaidBy: 'RECEIVER' }))}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold border-2 transition-all ${
                    (form.feePaidBy || 'RECEIVER') === 'RECEIVER'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>👤</span> Khách trả ship
                </button>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, feePaidBy: 'SENDER' }))}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold border-2 transition-all ${
                    form.feePaidBy === 'SENDER'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>🏪</span> Shop trả ship
                </button>
              </div>
              {(() => {
                const codVal = parseInt(form.codAmount || 0) || 0;
                const shipVal = (parseInt(form.deliveryFee || 0) || 0) + (parseInt(form.bulkyFee || 0) || 0) + (parseInt(form.extraSurcharge || 0) || 0);
                const isSenderPay = form.feePaidBy === 'SENDER';
                const shopAdvance = isSenderPay ? (codVal - shipVal) : codVal;
                const customerCollect = isSenderPay ? codVal : (codVal + shipVal);
                return (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs font-semibold text-slate-600 border-t border-slate-200/80">
                    <span>
                      {shopAdvance >= 0
                        ? `💼 Tài xế ứng cho Shop: ${shopAdvance.toLocaleString('vi-VN')}đ`
                        : `💼 Tài xế thu tiền ship tại Shop: ${Math.abs(shopAdvance).toLocaleString('vi-VN')}đ`}
                    </span>
                    <span className="font-bold text-red-600">
                      💵 Tổng thu của Khách: {customerCollect.toLocaleString('vi-VN')}đ {isSenderPay ? '(Chỉ thu COD)' : '(COD + Ship)'}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Phí cồng kềnh (Tùy chọn)</label>
              <CurrencyInput
                name="bulkyFee"
                value={form.bulkyFee}
                onChange={handleChange}
                placeholder="VD: 10.000"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Phụ thu thêm (Tùy chọn)</label>
              <CurrencyInput
                name="extraSurcharge"
                value={form.extraSurcharge}
                onChange={handleChange}
                placeholder="VD: 5.000"
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-red-600">Nhắc nhở Tài xế (Ghim đầu Đơn)</label>
              <textarea
                name="driverReminder"
                value={form.driverReminder}
                onChange={handleChange}
                rows={2}
                placeholder="Thu đủ tiền nhé..."
                className="input-field resize-y whitespace-pre-wrap border-red-200 bg-red-50 focus:border-red-500 focus:bg-white text-red-700 placeholder-red-300"
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
             
             {!form.forceAssignDriverId && (
               <div className={`mt-3 p-3.5 rounded-2xl border transition-all ${
                 form.autoAssignNearest
                   ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 shadow-xs'
                   : 'bg-slate-50 border-slate-300'
               }`}>
                 <div className="flex items-center justify-between gap-3">
                   <div className="flex items-center gap-2.5">
                     <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-base font-bold ${
                       form.autoAssignNearest ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-300 text-slate-600'
                     }`}>
                       {form.autoAssignNearest ? '⚡' : '🛑'}
                     </div>
                     <div>
                       <h4 className={`text-xs sm:text-sm font-black ${
                         form.autoAssignNearest ? 'text-emerald-900' : 'text-slate-700'
                       }`}>
                         {form.autoAssignNearest 
                           ? 'ĐANG BẬT: GÁN ĐƠN TỰ ĐỘNG (FULLTIME 1KM)' 
                           : 'ĐANG TẮT: LÊN ĐƠN TREO THỦ CÔNG'}
                       </h4>
                       <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                         {form.autoAssignNearest
                           ? 'Hệ thống tự quét tài xế Fulltime trong 1km, chia đều đơn rảnh (popup đếm 30s). Nếu không ai nhận mới treo lên.'
                           : 'Đơn sẽ treo thẳng lên cho TOÀN BỘ tài xế nhận tự do như cũ (không qua vòng gán Fulltime 1km).'}
                       </p>
                     </div>
                   </div>

                   <button
                     type="button"
                     onClick={() => setForm(prev => ({ ...prev, autoAssignNearest: !prev.autoAssignNearest }))}
                     className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                       form.autoAssignNearest ? 'bg-emerald-600' : 'bg-slate-300'
                     }`}
                   >
                     <span
                       className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                         form.autoAssignNearest ? 'translate-x-5' : 'translate-x-0'
                       }`}
                     />
                   </button>
                 </div>
               </div>
             )}

             <p className="text-[10px] text-purple-600 mt-2 font-medium italic relative z-10">
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
