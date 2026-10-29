import { api } from '../services/api';

const routeCache = new Map();

/**
 * Lấy đường đi thực tế theo đường bộ (road coordinates) giữa 2 điểm
 * Trả về mảng tọa độ Leaflet: [[lat, lng], [lat, lng], ...]
 * @param {[number, number] | {lat: number, lng: number}} from
 * @param {[number, number] | {lat: number, lng: number}} to
 */
export async function getRoadRoute(from, to) {
  if (!from || !to) return [];

  const lat1 = Array.isArray(from) ? from[0] : from.lat;
  const lng1 = Array.isArray(from) ? from[1] : from.lng;
  const lat2 = Array.isArray(to) ? to[0] : to.lat;
  const lng2 = Array.isArray(to) ? to[1] : to.lng;

  if (!lat1 || !lng1 || !lat2 || !lng2) return [];

  // Tạo cache key làm tròn 4 chữ số thập phân (~11m) để tránh gọi lặp lại khi tài xế di chuyển nhích nhẹ
  const cacheKey = `${lat1.toFixed(4)},${lng1.toFixed(4)}_${lat2.toFixed(4)},${lng2.toFixed(4)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  // 1. Thử gọi backend /api/maps/direction
  try {
    const res = await api.get(`/maps/direction?origin=${lat1},${lng1}&destination=${lat2},${lng2}`);
    if (res.data?.success && Array.isArray(res.data.coordinates) && res.data.coordinates.length > 1) {
      routeCache.set(cacheKey, res.data.coordinates);
      return res.data.coordinates;
    }
  } catch (err) {
    // Fallback sang OSRM trực tiếp
  }

  // 2. Fallback trực tiếp gọi OSRM client-side
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
    const response = await fetch(osrmUrl);
    const data = await response.json();
    if (data?.routes?.[0]?.geometry?.coordinates?.length > 1) {
      const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      routeCache.set(cacheKey, coords);
      return coords;
    }
  } catch (osrmErr) {
    // Không kết nối được
  }

  // 3. Fallback cuối cùng: đường thẳng 2 điểm
  const straightLine = [[lat1, lng1], [lat2, lng2]];
  return straightLine;
}
