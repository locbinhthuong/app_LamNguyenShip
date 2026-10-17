require('dotenv').config();
const mongoose = require('mongoose');
const Driver = require('./models/Driver');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aloshipp')
  .then(async () => {
    const drivers = await Driver.find().limit(5);
    console.log("Total drivers:", await Driver.countDocuments());
    console.log(drivers.map(d => ({phone: d.phone, name: d.name, status: d.status})));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
