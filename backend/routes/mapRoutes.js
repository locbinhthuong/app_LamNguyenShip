const express = require('express');
const router = express.Router();
const axios = require('axios');
const rateLimit = require('express-rate-limit');

// Rate Limiter: Mỗi IP được phép gọi tối đa 30 lần trong 5 phút cho các API bản đồ
const mapLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 30, // Tối đa 30 requests
  message: { error: 'Bạn đã thực hiện quá nhiều thao tác tìm kiếm bản đồ. Vui lòng thử lại sau 5 phút.' }
});

router.use(mapLimiter);

router.get('/autocomplete', async (req, res) => {
  try {
    const { input, location } = req.query;
    const apiKey = process.env.GOONG_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing Goong API Key on server' });

    let url = `https://rsapi.goong.io/Place/AutoComplete?api_key=${apiKey}&limit=7&input=${encodeURIComponent(input)}`;
    if (location) {
      url += `&location=${location}`;
    }

    const response = await axios.get(url, {
      headers: { 'Referer': 'https://aloshipp.com' }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error Goong Autocomplete:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch autocomplete from map service' });
  }
});

router.get('/place', async (req, res) => {
  try {
    const { place_id } = req.query;
    const apiKey = process.env.GOONG_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing Goong API Key on server' });

    const response = await axios.get(`https://rsapi.goong.io/Place/Detail?place_id=${place_id}&api_key=${apiKey}`, {
      headers: { 'Referer': 'https://aloshipp.com' }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error Goong Place Detail:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch place detail from map service' });
  }
});

router.get('/geocode', async (req, res) => {
  try {
    const { latlng } = req.query;
    const apiKey = process.env.GOONG_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing Goong API Key on server' });

    const response = await axios.get(`https://rsapi.goong.io/Geocode?latlng=${latlng}&api_key=${apiKey}`, {
      headers: { 'Referer': 'https://aloshipp.com' }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error Goong Geocode:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch geocode from map service' });
  }
});

module.exports = router;
