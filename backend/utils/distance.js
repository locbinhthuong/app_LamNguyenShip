const axios = require('axios');

/**
 * Tính khoảng cách đường bộ thực tế bằng OSRM API (OpenStreetMap)
 * @param {number} lat1 - Vĩ độ điểm đi
 * @param {number} lng1 - Kinh độ điểm đi
 * @param {number} lat2 - Vĩ độ điểm đến
 * @param {number} lng2 - Kinh độ điểm đến
 * @returns {Promise<number>} Khoảng cách tính bằng Km (Làm tròn 2 chữ số thập phân)
 */
const getDrivingDistance = async (lat1, lng1, lat2, lng2) => {
  try {
    // OSRM format: lng,lat;lng,lat
    const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;
    const response = await axios.get(url);

    if (response.data && response.data.routes && response.data.routes.length > 0) {
      // Khoảng cách trả về tính bằng mét, đổi ra km
      const distanceMeters = response.data.routes[0].distance;
      const distanceKm = distanceMeters / 1000;
      return Number(distanceKm.toFixed(2));
    }
    
    // Fallback: Nếu không tìm thấy đường, dùng đường chim bay nhân hệ số 1.3
    console.warn('OSRM không tìm thấy đường dẫn, sử dụng đường chim bay x 1.3');
    return getHaversineDistance(lat1, lng1, lat2, lng2) * 1.3;
  } catch (error) {
    console.error('Lỗi khi gọi API OSRM:', error.message);
    // Fallback an toàn nếu API OSRM bị lỗi
    return getHaversineDistance(lat1, lng1, lat2, lng2) * 1.3;
  }
};

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

module.exports = {
  getDrivingDistance,
  getHaversineDistance
};
