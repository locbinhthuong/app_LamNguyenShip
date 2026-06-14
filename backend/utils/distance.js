const axios = require('axios');

// Fallback logic cho tính toán khoảng cách đường chim bay (Haversine)
function haversineDistance(coords1, coords2) {
  function toRad(x) {
    return x * Math.PI / 180;
  }

  const lon1 = coords1.lng;
  const lat1 = coords1.lat;
  const lon2 = coords2.lng;
  const lat2 = coords2.lat;

  const R = 6371; // Radius of the earth in km
  const x1 = lat2 - lat1;
  const dLat = toRad(x1);
  const x2 = lon2 - lon1;
  const dLon = toRad(x2);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return d; // km
}

/**
 * Lấy khoảng cách và đường đi thực tế giữa 2 điểm
 * Dùng Google Maps Routes API (Công nghệ mới nhất của Google)
 */
async function getDrivingDistance(lat1, lng1, lat2, lng2) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      throw new Error("Missing Google Maps API Key for Routes");
    }

    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const payload = {
      origin: { location: { latLng: { latitude: lat1, longitude: lng1 } } },
      destination: { location: { latLng: { latitude: lat2, longitude: lng2 } } },
      travelMode: 'DRIVE'
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
      },
      timeout: 5000
    });

    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const distanceKm = route.distanceMeters / 1000;
      
      // Decode the polyline points from Google Maps format
      const encodedPolyline = route.polyline.encodedPolyline;
      const polylinePoints = require('@mapbox/polyline').decode(encodedPolyline).map(p => ({lat: p[0], lng: p[1]}));

      return {
        distanceKm: Number(distanceKm.toFixed(2)),
        routeLine: polylinePoints,
        duration: parseInt(route.duration.replace('s', '')) / 60
      };
    } else {
      throw new Error(`Google Routes API error: Không tìm thấy đường đi`);
    }
  } catch (error) {
    console.error('Lỗi tính khoảng cách Google Routes API:', error?.response?.data || error.message);
    
    // Nếu lỗi thì fallback dùng đường chim bay
    const origin = { lat: lat1, lng: lng1 };
    const destination = { lat: lat2, lng: lng2 };
    const fallbackDistance = haversineDistance(origin, destination) * 1.3;
    return {
      distanceKm: Number(fallbackDistance.toFixed(2)),
      routeLine: [origin, destination],
      error: 'ROUTES_API_FAILED_FALLBACK_TO_HAVERSINE'
    };
  }
}

module.exports = {
  getDrivingDistance,
  getHaversineDistance: haversineDistance
};
