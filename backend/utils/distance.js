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
 * Dùng OSRM (Miễn phí 100%) để không phụ thuộc vào billing của Google
 */
const getDrivingDistance = async (lat1, lng1, lat2, lng2) => {
  try {
    // Gọi OSRM API (Lưu ý: lng trước, lat sau)
    const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
    
    // Thêm User-Agent để không bị server OSRM chặn
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'LamNguyenShipApp/1.0'
      },
      timeout: 5000 // timeout 5s
    });

    if (response.data && response.data.code === 'Ok' && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const distanceKm = route.distance / 1000;
      
      // Chuyển đổi GeoJSON LineString của OSRM về định dạng polyline mảng object {lat, lng}
      // OSRM trả về [lng, lat], đổi thành {lat, lng} cho Frontend dễ vẽ
      const coordinates = route.geometry.coordinates.map(coord => ({
        lat: coord[1],
        lng: coord[0]
      })); 
      
      // Đảm bảo điểm bắt đầu và kết thúc trùng với điểm gốc
      coordinates.unshift({lat: lat1, lng: lng1});
      coordinates.push({lat: lat2, lng: lng2});

      return {
        distanceKm: Number(distanceKm.toFixed(2)),
        routeLine: coordinates
      };
    }
    
    throw new Error('Không tìm thấy đường đi từ OSRM');
  } catch (error) {
    console.error('Lỗi tính khoảng cách OSRM:', error.message);
    
    // Nếu lỗi thì fallback dùng đường chim bay x 1.3
    const fallbackDistance = getHaversineDistance(lat1, lng1, lat2, lng2) * 1.3;
    return {
      distanceKm: Number(fallbackDistance.toFixed(2)), 
      routeLine: [{lat: lat1, lng: lng1}, {lat: lat2, lng: lng2}], // Trả về đường thẳng 2 điểm để bản đồ đỡ trống
      error: 'OSRM_FAILED_FALLBACK_TO_HAVERSINE'
    };
  }
};

module.exports = {
  getDrivingDistance,
  getHaversineDistance
};
