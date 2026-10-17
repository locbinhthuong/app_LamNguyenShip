require('dotenv').config();
const mongoose = require('mongoose');
const Driver = require('./models/Driver');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aloshipp')
  .then(async () => {
    const driver = await Driver.findOne({ phone: '0348330774' });
    console.log(driver);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
