require('dotenv').config();
console.log("URI:", process.env.MONGO_URI);
const mongoose = require('mongoose');
const Driver = require('./models/Driver');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const driver1 = await Driver.findOne({ phone: '0348330774' });
    const driver2 = await Driver.findOne({ driverCode: 'TX17D9CA' });
    const driver3 = await Driver.findOne({ name: /hoà/i });
    console.log("0348330774:", driver1);
    console.log("TX17D9CA:", driver2);
    console.log("Hoà:", driver3);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
