const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  const collections = await mongoose.connection.db.listCollections().toArray();
  const drivers = await mongoose.connection.db.collection('drivers').find({}).toArray();
  console.log('All drivers:', drivers.map(d => `${d.name} | ${d.phone} | ${d.driverCode}`));

  mongoose.disconnect();
}
check();
