const http = require('http');
const https = require('https');

function checkUrl(url) {
  const protocol = url.startsWith('https') ? https : http;
  return new Promise((resolve) => {
    const req = protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ url, status: res.statusCode, data }));
    }).on('error', (err) => resolve({ url, error: err.message }));
    req.setTimeout(3000, () => { req.destroy(); resolve({ url, error: 'timeout' }); });
  });
}

async function main() {
  const urls = [
    'https://api.aloshipp.com/api/health',
    'http://api.aloshipp.com:5000/api/health',
    'https://aloshipp.com/api/health',
    'http://aloshipp.com:5000/api/health',
    'https://aloshipp.com/backend/api/health'
  ];
  
  for (const url of urls) {
    console.log(await checkUrl(url));
  }
}
main();
