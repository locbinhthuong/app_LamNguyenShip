const fs = require('fs');
const path = 'c:/app_LamNguyenShip/frontend/src/pages/shop/ShopStatistics.jsx';
let content = fs.readFileSync(path, 'utf8');

// Update chartData.push
content = content.replace(
  /chartData\.push\(\{ name: (.+?), revenue: 0, shipping: 0, orders: 0(.+?)\}\);/g,
  "chartData.push({ name: $1, revenue: 0, shipping: 0, shopPaid: 0, customerPaid: 0, orders: 0$2});"
);

// Update match accumulation
content = content.replace(
  /match\.shipping \+= \(o\.deliveryFee \|\| 0\);/g,
  `match.shipping += (o.deliveryFee || 0);
          if (o.feePaidBy === 'SENDER') match.shopPaid += (o.deliveryFee || 0);
          else match.customerPaid += (o.deliveryFee || 0);`
);

// Update final totals accumulation
content = content.replace(
  /let totalOrders = 0;/g,
  `let totalOrders = 0;
    let shopPaidShipping = 0;
    let customerPaidShipping = 0;`
);

content = content.replace(
  /totalShipping \+= c\.shipping;/g,
  `totalShipping += c.shipping;
      shopPaidShipping += c.shopPaid;
      customerPaidShipping += c.customerPaid;`
);

// Update return
content = content.replace(
  /return \{ chartData, totalRevenue, totalShipping, totalOrders \};/g,
  "return { chartData, totalRevenue, totalShipping, shopPaidShipping, customerPaidShipping, totalOrders };"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched ShopStatistics.jsx successfully');
