import { useState, useEffect } from 'react';
import CurrencyInput from './CurrencyInput';
import api from '../services/api';

export default function EditOrderModal({ isOpen, onClose, order, onSave }) {
  const [drivers, setDrivers] = useState([]);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    senderPhone: '',
    senderName: '',
    receiverName: '',
    receiverPhone: '',
    receiverPhone2: '',
    pickupAddress: '',
    deliveryAddress: '',
    codAmount: 0,
    deliveryFee: 0,
    bankName: '',
    bankAccount: '',
    bankAccountName: '',
    transactionAmount: 0,
    note: '',
    packageDescription: '',
    adminBonus: 0,
    forceAssignDriverId: ''
  });

  useEffect(() => {
    if (isOpen) {
      api.get('/api/drivers?status=active')
        .then(res => {
          if (res.data?.success) {
            setDrivers(res.data.data);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (order) {
      setFormData({
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        senderPhone: order.senderPhone || '',
        senderName: order.senderName || '',
        receiverName: order.receiverName || '',
        receiverPhone: order.receiverPhone || '',
        receiverPhone2: order.receiverPhone2 || '',
        pickupAddress: order.pickupAddress || '',
        deliveryAddress: order.deliveryAddress || '',
        codAmount: order.codAmount || 0,
        deliveryFee: order.deliveryFee || 0,
        bulkyFee: order.packageDetails?.bulkyFee || 0,
        surcharge: order.rideDetails?.surcharge || 0,
        vehicleClass: order.rideDetails?.vehicleClass || '',
        bankName: order.financialDetails?.bankName || '',
        bankAccount: order.financialDetails?.bankAccount || '',
        bankAccountName: order.financialDetails?.bankAccountName || '',
        transactionAmount: order.financialDetails?.transactionAmount || 0,
        note: order.note || '',
        packageDescription: order.packageDetails?.description || '',
        adminBonus: order.adminBonus || 0,
        forceAssignDriverId: order.assignedTo?._id || order.assignedTo || ''
      });
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['codAmount', 'deliveryFee', 'adminBonus', 'bulkyFee', 'surcharge', 'transactionAmount'].includes(name) ? Number(value) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(order._id, formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            Cập nhật Đơn #{order.orderCode || order._id.slice(-8)}
            {order.serviceType === 'DAT_XE' && (
               <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full whitespace-nowrap">
                 {order.subServiceType === 'XE_OM' ? '🛵 XE ÔM' : order.subServiceType === 'LAI_HO_XE_MAY' ? '🔑 LÁI HỘ (MÁY)' : order.subServiceType === 'LAI_HO_OTO' ? '🚗 LÁI HỘ (Ô TÔ)' : '🛵 ĐẶT XE'}
               </span>
            )}
            {order.serviceType === 'DIEU_PHOI' && (
               <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">
                 {order.subServiceType === 'NAP_TIEN' ? '🏦 NẠP TIỀN' : order.subServiceType === 'RUT_TIEN' ? '💵 RÚT TIỀN' : 'ĐIỀU PHỐI'}
               </span>
            )}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 rounded-lg p-2 bg-slate-100 font-bold">✕ Đóng</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* KHỐI 0: ĐIỀU PHỐI TÀI XẾ */}
          {(!order.assignedTo || order.status === 'PENDING') && (
            <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 shadow-sm relative overflow-hidden">
               <div className="absolute -right-2 -top-2 text-6xl opacity-5">🎯</div>
               <label className="block text-xs font-bold text-purple-700 uppercase mb-2 tracking-wider relative z-10">
                 👨‍✈️ ĐIỀU PHỐI / GÁN TÀI XẾ MỚI
               </label>
               <select 
                  name="forceAssignDriverId" 
                  value={formData.forceAssignDriverId} 
                  onChange={handleChange} 
                  className="w-full rounded-lg border border-purple-300 p-2.5 text-sm bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none font-medium relative z-10 appearance-none"
               >
                  <option value="">-- Đơn tự do (Tài xế tự giành) --</option>
                  {drivers.sort((a,b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0)).map(d => (
                    <option key={d._id} value={d._id}>
                      {d.isOnline ? '🟢 [ONLINE]' : '🔴 [OFFLINE]'} - {d.name} ({d.phone})
                    </option>
                  ))}
               </select>
               <p className="text-[10px] text-purple-600 mt-1.5 font-medium italic relative z-10">
                 * Hệ thống sẽ đánh giá công nợ của tài xế trước khi chốt gán đơn.
               </p>
            </div>
          )}

          {/* KHỐI 1: KHÁCH ĐẶT */}
          <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Khách Đặt Tự Động:</h3>
            <div className="text-xs font-bold text-slate-700">👤 {formData.customerName} <span className="text-slate-400 mx-1">|</span> 📞 {formData.customerPhone}</div>
          </div>
          
          {/* KHỐI 2: ĐIỂM ĐÓN / LẤY HÀNG */}
          <div className="bg-orange-50/30 p-3 rounded-xl border border-orange-100">
            <h3 className="text-xs font-bold text-orange-600 uppercase mb-3 tracking-wider">
              {order.serviceType === 'DAT_XE' ? 'ĐIỂM ĐÓN KHÁCH' : 'ĐIỂM LẤY HÀNG / NƠI ĐÓN'}
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  {order.serviceType === 'DAT_XE' ? 'Điểm Đón Khách' : (order.serviceType === 'DIEU_PHOI' ? 'Nơi Gặp Mặt / Lấy Tiền' : 'Địa chỉ lấy hàng')}
                </label>
                <input type="text" name="pickupAddress" value={formData.pickupAddress} onChange={handleChange} className="w-full rounded-lg border border-orange-200 p-2 text-sm bg-white focus:border-orange-500 focus:outline-none" />
              </div>
              

              {order.serviceType !== 'MUA_HO' && (
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    {order.serviceType === 'DAT_XE' ? 'SĐT Khách Lên Xe' : 'SĐT Nơi Lấy / Điểm Đón'}
                  </label>
                  <input type="text" name="senderPhone" value={formData.senderPhone} onChange={handleChange} className="w-full rounded-lg border border-orange-200 p-2 text-sm bg-white font-bold text-orange-700 focus:border-orange-500 focus:outline-none" placeholder="Nhập SĐT nơi lấy..." />
                </div>
              )}
            </div>
          </div>
          
          {/* KHỐI THƯỞNG KPI NĂNG SUẤT (READ-ONLY) */}
          {order.kpiBonus > 0 && (
             <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-3 rounded-xl border border-orange-200 flex justify-between items-center shadow-sm">
               <div className="flex items-center gap-2">
                 <span className="text-2xl">🏆</span>
                 <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Phần Thưởng KPI (Hệ thống tự cấp)</span>
                   <span className="text-xs text-orange-500 font-medium tracking-tight">Thưởng tự động cho Tài xế này!</span>
                 </div>
               </div>
               <div className="text-lg font-black text-orange-600 drop-shadow-sm px-3 py-1 bg-white rounded-lg border border-orange-100">
                 +{order.kpiBonus.toLocaleString()}đ
               </div>
             </div>
          )}

          {/* KHỐI 3: ĐIỂM GIAO / TRẢ KHÁCH (ko cho Điều Phối) */}
          {order.serviceType !== 'DIEU_PHOI' && (
            <div className="bg-sky-50 p-3 rounded-xl border border-sky-100">
              <h3 className="text-xs font-bold text-sky-600 uppercase mb-3 tracking-wider">
                {order.serviceType === 'DAT_XE' ? 'ĐIỂM TRẢ KHÁCH' : 'ĐIỂM GIAO HÀNG / TRẢ KHÁCH'}
              </h3>
              <div className="space-y-4">
                <div>
                   <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                     {order.serviceType === 'DAT_XE' ? 'Điểm Đến / Trả Khách' : 'Địa chỉ giao/nhận'}
                   </label>
                   <input type="text" name="deliveryAddress" value={formData.deliveryAddress} onChange={handleChange} className="w-full rounded-lg border border-sky-200 p-2 text-sm bg-white focus:border-sky-500 focus:outline-none" />
                </div>
                

                {order.serviceType !== 'DAT_XE' && (
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      {order.serviceType === 'MUA_HO' ? 'SĐT Khách Đặt Mua' : 'SĐT Nhận Hàng'}
                    </label>
                    <input type="text" name="receiverPhone" value={formData.receiverPhone} onChange={handleChange} className="w-full rounded-lg border border-sky-200 p-2 text-sm bg-white font-bold text-sky-700 focus:border-sky-500 focus:outline-none" placeholder={order.serviceType === 'MUA_HO' ? 'SĐT Khách Đặt...' : 'SĐT khách nhận...'} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dành riêng cho Đơn Lái Hộ (Nạp / Rút) */}
          {(order.serviceType === 'DIEU_PHOI' && (order.subServiceType === 'NAP_TIEN' || order.subServiceType === 'RUT_TIEN')) && (
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 space-y-3">
              <label className="block text-xs font-bold text-blue-600 tracking-wider">THÔNG TIN GIAO DỊCH TÀI CHÍNH</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-semibold text-slate-600 mb-1">Ngân Hàng</label>
                   <input type="text" name="bankName" value={formData.bankName} onChange={handleChange} className="w-full rounded-lg border border-blue-200 p-2 text-sm bg-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                   <label className="block text-xs font-semibold text-slate-600 mb-1">Số Tài Khoản</label>
                   <input type="text" name="bankAccount" value={formData.bankAccount} onChange={handleChange} className="w-full rounded-lg border border-blue-200 p-2 text-sm bg-white font-bold text-blue-700 focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Chủ Tài Khoản</label>
                   <input type="text" name="bankAccountName" value={formData.bankAccountName} onChange={handleChange} className="w-full rounded-lg border border-blue-200 p-2 text-sm bg-white uppercase font-bold focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                   <label className="block text-xs font-semibold text-orange-600 mb-1">Số Tiền Nạp / Rút</label>
                   <CurrencyInput name="transactionAmount" value={formData.transactionAmount} onChange={handleChange} min="0" className="w-full rounded-lg border border-orange-200 p-2 text-sm bg-orange-50 font-bold focus:border-orange-500 focus:outline-none" />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {order.serviceType !== 'DAT_XE' && order.serviceType !== 'DIEU_PHOI' && (
               <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tiền thu hộ (COD)</label>
                  <CurrencyInput name="codAmount" value={formData.codAmount} onChange={handleChange} min="0" className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" />
               </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                 {order.serviceType === 'DAT_XE' ? 'Cước xe' : 'Phí giao hàng (Ship)'}
              </label>
              <CurrencyInput name="deliveryFee" value={formData.deliveryFee} onChange={handleChange} min="0" className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>

          {/* Dòng Bonus riêng biệt */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-600 mb-1">Ví Tài Xế (Admin Bonus)</label>
              <CurrencyInput name="adminBonus" value={formData.adminBonus} onChange={handleChange} min="0" className="w-full rounded-lg border border-emerald-300 p-2 text-sm bg-emerald-50 font-bold text-emerald-700 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" placeholder="Thưởng thêm cho tài xế gốc..." />
            </div>
            
            {order.kpiBonus > 0 && (
              <div className="bg-gradient-to-r from-orange-100 to-yellow-50 border-l-4 border-orange-400 p-2 rounded-lg rounded-l-none flex flex-col justify-center shadow-sm">
                 <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wider">Hệ Thống Thưởng KPI</span>
                 <span className="font-black text-lg text-orange-600">+{order.kpiBonus.toLocaleString()}đ</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={(order.serviceType !== 'GIAO_HANG') ? 'hidden' : ''}>
              <label className="block text-xs font-semibold text-orange-500 mb-1">Phí Cồng Kềnh</label>
              <CurrencyInput name="bulkyFee" value={formData.bulkyFee} onChange={handleChange} min="0" className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-slate-50 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100" />
            </div>
            <div className={(order.serviceType !== 'DAT_XE') ? 'hidden' : ''}>
              <label className="block text-xs font-semibold text-teal-600 mb-1">Phụ Phí Lái Hộ / Gọi Xe</label>
              <CurrencyInput name="surcharge" value={formData.surcharge} onChange={handleChange} min="0" className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-slate-50 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100" />
            </div>
          </div>

          {order.serviceType === 'DAT_XE' && (
            <div>
              <label className="block text-xs font-semibold text-purple-600 mb-1">Dòng Xe / Loại Xe Khách Cung Cấp</label>
              <input type="text" name="vehicleClass" value={formData.vehicleClass || ''} onChange={handleChange} className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-slate-50 font-bold focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-100" placeholder="Chỉ áp dụng Xe ôm hoặc Lái hộ" />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú</label>
            <textarea name="note" value={formData.note} onChange={handleChange} rows="2" className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none" placeholder="Lưu ý khi giao..."></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 transition-colors">Hủy</button>
            <button type="submit" className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">Lưu thay đổi</button>
          </div>
        </form>
      </div>
    </div>
  );
}
