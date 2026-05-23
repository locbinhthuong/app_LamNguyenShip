const axios = require('axios');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

async function testApi() {
  try {
    // Generate a valid token for the driver
    const Driver = require('./models/Driver');
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGO_URI);
    
    const driver = await Driver.findOne({ phone: '0827758062' });
    if (!driver) {
      console.log('Driver not found');
      return;
    }
    
    const token = jwt.sign({ id: driver._id, role: 'DRIVER' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    const res = await axios.get('http://localhost:5000/api/debts/driver/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('API Response:', JSON.stringify(res.data, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

testApi();
