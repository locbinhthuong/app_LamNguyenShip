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

// Manual Polyline Decoder (Google Maps standard)
const decodePolyline = (encoded) => {
  if (!encoded) return [];
  const poly = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return poly;
};

/**
 * Lấy khoảng cách và đường đi thực tế theo đường bộ giữa 2 điểm
 * Ưu tiên Goong API, tự động fallback sang OSRM
 */
const getDrivingDistance = async (lat1, lng1, lat2, lng2) => {
  // 1. Thử qua Goong Direction API nếu có API key
  try {
    const apiKey = process.env.GOONG_API_KEY;
    if (apiKey) {
      const url = `https://rsapi.goong.io/Direction?origin=${lat1},${lng1}&destination=${lat2},${lng2}&vehicle=bike&api_key=${apiKey}`;
      const response = await axios.get(url, { timeout: 4000 });

      if (response.data && response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const distanceKm = route.legs[0].distance.value / 1000;
        const encodedPolyline = route.overview_polyline.points;
        const coordinates = decodePolyline(encodedPolyline);
        
        return {
          distanceKm: Number(distanceKm.toFixed(2)),
          routeLine: coordinates
        };
      }
    }
  } catch (error) {
    console.warn('[Routing] Goong Direction không khả dụng, chuyển sang OSRM:', error.message);
  }

  // 2. Fallback sang OSRM đường bộ thực tế (chuẩn OpenStreetMap)
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
    const osrmRes = await axios.get(osrmUrl, { timeout: 5000 });

    if (osrmRes.data && osrmRes.data.routes && osrmRes.data.routes.length > 0) {
      const route = osrmRes.data.routes[0];
      const distanceKm = route.distance / 1000;
      const rawCoords = route.geometry?.coordinates || [];
      const coordinates = rawCoords.map(([lng, lat]) => ({ lat, lng }));

      return {
        distanceKm: Number(distanceKm.toFixed(2)),
        routeLine: coordinates
      };
    }
  } catch (osrmErr) {
    console.warn('[Routing] OSRM lỗi:', osrmErr.message);
  }

  // 3. Fallback cuối cùng nếu cả 2 API đường bộ đều mất kết nối
  const fallbackDistance = getHaversineDistance(lat1, lng1, lat2, lng2) * 1.3;
  return {
    distanceKm: Number(fallbackDistance.toFixed(2)), 
    routeLine: [{ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 }],
    error: 'ROUTING_FALLBACK_TO_HAVERSINE'
  };
};

module.exports = {
  getDrivingDistance,
  getHaversineDistance
};
