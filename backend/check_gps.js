const mongoose = require('mongoose');
const Driver = require('./models/Driver');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const drivers = await Driver.find({ status: 'active', isOnline: true }).select('name phone currentLocation isOnline status').lean();
    console.log(`Found ${drivers.length} online drivers.`);
    drivers.forEach(d => {
      console.log(`- ${d.name} (${d.phone}): Location:`, d.currentLocation);
    });
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
