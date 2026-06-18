const fs = require('fs');
const path = 'c:/app_LamNguyenShip/frontend/src/pages/shop/ShopStatistics.jsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('const [showShippingModal, setShowShippingModal] = useState(false);')) {
  content = content.replace(
    /const \[statFilter, setStatFilter\] = useState\('day'\);/,
    `const [statFilter, setStatFilter] = useState('day');\n  const [showShippingModal, setShowShippingModal] = useState(false);`
  );
}

// Make the "Doanh thu tiền ship" card clickable
content = content.replace(
  /<div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-4 text-white shadow-lg shadow-emerald-500\/30">/g,
  `<div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-4 text-white shadow-lg shadow-emerald-500/30 cursor-pointer active:scale-95 transition-transform" onClick={() => setShowShippingModal(true)}>`
);

// Add modal at the end before final </div>
const modalCode = `
      {/* SHIPPING REVENUE BREAKDOWN MODAL */}
      {showShippingModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex flex-col justify-end md:justify-center md:items-center">
          <div className="bg-white w-full md:w-[400px] rounded-t-3xl md:rounded-3xl p-6 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-gray-800 text-lg">Chi Tiết Tiền Ship</h3>
              <button onClick={() => setShowShippingModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <span className="font-bold text-gray-500 text-sm">Tổng tiền ship</span>
                <span className="font-black text-emerald-600 text-lg">{statsData.totalShipping.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between items-center bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <span className="font-bold text-blue-700 text-sm">Ship Khách Trả</span>
                <span className="font-black text-blue-700 text-lg">{statsData.customerPaidShipping.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <span className="font-bold text-emerald-700 text-sm">Ship Shop Trả</span>
                <span className="font-black text-emerald-700 text-lg">{statsData.shopPaidShipping.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
            
            <button 
              onClick={() => setShowShippingModal(false)}
              className="w-full mt-6 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3.5 rounded-xl transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
`;

if (!content.includes('SHIPPING REVENUE BREAKDOWN MODAL')) {
  content = content.replace(
    /<\/div>\s*<\/div>\s*$/g,
    `${modalCode}\n    </div>\n  </div>\n`
  );
}

fs.writeFileSync(path, content, 'utf8');
console.log('Patched ShopStatistics.jsx UI successfully');
