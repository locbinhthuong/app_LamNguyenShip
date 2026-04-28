const axios = require('axios');

async function testUpdate() {
  try {
    // Thử cập nhật đơn đầu tiên mà API trả về
    const res = await axios.get('https://api.aloshipp.com/api/orders', {
      headers: {
        Authorization: 'Bearer MOCK_TOKEN' // I don't have token, so I can't test API easily
      }
    });
  } catch (e) {
    console.log(e);
  }
}
