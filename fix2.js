const fs = require('fs');
let content = fs.readFileSync('c:/app_LamNguyenShip/frontend/src/pages/shop/ShopStatistics.jsx', 'utf8');

const regex = /\}\)[\s\S]*?(?=\{\/\* SHIPPING REVENUE BREAKDOWN MODAL \*\/)/;
content = content.replace(regex, `})
            </div>
          </>
        )}
      </div>\n\n      `);

fs.writeFileSync('c:/app_LamNguyenShip/frontend/src/pages/shop/ShopStatistics.jsx', content, 'utf8');
