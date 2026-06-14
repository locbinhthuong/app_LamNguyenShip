const axios = require('axios');
const { getDrivingDistance } = require('./backend/utils/distance.js');

async function testGoong() {
  console.log('Testing Goong API Setup...');
  process.env.GOONG_API_KEY = '2OlStVgXqfhCduMBb8isHpudl5S8kLYzrxUPTT5d';
  const apiKey = process.env.GOONG_API_KEY;
  
  // 1. Test Autocomplete
  try {
    const url = `https://rsapi.goong.io/Place/AutoComplete?api_key=${apiKey}&input=${encodeURIComponent('Nam Cần Thơ')}`;
    const response = await axios.get(url);
    if (response.data && response.data.predictions) {
      console.log('✅ Autocomplete SUCCESS:', response.data.predictions[0].description);
    } else {
      console.error('❌ Autocomplete FAILED:', response.data);
    }
  } catch (error) {
    console.error('❌ Autocomplete ERROR:', error.message);
  }

  // 2. Test Routing
  try {
    const lat1 = 10.007692, lng1 = 105.733560;
    const lat2 = 10.034789, lng2 = 105.772592;
    
    const routeInfo = await getDrivingDistance(lat1, lng1, lat2, lng2);
    if (!routeInfo.error) {
      console.log(`✅ Routing SUCCESS: Distance = ${routeInfo.distanceKm} km, Polyline points = ${routeInfo.routeLine.length}`);
      if (routeInfo.routeLine.length > 2) {
        console.log('✅ Custom Polyline Decoder SUCCESS! (Generated ' + routeInfo.routeLine.length + ' curved points)');
      } else {
        console.warn('⚠️ Polyline only generated 2 points (straight line). Check vehicle type or route length.');
      }
    } else {
      console.error('❌ Routing FAILED (Fallback Triggered):', routeInfo.error);
    }
  } catch (error) {
    console.error('❌ Routing ERROR:', error.message);
  }
}

testGoong();
