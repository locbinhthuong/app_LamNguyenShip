const fs = require('fs');
const path = 'c:/app_LamNguyenShip/admin-app/src/components/EditOrderModal.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add feePaidBy to initial state
content = content.replace(
  /scheduledPublishAt: '',\s*batchedDeliveries: \[\]/,
  "scheduledPublishAt: '',\n    batchedDeliveries: [],\n    feePaidBy: 'RECEIVER'"
);

// Add feePaidBy to useEffect order parsing
content = content.replace(
  /scheduledPublishAt: order\.scheduledPublishAt \? new Date.*? : '',\s*batchedDeliveries: order\.batchedDeliveries \|\| \[\]/,
  `scheduledPublishAt: order.scheduledPublishAt ? new Date(new Date(order.scheduledPublishAt).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : '',
        batchedDeliveries: order.batchedDeliveries || [],
        feePaidBy: order.feePaidBy || 'RECEIVER'`
);

// In batched deliveries map, insert feePaidBy dropdown
const batchedDeliveryFeeCode = `
                        <div>
                           <label className="block text-[10px] font-semibold text-slate-500 mb-1">Ghi chú riêng</label>
                           <input type="text" value={delivery.note} onChange={e => handleBatchedChange(index, 'note', e.target.value)} className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-slate-50 focus:border-purple-400 focus:outline-none" placeholder="Lưu ý..." />
                        </div>
                     </div>
                     <div className="mt-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Người trả ship</label>
                        <select value={delivery.feePaidBy || 'RECEIVER'} onChange={e => handleBatchedChange(index, 'feePaidBy', e.target.value)} className="w-full rounded-lg border border-slate-200 p-2 text-xs font-bold text-sky-600 bg-slate-50 focus:border-purple-400 focus:outline-none">
                           <option value="RECEIVER">Khách nhận trả</option>
                           <option value="SENDER">Shop trả</option>
                        </select>
                     </div>
`;
content = content.replace(
  /<div>\s*<label className="block text-\[10px\] font-semibold text-slate-500 mb-1">Ghi chú riêng<\/label>\s*<input type="text" value=\{delivery\.note\}[^>]*>\s*<\/div>\s*<\/div>/,
  batchedDeliveryFeeCode.trim()
);

// For single deliveries, update deliveryFee block to include feePaidBy
const singleDeliveryFeeCode = `
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                 {order.serviceType === 'DAT_XE' ? 'Cước xe' : 'Phí giao hàng (Ship)'}
              </label>
              <div className="flex gap-2">
                 <CurrencyInput name="deliveryFee" value={formData.deliveryFee} onChange={handleChange} min="0" className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" />
                 {order.serviceType !== 'DAT_XE' && order.serviceType !== 'DIEU_PHOI' && order.serviceType !== 'DON_GHEP' && (
                   <select name="feePaidBy" value={formData.feePaidBy} onChange={handleChange} className="rounded-lg border border-slate-300 p-2 text-sm bg-slate-50 font-bold focus:border-blue-500 focus:outline-none">
                     <option value="RECEIVER">Khách trả</option>
                     <option value="SENDER">Shop trả</option>
                   </select>
                 )}
              </div>
            </div>
`;
content = content.replace(
  /<div>\s*<label className="block text-xs font-semibold text-slate-600 mb-1">\s*\{order\.serviceType === 'DAT_XE' \? 'Cước xe' : 'Phí giao hàng \(Ship\)'\}\s*<\/label>\s*<CurrencyInput name="deliveryFee" value=\{formData\.deliveryFee\} onChange=\{handleChange\} min="0" className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" \/>\s*<\/div>/,
  singleDeliveryFeeCode.trim()
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched EditOrderModal.jsx successfully');
