const express = require('express');
const router = express.Router();
const axios = require('axios');
const rateLimit = require('express-rate-limit');

// Rate Limiter: Mỗi IP được phép gọi tối đa 50 lần trong 5 phút cho các API bản đồ
const mapLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 50, // Tối đa 50 requests
  message: { error: 'Bạn đã thực hiện quá nhiều thao tác tìm kiếm bản đồ. Vui lòng thử lại sau 5 phút.' }
});

router.use(mapLimiter);

router.get('/autocomplete', async (req, res) => {
  try {
    const { input, location } = req.query;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing GOOGLE_MAPS_API_KEY on server' });

    // location is "lat,lng"
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}&language=vi&components=country:vn`;
    
    if (location) {
      url += `&location=${location}&radius=50000`; // 50km bias
    }

    const response = await axios.get(url);
    const data = response.data;
    
    if (data.status === 'OK' && data.predictions) {
      const predictions = data.predictions.map(item => ({
        description: item.description,
        place_id: item.place_id,
        source: 'google'
      }));
      return res.json({ predictions });
    } else {
       return res.json({ predictions: [] });
    }
  } catch (error) {
    console.error('Error Google Autocomplete:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch autocomplete from Google' });
  }
});

router.get('/place', async (req, res) => {
  try {
    const { place_id } = req.query;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing GOOGLE_MAPS_API_KEY on server' });

    const response = await axios.get(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&key=${apiKey}&language=vi`);
    const data = response.data;
    
    if (data.status === 'OK' && data.result) {
      // Transform format back to match old frontend expectations if needed
      // Frontend expects { result: { geometry: { location: { lat, lng } } } }
      return res.json({
        result: {
          geometry: {
            location: {
              lat: data.result.geometry.location.lat,
              lng: data.result.geometry.location.lng
            }
          },
          formatted_address: data.result.formatted_address,
          name: data.result.name
        }
      });
    } else {
      res.status(404).json({ error: 'Place not found' });
    }
  } catch (error) {
    console.error('Error Google Place Detail:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch place detail from Google' });
  }
});

router.get('/geocode', async (req, res) => {
  try {
    const { latlng } = req.query;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing GOOGLE_MAPS_API_KEY on server' });

    const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latlng}&key=${apiKey}&language=vi`);
    const data = response.data;
    
    if (data.status === 'OK' && data.results) {
      return res.json({
        results: data.results.map(r => ({
          formatted_address: r.formatted_address,
          geometry: r.geometry
        }))
      });
    } else {
       return res.json({ results: [] });
    }
  } catch (error) {
    console.error('Error Google Geocode:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch geocode from Google' });
  }
});

module.exports = router;
