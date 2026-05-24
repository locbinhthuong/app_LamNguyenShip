const express = require('express');
const app = express();

const configRoutes = express.Router();
configRoutes.get('/:key', (req, res) => res.json({ key: req.params.key }));

app.use('/api/config', configRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const request = require('supertest');

request(app)
  .get('/api/config/PRICING_CONFIG')
  .expect(200)
  .end((err, res) => {
    if (err) throw err;
    console.log('Result:', res.body);
  });
