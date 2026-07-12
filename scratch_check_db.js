const mongoose = require('mongoose');
require('dotenv').config({ path: 'backend/.env' });
const User = require('./backend/models/User');
const MenuItem = require('./backend/models/MenuItem');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to DB');
  const shops = await User.find({ role: 'SHOP' });
  console.log('=== SHOPS ===');
  console.log(shops.map(s => ({ id: s._id, name: s.shopName, isOpen: s.isOpen, phone: s.phone })));
  
  const items = await MenuItem.find();
  console.log('\n=== MENU ITEMS ===');
  console.log(items.map(i => ({ id: i._id, shopId: i.shopId, name: i.name, isAvailable: i.isAvailable })));
  
  mongoose.disconnect();
}).catch(err => console.log(err));
