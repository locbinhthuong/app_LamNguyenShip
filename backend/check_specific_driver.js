require('dotenv').config();
const mongoose = require('mongoose');
const Driver = require('./models/Driver');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aloshipp')
  .then(async () => {
    const driver1 = await Driver.findOne({ name: /hoà/i });
    const driver2 = await Driver.findOne({ driverCode: /TX17D9CA/i });
    console.log("Hoà:", driver1 ? {name: driver1.name, phone: driver1.phone, status: driver1.status} : null);
    console.log("TX17D9CA:", driver2 ? {name: driver2.name, phone: driver2.phone, status: driver2.status} : null);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
