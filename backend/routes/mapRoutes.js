const express = require('express');
const router = express.Router();
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const { getDrivingDistance } = require('../utils/distance');

// Rate Limiter
const mapLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 120,
  message: { error: 'Bạn đã thực hiện quá nhiều thao tác tìm kiếm bản đồ. Vui lòng thử lại sau 5 phút.' }
});

router.use(mapLimiter);

router.get('/autocomplete', async (req, res) => {
  try {
    const { input, location } = req.query;
    const apiKey = process.env.GOONG_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing GOONG_API_KEY on server' });

    let url = `https://rsapi.goong.io/Place/AutoComplete?api_key=${apiKey}&input=${encodeURIComponent(input)}`;
    if (location) {
      url += `&location=${location}&radius=50`; 
    }

    const response = await axios.get(url);
    const data = response.data;
    
    if (data.status === 'OK' && data.predictions) {
      const predictions = data.predictions.map(item => ({
        description: item.description,
        place_id: item.place_id,
        source: 'goong'
      }));
      return res.json({ predictions });
    } else {
       return res.json({ predictions: [] });
    }
  } catch (error) {
    console.error('Error Goong Autocomplete:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch autocomplete from Goong' });
  }
});

router.get('/place', async (req, res) => {
  try {
    const { place_id } = req.query;
    const apiKey = process.env.GOONG_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing GOONG_API_KEY on server' });

    const response = await axios.get(`https://rsapi.goong.io/Place/Detail?place_id=${place_id}&api_key=${apiKey}`);
    const data = response.data;
    
    if (data.status === 'OK' && data.result) {
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
    console.error('Error Goong Place Detail:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch place detail from Goong' });
  }
});

router.get('/geocode', async (req, res) => {
  try {
    const { latlng } = req.query;
    const apiKey = process.env.GOONG_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing GOONG_API_KEY on server' });

    const response = await axios.get(`https://rsapi.goong.io/Geocode?latlng=${latlng}&api_key=${apiKey}`);
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
    console.error('Error Goong Geocode:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch geocode from Goong' });
  }
});

// GET /api/maps/direction?origin=lat,lng&destination=lat,lng
// Trả về lộ trình đường bộ thực tế (chuỗi tọa độ [lat, lng])
router.get('/direction', async (req, res) => {
  try {
    const { origin, destination } = req.query;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Missing origin or destination' });
    }
    const [lat1, lng1] = origin.split(',').map(Number);
    const [lat2, lng2] = destination.split(',').map(Number);

    if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const result = await getDrivingDistance(lat1, lng1, lat2, lng2);
    const coordinates = (result.routeLine || []).map(p => [p.lat, p.lng]);

    res.json({
      success: true,
      distanceKm: result.distanceKm,
      coordinates
    });
  } catch (error) {
    console.error('Error /maps/direction:', error.message);
    res.status(500).json({ error: 'Failed to calculate direction' });
  }
});

module.exports = router;
