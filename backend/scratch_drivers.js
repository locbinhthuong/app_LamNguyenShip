require('dotenv').config();
const mongoose = require('mongoose');
const Driver = require('./models/Driver');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const drivers = await Driver.find().select('name phone status commissionRate');
    console.log("=== TẤT CẢ TÀI XẾ ===");
    drivers.forEach(d => console.log(`${d.name} (${d.phone}) - ${d.status}: ${d.commissionRate}`));
    process.exit(0);
  });
