const fs = require('fs');
let content = fs.readFileSync('c:/app_LamNguyenShip/frontend/src/pages/shop/ShopStatistics.jsx', 'utf8');

const searchStr = `{payload[2] && <p className="text-orange-500 font-bold">Số đơn: {payload[2  return (\r\n    <div className="flex flex-col min-h-screen w-full bg-gray-50 font-sans overflow-hidden">`;

const replaceStr = `{payload[2] && <p className="text-orange-500 font-bold">Số đơn: {payload[2].value}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-gray-50 font-sans overflow-hidden">`;

// fallback string matching without \r\n explicitly
const regex = /\{payload\[2\] \&\& <p className="text-orange-500 font-bold">Số đơn: \{payload\[2  return \([\s\S]*?<div className="flex flex-col min-h-screen w-full bg-gray-50 font-sans overflow-hidden">/;

content = content.replace(regex, replaceStr);

fs.writeFileSync('c:/app_LamNguyenShip/frontend/src/pages/shop/ShopStatistics.jsx', content, 'utf8');
