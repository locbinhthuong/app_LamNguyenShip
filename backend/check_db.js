const mongoose = require('mongoose');
const Config = require('./models/Config');
mongoose.connect('mongodb://127.0.0.1:27017/lamnguyenship').then(async () => {
  const doc = await Config.findOne({ key: 'LATE_NIGHT_SURCHARGE_CONFIG' });
  console.log(JSON.stringify(doc));
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
