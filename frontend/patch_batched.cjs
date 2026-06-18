const fs = require('fs');
const path = 'c:/app_LamNguyenShip/frontend/src/components/booking/BatchedDeliveryForm.jsx';
let content = fs.readFileSync(path, 'utf8');

// Remove global feePaidBy state
content = content.replace(/const \[feePaidBy, setFeePaidBy\] = useState\('RECEIVER'\);\s*/, '');

// Update initial deliveries state
content = content.replace(
  /\{ id: 1, address: '', coordinates: null, receiverName: '', receiverPhone: '', codAmount: '', note: '', fee: 0, distanceKm: 0 \}/,
  "{ id: 1, address: '', coordinates: null, receiverName: '', receiverPhone: '', codAmount: '', note: '', fee: 0, distanceKm: 0, feePaidBy: 'RECEIVER' }"
);

// Update handleAddDelivery
content = content.replace(
  /\{ id: Date\.now\(\), address: '', coordinates: null, receiverName: '', receiverPhone: '', codAmount: '', note: '', fee: 0, distanceKm: 0 \}/,
  "{ id: Date.now(), address: '', coordinates: null, receiverName: '', receiverPhone: '', codAmount: '', note: '', fee: 0, distanceKm: 0, feePaidBy: 'RECEIVER' }"
);

// Update payload for SINGLE_DRIVER
content = content.replace(
  /fee: d\.fee \|\| 0,\s*distanceKm: d\.distanceKm \|\| 0,\s*note: d\.note\.trim\(\)\s*\}\)\),/g,
  `fee: d.fee || 0,
          feePaidBy: d.feePaidBy || 'RECEIVER',
          distanceKm: d.distanceKm || 0,
          note: d.note.trim()
        })),`
);
// Remove global feePaidBy from SINGLE_DRIVER payload
content = content.replace(/\s*feePaidBy: feePaidBy\s*\};/g, '\n      };');

// Update payload for MULTI_DRIVER
content = content.replace(/feePaidBy: feePaidBy,/g, 'feePaidBy: d.feePaidBy || \'RECEIVER\',');

// Insert per-delivery UI
const perDeliveryUI = `
              {/* Thu hộ và Ghi chú */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <DollarSign size={12} className="text-yellow-500" /> THU HỘ (COD)
                  </label>
                  <CurrencyInput 
                    name={\`codAmount_\${index}\`}
                    placeholder="VD: 250.000"
                    className="w-full text-[13px] font-bold text-slate-800 p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-yellow-400"
                    value={delivery.codAmount}
                    onChange={e => updateDelivery(index, 'codAmount', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <Package size={12} className="text-blue-500" /> GHI CHÚ
                  </label>
                  <input 
                    type="text"
                    placeholder="Lưu ý: Dễ vỡ, gọi trước..."
                    className="w-full text-[13px] text-slate-800 p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-blue-300"
                    value={delivery.note}
                    onChange={e => updateDelivery(index, 'note', e.target.value)}
                  />
                </div>
              </div>

              {/* NGƯỜI TRẢ PHÍ SHIP */}
              <div className="mt-2">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  NGƯỜI TRẢ PHÍ SHIP
                </label>
                <div className="flex gap-2">
                  <label className={\`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl border-2 cursor-pointer transition-colors \${delivery.feePaidBy === 'RECEIVER' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-500'}\`}>
                    <input 
                      type="radio" 
                      value="RECEIVER" 
                      checked={delivery.feePaidBy === 'RECEIVER'}
                      onChange={() => updateDelivery(index, 'feePaidBy', 'RECEIVER')}
                      className="hidden" 
                    />
                    <span className="font-bold text-[12px]">Khách nhận trả</span>
                  </label>
                  <label className={\`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl border-2 cursor-pointer transition-colors \${delivery.feePaidBy === 'SENDER' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 bg-gray-50 text-gray-500'}\`}>
                    <input 
                      type="radio" 
                      value="SENDER" 
                      checked={delivery.feePaidBy === 'SENDER'}
                      onChange={() => updateDelivery(index, 'feePaidBy', 'SENDER')}
                      className="hidden" 
                    />
                    <span className="font-bold text-[12px]">Shop trả</span>
                  </label>
                </div>
              </div>
`;

// Replace the old "Thu hộ và Ghi chú" block with the new one containing feePaidBy
content = content.replace(
  /\{\/\* Thu hộ và Ghi chú \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\)\}/,
  perDeliveryUI.trim() + '\n            </div>\n          </div>\n        ))}'
);

// Remove the global feePaidBy UI block
content = content.replace(
  /\{\/\* NGƯỜI TRẢ PHÍ SHIP \*\/\}\s*<div className="mt-8">[\s\S]*?<\/div>\s*<\/div>\s*\{\/\* TỔNG KẾT & SUBMIT BUTTON \*\/\}/,
  '{/* TỔNG KẾT & SUBMIT BUTTON */}'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched BatchedDeliveryForm.jsx successfully');
