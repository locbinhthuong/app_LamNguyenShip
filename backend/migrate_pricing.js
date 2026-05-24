const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const Config = require('./models/Config');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lamnguyenship')
  .then(async () => {
    try {
      const defaultTiers = [
        { maxKm: 3, price: 17000, type: 'fixed' },
        { maxKm: 4, price: 20000, type: 'fixed' },
        { maxKm: 5, price: 22000, type: 'fixed' },
        { maxKm: 6, price: 25000, type: 'fixed' },
        { maxKm: 8, price: 27000, type: 'fixed' },
        { maxKm: 10, price: 35000, type: 'fixed' },
        { maxKm: 99999, price: 5000, type: 'per_km' }
      ];

      await Config.findOneAndUpdate(
        { key: 'PRICING_CONFIG' },
        { value: { tiers: defaultTiers } },
        { upsert: true }
      );
      console.log('Successfully migrated PRICING_CONFIG to tier-based structure.');
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  });
