const axios = require('axios');

// Hàm giải mã polyline từ Goong
const decodePolyline = (str) => {
    let index = 0, lat = 0, lng = 0, coordinates = [], shift = 0, result = 0, byte = null;
    while (index < str.length) {
        byte = null; shift = 0; result = 0;
        do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
        let latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
        shift = result = 0;
        do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
        let longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += latitude_change; lng += longitude_change;
        coordinates.push([lat / 1e5, lng / 1e5]);
    }
    return coordinates;
};

/**
 * Tính khoảng cách đường bộ thực tế bằng Goong Direction API
 * @param {number} lat1 - Vĩ độ điểm đi
 * @param {number} lng1 - Kinh độ điểm đi
 * @param {number} lat2 - Vĩ độ điểm đến
 * @param {number} lng2 - Kinh độ điểm đến
 * @returns {Promise<{distanceKm: number, routeLine: Array}>} Khoảng cách tính bằng Km và Mảng tọa độ đường đi
 */
const getDrivingDistance = async (lat1, lng1, lat2, lng2) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${lat1},${lng1}&destination=${lat2},${lng2}&mode=driving&key=${apiKey}`;
      const response = await axios.get(url);

      if (response.data && response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const distanceMeters = route.legs[0].distance.value;
        const polylineStr = route.overview_polyline.points;
        const coordinates = decodePolyline(polylineStr);
        
        // Nối điểm thực tế vào đầu và cuối để đảm bảo hiển thị liền mạch
        coordinates.unshift([lat1, lng1]);
        coordinates.push([lat2, lng2]);

        return {
          distanceKm: Number((distanceMeters / 1000).toFixed(2)),
          routeLine: coordinates
        };
      }
    }

    throw new Error('Google Maps Directions API không trả về kết quả hoặc thiếu API Key');
  } catch (error) {
    console.error('Lỗi khi gọi API Google Directions:', error?.response?.data || error.message);
    
    // FALLBACK: Chuyển sang dùng OSRM Miễn phí nếu Google xịt
    try {
      console.warn('Đang chuyển hướng sang OSRM miễn phí vì Google bị lỗi/hết request...');
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
      const osrmResponse = await axios.get(osrmUrl);

      if (osrmResponse.data && osrmResponse.data.routes && osrmResponse.data.routes.length > 0) {
        const route = osrmResponse.data.routes[0];
        const distanceKm = route.distance / 1000;
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Đổi [lng, lat] thành [lat, lng]
        
        // Nối điểm thực tế vào đầu và cuối
        coordinates.unshift([lat1, lng1]);
        coordinates.push([lat2, lng2]);

        return {
          distanceKm: Number(distanceKm.toFixed(2)),
          routeLine: coordinates
        };
      }
    } catch (osrmError) {
      console.error('Lỗi khi gọi OSRM Fallback:', osrmError.message);
    }

    // Nếu cả Google và OSRM đều xịt, dùng đường chim bay
    console.warn('Cả Google và OSRM đều lỗi, sử dụng đường chim bay x 1.3');
    const d = getHaversineDistance(lat1, lng1, lat2, lng2) * 1.3;
    return {
      distanceKm: Number(d.toFixed(2)),
      routeLine: [[lat1, lng1], [lat2, lng2]]
    };
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
