const axios = require('axios');

/**
 * Tính khoảng cách đường chim bay (Haversine formula)
 */
const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Bán kính trái đất (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Km
  return Number(distance.toFixed(2));
};

/**
 * Lấy khoảng cách và đường đi thực tế giữa 2 điểm
 * Dùng Goong API
 */
const getDrivingDistance = async (lat1, lng1, lat2, lng2) => {
  try {
    const apiKey = process.env.GOONG_API_KEY;
    if (!apiKey) throw new Error('Missing GOONG_API_KEY');

    // Gọi Goong Direction API (Lưu ý: Goong nhận Origin/Destination dạng lat,lng)
    const url = `https://rsapi.goong.io/Direction?origin=${lat1},${lng1}&destination=${lat2},${lng2}&vehicle=car&api_key=${apiKey}`;
    
    const response = await axios.get(url, { timeout: 5000 });

    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const distanceKm = route.legs[0].distance.value / 1000;
      
      // Decode polyline (Goong uses standard Google polyline encoding)
      const encodedPolyline = route.overview_polyline.points;
      const coordinates = require('@mapbox/polyline').decode(encodedPolyline).map(p => ({lat: p[0], lng: p[1]}));
      
      return {
        distanceKm: Number(distanceKm.toFixed(2)),
        routeLine: coordinates
      };
    }
    
    throw new Error('Không tìm thấy đường đi từ Goong');
  } catch (error) {
    console.error('Lỗi tính khoảng cách Goong:', error.message);
    
    // Nếu lỗi thì fallback dùng đường chim bay x 1.3
    const fallbackDistance = getHaversineDistance(lat1, lng1, lat2, lng2) * 1.3;
    return {
      distanceKm: Number(fallbackDistance.toFixed(2)), 
      routeLine: [{lat: lat1, lng: lng1}, {lat: lat2, lng: lng2}], // Trả về đường thẳng 2 điểm
      error: 'GOONG_FAILED_FALLBACK_TO_HAVERSINE'
    };
  }
};

module.exports = {
  getDrivingDistance,
  getHaversineDistance
};
