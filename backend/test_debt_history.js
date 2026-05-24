const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const Driver = require('./models/Driver');
const DebtTransaction = require('./models/DebtTransaction');

mongoose.connect('mongodb+srv://LamNguyen:NTL123456@cluster0.zoxsh.mongodb.net/NTL_BinhThuong?retryWrites=true&w=majority')
  .then(async () => {
    try {
      const drivers = await Driver.find({});
      console.log('--- ALL DRIVERS ---');
      drivers.forEach(d => console.log(d.name, d.phone, d._id));
      
      const targetDriver = drivers.find(d => d.name.toLowerCase().includes('văn') || d.phone.includes('0944'));
      if (targetDriver) {
        console.log('\nFound Target:', targetDriver.name, targetDriver.phone);
        const debts = await DebtTransaction.find({ driverId: targetDriver._id }).sort({ createdAt: 1 });
        debts.forEach(d => {
            const time = new Date(d.createdAt).toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'});
            console.log(`[${time}] | ${d.type} | ${d.amount} | ${d.status} | ${d.description} | ${d.targetDate}`);
        });
      }
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  });
